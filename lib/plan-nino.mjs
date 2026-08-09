// Plan por niño (R3, g1-13) — derivación BATCH memoizada. Cálculo puro, sin BD.
//
// La planificación va POR NIÑO: el ancla es `estudiantes.fecha_inicio_nivel`
// (su comienzo de nivel) y el plan se deriva AL VUELO — nunca se persiste por
// niño; el plan del grupo queda solo como referencia del aula. Hay UN solo
// generador (`generarItinerarioVersionado`) para los cuatro consumidores:
// referencia del grupo, plan por niño, columnas del coach y validación de
// asistencia. El calendario es la lista de versiones `{vigente_desde, dias}`
// del grupo (R2b): un cambio de horario post-inicio JAMÁS reescribe el pasado
// de los planes derivados.
//
// Memo request-scoped por (ancla, nivel, pais, fingerprint del calendario
// versionado, excepciones normalizadas): cada niño se enriquece UNA vez por
// carga y los que comparten clave comparten el MISMO plan (referencia física).
//
// Estados explícitos: por_iniciar | en_curso | cerrado | sin_plan — ningún
// consumidor interpreta el -1 de semanaEnCurso. El motor es DETERMINISTA: sin
// generado_at (ese sello se agrega solo al persistir la referencia del grupo,
// app/actions/grupos.js). Un grupo sin horario conserva el ancla del niño pero
// entrega `sin_plan`: jamás se inventa fecha u horario (g1-2).

import {
  plantillaNivel,
  normalizarExcepciones,
  esFeriadoPais,
  esVacacionDiciembre,
  semanaEnCurso,
  versionesDe,
} from './itinerario.js'

const DIA_MS = 24 * 60 * 60 * 1000
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/

// Una fecha de la BD llega como Date (driver de Neon) o como string ISO.
// SIEMPRE normalizar a 'AAAA-MM-DD' antes de comparar (lección de fechaIso10,
// lib/operaciones.js; local aquí para que el módulo siga siendo puro).
const iso10 = (v) => {
  if (!v) return null
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)
}

