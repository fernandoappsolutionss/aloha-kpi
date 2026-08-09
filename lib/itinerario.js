// Itinerario de clases de un nivel — reglamento del manual ALOHA Panamá.
// Cálculo puro, sin BD.
//
// Reglas del manual:
// - Un nivel dura ~5 meses (19–22 semanas de clases según calendario).
// - Las 2 PRIMERAS semanas son de INDUCCIÓN (permiten incorporar niños nuevos;
//   TINY acepta nuevos hasta la semana 4 del libro, KIDS solo hasta la 2).
// - Evaluaciones completas cada 3 semanas de trabajo.
// - MENTAL DAY 1 después de la semana 5 del libro (nivel 1: después de la 4);
//   MENTAL DAY 2 después de la semana 9.
// - El examen y cierre de nivel son 3 CLASES (repaso+examen, examen, cierre).
// - FERIADOS: no hay clases en las fechas patrias del PAÍS del centro
//   (Panamá o Venezuela — Los Naranjos usa el calendario venezolano).
// - DICIEMBRE: las últimas 2 semanas son vacaciones (desde el 16-dic).
// - CICLOS de 2 niveles: SIN semana de vacaciones dentro del ciclo (1→2);
//   al terminar el ciclo (tras nivel PAR) hay 1 semana de vacaciones antes
//   del siguiente nivel.

const DIA_MS = 24 * 60 * 60 * 1000

