// Outbox de sincronización al CRM — lógica PURA del productor y el consumidor.
// Sin BD: estas funciones reciben filas/grupos y devuelven decisiones; el SQL
// real vive en lib/llenado-service.js y aquí se prueba en espejo
// (test/llenado-service.test.mjs), misma técnica que lib/llenado.mjs.

import { ventanaNuevos } from './llenado.mjs'

// Cortes del consumidor — los MISMOS números que el claim SQL del servicio
// (si cambian aquí, cambia también el statement de lib/llenado-service.js):
// una fila muere a los 5 intentos y un lock huérfano (proceso caído a mitad
// de lote) se puede reclamar pasados 5 minutos.
export const MAX_INTENTOS = 5
export const LOCK_VENCIDO_MS = 5 * 60 * 1000
export const LOTE_OUTBOX = 20
export const CONCURRENCIA_OUTBOX = 3

// itinerario_clases llega como objeto (JSONB) o, defensivamente, como string
// (mismo criterio que el helper privado de lib/llenado.mjs).
const itinerarioDe = (grupo) => {
  const it = grupo?.itinerario_clases
  if (it == null) return null
  if (typeof it === 'string') {
    try { return JSON.parse(it) } catch { return {} }
  }
  return it
}

// Fingerprint del estado de ventana que ya vio el cron (corrección g2-4):
// 'nivel|fecha_limite_efectiva|abierta'. Cambia al pasar de nivel, al moverse
// la fecha límite (feriados corren el plan, extensión manual) Y al cruzar la
// fecha con el calendario (misma fecha límite, hoy distinto ⇒ abierta→cerrada)
// — por eso cubre apertura Y vencimiento. El cron lo calcula en JS y el
// marcador + encolado van en UN statement atómico del servicio.
export function fingerprintLlenado(grupo, hoyIso) {
  const v = ventanaNuevos(grupo, hoyIso)
  const it = itinerarioDe(grupo)
  const programa = String(grupo?.itinerario || '').toUpperCase() || '-'
  const nivel = it?.nivel != null ? `${programa} ${it.nivel}` : programa
  // Sin fecha límite (exento, legacy inválido, palanca) el hueco lo llena la
  // razón: 'exento' y 'sin_itinerario_valido' no deben confundirse entre sí.
  const limite = v.fechaLimite || v.razon || '-'
  return `${nivel}|${limite}|${v.abierta ? 'abierta' : 'cerrada'}`
}

// Normaliza y dedupe ids de grupo para el encolado batch: acepta números o
// strings, bota nulos/NaN y repetidos preservando el orden de llegada.
export function dedupIds(ids) {
  const vistos = new Set()
  const out = []
  for (const id of Array.isArray(ids) ? ids : []) {
    const n = Number(id)
    if (!Number.isFinite(n) || n <= 0 || vistos.has(n)) continue
    vistos.add(n)
    out.push(n)
  }
  return out
}

// Arma el lote de filas del outbox a partir de los eventos vinculados
// (una fila POR EVENTO CRM, corrección g2-5). Dedupe por crm_event_id: si el
// mismo evento aparece dos veces en la consulta, un solo push basta — el
// consumidor empuja el estado VIGENTE, no el del momento del encolado.
// `clave` es el sufijo de idempotencia del llamador (el productor manual usa
// la marca de tiempo del encolado; el cron usa el fingerprint).
export function armarLoteOutbox(eventos, { op = 'sync_group', motivo, clave }) {
  const vistos = new Set()
  const out = []
  for (const ev of Array.isArray(eventos) ? eventos : []) {
    const id = ev?.crm_event_id == null ? '' : String(ev.crm_event_id)
    if (!id || vistos.has(id)) continue
    vistos.add(id)
    out.push({
      crm_event_id: id,
      grupo_id: ev.grupo_id ?? null,
      op,
      motivo: motivo || op,
      clave_idem: `${op}|${ev.grupo_id ?? 'sin_grupo'}|${id}|${clave}`,
    })
  }
  return out
}

// Decisión del consumidor sobre QUÉ empujar al CRM: el vínculo VIGENTE del
// evento, sin importar la op de la fila. Devuelve el grupo_id a snapshotear o
// null (evento local ya inexistente o sigue desvinculado). Clave del diseño:
// una fila clear_group encolada por un cierre/fusión NO fuerza null — si un
// admin reasignó el evento a otro grupo después del encolado (siguiendo el
// aviso "cerrado a nuevos — reasignar"), el vínculo nuevo manda; empujar null
// le borraría a ventas los cupos de un evento correctamente reasignado.
export function grupoVigenteAEmpujar(ev) {
  return ev?.grupo_id ?? null
}

// Espejo puro del claim del consumidor (el WHERE del UPDATE ... FOR UPDATE
// SKIP LOCKED del servicio): pendiente = sin procesar, con intentos de sobra
// y sin lock vivo (lock NULL o vencido). Orden por id ascendente y tope de
// lote. No muta el arreglo recibido.
export function seleccionarPendientes(filas, {
  ahora = Date.now(),
  limite = LOTE_OUTBOX,
  maxIntentos = MAX_INTENTOS,
  lockVencidoMs = LOCK_VENCIDO_MS,
} = {}) {
  const ms = (v) => (v == null ? null : new Date(v).getTime())
  return (Array.isArray(filas) ? filas : [])
    .filter((f) => {
      if (f?.procesado_at != null) return false
      if ((Number(f?.intentos) || 0) >= maxIntentos) return false
      const lock = ms(f?.locked_at)
      return lock == null || lock < ahora - lockVencidoMs
    })
    .sort((a, b) => Number(a.id) - Number(b.id))
    .slice(0, limite)
}

// Parte el lote reclamado en tandas de `tam` para procesar con concurrencia
// acotada (Promise.all por tanda) y poder cortar por presupuesto entre tandas.
export function partirEnLotes(items, tam) {
  const n = Math.max(1, Math.floor(Number(tam) || 1))
  const lista = Array.isArray(items) ? items : []
  const out = []
  for (let i = 0; i < lista.length; i += n) out.push(lista.slice(i, i + n))
  return out
}
