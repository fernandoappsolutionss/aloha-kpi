// Período (trimestre / año) — dinámico según la fecha actual.
// Sin efectos en import: todas las funciones se evalúan al llamarse.

export const Q_MONTHS = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] }
export const Q_MESES = { 1: 'Ene–Mar', 2: 'Abr–Jun', 3: 'Jul–Sep', 4: 'Oct–Dic' }

// Trimestre y año del día de hoy.
export function getCurrentPeriod() {
  const d = new Date()
  return { year: d.getFullYear(), quarter: Math.floor(d.getMonth() / 3) + 1 }
}

export function quarterMonths(quarter) {
  return Q_MONTHS[quarter] || [1, 2, 3]
}

export function periodLabel(year, quarter) {
  return `Q${quarter} ${year}`
}

// Lectura/escritura del período elegido (solo cliente; default = trimestre actual).
export function readStoredPeriod() {
  try {
    const s = JSON.parse(localStorage.getItem('ts_period'))
    if (s && s.year && s.quarter) return { year: Number(s.year), quarter: Number(s.quarter) }
  } catch {}
  return getCurrentPeriod()
}

export function writeStoredPeriod(p) {
  try { localStorage.setItem('ts_period', JSON.stringify(p)) } catch {}
}

// ── Filtro del Panel general: Trimestre o Mensual (rango de meses) ──────────
const MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Suma `delta` meses a (year, month) y devuelve {year, month}.
export function addMonths(year, month, delta) {
  const idx = year * 12 + (month - 1) + delta
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 }
}

// Cantidad de meses (inclusive) entre dos extremos.
export function monthsSpan(fromY, fromM, toY, toM) {
  return (toY * 12 + (toM - 1)) - (fromY * 12 + (fromM - 1)) + 1
}

// Etiqueta legible de un rango de meses.
export function rangeLabel(fromY, fromM, toY, toM) {
  if (fromY === toY && fromM === toM) return `${MES_CORTO[fromM - 1]} ${fromY}`
  if (fromY === toY) return `${MES_CORTO[fromM - 1]}–${MES_CORTO[toM - 1]} ${fromY}`
  return `${MES_CORTO[fromM - 1]} '${String(fromY).slice(2)} – ${MES_CORTO[toM - 1]} '${String(toY).slice(2)}`
}

// Resuelve el filtro del panel a un rango de meses + su comparativa (rango
// previo equivalente, igual de largo e inmediatamente anterior).
//   { mode:'trimestre', year, quarter }
//   { mode:'mensual', preset:'12m'|'36m'|'anio'|'ytd'|'prev'|'custom', year, from, to }
//     '36m'  = últimos 3 años (36 meses hasta el mes en curso)
//     'anio' = un año completo (enero–diciembre del año elegido en `year`)
export function resolvePanelRange(f) {
  const now = new Date(), cy = now.getFullYear(), cm = now.getMonth() + 1
  let fromY, fromM, toY, toM, label

  if (!f || f.mode === 'trimestre') {
    const year = f?.year || cy
    const q = f?.quarter || (Math.floor((cm - 1) / 3) + 1)
    const qm = Q_MONTHS[q] || [1, 2, 3]
    return {
      fromY: year, fromM: qm[0], toY: year, toM: qm[2], label: `Q${q} ${year}`,
      prev: { fromY: year - 1, fromM: qm[0], toY: year - 1, toM: qm[2] }, prevLabel: `Q${q} ${year - 1}`,
    }
  }

  const preset = f.preset || '12m'
  if (preset === 'ytd') { fromY = cy; fromM = 1; toY = cy; toM = cm; label = `${cy}` }
  else if (preset === 'prev') { fromY = cy - 1; fromM = 1; toY = cy - 1; toM = 12; label = `${cy - 1}` }
  else if (preset === 'anio') {
    const y = Number(f.year) || cy
    fromY = y; fromM = 1; toY = y; toM = 12; label = `${y}`
  } else if (preset === '36m') {
    const s = addMonths(cy, cm, -35)
    fromY = s.year; fromM = s.month; toY = cy; toM = cm; label = 'Últimos 3 años'
  } else if (preset === 'custom' && f.from && f.to) {
    const [fy, fm] = f.from.split('-').map(Number), [ty, tm] = f.to.split('-').map(Number)
    fromY = fy; fromM = fm; toY = ty; toM = tm; label = rangeLabel(fromY, fromM, toY, toM)
  } else { const s = addMonths(cy, cm, -11); fromY = s.year; fromM = s.month; toY = cy; toM = cm; label = 'Últimos 12 meses' }

  // Comparativa: "Este año" se compara con los mismos meses del año pasado
  // (interanual); el resto, con el rango equivalente inmediatamente anterior.
  let prev, prevLabel
  if (preset === 'ytd') {
    prev = { fromY: cy - 1, fromM: 1, toY: cy - 1, toM }
    prevLabel = `${cy - 1}`
  } else if (preset === 'anio') {
    prev = { fromY: fromY - 1, fromM: 1, toY: fromY - 1, toM: 12 }
    prevLabel = `${fromY - 1}`
  } else {
    const span = monthsSpan(fromY, fromM, toY, toM)
    const ps = addMonths(fromY, fromM, -span), pe = addMonths(toY, toM, -span)
    prev = { fromY: ps.year, fromM: ps.month, toY: pe.year, toM: pe.month }
    prevLabel = rangeLabel(ps.year, ps.month, pe.year, pe.month)
  }
  return { fromY, fromM, toY, toM, label, prev, prevLabel }
}

export function readPanelFilter() {
  try { const s = JSON.parse(localStorage.getItem('ts_panel_filter')); if (s && s.mode) return s } catch {}
  const p = getCurrentPeriod(); return { mode: 'trimestre', year: p.year, quarter: p.quarter }
}

export function writePanelFilter(f) {
  try { localStorage.setItem('ts_panel_filter', JSON.stringify(f)) } catch {}
}
