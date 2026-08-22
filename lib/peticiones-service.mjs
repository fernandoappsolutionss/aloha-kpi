import { assertAdmin, assertCentroAccess, ADMIN_ROLES } from './current-user.mjs'
import { DRAFT_TTL_DAYS, PETICION_ESTADOS, canAddQuote, submissionErrorMessage, validateSubmission } from './peticiones-domain.mjs'

const RETRYABLE_SQLSTATES = new Set(['40001', '40P01'])
const iso = (value) => new Date(value).toISOString()
const draftExpired = (row, at) => Boolean(!row.submitted_at && row.draft_expires_at && new Date(row.draft_expires_at).getTime() <= new Date(at).getTime())
const assertDraftActive = (row, at) => { if (draftExpired(row, at)) throw new Error('El borrador venció y ya no puede modificarse ni enviarse.') }
const actorSnapshot = (actor) => ({ id: actor.id, nombre: actor.nombre, email: actor.email, rol: actor.rol })
const presentQuote = (quote) => ({
  id: quote.id,
  proveedor_razon_social: quote.proveedor_razon_social,
  proveedor_pais: quote.proveedor_pais,
  proveedor_id_fiscal: quote.proveedor_id_fiscal,
  empresa_constituida: quote.empresa_constituida,
  emite_factura_fiscal: quote.emite_factura_fiscal,
  archivo_nombre: quote.archivo_nombre,
  archivo_bytes: quote.archivo_bytes,
  upload_status: quote.upload_status,
  upload_attempts: quote.upload_attempts,
  validation_error: quote.validation_error,
  validada_at: quote.validada_at,
  created_at: quote.created_at,
})
const presentRecord = ({ created_by_snapshot: _snapshot, ...row }) => ({
  ...row,
  cotizaciones: Array.isArray(row.cotizaciones) ? row.cotizaciones.map(presentQuote) : [],
})

