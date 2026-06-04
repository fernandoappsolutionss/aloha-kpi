'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/Sidebar'
import PeriodSelector from '../../components/PeriodSelector'
import NivelBadge from '../../components/NivelBadge'
import { getCentrosKpi, getNinosSerie } from '../actions/dashboard'
import { getCurrentPeriod, readStoredPeriod, writeStoredPeriod, periodLabel } from '../../lib/period'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const ESTADO_PILL = { Cumplido: 'pill--ok', Parcial: 'pill--warn', Crítico: 'pill--bad' }
const cumplColor = (v) => v >= 85 ? 'var(--ok)' : v >= 70 ? 'var(--warn)' : 'var(--bad)'
const MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const NinosTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '8px 12px', fontSize: 12, boxShadow: '0 8px 28px rgba(0,0,0,0.18)' }}>
      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>{label}</div>
      <div style={{ color: 'var(--ts-green)' }}>Niños: <b>{payload[0].value}</b></div>
    </div>
  )
}

/* tiny dim icons for KPI cards */
const ic = {
  ninos:  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>,
  nuevos: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M3 12h18"/></svg>,
  des:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
  meta:   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>,
  gauge:  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 14 18 8"/><path d="M3.5 18a9 9 0 1 1 17 0"/></svg>,
  grupo:  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>,
}

