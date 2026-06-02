'use client'

// Selector de trimestre + año. Arranca en el período actual (ver lib/period).
export default function PeriodSelector({ value, onChange }) {
  const years = [value.year - 1, value.year, value.year + 1]
  return (
    <div className="period">
      <select className="select" value={value.quarter} aria-label="Trimestre"
        onChange={e => onChange({ ...value, quarter: Number(e.target.value) })}>
        {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
      </select>
      <select className="select" value={value.year} aria-label="Año"
        onChange={e => onChange({ ...value, year: Number(e.target.value) })}>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}