export function createPeticionesService({
  repo,
  now = () => new Date(),
  sleep = () => Promise.resolve(),
  verifyQuote = async () => { throw new Error('Verificador de Blob no configurado.') },
  notifyDecision = async () => {},
}) {
  async function serializable(work) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await repo.transaction(work, { isolationLevel: 'Serializable' })
      } catch (error) {
        if (!RETRYABLE_SQLSTATES.has(error?.code) || attempt === 3) throw error
        await sleep(attempt * 25)
      }
    }
  }

  return {
    async listPanel(actor, period) {
      assertCentroAccess(actor, period.centroId)
      const [items, drafts] = await Promise.all([
        repo.listSubmitted(period),
        repo.listDrafts(period, actor),
      ])
      return {
        items: items.map((source) => {
          const row = presentRecord(source)
          return {
            ...row,
            legacy: row.tipo === 'legado',
            canEditText: row.tipo === 'comentario' && row.estado === 'Próximo trimestre' && String(row.created_by) === String(actor.id),
            canAddQuote: row.tipo === 'peticion' && canAddQuote(row.estado),
          }
        }),
        drafts: drafts.map((source) => ({ ...presentRecord(source), expired: draftExpired(source, now()) })),
        permissions: { canChangeStatus: ADMIN_ROLES.has(actor.rol) },
      }
    },

    async createComentario(actor, input) {
      assertCentroAccess(actor, input.centroId)
      const texto = String(input.texto || '').trim()
      if (!texto) throw new Error('Escribe el comentario.')
      const timestamp = iso(now())
      return serializable(async (query) => {
        const peticion = await repo.insertComentario(query, {
          centro_id: Number(input.centroId), anio: Number(input.anio), trimestre: Number(input.trimestre),
          texto, tipo: 'comentario', categoria: null, estado: 'Próximo trimestre',
          created_by: actor.id, created_by_snapshot: actorSnapshot(actor), submitted_at: timestamp,
        })
        await repo.insertHistory(query, {
          peticion_id: peticion.id, estado_anterior: null, estado_nuevo: 'Próximo trimestre',
          changed_by: actor.id, changed_by_snapshot: actorSnapshot(actor), created_at: timestamp,
        })
        return { ok: true, peticion }
      })
    },

    async createDraft(actor, input) {
      assertCentroAccess(actor, input.centroId)
      const errors = validateSubmission({ texto: input.texto, categoria: input.categoria, cotizaciones: [] })
        .filter((code) => code !== 'minimo_tres')
      if (errors.length) throw new Error(submissionErrorMessage(errors))
      const timestamp = now()
      return serializable(async (query) => ({ ok: true, draft: await repo.insertDraft(query, {
        centro_id: Number(input.centroId), anio: Number(input.anio), trimestre: Number(input.trimestre),
        texto: input.texto.trim(), tipo: 'peticion', categoria: input.categoria,
        estado: 'Próximo trimestre', created_by: actor.id, created_by_snapshot: actorSnapshot(actor),
        submitted_at: null, draft_expires_at: iso(new Date(timestamp.getTime() + DRAFT_TTL_DAYS * 86400000)),
      }) }))
    },

    async submitPeticion(actor, input) {
      assertCentroAccess(actor, input.centroId)
      return serializable(async (query) => {
        const row = await repo.lockPeticion(query, input.id)
        if (!row || String(row.centro_id) !== String(input.centroId)) throw new Error('Petición no encontrada.')
        if (row.submitted_at) return { ok: true, peticion: row, alreadySubmitted: true }
        assertDraftActive(row, now())
        if (String(row.created_by) !== String(actor.id) && !ADMIN_ROLES.has(actor.rol)) throw new Error('No autorizado')
        const quotes = await repo.listQuotes(query, row.id, { forUpdate: true })
        const errors = validateSubmission({ texto: row.texto, categoria: row.categoria, cotizaciones: quotes })
        if (errors.length) throw new Error(submissionErrorMessage(errors))
        const validQuotes = quotes.filter((quote) => quote.upload_status === 'valid')
        await Promise.all(validQuotes.map((quote) => verifyQuote(quote)))
        const incomplete = quotes.filter((quote) => quote.upload_status !== 'valid')
        const incompletePaths = [...new Set(incomplete.flatMap((quote) => [quote.blob_pathname, quote.expected_pathname]).filter(Boolean))]
        for (const blob_pathname of incompletePaths) {
          await repo.enqueueCleanup(query, { blob_pathname, motivo: 'incomplete_draft_attempt' })
        }
        if (incomplete.length) await repo.deleteIncompleteDraftQuotes(query, row.id)
        const timestamp = iso(now())
        const peticion = await repo.markSubmitted(query, { id: row.id, submitted_at: timestamp, draft_expires_at: null })
        await repo.insertHistory(query, {
          peticion_id: row.id, estado_anterior: null, estado_nuevo: 'Próximo trimestre',
          changed_by: actor.id, changed_by_snapshot: actorSnapshot(actor), created_at: timestamp,
        })
        return { ok: true, peticion, alreadySubmitted: false }
      })
    },

    async updateComentario(actor, input) {
      assertCentroAccess(actor, input.centroId)
      const texto = String(input.texto || '').trim()
      if (!texto) throw new Error('Escribe el comentario.')
      return serializable(async (query) => {
        const row = await repo.lockPeticion(query, input.id)
        if (!row || row.tipo !== 'comentario' || String(row.centro_id) !== String(input.centroId)) throw new Error('El registro anterior no se puede editar.')
        if (row.estado !== 'Próximo trimestre' || String(row.created_by) !== String(actor.id)) throw new Error('El comentario ya no puede editarse.')
        return { ok: true, peticion: await repo.updateComentario(query, { id: row.id, texto }) }
      })
    },

    async changeStatus(actor, input) {
      assertAdmin(actor)
      if (!PETICION_ESTADOS.includes(input.estado)) throw new Error('Estado inválido.')
      const result = await serializable(async (query) => {
        const row = await repo.lockPeticion(query, input.id)
        if (!row || String(row.centro_id) !== String(input.centroId) || !row.submitted_at) throw new Error('Petición no encontrada.')

        if (row.estado === input.estado) {
          // Mismo estado: no-op silencioso, salvo un caso — corregir o
          // backfillear la cotización ganadora de una petición YA Aprobada
          // (gerencia se equivocó, o la petición se aprobó antes de que
          // existiera esta selección). Solo dispara si llega un id distinto
          // al guardado (o no había ninguno guardado); reelegir el mismo id,
          // o no mandar ninguno, sigue siendo un no-op puro.
          if (
            input.estado === 'Aprobado' && row.tipo === 'peticion' &&
            input.cotizacionAprobadaId &&
            String(input.cotizacionAprobadaId) !== String(row.cotizacion_aprobada_id)
          ) {
            const quotes = await repo.listQuotes(query, row.id, { forUpdate: true })
            const cotizacionAprobada = quotes.find((quote) =>
              String(quote.id) === String(input.cotizacionAprobadaId) && quote.upload_status === 'valid'
            ) || null
            if (!cotizacionAprobada) throw new Error('La cotización aprobada no es válida para esta petición.')
            const peticion = await repo.setApprovedQuote(query, { id: row.id, cotizacionAprobadaId: cotizacionAprobada.id })
            // Sin historial: el estado no cambió, solo se corrigió el ganador.
            return { ok: true, peticion, unchanged: false, cotizacionAprobada, estadoAnterior: row.estado }
          }
          return { ok: true, peticion: row, unchanged: true, cotizacionAprobada: null }
        }

        // Aprobar una petición formal exige que gerencia elija cuál cotización
        // ganó; comentarios/legado ignoran la selección. Cualquier transición
        // que NO sea "entrar a Aprobado" limpia la ganadora guardada (no debe
        // sobrevivir a una negación/anulación/reapertura posterior).
        let cotizacionAprobada = null
        if (input.estado === 'Aprobado' && row.tipo === 'peticion') {
          if (!input.cotizacionAprobadaId) throw new Error('Selecciona la cotización aprobada.')
          const quotes = await repo.listQuotes(query, row.id, { forUpdate: true })
          cotizacionAprobada = quotes.find((quote) =>
            String(quote.id) === String(input.cotizacionAprobadaId) && quote.upload_status === 'valid'
          ) || null
          if (!cotizacionAprobada) throw new Error('La cotización aprobada no es válida para esta petición.')
        }
        const timestamp = iso(now())
        const peticion = await repo.changeStatus(query, {
          id: row.id, estado: input.estado,
          anulada_at: input.estado === 'Anulada' ? timestamp : null,
          cotizacion_aprobada_id: input.estado === 'Aprobado' ? (cotizacionAprobada ? cotizacionAprobada.id : null) : null,
        })
        await repo.insertHistory(query, {
          peticion_id: row.id, estado_anterior: row.estado, estado_nuevo: input.estado,
          changed_by: actor.id, changed_by_snapshot: actorSnapshot(actor), created_at: timestamp,
        })
        return { ok: true, peticion, unchanged: false, cotizacionAprobada, estadoAnterior: row.estado }
      })
      // Notificación por fuera de la transacción: una falla de correo nunca
      // debe revertir ni ocultar un cambio de estado ya confirmado.
      if (!result.unchanged && (input.estado === 'Aprobado' || input.estado === 'Negado')) {
        try {
          await notifyDecision({
            peticion: result.peticion,
            estadoAnterior: result.estadoAnterior,
            estado: input.estado,
            actor,
            cotizacionAprobada: result.cotizacionAprobada,
          })
        } catch (error) {
          console.error('[peticiones-notify]', error)
        }
      }
      return { ok: true, peticion: result.peticion, unchanged: result.unchanged }
    },

    async discardDraft(actor, input) {
      assertCentroAccess(actor, input.centroId)
      return serializable(async (query) => {
        const row = await repo.lockPeticion(query, input.id)
        if (!row || row.submitted_at || String(row.centro_id) !== String(input.centroId)) throw new Error('Borrador no encontrado.')
        if (String(row.created_by) !== String(actor.id) && !ADMIN_ROLES.has(actor.rol)) throw new Error('No autorizado')
        const quotes = await repo.listQuotes(query, row.id, { forUpdate: true })
        const paths = [...new Set(quotes.flatMap((quote) => [quote.blob_pathname, quote.expected_pathname]).filter(Boolean))]
        for (const blob_pathname of paths) await repo.enqueueCleanup(query, { blob_pathname, motivo: 'draft_discarded' })
        await repo.deleteDraftQuotes(query, row.id)
        await repo.deleteDraft(query, row.id)
        return { ok: true }
      })
    },

    async updateDraft(actor, input) {
      assertCentroAccess(actor, input.centroId)
      const errors = validateSubmission({ texto: input.texto, categoria: input.categoria, cotizaciones: [] })
        .filter((code) => code !== 'minimo_tres')
      if (errors.length) throw new Error(submissionErrorMessage(errors))
      return serializable(async (query) => {
        const row = await repo.lockPeticion(query, input.id)
        if (!row || row.submitted_at || String(row.centro_id) !== String(input.centroId)) throw new Error('Borrador no encontrado.')
        assertDraftActive(row, now())
        if (String(row.created_by) !== String(actor.id) && !ADMIN_ROLES.has(actor.rol)) throw new Error('No autorizado')
        const timestamp = now()
        const draft = await repo.updateDraft(query, {
          id: row.id,
          texto: String(input.texto).trim(),
          categoria: input.categoria,
          draft_expires_at: iso(new Date(timestamp.getTime() + DRAFT_TTL_DAYS * 86400000)),
        })
        return { ok: true, draft }
      })
    },
  }
}
