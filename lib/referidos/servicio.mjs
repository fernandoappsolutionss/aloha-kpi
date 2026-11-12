// Servicio de referidos: importación desde el CRM, acreditación por importe
// neto, libro de saldo y tarjeta. Las dependencias (sql, withTransaction, crm)
// se inyectan para probarlo contra Postgres real sin Neon ni CRM.
// Diseño: docs/superpowers/specs/2026-11-12-referidos-wallet-design.md
import { randomBytes } from 'node:crypto'
import {
  CUENTAS, TIPO_DE_CONCEPTO, claseElegible, codigoDeRegistro, decidirAtribucion, deltaConcepto,
  generarCodigo, normalizarTelefono,
} from './reglas.mjs'

const RC = { isolationLevel: 'ReadCommitted' }
const PAGINA_CRM = 500
const INTENTOS_ALTA_POR_MINUTO = 10
const nuevoToken = () => randomBytes(24).toString('base64url')

export function crearServicio({ sql, withTransaction, crm, centrosDeCuenta }) {
  // ── CRM ────────────────────────────────────────────────────────────────
  // Recorre una lista paginada del CRM. `certificado` solo si el CRM devolvió
  // `total`, no cambió durante el recorrido y los ids ÚNICOS recibidos lo
  // igualan. Un CRM sin paginación responde todo de una vez y sin total: sirve
  // para operar, pero no certifica cobertura.
  async function listarTodo(action, payload, clave) {
    const vistos = new Map()
    let total = null
    for (let offset = 0; offset < 200000; offset += PAGINA_CRM) {
      const res = await crm(action, { ...payload, offset, limit: PAGINA_CRM })
      if (res.error) return { error: res.error }
      const filas = res[clave] || []
      for (const fila of filas) vistos.set(fila.id, fila)
      if (typeof res.total !== 'number') return { filas: [...vistos.values()], certificado: false }
      if (total !== null && res.total !== total) return { filas: [...vistos.values()], certificado: false }
      total = res.total
      if (filas.length < PAGINA_CRM) break
    }
    return { filas: [...vistos.values()], certificado: vistos.size === total }
  }

  // ── Miembros ───────────────────────────────────────────────────────────
  async function asegurarMiembro(q, cuenta, telefonoNorm, reg) {
    const nombre = [reg.first_name, reg.last_name].filter(Boolean).join(' ').trim() || null
    for (let intento = 0; intento < 5; intento++) {
      // ON CONFLICT sin destino: cubre el teléfono repetido y, rarísimo, un
      // código o token repetido (se reintenta con otros).
      const [nuevo] = await q`
        INSERT INTO referidos_miembros (crm_account_id, telefono_norm, nombre, telefono, correo, codigo, token, apple_auth, origen_registration_id)
        VALUES (${cuenta}, ${telefonoNorm}, ${nombre}, ${reg.phone || null}, ${reg.email || null},
          ${generarCodigo(randomBytes(6))}, ${nuevoToken()}, ${nuevoToken()}, ${reg.id})
        ON CONFLICT DO NOTHING RETURNING id`
      if (nuevo) return nuevo.id
      // Un miembro existente NO se sobrescribe con los datos de otra inscripción.
      const [existente] = await q`SELECT id FROM referidos_miembros WHERE crm_account_id = ${cuenta} AND telefono_norm = ${telefonoNorm}`
      if (existente) return existente.id
    }
    throw new Error('No se pudo crear el miembro de referidos.')
  }

  // ── Importar (CRM → espejo local). No acredita nada. ───────────────────
  // evento = { id, account_id?, start_date? }
  async function importarEvento(evento) {
    const [espejo] = await sql`SELECT centro_id, crm_account_id, start_date FROM centro_eventos WHERE crm_event_id = ${evento.id}`
    const cuenta = evento.account_id || espejo?.crm_account_id
    if (!CUENTAS.includes(cuenta)) return { error: 'El evento no es de una cuenta ALOHA.' }
    const claseFecha = evento.start_date || espejo?.start_date || null
    const centroId = espejo?.centro_id ?? null
    return withTransaction(async (q) => {
      // Candado por evento y lectura del CRM DENTRO del candado: dos corridas
      // no se cruzan y una lectura vieja no pisa a una nueva.
      await q`SELECT pg_advisory_xact_lock(hashtext(${'referidos:evento:' + evento.id}))`
      const lista = await listarTodo('list_registrations', { event_id: evento.id }, 'registrations')
      if (lista.error) return { error: lista.error }
      const filas = lista.filas.sort((a, b) =>
        String(a.registered_at || '').localeCompare(String(b.registered_at || '')) || String(a.id).localeCompare(String(b.id)))
      let sinTelefono = 0
      for (const reg of filas) {
        const telefonoNorm = normalizarTelefono(reg.phone, cuenta)
        if (!telefonoNorm) sinTelefono++
        const miembroId = telefonoNorm ? await asegurarMiembro(q, cuenta, telefonoNorm, reg) : null
        const participante = reg.participant_name || [reg.first_name, reg.last_name].filter(Boolean).join(' ').trim() || null
        await q`
          INSERT INTO referidos_registros (crm_registration_id, crm_event_id, crm_account_id, centro_id, miembro_id,
            codigo_referido, participante, registered_at, clase_fecha, estado)
          VALUES (${reg.id}, ${evento.id}, ${cuenta}, ${centroId}, ${miembroId}, ${codigoDeRegistro(reg)}, ${participante},
            ${reg.registered_at || null}::timestamptz, ${claseFecha}::timestamptz, ${reg.attendance_status || 'registered'})
          ON CONFLICT (crm_registration_id) DO UPDATE SET
            crm_event_id = EXCLUDED.crm_event_id, crm_account_id = EXCLUDED.crm_account_id,
            centro_id = COALESCE(EXCLUDED.centro_id, referidos_registros.centro_id),
            miembro_id = COALESCE(referidos_registros.miembro_id, EXCLUDED.miembro_id),
            codigo_referido = COALESCE(referidos_registros.codigo_referido, EXCLUDED.codigo_referido),
            participante = EXCLUDED.participante, registered_at = EXCLUDED.registered_at,
            clase_fecha = EXCLUDED.clase_fecha, estado = EXCLUDED.estado, visto_at = now()`
      }
      // Lista certificada: lo que ya no está en el CRM cuenta como cancelado.
      if (lista.certificado) {
        await q`UPDATE referidos_registros SET estado = 'cancelled', visto_at = now()
          WHERE crm_event_id = ${evento.id} AND estado <> 'cancelled' AND NOT (crm_registration_id = ANY(${filas.map((r) => String(r.id))}::text[]))`
        await q`INSERT INTO referidos_eventos (crm_event_id) VALUES (${evento.id})
          ON CONFLICT (crm_event_id) DO UPDATE SET certificado_at = now()`
      }
      return { ok: true, certificado: lista.certificado, inscritos: filas.length, sinTelefono }
    }, RC)
  }

  // ── Atribución (solo con cobertura completa; la llama el cron) ─────────
  async function primeraFichaFecha(q, cuenta, telefonoNorm) {
    const centros = centrosDeCuenta(cuenta)
    if (!centros.length) return null
    const fichas = await q`
      SELECT telefono, COALESCE(fecha_inscripcion, created_at::date) AS fecha FROM estudiantes
      WHERE centro_id = ANY(${centros}::int[]) AND telefono IS NOT NULL
        AND right(regexp_replace(telefono, '\\D', '', 'g'), 7) = right(${telefonoNorm}, 7)`
    const propias = fichas.filter((f) => normalizarTelefono(f.telefono, cuenta) === telefonoNorm).map((f) => f.fecha).filter(Boolean)
    return propias.length ? propias.sort((a, b) => new Date(a) - new Date(b))[0] : null
  }

  async function cerrarAtribuciones(cuenta) {
    const abiertos = await sql`
      SELECT m.id FROM referidos_miembros m
      WHERE m.crm_account_id = ${cuenta} AND NOT m.atribucion_cerrada
        AND EXISTS (SELECT 1 FROM referidos_registros r WHERE r.miembro_id = m.id)`
    for (const { id } of abiertos) {
      await withTransaction(async (q) => {
        const [m] = await q`SELECT id, telefono_norm, atribucion_cerrada FROM referidos_miembros WHERE id = ${id} FOR UPDATE`
        if (!m || m.atribucion_cerrada) return
        const registros = await q`SELECT crm_registration_id, registered_at, codigo_referido FROM referidos_registros WHERE miembro_id = ${id}`
        const codigos = [...new Set(registros.map((r) => r.codigo_referido).filter(Boolean))]
        const duenos = codigos.length
          ? await q`SELECT id, codigo FROM referidos_miembros WHERE crm_account_id = ${cuenta} AND codigo = ANY(${codigos}::text[])`
          : []
        const decision = decidirAtribucion({
          miembroId: id,
          registros: registros.map((r) => ({ ...r, registered_at: r.registered_at ? new Date(r.registered_at).toISOString() : '' })),
          miembroPorCodigo: (codigo) => duenos.find((d) => d.codigo === codigo) || null,
          primeraFichaFecha: await primeraFichaFecha(q, cuenta, m.telefono_norm),
        })
        await q`UPDATE referidos_miembros SET atribucion_cerrada = true,
          referidor_id = ${decision?.referidorId ?? null}, referido_por_registration_id = ${decision?.registrationId ?? null}
          WHERE id = ${id}`
      }, RC)
    }
    return abiertos.length
  }

  // ── Libro ──────────────────────────────────────────────────────────────
  // Toda escritura pasa por aquí, con la fila del miembro ya bloqueada.
  async function asentar(q, mov) {
    await q`INSERT INTO referidos_movimientos (miembro_id, tipo, monto_cent, concepto, clave, centro_id, nota, creado_por)
      VALUES (${mov.miembroId}, ${mov.tipo}, ${mov.montoCent}, ${mov.concepto ?? null}, ${mov.clave}, ${mov.centroId ?? null}, ${mov.nota ?? null}, ${mov.creadoPor ?? null})`
    await q`UPDATE referidos_miembros SET version = version + 1, actualizado_at = now() WHERE id = ${mov.miembroId}`
  }

  const saldoDe = async (q, miembroId) =>
    (await q`SELECT COALESCE(SUM(monto_cent), 0)::int AS saldo FROM referidos_movimientos WHERE miembro_id = ${miembroId}`)[0].saldo

  // ── Acreditar (importe neto por concepto; SQL local, sin CRM) ──────────
  async function acreditar(cuenta, { cerrarAtribucion = false } = {}) {
    const [config] = await sql`SELECT * FROM referidos_config WHERE crm_account_id = ${cuenta}`
    const cerradas = cerrarAtribucion && config?.cobertura_completa_at ? await cerrarAtribuciones(cuenta) : 0
    // Un bono por inscripción asistida (cp) y, por cada miembro referido, un
    // bono al referidor cuando asiste y otro cuando queda inscrito con ficha
    // nueva vigente (cualquiera de sus inscripciones cuenta, se paga una vez).
    const candidatos = await sql`
      WITH ref AS (
        SELECT m.id AS referido, m.referidor_id AS beneficiario,
          bool_or(r.estado = 'attended') AS asistio,
          max(r.clase_fecha) FILTER (WHERE r.estado = 'attended') AS fecha_asiste,
          bool_or(ins.ok IS TRUE) AS inscrito,
          max(r.clase_fecha) FILTER (WHERE ins.ok IS TRUE) AS fecha_inscrito,
          min(r.centro_id) AS centro_id
        FROM referidos_miembros m
        JOIN referidos_registros r ON r.miembro_id = m.id
        LEFT JOIN LATERAL (
          SELECT true AS ok FROM estudiantes e
          WHERE e.id = r.alta_nueva_estudiante_id AND e.estado <> 'matricula_anulada'
            AND EXISTS (SELECT 1 FROM estudiante_eventos ev WHERE ev.estudiante_id = e.id AND ev.tipo = 'inscripcion')
        ) ins ON true
        WHERE m.crm_account_id = ${cuenta} AND m.atribucion_cerrada AND m.referidor_id IS NOT NULL
        GROUP BY m.id
      ), todos AS (
        SELECT 'cp' AS clase, 'cp:' || r.crm_registration_id AS concepto, r.miembro_id AS beneficiario,
          (r.estado = 'attended') AS cumple, r.clase_fecha AS fecha, r.centro_id
        FROM referidos_registros r WHERE r.crm_account_id = ${cuenta} AND r.miembro_id IS NOT NULL
        UNION ALL SELECT 'ref_asiste', 'ref_asiste:m' || referido, beneficiario, COALESCE(asistio, false), fecha_asiste, centro_id FROM ref
        UNION ALL SELECT 'ref_inscrito', 'ref_inscrito:m' || referido, beneficiario, COALESCE(inscrito, false), fecha_inscrito, centro_id FROM ref
      )
      SELECT t.*, mv.asentado, mv.congelado FROM todos t
      LEFT JOIN LATERAL (
        SELECT SUM(monto_cent)::int AS asentado, (array_agg(monto_cent ORDER BY id))[1] AS congelado
        FROM referidos_movimientos WHERE concepto = t.concepto
      ) mv ON true
      WHERE t.cumple OR mv.asentado IS NOT NULL`
    let movimientos = 0
    const tocados = new Set()
    for (const c of candidatos) {
      const elegible = claseElegible(config, c.fecha)
      if (!deltaConcepto({ ...c, elegible, config })) continue
      const delta = await withTransaction(async (q) => {
        await q`SELECT id FROM referidos_miembros WHERE id = ${c.beneficiario} FOR UPDATE`
        // Se recalcula con el candado tomado: otra corrida pudo asentarlo ya.
        const [mv] = await q`
          SELECT COALESCE(SUM(monto_cent), 0)::int AS asentado, (array_agg(monto_cent ORDER BY id))[1] AS congelado, COUNT(*)::int AS n
          FROM referidos_movimientos WHERE concepto = ${c.concepto}`
        const d = deltaConcepto({ ...c, elegible, config, asentado: mv.asentado, congelado: mv.congelado })
        if (!d) return 0
        await asentar(q, {
          miembroId: c.beneficiario, tipo: d > 0 ? TIPO_DE_CONCEPTO[c.clase] : 'reverso', montoCent: d,
          concepto: c.concepto, clave: `${c.concepto}#${mv.n + 1}`, centroId: c.centro_id,
        })
        return d
      }, RC)
      if (delta) { movimientos++; tocados.add(c.beneficiario) }
    }
    return { ok: true, movimientos, cerradas, miembros: [...tocados] }
  }

  // Canje (monto > 0) o ajuste (monto con signo). `claveOp` la genera el
  // formulario al abrirse: un reintento con la misma clave no descuenta dos veces.
  async function moverSaldo({ miembroId, tipo, montoCent, nota, claveOp, centroId, creadoPor }) {
    if (!Number.isInteger(montoCent) || montoCent === 0) return { error: 'Monto inválido.' }
    if (tipo === 'canje' && montoCent < 0) return { error: 'Monto inválido.' }
    if (!/^[0-9a-f-]{16,64}$/i.test(String(claveOp || ''))) return { error: 'Falta la clave de la operación; recarga la página.' }
    if (!String(nota || '').trim()) return { error: 'Escribe una nota (por ejemplo, el número de factura).' }
    const clave = `op:${claveOp}`
    const delta = tipo === 'canje' ? -montoCent : montoCent
    return withTransaction(async (q) => {
      const [m] = await q`SELECT id FROM referidos_miembros WHERE id = ${miembroId} FOR UPDATE`
      if (!m) return { error: 'Miembro no encontrado.' }
      const [repetido] = await q`SELECT miembro_id FROM referidos_movimientos WHERE clave = ${clave}`
      if (repetido) return { ok: true, repetido: true, saldo: await saldoDe(q, miembroId) }
      const saldo = await saldoDe(q, miembroId)
      if (delta < 0 && saldo + delta < 0) return { error: `Saldo insuficiente: tiene $${(saldo / 100).toFixed(2)}.` }
      await asentar(q, { miembroId, tipo, montoCent: delta, clave, centroId, nota: String(nota).trim(), creadoPor })
      return { ok: true, saldo: saldo + delta }
    }, RC)
  }

  // Reemisión: corta el acceso a información actualizada de la tarjeta
  // anterior (web, alta, Apple y Google). No borra lo ya descargado.
  async function reemitir(miembroId, { objetoGoogle } = {}) {
    return withTransaction(async (q) => {
      const [m] = await q`SELECT id, emision, google_objeto_at FROM referidos_miembros WHERE id = ${miembroId} FOR UPDATE`
      if (!m) return { error: 'Miembro no encontrado.' }
      if (m.google_objeto_at && objetoGoogle) {
        await q`INSERT INTO referidos_google_bajas (objeto_id) VALUES (${objetoGoogle(m)}) ON CONFLICT DO NOTHING`
      }
      const token = nuevoToken()
      await q`UPDATE referidos_miembros SET emision = emision + 1, token = ${token}, apple_auth = ${nuevoToken()},
        google_objeto_at = NULL, version = version + 1, actualizado_at = now(), tarjeta_vista_at = NULL WHERE id = ${miembroId}`
      await q`DELETE FROM referidos_apple_dispositivos WHERE miembro_id = ${miembroId}`
      return { ok: true, token }
    }, RC)
  }

  // ── Tarjeta pública ────────────────────────────────────────────────────
  async function tarjetaPorToken(token) {
    const [m] = await sql`
      SELECT m.id, m.nombre, m.codigo, m.token, m.crm_account_id, m.emision, m.version, m.apple_auth, m.actualizado_at,
        (SELECT COALESCE(SUM(monto_cent), 0)::int FROM referidos_movimientos WHERE miembro_id = m.id) AS saldo_cent,
        (SELECT COUNT(*)::int FROM referidos_miembros r WHERE r.referidor_id = m.id) AS referidos
      FROM referidos_miembros m WHERE m.token = ${token}`
    if (!m) return null
    // Público: solo tipo, fecha y monto. Nunca notas internas.
    const movimientos = await sql`SELECT tipo, monto_cent, created_at FROM referidos_movimientos WHERE miembro_id = ${m.id} ORDER BY id DESC LIMIT 8`
    return { ...m, movimientos }
  }

  const marcarVista = (miembroId) =>
    sql`UPDATE referidos_miembros SET tarjeta_vista_at = now() WHERE id = ${miembroId} AND tarjeta_vista_at IS NULL`

  // Enlace de la confirmación del CRM. De un solo uso y solo para la
  // inscripción que creó al miembro: una inscripción nueva con el teléfono de
  // otra persona no revela su tarjeta.
  async function consumirAlta({ eventId, registrationId, ip }) {
    const [intento] = await sql`
      INSERT INTO referidos_intentos (ip, minuto) VALUES (${ip || 'desconocida'}, date_trunc('minute', now()))
      ON CONFLICT (ip, minuto) DO UPDATE SET n = referidos_intentos.n + 1 RETURNING n`
    if (intento.n > INTENTOS_ALTA_POR_MINUTO) return { error: 'limite' }
    const res = await crm('get_event', { event_id: eventId })
    if (res.error || !res.event) return { error: 'no' }
    const imp = await importarEvento(res.event)
    if (imp.error) return { error: 'no' }
    const [m] = await sql`
      UPDATE referidos_miembros SET tarjeta_vista_at = now()
      WHERE origen_registration_id = ${registrationId} AND emision = 1 AND tarjeta_vista_at IS NULL
        AND EXISTS (SELECT 1 FROM referidos_registros r WHERE r.crm_registration_id = ${registrationId} AND r.crm_event_id = ${eventId})
      RETURNING token`
    return m ? { token: m.token } : { error: 'no' }
  }

  async function cuentaPorCodigo(codigo) {
    const [m] = await sql`SELECT crm_account_id FROM referidos_miembros WHERE codigo = ${codigo}`
    return m?.crm_account_id || null
  }

  // ── Lotes (cron y carga histórica) ─────────────────────────────────────
  // Importa los eventos de la cuenta y luego acredita. `desdeDias` null =
  // toda la cuenta (carga histórica): solo ese recorrido, completo y
  // certificado evento por evento, marca la cobertura.
  async function correrCuenta(cuenta, { desdeDias = 45, hasta = () => false } = {}) {
    return withTransaction(async (q) => {
      // Cron y carga histórica de la misma cuenta no se pisan.
      const [{ libre }] = await q`SELECT pg_try_advisory_xact_lock(hashtext(${'referidos:cuenta:' + cuenta})) AS libre`
      if (!libre) return { ocupado: true }
      const lista = await listarTodo('list_events', { account_id: cuenta }, 'events')
      if (lista.error) return { error: lista.error }
      const corte = desdeDias == null ? null : Date.now() - desdeDias * 86400000
      const eventos = lista.filas.filter((e) => corte == null || !e.start_date || new Date(e.start_date).getTime() >= corte)
      let completo = lista.certificado
      let importados = 0
      // Carga histórica reanudable: lo certificado en las últimas 24 h no se repite.
      const recientes = desdeDias == null
        ? new Set((await sql`SELECT crm_event_id FROM referidos_eventos WHERE certificado_at > now() - interval '24 hours'`).map((r) => r.crm_event_id))
        : new Set()
      for (const evento of eventos) {
        if (recientes.has(String(evento.id))) continue
        if (hasta()) { completo = false; break }
        const r = await importarEvento(evento).catch((e) => ({ error: e.message }))
        if (r.error || !r.certificado) completo = false
        if (!r.error) importados++
      }
      if (desdeDias == null && completo) {
        // Con `sql` (fuera de la transacción del candado) para que acreditar la vea.
        await sql`INSERT INTO referidos_config (crm_account_id, cobertura_completa_at) VALUES (${cuenta}, now())
          ON CONFLICT (crm_account_id) DO UPDATE SET cobertura_completa_at = now()`
      }
      // Una corrida incompleta no cierra atribuciones, aunque exista la marca histórica.
      const acreditado = await acreditar(cuenta, { cerrarAtribucion: completo })
      return { ...acreditado, ok: true, eventos: eventos.length, importados, completo }
    }, RC)
  }

  return {
    listarTodo, importarEvento, acreditar, cerrarAtribuciones, moverSaldo, reemitir,
    tarjetaPorToken, marcarVista, consumirAlta, cuentaPorCodigo, correrCuenta, saldoDe,
  }
}

// Evidencia de ficha NUEVA: se llama DENTRO de la transacción que crea la
// ficha. Con SAVEPOINT: si la tabla aún no existe (migración sin aplicar) el
// alta del alumno no se rompe.
export async function anotarAltaNueva(query, { crmRegistrationId, estudianteId, centroId }) {
  if (!crmRegistrationId) return
  await query('SAVEPOINT referidos_alta')
  try {
    await query(
      `INSERT INTO referidos_registros (crm_registration_id, centro_id, alta_nueva_estudiante_id) VALUES ($1, $2, $3)
       ON CONFLICT (crm_registration_id) DO UPDATE SET alta_nueva_estudiante_id = COALESCE(referidos_registros.alta_nueva_estudiante_id, EXCLUDED.alta_nueva_estudiante_id)`,
      [crmRegistrationId, centroId, estudianteId])
    await query('RELEASE SAVEPOINT referidos_alta')
  } catch (error) {
    console.error('[referidos] anotarAltaNueva', error)
    await query('ROLLBACK TO SAVEPOINT referidos_alta')
  }
}
