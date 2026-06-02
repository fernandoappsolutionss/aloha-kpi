'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import PeriodSelector from '../../../components/PeriodSelector'
import { getCentrosKpi } from '../../actions/dashboard'
import { getCurrentPeriod, readStoredPeriod, writeStoredPeriod, periodLabel } from '../../../lib/period'
import NivelBadge from '../../../components/NivelBadge'

const MEDAL = { 1:'🥇', 2:'🥈', 3:'🥉' }
const cumplColor = (v) => v >= 85 ? 'var(--ok)' : v >= 70 ? 'var(--warn)' : 'var(--bad)'
const podioAccent = (pos) => pos === 1 ? 'var(--ts-green)' : pos === 2 ? 'var(--text-muted)' : 'var(--text-dim)'

export default function RankingPage() {
  const [centros, setCentros] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(getCurrentPeriod())
  const label = periodLabel(period.year, period.quarter)
  function changePeriod(p) { writeStoredPeriod(p); setPeriod(p) }

  useEffect(() => { setPeriod(readStoredPeriod()) }, [])
  useEffect(() => {
    setLoading(true)
    getCentrosKpi(period.year, period.quarter)
      .then((data) => {
        const sorted = [...(data || [])].sort((a, b) => b.cumpl - a.cumpl || b.nuevos - a.nuevos)
        setCentros(sorted.map((c, i) => ({ ...c, pos: i + 1 })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  return (
    <div className="shell">
      <Sidebar rol="admin_general"/>
      <main className="main">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Ranking · {label}</div>
            <h1 className="h-title">Ranking de centros</h1>
            <p className="h-sub">Clasificación por % de cumplimiento — {label}</p>
          </div>
          <PeriodSelector value={period} onChange={changePeriod} />
        </div>

        {loading ? (
          <div className="panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Cargando ranking…</div>
        ) : centros.length === 0 ? (
          <div className="panel" style={{ padding: 48, textAlign: 'center', color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏆</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Aún no hay datos para clasificar</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>El ranking aparecerá cuando los centros registren sus KPIs.</div>
          </div>
        ) : (
          <>
            {/* Podio */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 26 }}>
              {centros.slice(0, 3).map((c, i) => (
                <div key={c.pos} className="kpi" style={{ animationDelay: `${i * 0.06}s`, '--accent': podioAccent(c.pos), textAlign: 'center', padding: '22px 18px 20px' }}>
                  <div style={{ fontSize: 30, marginBottom: 8 }}>{MEDAL[c.pos]}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{c.nombre}</div>
                  <div className="label" style={{ marginBottom: 14 }}>{c.admin}</div>
                  <div className="kpi__value" style={{ color: cumplColor(c.cumpl) }}>{c.cumpl}%</div>
                  <div className="kpi__sub">cumplimiento</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 16, fontSize: 12 }} className="num">
                    <span style={{ color: 'var(--ts-green)', fontWeight: 600 }}>{c.nuevos} nuevos</span>
                    <span style={{ color: 'var(--text-muted)' }}>{c.ninos} niños</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}><NivelBadge nivel={c.nivel} /></div>
                </div>
              ))}
            </div>

            {/* Tabla completa */}
            <div className="panel">
              <div className="panel__head">
                <h2 className="panel__title">Clasificación completa</h2>
                <span className="label">{label}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
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
                        <td style={{ fontSize: 16, color: c.trend === '↑' ? 'var(--ok)' : c.trend === '↓' ? 'var(--bad)' : 'var(--text-dim)' }}>{c.trend}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Leyenda de niveles — siempre visible */}
        <div className="card" style={{ marginTop: 16, padding: '16px 20px' }}>
          <div className="label" style={{ marginBottom: 12 }}>Niveles de centro · ALOHA 2026</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
            {[[1, '> 170'], [2, '> 200'], [3, '> 240'], [4, '> 325'], [5, '> 410']].map(([n, r]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <NivelBadge nivel={n} size="sm" />
                <span className="num" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r} niños</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 12, lineHeight: 1.5, maxWidth: 720 }}>
            Se otorga el nivel según la cantidad de niños activos, siempre que la deserción haya sido{' '}
            <strong style={{ color: 'var(--text-muted)' }}>menor al 8% durante los 3 meses</strong> del trimestre.
            Si no se cumple, el centro queda <strong style={{ color: 'var(--text-muted)' }}>Sin nivel</strong>.
          </p>
        </div>
      </main>
    </div>
  )
}
