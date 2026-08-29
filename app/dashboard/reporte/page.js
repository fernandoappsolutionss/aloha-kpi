'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import PeriodSelector from '../../../components/PeriodSelector'
import { getCentrosKpi } from '../../actions/dashboard'
import { getCurrentPeriod, readStoredPeriod, writeStoredPeriod, periodLabel } from '../../../lib/period'

const cumplColor = (v) => v >= 85 ? 'var(--ok)' : v >= 70 ? 'var(--warn)' : 'var(--bad)'

export default function ReportePage() {
  const [centros, setCentros] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(getCurrentPeriod())
  const label = periodLabel(period.year, period.quarter)
  function changePeriod(p) { writeStoredPeriod(p); setPeriod(p) }

  useEffect(() => { setPeriod(readStoredPeriod()) }, [])
  useEffect(() => {
    setLoading(true)
    getCentrosKpi(period.year, period.quarter)
      .then((data) => setCentros(data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  const tot = centros.reduce((a, c) => ({ ninos: a.ninos + c.ninos, nuevos: a.nuevos + c.nuevos, desercion: a.desercion + c.desercion }), { ninos: 0, nuevos: 0, desercion: 0 })
  const promCumpl = centros.length ? Math.round(centros.reduce((a, c) => a + c.cumpl, 0) / centros.length) : 0

  function exportCSV() {
    const rows = [['Centro','Niños Activos','Nuevos Ingresos','Deserción','% Cumplimiento'],
      ...centros.map(c=>[c.nombre,c.ninos,c.nuevos,c.desercion,c.cumpl+'%']),
      ['TOTAL',tot.ninos,tot.nuevos,tot.desercion,'']
    ]
    const csv = rows.map(r=>r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `ALOHA_KPI_Q${period.quarter}_${period.year}.csv`
    a.click()
  }

  return (
    <div className="shell">
      <Sidebar rol="admin_general"/>
      <main className="main">

        {/* Header */}
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Reporte · {label}</div>
            <h1 className="h-title">Reporte trimestral</h1>
            <p className="h-sub">Resumen consolidado {label} · {centros.length} centros</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <PeriodSelector value={period} onChange={changePeriod} />
            <button onClick={exportCSV} disabled={loading||centros.length===0} className="btn btn--primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportar CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Cargando reporte...</div>
        ) : (
          <>
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {[{l:'Total niños activos',v:tot.ninos.toLocaleString()},{l:'Nuevos ingresos',v:tot.nuevos,color:'var(--ts-green)'},{l:'Deserción total',v:tot.desercion},{l:'Prom. cumplimiento',v:promCumpl+'%',color:cumplColor(promCumpl)}]
                .map((m,i)=>(
                  <div key={i} className="kpi" style={{ animationDelay: `${i * 0.06}s`, ['--accent']: m.color || 'var(--ts-green)' }}>
                    <div className="kpi__top"><span className="label">{m.l}</span></div>
                    <div className="kpi__value" style={m.color ? { color: m.color } : undefined}>{m.v}</div>
                  </div>
                ))}
            </div>

            <div className="panel">
              <div className="panel__head">
                <h2 className="panel__title">Detalle por centro</h2>
                <span className="label">{label}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>{['Centro','Niños activos','Nuevos ingresos','Meta','Deserción','% Cumplimiento'].map(h=>
                      <th key={h}>{h}</th>
                    )}</tr>
                  </thead>
                  <tbody>
                    {centros.map((c,i)=>(
                      <tr key={i} style={{ cursor: 'default' }}>
                        <td style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>{c.nombre}</td>
                        <td className="num" style={{ color: 'var(--text)' }}>{c.ninos}</td>
                        <td className="num" style={{ fontWeight: 600, color: c.nuevos>=c.meta?'var(--ok)':'var(--bad)' }}>{c.nuevos}</td>
                        <td>
                          <span className={`pill ${c.nuevos>=c.meta ? 'pill--ok' : 'pill--bad'}`}><span className="dot" />{c.nuevos>=c.meta?'Meta':'No'}</span>
                        </td>
                        <td className="num" style={{ color: c.desercion>55?'var(--bad)':'var(--text-muted)' }}>{c.desercion}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="num" style={{ fontWeight: 600, color: cumplColor(c.cumpl), minWidth: 34 }}>{c.cumpl}%</span>
                            <div className="bar"><div className="bar__fill" style={{ width: c.cumpl+'%', background: cumplColor(c.cumpl) }}/></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {centros.length > 0 && (
                      <tr style={{ cursor: 'default', background: 'var(--surface-3)' }}>
                        <td style={{ fontWeight: 700, color: 'var(--ts-green)', fontFamily: 'var(--font-sans)' }}>TOTALES</td>
                        <td className="num" style={{ fontWeight: 700, color: 'var(--text)' }}>{tot.ninos}</td>
                        <td className="num" style={{ fontWeight: 700, color: 'var(--text)' }}>{tot.nuevos}</td>
                        <td></td>
                        <td className="num" style={{ fontWeight: 700, color: 'var(--text)' }}>{tot.desercion}</td>
                        <td className="num" style={{ fontWeight: 700, color: 'var(--ts-green)' }}>{promCumpl}%</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
