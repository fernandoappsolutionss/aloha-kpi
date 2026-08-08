// Llenado de grupos — servicio de sincronización al CRM.
// Módulo server-only (usa sql y el token de servicio del CRM; el repo no usa
// el paquete 'server-only', así que la regla es esta línea): se importa desde
// el route del cron (auth por CRON_SECRET) y desde server actions (auth por
// sesión), NUNCA desde componentes de cliente.
//
// Arquitectura (diseño 2026-08-08): el cierre de llenado es un estado DERIVADO
// y el CRM se entera por el outbox durable crm_sync_outbox — una fila POR
// EVENTO CRM (corrección g2-5). Productores: las server actions encolan con
// encolarSyncCrm y el cron detecta transiciones de ventana por fingerprint
// (corrección g2-4). Consumidor: procesarOutbox reclama lotes con lock y
// empuja el estado VIGENTE del evento al CRM; las actions ya no empujan inline.
import { sql } from './db'
import { crmCall, crmConfigured } from './crm'
import { armarAlohaGroup } from './cupos-sync'
import {
  CONCURRENCIA_OUTBOX,
  LOTE_OUTBOX,
  MAX_INTENTOS,
  armarLoteOutbox,
  dedupIds,
  fingerprintLlenado,
  grupoVigenteAEmpujar,
  partirEnLotes,
} from './llenado-outbox.mjs'

// Timeout de cada push al CRM: el consumidor corre en el cron con presupuesto
// propio, pero un CRM colgado no puede comerse el lote entero (ver crmCall).
const PUSH_TIMEOUT_MS = 8000

// Encola la sincronización de todos los eventos vinculados a los grupos dados
// (op sync_group). Lo llaman las server actions tras inscribir/retirar/
// reincorporar/fusionar o mover la palanca: solo ENCOLAN — el push real lo
// hace el consumidor, así loadOperaciones nunca espera red externa.
// La clave de idempotencia lleva la marca de tiempo del encolado: filas
// repetidas del MISMO encolado no duplican, y un cambio posterior nunca choca
// con claves ya procesadas (el consumidor empuja el estado vigente, así que
// una fila de más solo cuesta un push redundante).
export async function encolarSyncCrm(grupoIds, motivo, query = sql) {
  const ids = dedupIds(grupoIds)
  if (!ids.length) return { encoladas: 0 }
  const eventos = await query`
    SELECT crm_event_id, grupo_id FROM centro_eventos WHERE grupo_id = ANY(${ids}::int[])
  `
  return await encolarOutboxEn(query, eventos, { op: 'sync_group', motivo })
}

// Encola las filas del outbox con la conexión que se le pase: `sql` normal, o
// el `query` de una transacción interactiva (lib/db.js withTransaction). Esto
// último es lo que exige la corrección g2-5 en cerrarGrupo/aplicarFusion: los
// crm_event_id se capturan ANTES de desvincular y su clear_group se inserta EN
// LA MISMA transacción — si la transacción aborta, no queda ni la
// desvinculación ni la fila huérfana, y si commitea el consumidor sabe
// exactamente a quién limpiarle aloha_group.
export async function encolarOutboxEn(query, eventos, { op = 'sync_group', motivo, clave } = {}) {
  const lote = armarLoteOutbox(eventos, { op, motivo, clave: clave || new Date().toISOString() })
  if (!lote.length) return { encoladas: 0 }
  const filas = await query`
    INSERT INTO crm_sync_outbox (crm_event_id, grupo_id, op, motivo, clave_idem)
    SELECT * FROM UNNEST(
      ${lote.map((f) => f.crm_event_id)}::text[],
      ${lote.map((f) => f.grupo_id)}::int[],
      ${lote.map((f) => f.op)}::text[],
      ${lote.map((f) => f.motivo)}::text[],
      ${lote.map((f) => f.clave_idem)}::text[]
    )
    ON CONFLICT (clave_idem) DO NOTHING
    RETURNING id
  `
  return { encoladas: filas.length }
}

