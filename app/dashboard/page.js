'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/Sidebar'
import PeriodSelector from '../../components/PeriodSelector'
import NivelBadge from '../../components/NivelBadge'
import { getCentrosKpi } from '../actions/dashboard'
import { getCurrentPeriod, readStoredPeriod, writeStoredPeriod, periodLabel } from '../../lib/period'

const ESTADO_PILL = { Cumplido: 'pill--ok', Parcial: 'pill--warn', Crítico: 'pill--bad' }
const cumplColor = (v) => v >= 85 ? 'var(--ok)' : v >= 70 ? 'var(--warn)' : 'var(--bad)'

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
  const [nombre, setNombre] = useState('')
  const [period, setPeriod] = useState(getCurrentPeriod())
  const criticos = centros.filter(c => c.estado === 'Crítico').length

  useEffect(() => { setNombre(localStorage.getItem('aloha_nombre') || 'Administrador'); setPeriod(readStoredPeriod()) }, [])
  useEffect(() => { getCentrosKpi(period.year, period.quarter).then((data) => setCentros(data || [])).catch(() => {}) }, [period])

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

  const cards = [
    { label: 'Niños activos', value: totNinos.toLocaleString(), icon: ic.ninos, sub: 'en todos los centros' },
    { label: 'Nuevos ingresos', value: totNuevos, icon: ic.nuevos, sub: label, color: 'var(--ts-green)' },
    { label: 'Deserción total', value: totDes, icon: ic.des, sub: 'en el trimestre' },
    { label: 'Centros en meta', value: `${enMeta}/${centros.length}`, icon: ic.meta, sub: 'meta de ingresos' },
    { label: 'Cumplimiento prom.', value: `${isNaN(promCumpl) ? 0 : promCumpl}%`, icon: ic.gauge, sub: 'promedio general', color: cumplColor(promCumpl) },
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
        <div className="panel">
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
      </main>
    </div>
  )
}