export default function DashboardPage() {
  const router = useRouter()
  const [centros, setCentros] = useState([])
  const [prev, setPrev] = useState([])
  const [nombre, setNombre] = useState('')
  const [period, setPeriod] = useState(getCurrentPeriod())
  const [rango, setRango] = useState('ytd')
  const [custom, setCustom] = useState({ from: '', to: '' })
  const [serie, setSerie] = useState([])
  const criticos = centros.filter(c => c.estado === 'Crítico').length

  useEffect(() => { setNombre(localStorage.getItem('aloha_nombre') || 'Administrador'); setPeriod(readStoredPeriod()) }, [])
  useEffect(() => {
    getCentrosKpi(period.year, period.quarter).then((data) => setCentros(data || [])).catch(() => {})
    getCentrosKpi(period.year - 1, period.quarter).then((data) => setPrev(data || [])).catch(() => setPrev([]))
  }, [period])
  useEffect(() => {
    const now = new Date(); const cy = now.getFullYear(), cm = now.getMonth() + 1
    let d, h
    if (rango === 'prev') { d = [cy - 1, 1]; h = [cy - 1, 12] }
    else if (rango === 'custom' && custom.from && custom.to) {
      const [fy, fm] = custom.from.split('-').map(Number); const [ty, tm] = custom.to.split('-').map(Number)
      d = [fy, fm]; h = [ty, tm]
    } else { d = [cy, 1]; h = [cy, cm] }
    getNinosSerie(d[0], d[1], h[0], h[1])
      .then((rows) => setSerie((rows || []).map((r) => ({ ...r, label: MES_CORTO[r.month - 1] + " '" + String(r.year).slice(2) }))))
      .catch(() => setSerie([]))
  }, [rango, custom.from, custom.to])

  const label = periodLabel(period.year, period.quarter)
  function changePeriod(p) { writeStoredPeriod(p); setPeriod(p) }

  const n = centros.length || 1
  const totNinos = centros.reduce((a, c) => a + c.ninos, 0)
  const totNuevos = centros.reduce((a, c) => a + c.nuevos, 0)
  const totDes = centros.reduce((a, c) => a + c.desercion, 0)
  const promCumpl = Math.round(centros.reduce((a, c) => a + c.cumpl, 0) / n)
  const enMeta = centros.filter(c => c.nuevos >= c.meta).length
  const totGrupos = centros.reduce((a, c) => a + (c.grupos || 0), 0)
  const ninosGrupoProm = totGrupos > 0 ? (totNinos / totGrupos) : 0
  const metaGpn = centros[0]?.metaGpn || 8
  const centrosBajoGpn = centros.filter(c => c.gpnBajo).length

  // Comparativa vs mismo trimestre del año anterior.
  const pTotNinos = prev.reduce((a, c) => a + c.ninos, 0)
  const pTotNuevos = prev.reduce((a, c) => a + c.nuevos, 0)
  const pTotDes = prev.reduce((a, c) => a + c.desercion, 0)
  const pPromCumpl = prev.length ? Math.round(prev.reduce((a, c) => a + c.cumpl, 0) / prev.length) : 0
  const delta = (cur, prv) => (prv > 0 ? Math.round(((cur - prv) / prv) * 100) : null)
  const prevLabel = `Q${period.quarter} ${period.year - 1}`

  const cards = [
    { label: 'Niños activos', value: totNinos.toLocaleString(), icon: ic.ninos, sub: 'en todos los centros', yoy: { delta: delta(totNinos, pTotNinos), upGood: true } },
    { label: 'Nuevos ingresos', value: totNuevos, icon: ic.nuevos, sub: label, color: 'var(--ts-green)', yoy: { delta: delta(totNuevos, pTotNuevos), upGood: true } },
    { label: 'Deserción total', value: totDes, icon: ic.des, sub: 'en el trimestre', yoy: { delta: delta(totDes, pTotDes), upGood: false } },
    { label: 'Centros en meta', value: `${enMeta}/${centros.length}`, icon: ic.meta, sub: 'meta de ingresos' },
    { label: 'Cumplimiento prom.', value: `${isNaN(promCumpl) ? 0 : promCumpl}%`, icon: ic.gauge, sub: 'promedio general', color: cumplColor(promCumpl), yoy: { delta: delta(promCumpl, pPromCumpl), upGood: true } },
    { label: 'Niños por grupo', value: totGrupos > 0 ? ninosGrupoProm.toFixed(1) : '—', icon: ic.grupo, sub: `meta ≥ ${metaGpn} · clave de rentabilidad`, color: totGrupos > 0 ? (ninosGrupoProm >= metaGpn ? 'var(--ok)' : 'var(--bad)') : undefined },
  ]

  return (
    <div className="shell">
      <Sidebar rol="admin_general" />
      <main className="main">

        {/* Header */}
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Panel general · {label}</div>
            <h1 className="h-title">Hola, {(nombre.split(' ')[0]) || '—'}.</h1>
            <p className="h-sub">{centros.length} centros activos · seguimiento en tiempo real</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
            <PeriodSelector value={period} onChange={changePeriod} />
            {criticos > 0 && (
              <div className="alert alert--error" style={{ alignItems: 'flex-start' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <div style={{ fontWeight: 600 }}>{criticos} centro{criticos > 1 ? 's' : ''} en estado crítico</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>Requiere atención inmediata</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KPI cards */}
        <div className="kpi-grid">
          {cards.map((m, i) => (
            <div key={i} className="kpi" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="kpi__top">
                <span className="label">{m.label}</span>
                {m.icon}
              </div>
              <div className="kpi__value" style={m.color ? { color: m.color } : undefined}>{m.value}</div>
              <div className="kpi__sub">{m.sub}</div>
              {m.yoy && m.yoy.delta != null && (
                <div style={{ marginTop: 7, fontSize: 11.5, fontFamily: 'var(--font-mono)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
                  color: m.yoy.delta === 0 ? 'var(--text-dim)' : ((m.yoy.delta > 0) === m.yoy.upGood ? 'var(--ok)' : 'var(--bad)') }}>
                  <span>{m.yoy.delta > 0 ? '▲' : m.yoy.delta < 0 ? '▼' : '—'} {Math.abs(m.yoy.delta)}%</span>
                  <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>vs {prevLabel}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Alerta de ocupación de grupos (rentabilidad) */}
        {centrosBajoGpn > 0 && (
          <div className="card" style={{ marginBottom: 26, padding: '16px 20px', borderLeft: '3px solid var(--bad)', background: 'var(--bad-bg)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                {centrosBajoGpn} centro{centrosBajoGpn > 1 ? 's' : ''} por debajo de {metaGpn} niños por grupo
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5, maxWidth: 780 }}>
                La baja ocupación de grupos golpea directo la rentabilidad: un grupo cuesta casi lo mismo con 4 que con 8 niños. Prioriza <b style={{ color: 'var(--text)' }}>llenar los grupos actuales</b> antes de abrir nuevos.
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="panel" style={{ marginBottom: 26 }}>
          <div className="panel__head">
            <h2 className="panel__title">Estado de todos los centros</h2>
            <span className="label">{label}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  {['Centro', 'Administradora', 'Niños', 'N/grupo', 'Nuevos', 'Deserción', 'Cobranza', 'Cumpl.', 'Tend.', 'Estado', 'Nivel'].map(h =>
                    <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {centros.map((c, i) => (
                  <tr key={i} onClick={() => router.push('/dashboard/ranking')}>
                    <td style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>{c.nombre}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{c.admin}</td>
                    <td className="num" style={{ color: 'var(--text)' }}>{c.ninos}</td>
                    <td className="num" style={{ fontWeight: 600, color: c.grupos > 0 ? (c.ninosGrupo >= c.metaGpn ? 'var(--ok)' : 'var(--bad)') : 'var(--text-faint)' }} title={c.grupos > 0 ? `${c.grupos} grupos · meta ≥ ${c.metaGpn}` : 'sin datos de grupos'}>{c.grupos > 0 ? c.ninosGrupo.toFixed(1) : '—'}</td>
                    <td className="num" style={{ fontWeight: 600, color: c.nuevos >= c.meta ? 'var(--ok)' : 'var(--bad)' }}>
                      {c.nuevos}<span style={{ color: 'var(--text-faint)', fontWeight: 400 }}> /{c.meta}</span>
                    </td>
                    <td className="num" style={{ color: c.desercion > 55 ? 'var(--bad)' : 'var(--text-muted)' }}>{c.desercion}</td>
                    <td>
                      <span className={`pill ${c.cobranza === 'Sí' ? 'pill--ok' : 'pill--bad'}`}>{c.cobranza}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="num" style={{ fontWeight: 600, color: cumplColor(c.cumpl), minWidth: 34 }}>{c.cumpl}%</span>
                        <div className="bar"><div className="bar__fill" style={{ width: c.cumpl + '%', background: cumplColor(c.cumpl) }} /></div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', color: c.nuevos >= c.meta ? 'var(--ok)' : 'var(--bad)' }}>
                      {c.nuevos >= c.meta
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline' }}><line x1="12" y1="19" x2="12" y2="5" /><polyline points="6 11 12 5 18 11" /></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline' }}><line x1="12" y1="5" x2="12" y2="19" /><polyline points="18 13 12 19 6 13" /></svg>}
                    </td>
                    <td>
                      <span className={`pill ${ESTADO_PILL[c.estado] || 'pill--warn'}`}>
                        <span className="dot" />{c.estado}
                      </span>
                    </td>
                    <td><NivelBadge nivel={c.nivel} size="sm" /></td>
                  </tr>
                ))}
                {centros.length === 0 && (
                  <tr style={{ cursor: 'default' }}><td colSpan={11} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '32px' }}>Cargando centros…</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico general de niños + filtros rápidos (al final del panel) */}
        <div className="panel">
          <div className="panel__head" style={{ flexWrap: 'wrap', gap: 10 }}>
            <h2 className="panel__title">Evolución de niños activos</h2>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {[['ytd', 'Este año'], ['prev', 'Año anterior'], ['custom', 'Personalizado']].map(([k, l]) => {
                const on = rango === k
                return (
                  <button key={k} onClick={() => setRango(k)}
                    style={{ padding: '5px 13px', border: `1px solid ${on ? 'var(--ts-green-line)' : 'var(--border-strong)'}`, borderRadius: 'var(--r-pill)', background: on ? 'var(--ts-green-soft)' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: 11, color: on ? 'var(--ts-green)' : 'var(--text-dim)', cursor: 'pointer', fontWeight: on ? 600 : 500 }}>
                    {l}
                  </button>
                )
              })}
              {rango === 'custom' && (
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginLeft: 4 }}>
                  <input type="month" value={custom.from} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))}
                    style={{ padding: '4px 8px', background: 'var(--bg)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-mono)' }} />
                  <span style={{ color: 'var(--text-dim)' }}>→</span>
                  <input type="month" value={custom.to} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))}
                    style={{ padding: '4px 8px', background: 'var(--bg)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-mono)' }} />
                </span>
              )}
            </div>
          </div>
          <div style={{ padding: '18px 12px 8px' }}>
            {serie.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px 0', fontSize: 13 }}>Sin datos de niños para el rango seleccionado.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={serie} margin={{ top: 6, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gNinos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8896A9', fontFamily: 'var(--font-mono)' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: '#8896A9', fontFamily: 'var(--font-mono)' }} allowDecimals={false} width={44} />
                  <Tooltip content={<NinosTooltip />} />
                  <Area type="monotone" dataKey="ninos" name="Niños" stroke="#10B981" strokeWidth={2.5} fill="url(#gNinos)" dot={{ r: 3, fill: '#10B981' }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
