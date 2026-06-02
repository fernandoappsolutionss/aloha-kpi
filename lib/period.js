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