// Detecta transiciones de la ventana de nuevos (apertura Y vencimiento) por
// grupo activo: calcula el fingerprint vigente en JS (lib/llenado-outbox.mjs)
// y, si difiere del guardado, ejecuta UN statement CTE que marca el
// fingerprint y encola el sync de todos los eventos vinculados de forma
// ATÓMICA (corrección g2-4): si el proceso cae, la transición no se pierde —
// o quedó marcada CON sus filas de outbox, o no quedó marcada y la próxima
// corrida la vuelve a ver. El pre-chequeo en JS solo ahorra statements; la
// garantía la da el IS DISTINCT FROM del UPDATE (una corrida concurrente que
// ya marcó deja el UPDATE en 0 filas y no encola nada).
export async function detectarTransicionesVentana(hoyIso, { centroId = null } = {}) {
  const grupos = centroId == null
    ? await sql`
        SELECT id, estado, itinerario, itinerario_clases, inscripcion_abierta,
               llenado_extendido_hasta, llenado_fingerprint
        FROM grupos WHERE estado = 'activo' ORDER BY id
      `
    : await sql`
        SELECT id, estado, itinerario, itinerario_clases, inscripcion_abierta,
               llenado_extendido_hasta, llenado_fingerprint
        FROM grupos WHERE estado = 'activo' AND centro_id = ${centroId} ORDER BY id
      `
  let transiciones = 0
  let encoladas = 0
  for (const g of grupos) {
    const fp = fingerprintLlenado(g, hoyIso)
    if (g.llenado_fingerprint === fp) continue
    const [r] = await sql`
      WITH cambiado AS (
        UPDATE grupos SET llenado_fingerprint = ${fp}
        WHERE id = ${g.id} AND llenado_fingerprint IS DISTINCT FROM ${fp}
        RETURNING id
      ), encolado AS (
        INSERT INTO crm_sync_outbox (crm_event_id, grupo_id, op, motivo, clave_idem)
        SELECT ce.crm_event_id, ${g.id}, 'sync_group', 'ventana', ${fp} || '|' || ce.crm_event_id
        FROM cambiado, centro_eventos ce
        WHERE ce.grupo_id = ${g.id}
        ON CONFLICT (clave_idem) DO NOTHING
        RETURNING id
      )
      SELECT (SELECT COUNT(*)::int FROM cambiado) AS cambiados,
             (SELECT COUNT(*)::int FROM encolado) AS enc
    `
    if (r?.cambiados) transiciones += 1
    encoladas += Number(r?.enc) || 0
  }
  return { revisados: grupos.length, transiciones, encoladas }
}

// Filas del outbox aún por procesar (las que el claim puede reclamar).
async function contarPendientes() {
  const [r] = await sql`
    SELECT COUNT(*)::int AS n FROM crm_sync_outbox
    WHERE procesado_at IS NULL AND intentos < ${MAX_INTENTOS}
  `
  return Number(r?.n) || 0
}

// Pendientes agrupadas por centro (vía grupos; una fila clear_group cuyo grupo
// ya no exista cae en 'sin_centro'). Para el reporte del cron.
export async function pendientesPorCentro() {
  const filas = await sql`
    SELECT COALESCE(g.centro_id::text, 'sin_centro') AS centro, COUNT(*)::int AS n
    FROM crm_sync_outbox o LEFT JOIN grupos g ON g.id = o.grupo_id
    WHERE o.procesado_at IS NULL AND o.intentos < ${MAX_INTENTOS}
    GROUP BY 1
  `
  return Object.fromEntries(filas.map((f) => [f.centro, Number(f.n) || 0]))
}

