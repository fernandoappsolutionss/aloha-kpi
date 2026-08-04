'use client'

// Filtro del Panel general: alterna entre Trimestre (Q + año) y Mensual
// (rango de meses por preset o personalizado). Gobierna tarjetas, tabla y
// gráfico a la vez. El valor es el objeto `filter` (ver lib/period).
const pill = (on) => ({
  padding: '5px 13px',
  border: `1px solid ${on ? 'var(--ts-green-line)' : 'var(--border-strong)'}`,
  borderRadius: 'var(--r-pill)',
  background: on ? 'var(--ts-green-soft)' : 'transparent',
  fontFamily: 'var(--font-mono)', fontSize: 11,
  color: on ? 'var(--ts-green)' : 'var(--text-dim)',
  cursor: 'pointer', fontWeight: on ? 600 : 500,
})
const inp = { padding: '4px 8px', background: 'var(--bg)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-mono)' }

export default function PanelFilter({ value, onChange }) {
  const f = value || { mode: 'trimestre' }
  const cy = new Date().getFullYear()
  const years = [cy - 2, cy - 1, cy, cy + 1]
  const isT = f.mode !== 'mensual'
  const preset = f.preset || '12m'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={pill(isT)} onClick={() => onChange({ mode: 'trimestre', year: f.year || cy, quarter: f.quarter || (Math.floor(new Date().getMonth() / 3) + 1) })}>Trimestre</button>
        <button style={pill(!isT)} onClick={() => onChange({ mode: 'mensual', preset, from: f.from || '', to: f.to || '' })}>Mensual</button>
      </div>

      {isT ? (
        <div className="period">
          <select className="select" value={f.quarter || 1} aria-label="Trimestre"
            onChange={e => onChange({ ...f, mode: 'trimestre', quarter: Number(e.target.value) })}>
            {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
          </select>
          <select className="select" value={f.year || cy} aria-label="Año"
            onChange={e => onChange({ ...f, mode: 'trimestre', year: Number(e.target.value) })}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {[['12m', 'Últimos 12 meses'], ['36m', 'Últimos 3 años'], ['anio', 'Año completo'], ['ytd', 'Este año'], ['custom', 'Personalizado']].map(([k, l]) => (
            <button key={k} style={pill(preset === k)} onClick={() => onChange({ ...f, mode: 'mensual', preset: k, year: f.year || cy })}>{l}</button>
          ))}
          {preset === 'anio' && (
            <select className="select" value={f.year || cy} aria-label="Año"
              onChange={e => onChange({ ...f, mode: 'mensual', preset: 'anio', year: Number(e.target.value) })}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          {preset === 'custom' && (
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginLeft: 4 }}>
              <input type="month" value={f.from || ''} style={inp}
                onChange={e => onChange({ ...f, mode: 'mensual', preset: 'custom', from: e.target.value })} />
              <span style={{ color: 'var(--text-dim)' }}>→</span>
              <input type="month" value={f.to || ''} style={inp}
                onChange={e => onChange({ ...f, mode: 'mensual', preset: 'custom', to: e.target.value })} />
            </span>
          )}
        </div>
      )}
    </div>
  )
}