const iso = (t) => new Date(t).toISOString().slice(0, 10)
const utc = (isoStr) => {
  const [y, m, d] = String(isoStr).slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

// itinerario_clases llega como objeto (JSONB) o, defensivamente, como string
// (mismo criterio que lib/llenado.mjs).
const itinerarioDe = (grupo) => {
  const it = grupo?.itinerario_clases
  if (it == null) return null
  if (typeof it === 'string') {
    try { return JSON.parse(it) } catch { return null }
  }
  return it
}

// ── Calendario versionado ────────────────────────────────────────────────────

// Normaliza a [{ vigente_desde: 'AAAA-MM-DD'|null, dias: [1..7] }] ordenado por
// vigencia (null = "desde siempre", va primero). Versiones sin días válidos se
// descartan; misma vigencia repetida → la ÚLTIMA escrita gana.
export function normalizarCalendarioVersionado(entrada) {
  const lista = Array.isArray(entrada) ? entrada : []
  const out = []
  for (const v of lista) {
    const dias = [...new Set((v?.dias || []).map(Number))].filter((d) => d >= 1 && d <= 7).sort()
    if (!dias.length) continue
    const desde = v?.vigente_desde == null ? null : iso10(v.vigente_desde)
    if (desde != null && !RE_FECHA.test(desde)) continue
    const repetida = out.findIndex((x) => x.vigente_desde === desde)
    if (repetida >= 0) out.splice(repetida, 1)
    out.push({ vigente_desde: desde, dias })
  }
  return out.sort((a, b) => String(a.vigente_desde ?? '').localeCompare(String(b.vigente_desde ?? '')))
}

// Parte de la clave del memo: dos calendarios con las mismas vigencias y los
// mismos días producen el mismo plan, vengan de donde vengan.
export function fingerprintCalendarioVersionado(calendarioVersionado) {
  return JSON.stringify(
    normalizarCalendarioVersionado(calendarioVersionado).map((v) => [v.vigente_desde, v.dias])
  )
}

// Días de clase vigentes en una fecha: la versión más reciente cuya vigencia
// no es posterior. Antes de la primera vigencia rige la PRIMERA versión (un
// ancla anterior al plan vigente del grupo no se queda sin calendario).
function diasVigentesEn(versiones, fecha) {
  let vigente = null
  for (const v of versiones) {
    if (v.vigente_desde == null || v.vigente_desde <= fecha) vigente = v
    else break
  }
  return (vigente || versiones[0]).dias
}

// El calendario versionado de un grupo, listo para el generador:
//   1. versiones[] de su itinerario de referencia (o la versión 1 inferida de
//      las fechas ya generadas — versionesDe, lib/itinerario.js).
//   2. Sin referencia todavía: los días de sus horarios rigen "desde siempre".
//   3. Sin horario → [] (los consumidores reciben sin_plan; nada se inventa).
export function calendarioVersionadoDe(grupo) {
  const it = itinerarioDe(grupo)
  const deReferencia = it ? versionesDe(it) : []
  if (deReferencia.length) return deReferencia
  const dias = [...new Set((grupo?.horarios || []).map((h) => Number(h?.dia)))]
    .filter((d) => d >= 1 && d <= 7)
    .sort()
  return dias.length ? [{ vigente_desde: null, dias }] : []
}

// ── El generador único (g1-13) ───────────────────────────────────────────────

// Mismo paseo que generarItinerario (lib/itinerario.js) pero con el calendario
// VERSIONADO: cada fecha consulta los días de clase vigentes ESE día, así el
// tramo previo a un cambio de horario conserva sus fechas y solo el sufijo usa
// el patrón nuevo (la semana N sigue siendo la semana N). Determinista: sin
// generado_at. Devuelve null si falta ancla o no hay calendario usable.
//   pais: 'PA' (default) | 'VE' — define qué feriados se saltan; otro valor =
//   sin feriados (compatibilidad con generarItinerario).
export function generarItinerarioVersionado({ fechaInicio, calendarioVersionado, nivel, pais = 'PA', excepciones = [] }) {
  const inicio10 = iso10(fechaInicio)
  const versiones = normalizarCalendarioVersionado(calendarioVersionado)
  if (!inicio10 || !RE_FECHA.test(inicio10) || !versiones.length) return null

  const paisCal = pais === 'VE' || pais === 'PA' ? pais : null
  const plantilla = plantillaNivel(nivel)
  const exc = normalizarExcepciones(excepciones)
  const excPorFecha = new Map(exc.map((e) => [e.fecha, e.motivo]))
  const inicio = utc(inicio10)
  const dow = new Date(inicio).getUTCDay() || 7
  let lunes = inicio - (dow - 1) * DIA_MS

  const semanas = []
  const feriadosSaltados = []
  const suspendidas = []
  let pendientes = []
  let i = 0
  let guard = 0
  // Cota: 22 semanas de plantilla + margen para feriados y suspensiones (misma
  // cota que el paseo de generarItinerario).
  while (i < plantilla.length && guard < 200) {
    guard++
    const fechas = []
    for (let d = 1; d <= 7; d++) {
      const t = lunes + (d - 1) * DIA_MS
      if (t < inicio) continue
      const f = iso(t)
      if (!diasVigentesEn(versiones, f).includes(d)) continue
      if (excPorFecha.has(f)) {
        const motivo = excPorFecha.get(f)
        suspendidas.push({ fecha: f, motivo })
        pendientes.push({ fecha: f, motivo: motivo || 'Clase suspendida', tipo: 'suspendida' })
        continue
      }
      if (paisCal && (esFeriadoPais(f, paisCal) || esVacacionDiciembre(f))) {
        feriadosSaltados.push(f)
        pendientes.push({ fecha: f, motivo: esVacacionDiciembre(f) ? 'Vacaciones de diciembre' : 'Feriado', tipo: 'feriado' })
        continue
      }
      fechas.push(f)
    }
    if (fechas.length) {
      semanas.push({ ...plantilla[i], fechas, saltadas: pendientes })
      pendientes = []
      i++
    }
    lunes += 7 * DIA_MS
  }
  const fechaCierre = semanas.length ? semanas[semanas.length - 1].fechas.slice(-1)[0] : null
  const semanasDescanso = Number(nivel) % 2 === 0 ? 1 : 0
  const inicioSiguiente = fechaCierre ? iso(utc(fechaCierre) + (1 + semanasDescanso) * 7 * DIA_MS) : null

  return {
    nivel: Number(nivel) || 1,
    fecha_inicio: inicio10,
    semanas,
    fecha_cierre_estimada: fechaCierre,
    inicio_siguiente_nivel: inicioSiguiente,
    feriados_saltados: [...new Set(feriadosSaltados)],
    excepciones: exc,
    clases_suspendidas: suspendidas,
    pais: paisCal,
    con_feriados: !!paisCal,
    versiones,
  }
}

// ── Memo request-scoped ──────────────────────────────────────────────────────

export function crearMemoPlanes() {
  return new Map()
}

// Plan derivado de UN niño (ancla en su comienzo de nivel). Con memo, los
// niños que comparten (ancla, nivel, pais, calendario, excepciones) comparten
// el MISMO objeto plan — se calcula una sola vez por carga. null = sin plan
// derivable (sin ancla, nivel inválido o calendario vacío); el null también se
// memoiza para no reintentar la misma clave.
export function planNino({ ancla, nivel, pais = 'PA', calendarioVersionado, excepciones = [] }, memo = null) {
  const ancla10 = iso10(ancla)
  const nivelNum = Number(nivel)
  if (!ancla10 || !RE_FECHA.test(ancla10) || !Number.isFinite(nivelNum) || nivelNum < 1) return null
  const exc = normalizarExcepciones(excepciones)
  const fpCalendario = fingerprintCalendarioVersionado(calendarioVersionado)
  const key = `${ancla10}|${nivelNum}|${pais}|${fpCalendario}|${JSON.stringify(exc)}`
  if (memo?.has(key)) return memo.get(key)
  const plan = generarItinerarioVersionado({
    fechaInicio: ancla10,
    calendarioVersionado,
    nivel: nivelNum,
    pais,
    excepciones: exc,
  })
  if (memo) memo.set(key, plan)
  return plan
}

// ── Posición, cierre y estados ───────────────────────────────────────────────

const resumenSemana = (s) => (s ? { etiqueta: s.etiqueta, tipo: s.tipo, corto: s.corto } : null)

// Posición semántica del niño en su plan a la fecha `hoy` (iso10 Panamá).
// → { estado, indice, semana: {etiqueta, tipo, corto} | null }
//   por_iniciar → indice 0 (arrancará por la primera semana);
//   cerrado → indice de la última semana (NUNCA se expone el -1);
//   sin_plan → sin índice ni semana (también si falta `hoy`: sin fecha de
//   negocio no hay posición — nada se adivina).
export function posicionPlanNino(plan, hoy) {
  const semanas = plan?.semanas || []
  const h = iso10(hoy)
  if (!semanas.length || !h) return { estado: 'sin_plan', indice: null, semana: null }
  const primera = semanas[0]?.fechas?.[0] || null
  if (primera && h < primera) {
    return { estado: 'por_iniciar', indice: 0, semana: resumenSemana(semanas[0]) }
  }
  const indice = semanaEnCurso(plan, h)
  if (indice === -1) {
    return { estado: 'cerrado', indice: semanas.length - 1, semana: resumenSemana(semanas[semanas.length - 1]) }
  }
  return { estado: 'en_curso', indice, semana: resumenSemana(semanas[indice]) }
}

// Cierre efectivo del nivel del niño (g1-11): override manual ?? derivado del
// plan, calculado AL VUELO — jamás se persiste el automático.
// → { fecha, origen: 'manual' | 'derivado' | null }
export function cierreEfectivo({ override, plan } = {}) {
  const manual = iso10(override)
  if (manual && RE_FECHA.test(manual)) return { fecha: manual, origen: 'manual' }
  const derivado = iso10(plan?.fecha_cierre_estimada)
  if (derivado) return { fecha: derivado, origen: 'derivado' }
  return { fecha: null, origen: null }
}

// ── Enriquecimiento batch (una pasada) ───────────────────────────────────────

// Enriquece cada niño UNA vez por carga con su plan derivado:
//   { ...nino, plan: { estado, ancla, indiceSemana, semana, cierre, itinerario } }
// `grupos` acepta un grupo, una lista o nada; el niño sin grupo o sin ancla
// queda en sin_plan. `hoy` es la fecha del negocio (hoyISO Panamá — aquí llega
// como parámetro: el módulo no mira el reloj). `pais` es el default cuando el
// grupo no trae el suyo. `memo` permite compartir el cache entre varias
// llamadas del mismo request (operaciones, coach, fusiones — antes del bucle
// de pares); sin él se crea uno local a la pasada.
export function enriquecerNinos(ninos, grupos, { hoy, pais = 'PA', memo = null } = {}) {
  const lista = Array.isArray(grupos) ? grupos : grupos ? [grupos] : []
  const porId = new Map(lista.map((g) => [String(g.id), g]))
  const memoPlanes = memo || crearMemoPlanes()
  // El calendario de cada grupo se normaliza una sola vez por pasada.
  const calendarios = new Map()
  const calendarioDe = (grupo) => {
    const key = String(grupo.id)
    if (!calendarios.has(key)) calendarios.set(key, calendarioVersionadoDe(grupo))
    return calendarios.get(key)
  }

  return (ninos || []).map((nino) => {
    const grupo = nino?.grupo_id == null ? null : porId.get(String(nino.grupo_id)) || null
    const paisGrupo = grupo?.pais === 'VE' || grupo?.pais === 'PA' ? grupo.pais : pais
    const it = grupo ? itinerarioDe(grupo) : null
    const plan = grupo
      ? planNino({
          ancla: nino?.fecha_inicio_nivel,
          nivel: nino?.nivel,
          pais: paisGrupo,
          calendarioVersionado: calendarioDe(grupo),
          excepciones: it?.excepciones || [],
        }, memoPlanes)
      : null
    const posicion = posicionPlanNino(plan, hoy)
    const cierre = cierreEfectivo({ override: nino?.fecha_cierre_nivel, plan })
    return {
      ...nino,
      plan: {
        estado: posicion.estado,
        ancla: iso10(nino?.fecha_inicio_nivel),
        indiceSemana: posicion.indice,
        semana: posicion.semana,
        cierre,
        itinerario: plan,
      },
    }
  })
}