// Procesa UNA fila reclamada. AMBAS ops empujan el aloha_group VIGENTE del
// evento (su vínculo actual, no el del momento del encolado; sin vínculo o
// evento local ya inexistente ⇒ null, que es lo que ventas debe ver).
// clear_group NO fuerza null: la fila del cierre/fusión re-deriva el vínculo
// (grupoVigenteAEmpujar) — si el admin ya reasignó el evento a otro grupo,
// el snapshot nuevo manda y la fila vieja jamás pisa esa reasignación.
// Éxito ⇒ procesado_at con el lock_token correcto; fallo ⇒ intentos+1 y
// ultimo_error, soltando el lock para el próximo intento.
async function procesarFila(fila, token, porEvento) {
  const ev = porEvento.get(String(fila.crm_event_id)) || null
  const centroKey = ev?.centro_id != null ? String(ev.centro_id) : 'sin_centro'
  try {
    const grupoVigente = grupoVigenteAEmpujar(ev)
    const aloha_group = grupoVigente == null
      ? null
      : await armarAlohaGroup(ev.centro_id, grupoVigente)
    const res = await crmCall(
      'update_event',
      { event_id: fila.crm_event_id, event: { aloha_group } },
      { timeoutMs: PUSH_TIMEOUT_MS }
    )
    if (res.error) throw new Error(res.error)
    await sql`
      UPDATE crm_sync_outbox SET procesado_at = now(), locked_at = NULL, lock_token = NULL
      WHERE id = ${fila.id} AND lock_token = ${token}
    `
    return { ok: true, centroKey }
  } catch (e) {
    await sql`
      UPDATE crm_sync_outbox
      SET intentos = intentos + 1, ultimo_error = ${String(e?.message || e).slice(0, 500)},
          locked_at = NULL, lock_token = NULL
      WHERE id = ${fila.id} AND lock_token = ${token}
    `
    return { ok: false, centroKey }
  }
}

// Consumidor del outbox. Reclama lotes con UN statement (UPDATE + subquery
// FOR UPDATE SKIP LOCKED: dos corridas concurrentes jamás procesan la misma
// fila) y procesa con concurrencia acotada. Corta por presupuesto (corrección
// g2-6) SOLTANDO lo reclamado y sin tocar: esas filas quedan pendientes para
// la próxima corrida. Devuelve el resumen con desglose por centro.
export async function procesarOutbox({
  limite = LOTE_OUTBOX,
  concurrencia = CONCURRENCIA_OUTBOX,
  budgetMs = null,
} = {}) {
  const inicio = Date.now()
  const sinTiempo = () => budgetMs != null && Date.now() - inicio >= budgetMs
  const resumen = { procesadas: 0, fallidas: 0, pendientes: 0, porCentro: {} }

  // Sin CRM configurado no se quema ni un intento: el outbox espera intacto.
  if (!crmConfigured()) {
    resumen.pendientes = await contarPendientes()
    return { ...resumen, warn: 'CRM no configurado: el outbox queda pendiente.' }
  }

  while (!sinTiempo()) {
    const token = globalThis.crypto.randomUUID()
    const filas = await sql`
      UPDATE crm_sync_outbox SET locked_at = now(), lock_token = ${token}
      WHERE id IN (
        SELECT id FROM crm_sync_outbox
        WHERE procesado_at IS NULL AND intentos < ${MAX_INTENTOS}
          AND (locked_at IS NULL OR locked_at < now() - interval '5 minutes')
        ORDER BY id
        LIMIT ${limite}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `
    if (!filas.length) break

    // El centro y el vínculo VIGENTE de cada evento, en una sola consulta.
    const evIds = [...new Set(filas.map((f) => String(f.crm_event_id)))]
    const eventos = await sql`
      SELECT crm_event_id, centro_id, grupo_id FROM centro_eventos
      WHERE crm_event_id = ANY(${evIds})
    `
    const porEvento = new Map(eventos.map((e) => [String(e.crm_event_id), e]))

    let corte = false
    for (const tanda of partirEnLotes(filas, concurrencia)) {
      if (sinTiempo()) { corte = true; break }
      const resultados = await Promise.all(tanda.map((f) => procesarFila(f, token, porEvento)))
      for (const r of resultados) {
        const c = resumen.porCentro[r.centroKey] || (resumen.porCentro[r.centroKey] = { procesadas: 0, fallidas: 0 })
        if (r.ok) { resumen.procesadas += 1; c.procesadas += 1 }
        else { resumen.fallidas += 1; c.fallidas += 1 }
      }
    }
    if (corte) {
      // Presupuesto agotado a mitad de lote: soltar lo reclamado sin procesar
      // (las falladas ya soltaron su lock en procesarFila y no se tocan).
      await sql`
        UPDATE crm_sync_outbox SET locked_at = NULL, lock_token = NULL
        WHERE lock_token = ${token} AND procesado_at IS NULL
      `
      break
    }
    if (filas.length < limite) break // no queda nada reclamable ahora mismo
  }

  resumen.pendientes = await contarPendientes()
  return resumen
}
