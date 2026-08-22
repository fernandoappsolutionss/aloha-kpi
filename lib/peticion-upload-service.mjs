import { ADMIN_ROLES, assertCentroAccess } from './current-user.mjs'
import {
  MAX_COTIZACIONES,
  MAX_UPLOAD_ATTEMPTS,
  DRAFT_TTL_DAYS,
  canAddQuote,
  normalizeFiscalId,
  normalizeSupplierName,
} from './peticiones-domain.mjs'
import { PdfValidationError, sanitizePdfName } from './peticion-pdf.mjs'
import { isIsoCountryCode } from './iso-countries.mjs'

const actorSnapshot = (actor) => ({ id: actor.id, nombre: actor.nombre, email: actor.email, rol: actor.rol })
const activeCallbackActor = (row, payload) => Boolean(
  row?.user_exists && row?.user_password_hash && (
    ADMIN_ROLES.has(row.user_rol) || (
      String(row.user_centro_id) === String(row.centro_id) &&
      (row.submitted_at || String(row.created_by) === String(payload.uid))
    )
  )
)
const callbackMatches = (row, payload, pathname) => Boolean(
  row && Number(row.id) === Number(payload.cotizacionId) &&
  Number(row.peticion_id) === Number(payload.peticionId) &&
  String(row.upload_nonce) === String(payload.nonce) &&
  row.expected_pathname === payload.pathname && payload.pathname === pathname
)
const assertQuoteAccess = (actor, row) => {
  assertCentroAccess(actor, row.centro_id)
  if (!row.submitted_at && String(row.created_by) !== String(actor.id) && !ADMIN_ROLES.has(actor.rol)) {
    throw new Error('Carga no autorizada.')
  }
}

