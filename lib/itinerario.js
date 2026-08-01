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
// - FERIADOS de la lista del manual: no hay clases (ALOHA Panamá; Los Naranjos
//   opera con el reglamento de ALOHA Venezuela y NO usa este calendario).
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

// Feriados de la lista del manual (los de fecha fija) + los móviles del año.
// Dic 8 y 25 completan la sección DICIEMBRE de la tabla (ley panameña).
const FERIADOS_FIJOS = [[1, 1], [1, 9], [5, 1], [11, 3], [11, 5], [11, 10], [11, 28], [12, 8], [12, 25]]

export function feriadosPanama(year) {
  const out = new Set(FERIADOS_FIJOS.map(([m, d]) => `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`))
  const [pm, pd] = pascua(year)
  const domingoPascua = Date.UTC(year, pm - 1, pd)
  out.add(iso(domingoPascua - 47 * DIA_MS)) // Martes de Carnaval
  out.add(iso(domingoPascua - 2 * DIA_MS))  // Viernes Santo
  return out
}

export function esFeriadoPanama(fechaIso) {
  return feriadosPanama(Number(String(fechaIso).slice(0, 4))).has(String(fechaIso).slice(0, 10))
}

// Últimas 2 semanas de diciembre = vacaciones (manual): del 16-dic al 31-dic.
export function esVacacionDiciembre(fechaIso) {
  const [, m, d] = String(fechaIso).slice(0, 10).split('-').map(Number)
  return m === 12 && d >= 16
}

// Plantilla de semanas de un nivel (~22 semanas: tope del rango 19–22 del
// manual; el itinerario real que pase Fernando podrá recalibrarla).
export function plantillaNivel(nivel) {
  const md1TrasSemana = Number(nivel) === 1 ? 4 : 5
  const semanas = ['Inducción 1', 'Inducción 2']
  for (let s = 1; s <= 15; s++) {
    semanas.push(`Semana ${s}${s % 3 === 0 ? ' · Evaluación' : ''}`)
    if (s === md1TrasSemana) semanas.push('Mental Day 1')
    if (s === 9) semanas.push('Mental Day 2')
  }
  semanas.push('Cierre 1 · Repaso y examen', 'Cierre 2 · Examen', 'Cierre 3 · Cierre de nivel')
  return semanas
}

// Genera el itinerario de clases del nivel de un grupo.
//   fechaInicio: 'AAAA-MM-DD' (primera semana de clases)
//   dias: días de clase del grupo (1=lunes … 7=domingo), de sus horarios
//   nivel: nivel que inicia
//   conFeriados: true = ALOHA Panamá (salta feriados y vacaciones de diciembre);
//                false = reglamento propio (Los Naranjos / ALOHA Venezuela).
// Una semana calendario en la que TODAS las clases caen en feriado/vacaciones
// no consume semana de la plantilla (el contenido corre a la siguiente).
export function generarItinerario({ fechaInicio, dias, nivel, conFeriados = true }) {
  const diasClase = [...new Set((dias || []).map(Number))].filter((d) => d >= 1 && d <= 7).sort()
  if (!fechaInicio || !diasClase.length) return null
  const plantilla = plantillaNivel(nivel)
  const inicio = utc(fechaInicio)
  // Lunes de la semana calendario del inicio (getUTCDay: 0=domingo).
  const dow = new Date(inicio).getUTCDay() || 7
  let lunes = inicio - (dow - 1) * DIA_MS

  const semanas = []
  let feriadosSaltados = []
  let i = 0
  let guard = 0
  while (i < plantilla.length && guard < 120) {
    guard++
    const fechas = []
    for (const d of diasClase) {
      const t = lunes + (d - 1) * DIA_MS
      if (t < inicio) continue
      const f = iso(t)
      if (conFeriados && (esFeriadoPanama(f) || esVacacionDiciembre(f))) {
        feriadosSaltados.push(f)
        continue
      }
      fechas.push(f)
    }
    if (fechas.length) {
      semanas.push({ etiqueta: plantilla[i], fechas })
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
    con_feriados: !!conFeriados,
    generado_at: new Date().toISOString(),
  }
}