const iso = (t) => new Date(t).toISOString().slice(0, 10)
const utc = (isoStr) => {
  const [y, m, d] = String(isoStr).slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

// Domingo de Pascua (algoritmo de Meeus/Jones/Butcher) → [mes, día].
function pascua(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  return [Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1]
}

// Fechas patrias y feriados por PAÍS. Cada centro declara su país (PA/VE) y
// su calendario salta las fechas patrias correspondientes.
// PANAMÁ: fiestas nacionales (incluye el mes de la patria completo: 3, 4, 5,
// 10 y 28 de noviembre) + la práctica real de los centros: la semana de
// carnaval se pierde lunes y martes, y en Semana Santa no hay clases viernes
// ni sábado (así lo marcan los cuadernos de las coaches).
const FERIADOS_FIJOS_PA = [[1, 1], [1, 9], [5, 1], [11, 3], [11, 4], [11, 5], [11, 10], [11, 28], [12, 8], [12, 25]]
// VENEZUELA: fechas patrias y feriados nacionales (Los Naranjos y cualquier
// centro ALOHA Venezuela): 19-abr, 1-may, 24-jun (Carabobo), 5-jul
// (Independencia), 24-jul (Natalicio del Libertador), 12-oct, 24/25/31-dic.
const FERIADOS_FIJOS_VE = [[1, 1], [4, 19], [5, 1], [6, 24], [7, 5], [7, 24], [10, 12], [12, 24], [12, 25], [12, 31]]

const cacheFeriados = new Map()
export function feriadosPais(year, pais = 'PA') {
  const key = `${pais}-${year}`
  if (cacheFeriados.has(key)) return cacheFeriados.get(key)
  const fijos = pais === 'VE' ? FERIADOS_FIJOS_VE : FERIADOS_FIJOS_PA
  const out = new Set(fijos.map(([m, d]) => `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`))
  const [pm, pd] = pascua(year)
  const domingoPascua = Date.UTC(year, pm - 1, pd)
  out.add(iso(domingoPascua - 48 * DIA_MS)) // Lunes de Carnaval
  out.add(iso(domingoPascua - 47 * DIA_MS)) // Martes de Carnaval
  out.add(iso(domingoPascua - 2 * DIA_MS))  // Viernes Santo
  if (pais === 'VE') out.add(iso(domingoPascua - 3 * DIA_MS)) // Jueves Santo
  else out.add(iso(domingoPascua - 1 * DIA_MS))               // Sábado Santo (práctica de los centros)
  cacheFeriados.set(key, out)
  return out
}

export function esFeriadoPais(fechaIso, pais = 'PA') {
  return feriadosPais(Number(String(fechaIso).slice(0, 4)), pais).has(String(fechaIso).slice(0, 10))
}

// Compatibilidad con llamadas existentes (calendario de Panamá).
export function feriadosPanama(year) {
  return feriadosPais(year, 'PA')
}

export function esFeriadoPanama(fechaIso) {
  return esFeriadoPais(fechaIso, 'PA')
}

// Últimas 2 semanas de diciembre = vacaciones (manual): del 16-dic al 31-dic.
export function esVacacionDiciembre(fechaIso) {
  const [, m, d] = String(fechaIso).slice(0, 10).split('-').map(Number)
  return m === 12 && d >= 16
}

// Tipos de semana (para colorear y leer el itinerario de un vistazo).
export const TIPOS_SEMANA = {
  induccion: { label: 'Inducción', desc: 'Se pueden incorporar niños nuevos' },
  clase: { label: 'Clase', desc: 'Semana de trabajo del libro' },
  evaluacion: { label: 'Repaso / Evaluación', desc: 'Repaso con evaluación completa (cada ~3 semanas)' },
  mental: { label: 'Mental Day', desc: 'Día de cálculo mental' },
  cierre: { label: 'Cierre', desc: 'Repaso de examen, examen y cierre de nivel' },
}

// Plantilla de semanas de un nivel, calibrada con la PLANIFICACIÓN REAL de las
// coaches (cuaderno de Anclas Mall, 2026): INT → S1–S11 con repasos R1 (tras
// S3) y R2 (tras S6) y Mental Days (tras S4 y S8) → R.E → Examen → Cierre.
// 19 semanas (20 en nivel 1, que lleva la doble inducción del manual) — dentro
// del rango 19–22 del manual una vez que los feriados corren el plan. Lo que
// se ajusta por grupo son la fecha de inicio y las excepciones.
// Cada semana: { etiqueta, tipo, corto } — `corto` es la etiqueta de la línea
// de tiempo (INT, 7, MD1, R.E, C).
export function plantillaNivel(nivel) {
  const n = Number(nivel) || 1
  const semanas = []
  // Manual: 2 semanas de inducción al ENTRAR al programa; entre niveles la
  // práctica real es 1 semana INT.
  if (n === 1) {
    semanas.push({ etiqueta: 'Inducción 1', tipo: 'induccion', corto: 'I1' })
    semanas.push({ etiqueta: 'Inducción 2', tipo: 'induccion', corto: 'I2' })
  } else {
    semanas.push({ etiqueta: 'Inducción', tipo: 'induccion', corto: 'INT' })
  }
  for (let s = 1; s <= 11; s++) {
    semanas.push({ etiqueta: `Semana ${s}`, tipo: 'clase', corto: String(s) })
    if (s === 3) semanas.push({ etiqueta: 'Repaso 1 · Evaluación', tipo: 'evaluacion', corto: 'R1' })
    if (s === 4) semanas.push({ etiqueta: 'Mental Day 1', tipo: 'mental', corto: 'MD1' })
    if (s === 6) semanas.push({ etiqueta: 'Repaso 2 · Evaluación', tipo: 'evaluacion', corto: 'R2' })
    if (s === 8) semanas.push({ etiqueta: 'Mental Day 2', tipo: 'mental', corto: 'MD2' })
  }
  semanas.push(
    { etiqueta: 'Repaso de examen', tipo: 'cierre', corto: 'R.E' },
    { etiqueta: 'Examen', tipo: 'cierre', corto: 'E' },
    { etiqueta: 'Cierre de nivel', tipo: 'cierre', corto: 'C' },
  )
  return semanas
}

// Normaliza las excepciones del grupo (clases que NO se dieron: coach enfermo,
// feriado local, suspensión del centro). Cada una corre el plan una clase.
export function normalizarExcepciones(excepciones) {
  const vistas = new Set()
  const out = []
  for (const e of excepciones || []) {
    const fecha = String(e?.fecha || '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || vistas.has(fecha)) continue
    vistas.add(fecha)
    out.push({ fecha, motivo: String(e?.motivo || '').trim().slice(0, 80) })
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// Genera el itinerario de clases del nivel de un grupo.
//   fechaInicio: 'AAAA-MM-DD' (primera semana de clases)
//   dias: días de clase del grupo (1=lunes … 7=domingo), de sus horarios
//   nivel: nivel que inicia
//   pais: 'PA' (fechas patrias de Panamá) o 'VE' (fechas patrias de Venezuela,
//         p. ej. Los Naranjos). Define qué feriados se saltan.
//   conFeriados: compatibilidad — false y sin pais = no saltar ningún feriado.
//   excepciones: [{ fecha, motivo }] clases que NO se dieron en ESE grupo
//                (coach enfermo, feriado local, suspensión). Corren el plan.
// Una semana calendario en la que TODAS las clases caen en feriado/vacaciones/
// excepción no consume semana de la plantilla (el contenido corre a la siguiente).
export function generarItinerario({ fechaInicio, dias, nivel, pais = null, conFeriados = true, excepciones = [] }) {
  const paisCal = pais === 'VE' || pais === 'PA' ? pais : conFeriados ? 'PA' : null
  const diasClase = [...new Set((dias || []).map(Number))].filter((d) => d >= 1 && d <= 7).sort()
  if (!fechaInicio || !diasClase.length) return null
  const plantilla = plantillaNivel(nivel)
  const exc = normalizarExcepciones(excepciones)
  const excPorFecha = new Map(exc.map((e) => [e.fecha, e.motivo]))
  const inicio = utc(fechaInicio)
  // Lunes de la semana calendario del inicio (getUTCDay: 0=domingo).
  const dow = new Date(inicio).getUTCDay() || 7
  let lunes = inicio - (dow - 1) * DIA_MS

  const semanas = []
  const feriadosSaltados = []
  const suspendidas = []
  // Días sin clase que aún no se han podido mostrar: se cuelgan de la próxima
  // semana con clases para que en la agenda se vea POR QUÉ se corrió el plan.
  let pendientes = []
  let i = 0
  let guard = 0
  // Cota: 22 semanas de plantilla + margen para feriados y suspensiones.
  while (i < plantilla.length && guard < 200) {
    guard++
    const fechas = []
    for (const d of diasClase) {
      const t = lunes + (d - 1) * DIA_MS
      if (t < inicio) continue
      const f = iso(t)
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
  // Fin de ciclo tras nivel PAR → 1 semana de vacaciones antes del siguiente.
  const semanasDescanso = Number(nivel) % 2 === 0 ? 1 : 0
  const inicioSiguiente = fechaCierre ? iso(utc(fechaCierre) + (1 + semanasDescanso) * 7 * DIA_MS) : null

  return {
    nivel: Number(nivel) || 1,
    fecha_inicio: String(fechaInicio).slice(0, 10),
    semanas,
    fecha_cierre_estimada: fechaCierre,
    inicio_siguiente_nivel: inicioSiguiente,
    feriados_saltados: [...new Set(feriadosSaltados)],
    excepciones: exc,
    clases_suspendidas: suspendidas,
    pais: paisCal,
    con_feriados: !!paisCal,
    // Calendario versionado (R2b): la versión 1 nace con el plan. `semanas[]`
    // sigue siendo la verdad APLANADA; versiones[] registra qué días de clase
    // rigieron desde cuándo (un cambio post-inicio agrega la siguiente).
    versiones: [{ vigente_desde: String(fechaInicio).slice(0, 10), dias: diasClase }],
    // Sin generado_at: el motor es DETERMINISTA (g1-13). El sello de cuándo se
    // generó se agrega SOLO al persistir la referencia del grupo
    // (regenerarItinerarioClases, app/actions/grupos.js).
  }
}

// ---------------------------------------------------------------------------
// Calendario versionado (R2b, g1-7): un cambio de horario POST-INICIO no
// reescribe el pasado. El itinerario gana `versiones[] = [{vigente_desde,
// dias}]` sin romper la forma actual: `semanas[]` sigue siendo la verdad
// aplanada del aula (pasado conservado + sufijo futuro regenerado), y la
// semana N de la plantilla sigue siendo la semana N — solo cambian sus
// fechas futuras.

// Días de clase de un itinerario legado (sin versiones[]): se infieren de las
// fechas ya generadas — determinista y suficiente para sembrar la versión 1.
function inferirDias(itinerario) {
  const dias = new Set()
  for (const s of itinerario?.semanas || []) {
    for (const f of s.fechas || []) {
      dias.add(new Date(utc(f)).getUTCDay() || 7)
    }
  }
  return [...dias].sort()
}

// Lista normalizada de versiones del calendario, ordenada por vigencia.
// Itinerarios previos a R2b no traen versiones[]: se siembra la versión 1 con
// la fecha de inicio del plan y los días inferidos de sus propias fechas.
export function versionesDe(itinerario) {
  const crudas = Array.isArray(itinerario?.versiones) ? itinerario.versiones : []
  const out = crudas
    .map((v) => ({
      vigente_desde: String(v?.vigente_desde || '').slice(0, 10),
      dias: [...new Set((v?.dias || []).map(Number))].filter((d) => d >= 1 && d <= 7).sort(),
    }))
    .filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v.vigente_desde) && v.dias.length)
    .sort((a, b) => a.vigente_desde.localeCompare(b.vigente_desde))
  if (out.length) return out
  const dias = inferirDias(itinerario)
  const desde = String(itinerario?.fecha_inicio || '').slice(0, 10)
  return dias.length && /^\d{4}-\d{2}-\d{2}$/.test(desde) ? [{ vigente_desde: desde, dias }] : []
}

// Regenera SOLO el sufijo futuro del itinerario cuando el horario cambia a
// mitad de nivel. Contrato (R2b):
// - `desde` es el primer día en que rige el horario nuevo (post-inicio: MAÑANA
//   Panamá — lo decide el caller, esta función es pura).
// - Se CONSERVA toda fecha < `desde` y toda fecha con asistencia registrada
//   (el caller pasa el set `fechasConAsistencia`; puede incluir fechas futuras
//   marcadas por adelantado — también se respetan).
// - El índice de contenido es estable: mismas semanas, mismas etiquetas; la
//   semana de corte arrastra sus clases ya dadas y completa con el patrón
//   nuevo; las siguientes se regeneran completas.
// - versiones[] descarta las vigencias >= `desde` (supersedidas) y agrega la
//   nueva al final. Devuelve el itinerario nuevo o null si el input no da.
export function regenerarSufijo(itinerario, { desde, diasNuevos, excepciones = [], fechasConAsistencia } = {}) {
  const semanasViejas = itinerario?.semanas || []
  const desde10 = String(desde || '').slice(0, 10)
  const dias = [...new Set((diasNuevos || []).map(Number))].filter((d) => d >= 1 && d <= 7).sort()
  if (!semanasViejas.length || !/^\d{4}-\d{2}-\d{2}$/.test(desde10) || !dias.length) return null

  const asistencia = fechasConAsistencia instanceof Set ? fechasConAsistencia : new Set(fechasConAsistencia || [])
  const protegida = (f) => f < desde10 || asistencia.has(f)
  const paisCal = itinerario.pais === 'VE' || itinerario.pais === 'PA' ? itinerario.pais : null
  const exc = normalizarExcepciones(excepciones)
  const excPorFecha = new Map(exc.map((e) => [e.fecha, e.motivo]))

  // Partición: qué fechas de cada semana sobreviven (pasado o asistencia).
  const conservadas = semanasViejas.map((s) => (s.fechas || []).filter(protegida))
  const globalConservadas = new Set(conservadas.flat())
  const idxCorte = semanasViejas.findIndex((s, i) => (s.fechas || []).length !== conservadas[i].length)

  const versiones = versionesDe(itinerario)
    .filter((v) => v.vigente_desde < desde10)
    .concat([{ vigente_desde: desde10, dias }])

  if (idxCorte === -1) {
    // Nada futuro que mover: el cambio solo queda registrado en versiones[]
    // (regirá las clases que aún no existen, p. ej. el siguiente nivel).
    return { ...itinerario, excepciones: exc, versiones }
  }

  // Semanas 100% protegidas: intactas, con sus fechas y sus saltadas.
  const semanas = semanasViejas.slice(0, idxCorte).map((s) => ({ ...s }))
  const feriadosSaltados = (itinerario.feriados_saltados || []).filter((f) => f < desde10)
  const suspendidas = (itinerario.clases_suspendidas || []).filter((s) => s?.fecha < desde10)

  // El paseo arranca en la semana calendario de `desde` (el horario nuevo
  // jamás rige antes) y llena la plantilla desde la semana de corte: mismo
  // esquema de generarItinerario — una semana calendario con clases consume
  // una semana de contenido; feriados y excepciones corren el plan.
  const tDesde = utc(desde10)
  const dowDesde = new Date(tDesde).getUTCDay() || 7
  let lunes = tDesde - (dowDesde - 1) * DIA_MS
  let pendientes = []
  let i = idxCorte
  let guard = 0
  while (i < semanasViejas.length && guard < 300) {
    guard++
    const fechas = []
    for (const d of dias) {
      const t = lunes + (d - 1) * DIA_MS
      if (t < tDesde) continue
      const f = iso(t)
      if (globalConservadas.has(f)) continue // ya vive en el plan conservado
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
      const vieja = semanasViejas[i]
      // La semana de corte conserva las saltadas de su tramo ya vivido; las
      // regeneradas estrenan las suyas.
      const saltadasViejas = i === idxCorte ? (vieja.saltadas || []).filter((s) => s?.fecha < desde10) : []
      semanas.push({
        etiqueta: vieja.etiqueta,
        tipo: vieja.tipo,
        corto: vieja.corto,
        fechas: [...conservadas[i], ...fechas].sort(),
        saltadas: [...saltadasViejas, ...pendientes],
      })
      pendientes = []
      i++
    }
    lunes += 7 * DIA_MS
  }
  // Si el guard se agota (≈6 años de calendario, imposible en la práctica) las
  // semanas restantes conservan al menos sus fechas protegidas: el índice de
  // contenido NUNCA se acorta.
  for (; i < semanasViejas.length; i++) {
    const vieja = semanasViejas[i]
    semanas.push({ etiqueta: vieja.etiqueta, tipo: vieja.tipo, corto: vieja.corto, fechas: [...conservadas[i]], saltadas: [] })
  }

  let fechaCierre = null
  for (let k = semanas.length - 1; k >= 0 && !fechaCierre; k--) {
    fechaCierre = semanas[k].fechas?.slice(-1)[0] || null
  }
  const semanasDescanso = Number(itinerario.nivel) % 2 === 0 ? 1 : 0
  const inicioSiguiente = fechaCierre ? iso(utc(fechaCierre) + (1 + semanasDescanso) * 7 * DIA_MS) : null

  return {
    ...itinerario,
    semanas,
    fecha_cierre_estimada: fechaCierre,
    inicio_siguiente_nivel: inicioSiguiente,
    feriados_saltados: [...new Set(feriadosSaltados)],
    excepciones: exc,
    clases_suspendidas: suspendidas,
    versiones,
  }
}

// Índice de la semana en curso (la primera cuya última clase aún no pasa).
// -1 = el nivel ya cerró. Recibe hoy en AAAA-MM-DD (hora de Panamá).
export function semanaEnCurso(itinerario, hoy) {
  const semanas = itinerario?.semanas || []
  return semanas.findIndex((s) => (s.fechas?.slice(-1)[0] || '') >= hoy)
}