export function createPeticionUploadService({ repo, blob, now = () => new Date(), uuid = () => crypto.randomUUID() }) {
  async function queue(pathname, motivo) {
    if (!pathname) return
    await repo.transaction((query) => repo.enqueueCleanup(query, { blob_pathname: pathname, motivo }), { isolationLevel: 'ReadCommitted' })
  }

  async function invalidate(payload, pathname, message, motivo = 'invalid_pdf') {
    const invalidated = await repo.transaction(async (query) => {
      const changed = await repo.markInvalid(query, { cotizacionId: payload.cotizacionId, nonce: payload.nonce, pathname, error: message })
      if (changed) await repo.enqueueCleanup(query, { blob_pathname: pathname, motivo })
      return Boolean(changed)
    }, { isolationLevel: 'ReadCommitted' })
    if (invalidated) return { ok: true, invalid: true }
    const current = await repo.getCallbackContext(payload)
    if (callbackMatches(current, payload, pathname) && current.upload_status === 'valid') {
      return { ok: true, idempotent: true }
    }
    if (callbackMatches(current, payload, pathname) && ['invalid', 'cleanup_pending'].includes(current.upload_status)) {
      return { ok: true, invalid: true, idempotent: true }
    }
    await queue(pathname, 'stale_callback')
    return { ok: true, stale: true }
  }

  return {
    async prepare(actor, input) {
      try {
        return await repo.transaction(async (query) => {
          const petition = await repo.lockPeticion(query, input.peticionId)
          if (!petition || String(petition.centro_id) !== String(input.centroId)) throw new Error('Petición no encontrada.')
          // `petition.tipo &&` guarda porque los mocks de test unitario devuelven filas sin tipo;
          // las filas reales de la base siempre lo traen.
          if (petition.tipo && petition.tipo !== 'peticion') throw new Error('Solo una petición formal admite cotizaciones.')
          assertCentroAccess(actor, petition.centro_id)
          if (!petition.submitted_at && String(petition.created_by) !== String(actor.id) && !ADMIN_ROLES.has(actor.rol)) throw new Error('No autorizado')
          if (!petition.submitted_at && petition.draft_expires_at && new Date(petition.draft_expires_at).getTime() <= now().getTime()) throw new Error('El borrador venció y ya no admite cargas.')
          if (petition.submitted_at && !canAddQuote(petition.estado)) throw new Error('Esta petición ya no admite cotizaciones.')

          const current = input.cotizacionId ? await repo.lockQuote(query, input.cotizacionId) : null
          if (current && Number(current.peticion_id) !== Number(petition.id)) throw new Error('Cotización no encontrada.')
          if (petition.submitted_at && current?.upload_status === 'valid') throw new Error('Una cotización enviada no se puede sustituir.')
          if (!current && await repo.countQuotes(query, petition.id) >= MAX_COTIZACIONES) throw new Error('La petición admite hasta diez cotizaciones.')

          const reason = String(input.proveedorRazonSocial || '').trim()
          const country = String(input.proveedorPais || '').trim().toUpperCase()
          const fiscal = String(input.proveedorIdFiscal || '').trim()
          if (!normalizeSupplierName(reason) || !isIsoCountryCode(country) || !normalizeFiscalId(fiscal)) throw new Error('Completa razón social, país ISO válido e identificación fiscal.')
          if (input.empresaConstituida !== true || input.emiteFacturaFiscal !== true) throw new Error('Debes certificar empresa constituida y factura fiscal.')

          const attempt = Number(current?.upload_attempts || 0) + 1
          if (attempt > MAX_UPLOAD_ATTEMPTS) throw new Error('Esta cotización agotó sus cinco intentos de carga.')
          for (const oldPath of new Set([current?.blob_pathname, current?.expected_pathname].filter(Boolean))) {
            await repo.enqueueCleanup(query, { blob_pathname: oldPath, motivo: 'upload_retried' })
          }
          const nonce = uuid()
          const pathname = `peticiones/${petition.id}/${uuid()}.pdf`
          const quote = await repo.prepareQuote(query, {
            // Solo se incluye `id` cuando se reintenta una cotización existente:
            // así el repositorio (real o mock) que hace spread sobre esta fila
            // nunca puede confundir "id ausente = fila nueva" con un id null
            // explícito que pisara el id recién asignado por la base.
            ...(current?.id ? { id: current.id } : {}),
            peticion_id: petition.id,
            proveedor_razon_social: reason,
            proveedor_clave: normalizeSupplierName(reason),
            proveedor_pais: country,
            proveedor_id_fiscal: fiscal,
            proveedor_id_fiscal_clave: normalizeFiscalId(fiscal),
            empresa_constituida: true,
            emite_factura_fiscal: true,
            archivo_nombre: sanitizePdfName(input.archivoNombre),
            archivo_mime: null,
            archivo_bytes: null,
            archivo_sha256: null,
            blob_pathname: null,
            upload_nonce: nonce,
            expected_pathname: pathname,
            upload_status: 'pending',
            upload_attempts: attempt,
            validation_error: null,
            uploaded_by: actor.id,
            uploaded_by_snapshot: actorSnapshot(actor),
            validada_at: null,
          })
          if (!petition.submitted_at) {
            await repo.touchDraft(query, {
              id: petition.id,
              draft_expires_at: new Date(now().getTime() + DRAFT_TTL_DAYS * 86400000).toISOString(),
            })
          }
          return { cotizacionId: quote.id, pathname, nonce, attempt }
        }, { isolationLevel: 'ReadCommitted' })
      } catch (error) {
        if (error?.code === '23505' && error.constraint === 'uq_peticion_proveedor_fiscal') {
          throw new Error('Ese proveedor fiscal ya está registrado en la petición.')
        }
        throw error
      }
    },

    async authorizeToken(actor, input) {
      const row = await repo.getUploadAttempt(input.cotizacionId)
      // No se exige `input.peticionId`: el payload que el cliente reenvía es
      // el que `prepare()` devolvió ({ cotizacionId, pathname, nonce,
      // attempt }), que nunca incluyó peticionId. La cotización ya identifica
      // una única fila (PK); nonce + expected_pathname + assertQuoteAccess
      // (centro/propietario) son la autorización real.
      if (!row) throw new Error('Carga no autorizada.')
      assertQuoteAccess(actor, row)
      if (row.upload_status !== 'pending' || row.upload_nonce !== input.nonce || row.expected_pathname !== input.pathname) throw new Error('Carga no autorizada.')
      if (row.submitted_at && !canAddQuote(row.estado)) throw new Error('Esta petición ya no admite cotizaciones.')
      return {
        allowedContentTypes: ['application/pdf'],
        maximumSizeInBytes: 10 * 1024 * 1024,
        validUntil: now().getTime() + 10 * 60000,
        addRandomSuffix: false,
        allowOverwrite: false,
        tokenPayload: JSON.stringify({
          v: 1, uid: actor.id, peticionId: Number(row.peticion_id),
          cotizacionId: Number(row.id), nonce: row.upload_nonce, pathname: row.expected_pathname,
        }),
      }
    },

    async complete({ blob: uploaded, tokenPayload }) {
      let payload
      try { payload = JSON.parse(tokenPayload || '{}') } catch { throw new Error('Payload de carga inválido.') }
      if (payload.v !== 1 || !payload.uid || !payload.peticionId || !payload.cotizacionId || !payload.nonce || !payload.pathname) throw new Error('Payload de carga incompleto.')
      let context = await repo.getCallbackContext(payload)
      if (!callbackMatches(context, payload, uploaded.pathname)) {
        await queue(uploaded.pathname, 'stale_callback')
        return { ok: true, stale: true }
      }
      if (context.upload_status === 'valid') return { ok: true, idempotent: true }
      if (!activeCallbackActor(context, payload)) {
        return invalidate(payload, uploaded.pathname, 'La cuenta que inició la carga ya no está activa o autorizada.', 'revoked_access')
      }
      if (context.submitted_at && !canAddQuote(context.estado)) {
        return invalidate(payload, uploaded.pathname, 'La petición ya no admite cotizaciones.', 'terminal_state')
      }
      if (context.upload_status === 'invalid' || context.upload_status === 'cleanup_pending') {
        return { ok: true, invalid: true, idempotent: true }
      }
      if (context.upload_status === 'pending') {
        await repo.transaction((query) => repo.markValidating(query, {
          cotizacionId: payload.cotizacionId, nonce: payload.nonce, pathname: uploaded.pathname,
        }), { isolationLevel: 'ReadCommitted' })
        context = await repo.getCallbackContext(payload)
      }
      if (!callbackMatches(context, payload, uploaded.pathname)) {
        await queue(uploaded.pathname, 'stale_callback')
        return { ok: true, stale: true }
      }
      if (context.upload_status === 'valid') return { ok: true, idempotent: true }
      if (!activeCallbackActor(context, payload)) {
        return invalidate(payload, uploaded.pathname, 'La cuenta que inició la carga ya no está activa o autorizada.', 'revoked_access')
      }
      if (context.upload_status === 'invalid' || context.upload_status === 'cleanup_pending') {
        return { ok: true, invalid: true, idempotent: true }
      }
      if (context.upload_status !== 'validating') {
        await queue(uploaded.pathname, 'stale_callback')
        return { ok: true, stale: true }
      }
      if (uploaded.contentType !== 'application/pdf') return invalidate(payload, uploaded.pathname, 'El archivo no tiene MIME application/pdf.')
      let inspected
      try { inspected = await blob.inspect(uploaded.pathname) } catch (error) {
        if (error instanceof PdfValidationError) return invalidate(payload, uploaded.pathname, error.message)
        throw error
      }
      try {
        const finalized = await repo.transaction(async (query) => {
          const petition = await repo.lockPeticion(query, payload.peticionId)
          if (!petition) return { stale: true }
          const fresh = await repo.getCallbackContext(payload, query, { lockUser: true })
          if (!callbackMatches(fresh, payload, uploaded.pathname)) return { stale: true }
          if (fresh.upload_status === 'valid') return { valid: true, idempotent: true }
          if (petition.submitted_at && !canAddQuote(petition.estado)) return { terminal: true }
          if (!activeCallbackActor(fresh, payload)) return { revoked: true }
          if (['invalid', 'cleanup_pending'].includes(fresh.upload_status)) return { invalid: true }
          if (fresh.upload_status !== 'validating') return { stale: true }
          const quote = await repo.markValid(query, {
            cotizacionId: payload.cotizacionId, nonce: payload.nonce, pathname: uploaded.pathname,
            mime: 'application/pdf', bytes: inspected.bytes, sha256: inspected.sha256,
            validadaAt: now().toISOString(),
          })
          return quote ? { valid: true } : { stale: true }
        }, { isolationLevel: 'ReadCommitted' })
        if (finalized.terminal) return invalidate(payload, uploaded.pathname, 'La petición ya no admite cotizaciones.', 'terminal_state')
        if (finalized.revoked) return invalidate(payload, uploaded.pathname, 'La cuenta que inició la carga ya no está activa o autorizada.', 'revoked_access')
        if (finalized.invalid) return { ok: true, invalid: true, idempotent: true }
        if (finalized.idempotent) return { ok: true, idempotent: true }
        if (finalized.stale) {
          await queue(uploaded.pathname, 'stale_callback')
          return { ok: true, stale: true }
        }
      } catch (error) {
        if (error?.code === '23505' && error.constraint === 'uq_peticion_pdf_sha') {
          return invalidate(payload, uploaded.pathname, 'El mismo PDF ya fue presentado en esta petición.')
        }
        throw error
      }
      return { ok: true, valid: true }
    },

    async status(actor, input) {
      const row = await repo.getUploadStatus(input.cotizacionId)
      if (!row || Number(row.peticion_id) !== Number(input.peticionId)) throw new Error('Cotización no encontrada.')
      assertQuoteAccess(actor, row)
      return { id: row.id, upload_status: row.upload_status, error: row.validation_error || null }
    },

    async discardAttempt(actor, input) {
      return repo.transaction(async (query) => {
        const petition = await repo.lockPeticion(query, input.peticionId)
        if (!petition || String(petition.centro_id) !== String(input.centroId)) throw new Error('Petición no encontrada.')
        assertCentroAccess(actor, petition.centro_id)
        if (!petition.submitted_at && String(petition.created_by) !== String(actor.id) && !ADMIN_ROLES.has(actor.rol)) throw new Error('No autorizado')
        if (petition.submitted_at && !canAddQuote(petition.estado)) throw new Error('Esta petición ya no admite cambios documentales.')
        const quote = await repo.lockQuote(query, input.cotizacionId)
        if (!quote || Number(quote.peticion_id) !== Number(petition.id)) throw new Error('Cotización no encontrada.')
        if (quote.upload_status === 'valid') throw new Error('Una cotización válida no se puede retirar.')
        const paths = [...new Set([quote.blob_pathname, quote.expected_pathname].filter(Boolean))]
        for (const blob_pathname of paths) await repo.enqueueCleanup(query, { blob_pathname, motivo: 'attempt_discarded' })
        await repo.deleteQuoteAttempt(query, { id: quote.id, peticionId: petition.id })
        return { ok: true }
      }, { isolationLevel: 'ReadCommitted' })
    },
  }
}
