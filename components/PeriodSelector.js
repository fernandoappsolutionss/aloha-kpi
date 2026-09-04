'use client'

// Selector de trimestre + año. Arranca en el período actual (ver lib/period).
export default function PeriodSelector({ value, onChange }) {
  const years = [value.year - 1, value.year, value.year + 1]
  return (
    <div className="period" role="group" aria-label="Periodo">
      <label className="period__field"><span>Periodo trimestre</span><select name="period-quarter" className="select" value={value.quarter}
        onChange={e => onChange({ ...value, quarter: Number(e.target.value) })}>
        {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
      </select></label>
      <label className="period__field"><span>Periodo año</span><select name="period-year" className="select" value={value.year}
        onChange={e => onChange({ ...value, year: Number(e.target.value) })}>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select></label>
    </div>
  )
}
