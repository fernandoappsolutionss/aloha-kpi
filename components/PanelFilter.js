'use client'

// Filtro del Panel general: alterna entre Trimestre (Q + año) y Mensual
// (rango de meses por preset o personalizado). Gobierna tarjetas, tabla y
// gráfico a la vez. El valor es el objeto `filter` (ver lib/period).
export default function PanelFilter({ value, onChange }) {
  const f = value || { mode: 'trimestre' }
  const cy = new Date().getFullYear()
  const years = [cy - 2, cy - 1, cy, cy + 1]
  const isT = f.mode !== 'mensual'
  const preset = f.preset || '12m'

  return (
    <div className="panel-filter">
      <div className="panel-filter__modes" role="group" aria-label="Tipo de período">
        <button type="button" className={`panel-filter__mode ${isT ? 'panel-filter__mode--active' : ''}`} aria-pressed={isT} onClick={() => onChange({ mode: 'trimestre', year: f.year || cy, quarter: f.quarter || (Math.floor(new Date().getMonth() / 3) + 1) })}>Trimestre</button>
        <button type="button" className={`panel-filter__mode ${!isT ? 'panel-filter__mode--active' : ''}`} aria-pressed={!isT} onClick={() => onChange({ mode: 'mensual', preset, from: f.from || '', to: f.to || '' })}>Mensual</button>
      </div>

      {isT ? (
        <div className="period panel-filter__period" role="group" aria-label="Periodo trimestral">
          <label className="period__field"><span>Trimestre</span><select name="panel-quarter" className="select" value={f.quarter || 1}
            onChange={e => onChange({ ...f, mode: 'trimestre', quarter: Number(e.target.value) })}>
            {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
          </select></label>
          <label className="period__field"><span>Año</span><select name="panel-year" className="select" value={f.year || cy}
            onChange={e => onChange({ ...f, mode: 'trimestre', year: Number(e.target.value) })}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select></label>
        </div>
      ) : (
        <div className="panel-filter__presets" role="group" aria-label="Rango mensual">
          {[['12m', 'Últimos 12 meses'], ['36m', 'Últimos 3 años'], ['anio', 'Año completo'], ['ytd', 'Este año'], ['custom', 'Personalizado']].map(([k, l]) => (
            <button type="button" key={k} className={`panel-filter__preset ${preset === k ? 'panel-filter__preset--active' : ''}`} aria-pressed={preset === k} onClick={() => onChange({ ...f, mode: 'mensual', preset: k, year: f.year || cy })}>{l}</button>
          ))}
          {preset === 'anio' && (
            <label className="period__field panel-filter__year"><span>Año</span><select name="panel-monthly-year" className="select" value={f.year || cy}
              onChange={e => onChange({ ...f, mode: 'mensual', preset: 'anio', year: Number(e.target.value) })}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select></label>
          )}
          {preset === 'custom' && (
            <div className="panel-filter__range">
              <label><span>Desde</span><input type="month" name="desde" autoComplete="off" value={f.from || ''}
                onChange={e => onChange({ ...f, mode: 'mensual', preset: 'custom', from: e.target.value })} />
              </label>
              <label><span>Hasta</span><input type="month" name="hasta" autoComplete="off" value={f.to || ''}
                onChange={e => onChange({ ...f, mode: 'mensual', preset: 'custom', to: e.target.value })} />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
