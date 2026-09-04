'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import PeriodSelector from '../../../components/PeriodSelector'
import TableScroller from '../../../components/TableScroller'
import OperationalCard from '../../../components/OperationalCard'
import { getCentrosKpi } from '../../actions/dashboard'
import { getCurrentPeriod, readStoredPeriod, writeStoredPeriod, periodLabel } from '../../../lib/period'

const cumplColor = (v) => v >= 85 ? 'var(--ok)' : v >= 70 ? 'var(--warn)' : 'var(--bad)'

export default function ReportePage() {
  const [centros, setCentros] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState(getCurrentPeriod())
  const label = periodLabel(period.year, period.quarter)
  function changePeriod(p) { writeStoredPeriod(p); setPeriod(p) }

  useEffect(() => { setPeriod(readStoredPeriod()) }, [])
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    getCentrosKpi(period.year, period.quarter)
      .then((data) => { if (active) setCentros(data || []) })
      .catch(() => { if (active) setError('No se pudo cargar reporte. Intenta de nuevo.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
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
      <main id="main-content" data-page-state={loading ? 'loading' : error ? 'error' : 'ready'} className="main operations-page">

        {/* Header */}
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Reporte · {label}</div>
            <h1 className="h-title">Reporte trimestral</h1>
            {!loading && !error && <p role="status" className="h-sub">Resumen consolidado {label} · {centros.length} centros</p>}
          </div>
          <div className="page-actions operations-actions">
            <PeriodSelector value={period} onChange={changePeriod} />
            <button onClick={exportCSV} disabled={loading||!!error||centros.length===0} className="btn btn--primary operations-export">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportar CSV
            </button>
          </div>
        </div>

        {error ? <p role="alert" className="alert alert--error">{error}</p> : loading ? (
          <div role="status" className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Cargando reporte...</div>
        ) : (
          <>
            <div className="responsive-grid operations-grid--four">
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
              <div className="desktop-only operational-table">
              <TableScroller label="Detalle por centro">
                <table className="table operations-table--report">
                  <caption className="sr-only">Detalle por centro · {label}</caption>
                  <thead>
                    <tr>{['Centro','Niños activos','Nuevos ingresos','Meta','Deserción','% Cumplimiento'].map(h=>
                      <th key={h}>{h}</th>
                    )}</tr>
                  </thead>
                  <tbody>
                    {centros.length === 0 && <tr><td colSpan={6}>No hay centros para este período.</td></tr>}
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
              </TableScroller>
              </div>
              <div className="mobile-only operational-list">
                {centros.map(c => <OperationalCard key={c.id} headingLevel={3} title={c.nombre}
                  fields={[
                    { label: 'Niños activos', value: c.ninos }, { label: 'Nuevos ingresos', value: c.nuevos },
                    { label: 'Meta', value: c.nuevos >= c.meta ? 'Meta cumplida' : 'No cumplida' },
                    { label: 'Deserción', value: c.desercion }, { label: 'Cumplimiento', value: `${c.cumpl}%` },
                  ]} />)}
                {centros.length > 0 ? <OperationalCard headingLevel={3} title="TOTALES" fields={[
                  { label: 'Niños activos', value: tot.ninos }, { label: 'Nuevos ingresos', value: tot.nuevos },
                  { label: 'Deserción', value: tot.desercion }, { label: 'Cumplimiento promedio', value: `${promCumpl}%` },
                ]} /> : <p>No hay centros para este período.</p>}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
