'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import PeriodSelector from '../../../components/PeriodSelector'
import { getCentrosKpi } from '../../actions/dashboard'
import { getCurrentPeriod, readStoredPeriod, writeStoredPeriod, periodLabel } from '../../../lib/period'
import NivelBadge from '../../../components/NivelBadge'
import TableScroller from '../../../components/TableScroller'
import OperationalCard from '../../../components/OperationalCard'
import { CENTER_LEVELS } from '../../../lib/growth/constants.mjs'

const MEDAL = { 1:'🥇', 2:'🥈', 3:'🥉' }
const cumplColor = (v) => v >= 85 ? 'var(--ok)' : v >= 70 ? 'var(--warn)' : 'var(--bad)'
const podioAccent = (pos) => pos === 1 ? 'var(--ts-green)' : pos === 2 ? 'var(--text-muted)' : 'var(--text-dim)'

export default function RankingPage() {
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
      .then((data) => {
        if (!active) return
        const sorted = [...(data || [])].sort((a, b) => b.cumpl - a.cumpl || b.nuevos - a.nuevos)
        setCentros(sorted.map((c, i) => ({ ...c, pos: i + 1 })))
      })
      .catch(() => { if (active) setError('No se pudo cargar ranking. Intenta de nuevo.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [period])

  return (
    <div className="shell">
      <Sidebar rol="admin_general"/>
      <main id="main-content" data-page-state={loading ? 'loading' : error ? 'error' : 'ready'} className="main operations-page">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Ranking · {label}</div>
            <h1 className="h-title">Ranking de centros</h1>
            <p className="h-sub">Clasificación por % de cumplimiento — {label}</p>
          </div>
          <PeriodSelector value={period} onChange={changePeriod} />
        </div>

        {error ? <p role="alert" className="alert alert--error">{error}</p> : loading ? (
          <div role="status" className="panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Cargando ranking…</div>
        ) : centros.length === 0 ? (
          <div className="panel" style={{ padding: 48, textAlign: 'center', color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏆</div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>Aún no hay datos para clasificar</div>
            <div style={{ marginTop: 6 }}>El ranking aparecerá cuando los centros registren sus KPIs.</div>
          </div>
        ) : (
          <>
            {/* Podio */}
            <p role="status" className="sr-only">{centros.length} centros clasificados</p>
            <div className="responsive-grid operations-grid--three">
              {centros.slice(0, 3).map((c, i) => (
                <div key={c.pos} className="kpi" style={{ animationDelay: `${i * 0.06}s`, '--accent': podioAccent(c.pos), textAlign: 'center', padding: '22px 18px 20px' }}>
                  <div style={{ fontSize: 30, marginBottom: 8 }}>{MEDAL[c.pos]}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{c.nombre}</div>
                  <div className="label" style={{ marginBottom: 14 }}>{c.admin}</div>
                  <div className="kpi__value" style={{ color: cumplColor(c.cumpl) }}>{c.cumpl}%</div>
                  <div className="kpi__sub">cumplimiento</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 16 }} className="num">
                    <span style={{ color: 'var(--ts-green)', fontWeight: 600 }}>{c.nuevos} nuevos</span>
                    <span style={{ color: 'var(--text-muted)' }}>{c.ninos} niños</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 14 }}>
                    <NivelBadge nivel={c.nivel} />
                    {c.sig
                      ? <div style={{ color: 'var(--text-dim)' }}>Próximo: <b style={{ color: 'var(--ts-green)' }}>Nivel {c.sig.nivel}</b> · faltan {c.sig.faltan}</div>
                      : <div style={{ color: 'var(--ts-green)' }}>Nivel máximo</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Tabla completa */}
            <div className="panel">
              <div className="panel__head">
                <h2 className="panel__title">Clasificación completa</h2>
                <span className="label">{label}</span>
              </div>
              <div className="desktop-only operational-table">
              <TableScroller label="Clasificación completa">
                <table className="table operations-table--ranking">
                  <caption className="sr-only">Clasificación completa · {label}</caption>
                  <thead>
                    <tr>{['Pos.','Centro','Administradora','Cumplimiento','Nuevos ing.','Niños activos','Nivel','Tendencia'].map(h =>
                      <th key={h}>{h}</th>
                    )}</tr>
                  </thead>
                  <tbody>
                    {centros.map(c => (
                      <tr key={c.pos} style={{ cursor: 'default' }}>
                        <td className="num">
                          <span style={{ fontWeight: 700, color: c.pos <= 3 ? podioAccent(c.pos) : 'var(--text-dim)' }}>{MEDAL[c.pos] || c.pos}</span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>{c.nombre}</td>
                        <td style={{ color: 'var(--text-dim)' }}>{c.admin}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="num" style={{ fontWeight: 600, color: cumplColor(c.cumpl), minWidth: 34 }}>{c.cumpl}%</span>
                            <div className="bar"><div className="bar__fill" style={{ width: `${c.cumpl}%`, background: cumplColor(c.cumpl) }} /></div>
                          </div>
                        </td>
                        <td className="num" style={{ color: 'var(--text)' }}>{c.nuevos}</td>
                        <td className="num" style={{ color: 'var(--text-muted)' }}>{c.ninos}</td>
                        <td><NivelBadge nivel={c.nivel} size="sm" /></td>
                        <td style={{ color: c.trend === '↑' ? 'var(--ok)' : c.trend === '↓' ? 'var(--bad)' : 'var(--text-dim)' }}>{c.trend === '↑' ? 'Al alza' : c.trend === '↓' ? 'A la baja' : 'Estable'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroller>
              </div>
              <div className="mobile-only operational-list">
                {centros.map(c => <OperationalCard key={c.id} headingLevel={3} title={`${c.pos}. ${c.nombre}`} subtitle={c.admin}
                  fields={[
                    { label: 'Posición', value: c.pos }, { label: 'Administradora', value: c.admin || '—' },
                    { label: 'Cumplimiento', value: `${c.cumpl}%` }, { label: 'Nuevos ingresos', value: c.nuevos },
                    { label: 'Niños activos', value: c.ninos }, { label: 'Nivel', value: <NivelBadge nivel={c.nivel} /> },
                    { label: 'Tendencia', value: c.trend === '↑' ? 'Al alza' : c.trend === '↓' ? 'A la baja' : 'Estable' },
                  ]} />)}
              </div>
            </div>
          </>
        )}

        {/* Leyenda de niveles — siempre visible */}
        <div className="card" style={{ marginTop: 16, padding: '16px 20px' }}>
          <div className="label" style={{ marginBottom: 12 }}>Niveles de centro · ALOHA 2026</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
            {CENTER_LEVELS.map(({ level, threshold }) => (
              <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <NivelBadge nivel={level} size="sm" />
                <span className="num" style={{ color: 'var(--text-muted)' }}>≥ {threshold} niños</span>
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--text-dim)', marginTop: 12, lineHeight: 1.5, maxWidth: 760 }}>
            El nivel se reconoce al <strong style={{ color: 'var(--text-muted)' }}>cerrar el trimestre</strong> según los niños activos
            y aplica al <strong style={{ color: 'var(--text-muted)' }}>trimestre siguiente</strong>. Reducir la deserción ayuda a sostener el umbral alcanzado.
          </p>
        </div>
      </main>
    </div>
  )
}
