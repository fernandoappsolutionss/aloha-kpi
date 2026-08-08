// Reglas puras de la transición de plan del grupo (remodelado 2026-08-08:
// R1/R2 candado y allowlist, R3 cohorte y re-anclaje de fusión). Cálculo puro,
// sin BD: app/actions/grupos.js es el único caller con transacción; aquí vive
// lo que se puede probar en frío con node:test.
//
// - grupoIniciado: el candado post-inicio (g1-5). El caller lo evalúa con
//   hoyISO() Panamá RECALCULADO tras el FOR UPDATE sobre la fila bloqueada.
//   NULL legacy = INICIADO (fail closed, R1): un grupo sin fecha jamás queda
//   más editable que uno con fecha.
// - clavesNoPermitidasPostInicio: allowlist estricta de actualizarGrupo (g1-4)
//   — post-inicio SOLO `horarios` y `coach_id`, ni notas.
// - fingerprintPlanGrupo: identidad del plan de referencia para el CAS
//   optimista de ajustarItinerarioGrupo (g1-10): el cliente manda el
//   fingerprint del plan que VIO y el server aborta si la referencia cambió.
// - errorExcepcionesPasado: candado del ajuste de excepciones (g1-7/g1-23) —
//   el tramo pasado del calendario no se reescribe y una clase con asistencia
//   registrada no se suspende.
// - cohorteDeTransicion: los niños que siguen la referencia ANTERIOR exacta
//   (itinerario, nivel, fecha_inicio_nivel); los demás quedan intactos.
// - reAnclaEnDestino: re-anclaje semántico de la fusión (g1-9) — misma semana
//   (mismo índice de contenido) en el calendario del destino; la más cercana;
//   empate → la más antigua; sin equivalente → null (el caller aborta con
//   error legible).

import { versionesDe, normalizarExcepciones } from './itinerario.js'
import { planNino, posicionPlanNino, fingerprintCalendarioVersionado } from './plan-nino.mjs'

const DIA_MS = 24 * 60 * 60 * 1000
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/

// Fecha de la BD (Date del driver) o string ISO → 'AAAA-MM-DD' | null.
const iso10 = (v) => {
  if (!v) return null
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)
}
const iso = (t) => new Date(t).toISOString().slice(0, 10)
const utc = (isoStr) => {
  const [y, m, d] = String(isoStr).slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

// itinerario_clases llega como objeto (JSONB) o, defensivamente, como string.
const planDe = (v) => {
  if (v == null) return null
  if (typeof v === 'string') {
    try { return JSON.parse(v) } catch { return null }
  }
  return typeof v === 'object' ? v : null
}

// ── Candado post-inicio (g1-5, R1) ──────────────────────────────────────────

// ¿El grupo ya inició clases a la fecha `hoy` (iso10 Panamá)? La igualdad
// exacta cuenta como iniciado (el día 1 de clases el grupo ya es intocable).
// fecha NULL = INICIADO (fail closed, R1): el legacy sin fecha nunca deja de
// contar como iniciado ni abre la edición completa.
export function grupoIniciado(fechaInicioClases, hoy) {
  const f = iso10(fechaInicioClases)
  if (!f) return true
  const h = iso10(hoy)
  if (!h) return true // sin fecha de negocio tampoco se abre nada: fail closed
  return h >= f
}

// ── Allowlist post-inicio (g1-4) ────────────────────────────────────────────

export const CAMPOS_POST_INICIO = ['horarios', 'coach_id']

// Claves del payload que el candado post-inicio NO permite. Toda clave
// presente (aunque venga con el mismo valor) fuera de horarios/coach_id se
// rechaza: la UI construye un payload exclusivo y el server no adivina.
export function clavesNoPermitidasPostInicio(data) {
  return Object.keys(data || {}).filter(
    (k) => data[k] !== undefined && !CAMPOS_POST_INICIO.includes(k)
  )
}

// ── Fingerprint del plan de referencia (CAS de g1-10) ───────────────────────

// Identidad del plan que el cliente está editando: nivel + ancla del nivel +
// calendario versionado + excepciones. Determinista (mismas entradas → mismo
// string) para que cliente y server lo calculen por separado y coincidan.
// Sin referencia (grupo sin plan) → 'sin_plan'.
export function fingerprintPlanGrupo(itinerario) {
  const it = planDe(itinerario)
  if (!it) return 'sin_plan'
  return JSON.stringify([
    Number(it.nivel) || 1,
    iso10(it.fecha_inicio) || null,
    fingerprintCalendarioVersionado(versionesDe(it)),
    normalizarExcepciones(it.excepciones),
  ])
}

// ── Excepciones sin reescribir el pasado (g1-7 / g1-10) ─────────────────────

// Al ajustar SOLO excepciones (mismo nivel, misma ancla), el tramo ya vivido
// del calendario es intocable (R2b):
// - las excepciones con fecha ANTERIOR a `hoy` deben quedar EXACTAMENTE las
//   mismas (ni agregar ni quitar: mover una clase pasada reescribiría fechas
//   que pueden tener asistencia y rompería la evidencia g1-23);
// - una excepción NUEVA no puede caer sobre una clase con asistencia
//   registrada (las marcas por adelantado también son evidencia y se
//   protegen).
// El MOTIVO de una excepción pasada sí se puede editar: no mueve fechas.
// Devuelve el mensaje de error o null si el cambio es legal.
export function errorExcepcionesPasado({ referencia, excepciones, hoy, fechasConAsistencia } = {}) {
  const h = iso10(hoy)
  if (!h || !RE_FECHA.test(h)) return 'Fecha de negocio inválida.'
  const viejas = normalizarExcepciones(planDe(referencia)?.excepciones)
  const nuevas = normalizarExcepciones(excepciones)
  const pasadasViejas = viejas.map((e) => e.fecha).filter((f) => f < h)
  const pasadasNuevas = nuevas.map((e) => e.fecha).filter((f) => f < h)
  if (JSON.stringify(pasadasViejas) !== JSON.stringify(pasadasNuevas)) {
    return 'Las clases anteriores a hoy no se reescriben (R2b): las excepciones pasadas quedan como están; solo puedes suspender o restaurar clases de hoy en adelante.'
  }
  const asistencia = fechasConAsistencia instanceof Set ? fechasConAsistencia : new Set(fechasConAsistencia || [])
  const previas = new Set(viejas.map((e) => e.fecha))
  const chocante = nuevas.find((e) => !previas.has(e.fecha) && asistencia.has(e.fecha))
  if (chocante) {
    return `El ${chocante.fecha} tiene asistencia registrada: una clase con marcas no se puede suspender (corrige primero las marcas si de verdad no se dio).`
  }
  return null
}

// ── Cohorte de la transición (g1-10) ────────────────────────────────────────

// Niños que siguen EXACTAMENTE la referencia anterior del grupo: activos o
// baja_potencial cuyo (itinerario, nivel, fecha_inicio_nivel) coincide con
// (itinerario del grupo, nivel de la referencia, fecha_inicio de la
// referencia). Cualquier discrepancia (niño adelantado, atrasado, de otro
// itinerario o con ancla propia) lo deja FUERA: intacto.
export function cohorteDeTransicion(referenciaAnterior, itinerarioGrupo, estudiantes) {
  const it = planDe(referenciaAnterior)
  const nivelRef = Number(it?.nivel)
  const anclaRef = iso10(it?.fecha_inicio)
  if (!Number.isFinite(nivelRef) || !anclaRef || !RE_FECHA.test(anclaRef)) return []
  return (estudiantes || []).filter(
    (e) =>
      (e?.estado === 'activo' || e?.estado === 'baja_potencial') &&
      e?.itinerario === itinerarioGrupo &&
      Number(e?.nivel) === nivelRef &&
      iso10(e?.fecha_inicio_nivel) === anclaRef
  )
}

// ── Re-anclaje semántico de la fusión (g1-9) ────────────────────────────────

// Búsqueda acotada: ±420 días alrededor del ancla original cubren de sobra un
// nivel completo (19–22 semanas) más feriados y suspensiones.
const MAX_DIST_ANCLA = 420

// Al mover un niño al grupo destino, su posición semántica se conserva: si va
// por la semana de índice k en su plan de origen a la fecha efectiva `hoy`,
// el ancla nueva debe producir EL MISMO (estado, índice) en el calendario del
// destino. Se busca la ancla más CERCANA a la original; a igual distancia se
// prueba primero la más ANTIGUA (empate → la más antigua). Devuelve:
//   { ancla, antes: {estado, indice}, despues: {estado, indice} } — re-ancla;
//   { sinPlan: true, antes } — el niño no tiene posición derivable (sin ancla
//     o su grupo de origen no da plan): nada que preservar, nada se inventa;
//   null — el destino no tiene NINGUNA ancla equivalente: el caller aborta
//     con error legible (jamás se recoloca al niño en otra semana).
// origen/destino: { calendarioVersionado, excepciones, pais }.
export function reAnclaEnDestino({ ancla, nivel, hoy, origen = {}, destino = {} }, memo = null) {
  const ancla10 = iso10(ancla)
  const planOrigen = planNino(
    {
      ancla: ancla10,
      nivel,
      pais: origen.pais,
      calendarioVersionado: origen.calendarioVersionado,
      excepciones: origen.excepciones || [],
    },
    memo
  )
  const antes = posicionPlanNino(planOrigen, hoy)
  if (antes.estado === 'sin_plan') {
    return { sinPlan: true, antes: { estado: antes.estado, indice: antes.indice } }
  }
  const base = utc(ancla10)
  for (let dist = 0; dist <= MAX_DIST_ANCLA; dist++) {
    for (const signo of dist === 0 ? [0] : [-1, 1]) {
      const candidata = iso(base + signo * dist * DIA_MS)
      const planDestino = planNino(
        {
          ancla: candidata,
          nivel,
          pais: destino.pais,
          calendarioVersionado: destino.calendarioVersionado,
          excepciones: destino.excepciones || [],
        },
        memo
      )
      const despues = posicionPlanNino(planDestino, hoy)
      if (despues.estado === antes.estado && despues.indice === antes.indice) {
        return {
          ancla: candidata,
          antes: { estado: antes.estado, indice: antes.indice },
          despues: { estado: despues.estado, indice: despues.indice },
        }
      }
    }
  }
  return null
}
