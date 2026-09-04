'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import TableScroller from '../../../components/TableScroller'
import OperationalCard from '../../../components/OperationalCard'
import Sidebar from '../../../components/Sidebar'
import { tienePanel } from '../../../components/useRol'
import { getCentroResumen } from '../../actions/centro'
import { getCentroGrowth } from '../../actions/growth'
import { resumenProgreso } from '../../actions/entrenamiento'
import { getCurrentPeriod, readStoredPeriod, writeStoredPeriod, periodLabel } from '../../../lib/period'
import PeriodSelector from '../../../components/PeriodSelector'
import GrowthSummaryBand from '../../../components/growth/GrowthSummaryBand'
import GrowthBriefing from '../../../components/growth/GrowthBriefing'

const NOMBRES_MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const Q_MONTHS = { 1:[1,2,3], 2:[4,5,6], 3:[7,8,9], 4:[10,11,12] }

const cumplColor = (v) => v >= 85 ? 'var(--ok)' : v >= 70 ? 'var(--warn)' : 'var(--bad)'

function Bar({ val, max, color = 'var(--ts-green)' }) {
  const pct = Math.min((val / (max || 1)) * 100, 100)
  return (
    <div className="bar">
      <div className="bar__fill" style={{ width: pct + '%', background: color }} />
    </div>
  )
}

function Card({ l, v, s, warn }) {
  return (
    <div className="kpi">
      <div className="kpi__top">
        <span className="label">{l}</span>
      </div>
      <div className="kpi__value">{v}</div>
      <div className="kpi__sub" style={warn ? { color: 'var(--bad)' } : undefined}>{s}</div>
    </div>
  )
}

function Kpi({ l, v }) {
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 14px' }}>
      <div className="label" style={{ fontSize: 13 }}>{l}</div>
      <div className="num" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', marginTop: 3 }}>{v}</div>
    </div>
  )
}

// Indicador de cumplimiento (Sí / No / Sin datos) para los KPI por rol.
function CumplePill({ ok, evaluar }) {
  if (!evaluar) return <span className="pill" style={{ background: 'var(--surface-3)', borderColor: 'var(--border-strong)', color: 'var(--text-dim)' }}><span className="dot" />Sin datos</span>
  return <span className={`pill ${ok ? 'pill--ok' : 'pill--bad'}`} style={ok ? { color: 'var(--text)' } : undefined}><span className="dot" />{ok ? 'Cumple' : 'No cumple'}</span>
}

// Tarjeta de KPI trimestral segmentada por rol (Administrador / Asistente).
function RoleKpi({ rol, sub, items }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <h3 style={sectionTitle} >{rol}</h3>
        <span className="h-sub" style={{ margin: 0, fontSize: 13 }}>{sub}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '12px 14px' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{it.l}</div>
              <div className="label" style={{ fontSize: 13, marginTop: 3 }}>{it.meta}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="num" style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{it.v}</span>
              <CumplePill ok={it.ok} evaluar={it.eval} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const sectionTitle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--text-dim)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: 14,
}

export default function CentroPage() {
  const { id } = useParams()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [period, setPeriod] = useState(getCurrentPeriod())
  const [periodReady, setPeriodReady] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [nombre, setNombre] = useState('')
  const [meses, setMeses] = useState([])
  const [totals, setTotals] = useState({
    ninosActivos: 0, nuevosIngresos: 0, nuevosActivos: 0, desercion: 0, grupos: 0,
    cpInv: 0, cpAsi: 0, cpMat: 0,
    motivos: { tecnica: 0, perdida: 0, economico: 0, horario: 0, graduado: 0 },
    origen: { marketing: 0, centro: 0, activaciones: 0, referidos: 0, medios: 0 },
  })
  const [meta, setMeta] = useState({ nuevos: 20, desercion: 18.4, cobranza: 1 })
  const [cumplReal, setCumplReal] = useState(null)
  const [graduacion, setGraduacion] = useState(null)
  const [growth, setGrowth] = useState(null)
  const [ent, setEnt] = useState(null)

  useEffect(() => {
    setPeriod(readStoredPeriod())
    setPeriodReady(true)
    const r = localStorage.getItem('aloha_rol')
    const admin = tienePanel(r)
    setIsAdmin(admin)
    if (!admin) resumenProgreso().then((res) => { if (res && !res.error) setEnt(res) }).catch(() => {})
  }, [])
  const label = periodLabel(period.year, period.quarter)
  function changePeriod(p) { writeStoredPeriod(p); setPeriod(p) }
  useEffect(() => {
    if (!periodReady) return
    let active = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const year = period.year
        const trimestre = period.quarter
        const months = Q_MONTHS[trimestre] || [1, 2, 3]

        const [summary, growthData] = await Promise.all([
          getCentroResumen(id, year, trimestre),
          getCentroGrowth(id).catch((error) => {
            console.error('[CentroPage] no se pudo cargar la ruta de nivel:', error)
            return null
          }),
        ])
        if (!active) return
        if (!summary || summary.error) throw new Error(summary?.error || 'No se pudo cargar el resumen.')
        const { nombre: cNombre, metas: m, rs, ks, meses: mesesCalc, cumplimientoPct, graduacion: grad } = summary
        if (cNombre) setNombre(cNombre)
        setCumplReal(cumplimientoPct ?? null)
        setGraduacion(grad || null)
        setGrowth(growthData)

        const metaFetched = {
          nuevos: m?.meta_nuevos_ingresos_mes ?? 20,
          desercion: Number(m?.meta_desercion_mes ?? 8),
          cobranza: m?.meta_cobranza_max ?? 1,
        }
        setMeta(metaFetched)

        const mensual = months.map(mo => {
          const r = (rs || []).find(x => x.month === mo)
          const ws = (ks || []).filter(x => x.month === mo)
          const nuevos = ws.reduce((s, w) => s + (w.ing_d1 || 0) + (w.ing_d2 || 0) + (w.ing_d3 || 0) + (w.ing_d4 || 0) + (w.ing_d5 || 0), 0)
          const desercionSemanal = ws.reduce((s, w) => s + (w.des_d1 || 0) + (w.des_d2 || 0) + (w.des_d3 || 0) + (w.des_d4 || 0) + (w.des_d5 || 0), 0)
          let cobMes = 0
          if (ws.length) {
            const lastSem = [...ws].sort((a, b) => b.semana - a.semana)[0]
            cobMes = lastSem.cob_d5 || lastSem.cob_d4 || lastSem.cob_d3 || lastSem.cob_d2 || lastSem.cob_d1 || 0
          }
          // El encadenamiento lo resuelve el servidor (quarterMetrics): inicio
          // heredado del cierre anterior y cierre real del mes cuando existe.
          const calc = (mesesCalc || []).find(x => x.mo === mo)
          const desercion = r?.retiros_operativos_mes ?? desercionSemanal
          const ninosInicio = calc ? calc.ninosInicio : (r?.ninos_inicio_mes || 0)
          const nuevosActivosMes = r?.nuevos_activos_mes || 0
          const ninosFin = calc ? calc.ninosFinal : Math.max(0, ninosInicio + nuevosActivosMes - desercion)
          const desPctMes = ninosInicio > 0 ? (desercion / ninosInicio) * 100 : (desercion > 0 ? 100 : 0)
          const cumple = nuevos >= metaFetched.nuevos && desPctMes <= metaFetched.desercion && cobMes <= metaFetched.cobranza
          return {
            mes: NOMBRES_MES[mo - 1],
            mesNum: mo,
            nuevos, desercion, desPct: desPctMes, cobranza: cobMes, ninos: ninosFin,
            ninosInicio, nuevosActivos: nuevosActivosMes,
            cumpl: cumple ? 'Sí' : 'No'
          }
        })
        setMeses(mensual)

        const conDatosMes = mensual.filter(mm => mm.ninosInicio > 0 || mm.nuevos > 0 || mm.desercion > 0 || mm.nuevosActivos > 0)
        const lastMonth = conDatosMes.length ? conDatosMes[conDatosMes.length - 1] : mensual[mensual.length - 1]
        const ultResumen = (rs || [])[(rs || []).length - 1]
        setTotals({
          ninosActivos: lastMonth.ninos,
          nuevosIngresos: mensual.reduce((s, mm) => s + mm.nuevos, 0),
          nuevosActivos: mensual.reduce((s, mm) => s + mm.nuevosActivos, 0),
          desercion: mensual.reduce((s, mm) => s + mm.desercion, 0),
          grupos: ultResumen?.grupos_activos || 0,
          cpInv: (rs || []).reduce((s, r) => s + (r.cp_invitados || 0), 0),
          cpAsi: (rs || []).reduce((s, r) => s + (r.cp_asistieron || 0), 0),
          cpMat: (rs || []).reduce((s, r) => s + (r.cp_matriculados || 0), 0),
          motivos: {
            tecnica: (rs || []).reduce((s, r) => s + (r.mot_tecnica || 0), 0),
            perdida: (rs || []).reduce((s, r) => s + (r.mot_perdida_clase || 0), 0),
            economico: (rs || []).reduce((s, r) => s + (r.mot_economico || 0), 0),
            horario: (rs || []).reduce((s, r) => s + (r.mot_horario || 0), 0),
            graduado: (rs || []).reduce((s, r) => s + (r.mot_graduado || 0), 0),
          },
          origen: {
            marketing: (rs || []).reduce((s, r) => s + (r.orig_marketing || 0), 0),
            centro: (rs || []).reduce((s, r) => s + (r.orig_centro || 0), 0),
            activaciones: (rs || []).reduce((s, r) => s + (r.orig_activaciones || 0), 0),
            referidos: (rs || []).reduce((s, r) => s + (r.orig_referido || 0), 0),
            medios: (rs || []).reduce((s, r) => s + (r.orig_medios || 0), 0),
          },
        })
      } catch (cause) {
        if (active) setError('No se pudo cargar el resumen del centro. Intenta recargar la página.')
      } finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [id, period.year, period.quarter, periodReady])

  if (loading) return (
    <div className="shell center-core-shell">
      <Sidebar rol="usuario" centroNombre={nombre || 'Centro'} centroId={id} />
      <main id="main-content" data-page-state="loading" className="main center-summary-page"><div className="empty" role="status" aria-live="polite">Cargando resumen…</div></main>
    </div>
  )

  if (error) return <div className="shell center-core-shell">
    <Sidebar rol="usuario" centroNombre={nombre || 'Centro'} centroId={id} />
    <main id="main-content" data-page-state="error" className="main center-summary-page"><div className="alert alert--error" role="alert">{error}</div></main>
  </div>

  const cumplCount = meses.filter(m => m.cumpl === 'Sí').length
  const cumplPctMetas = meses.length ? Math.round((cumplCount / meses.length) * 100) : 0
  const cumplPct = cumplReal != null ? cumplReal : cumplPctMetas
  const maxMot = Math.max(totals.motivos.tecnica, totals.motivos.perdida, totals.motivos.economico, totals.motivos.horario, totals.motivos.graduado, 1)
  const maxOri = Math.max(totals.origen.marketing, totals.origen.centro, totals.origen.activaciones, totals.origen.referidos, totals.origen.medios, 1)
  const metaNuevosTrim = meta.nuevos * meses.length
  const desercionAlta = meses.some(m => (m.desPct || 0) > meta.desercion)
  const graduadosQ = totals.motivos.graduado || 0
  const desReal = Math.max(0, totals.desercion - graduadosQ)

  // Cumplimiento por indicador (para el KPI trimestral por rol y la cobranza)
  const mesesConDatos = meses.filter(m => m.ninosInicio > 0 || m.nuevos > 0 || m.desercion > 0 || m.nuevosActivos > 0)
  const nuevosOk = totals.nuevosIngresos >= metaNuevosTrim
  const desercionOk = !desercionAlta
  // Gestión de cobranza: se cumple si en cada mes con datos la cobranza vencida quedó dentro de la meta.
  const cobranzaEval = mesesConDatos.length > 0
  const cobranzaOk = cobranzaEval && mesesConDatos.every(m => (m.cobranza || 0) <= meta.cobranza)
  const ultCobranza = mesesConDatos.length ? (mesesConDatos[mesesConDatos.length - 1].cobranza || 0) : 0
  const promGrupo = totals.grupos > 0 ? (totals.ninosActivos / totals.grupos) : 0
  const pcv = promGrupo > 0 ? (120 / promGrupo) + 16 : 0
  const gpn = totals.ninosActivos > 0 ? ((totals.ninosActivos * 108) * (1 - pcv / 100) - 7800) / totals.ninosActivos : 0
  const pctCpAsi = totals.cpInv ? Math.round(totals.cpAsi / totals.cpInv * 100) : 0
  const pctCpMat = totals.cpAsi ? Math.round(totals.cpMat / totals.cpAsi * 100) : 0

  return (
    <div className="shell center-core-shell">
      <Sidebar rol="usuario" centroNombre={nombre} centroId={id} />
      <GrowthBriefing centroId={id} />
      <main id="main-content" data-page-state="ready" className="main center-summary-page">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Resumen de centro · {label}</div>
            <h1 className="h-title">{nombre}</h1>
            <p className="h-sub">Vista consolidada del trimestre</p>
          </div>
          <div className="center-summary-actions">
            <PeriodSelector value={period} onChange={changePeriod} />
            <span className={`pill ${cumplColor(cumplPct) === 'var(--ok)' ? 'pill--ok' : cumplColor(cumplPct) === 'var(--warn)' ? 'pill--warn' : 'pill--bad'}`}>
              <span className="dot" />{cumplPct}% cumplimiento
            </span>
          </div>
        </div>

        {!isAdmin && ent && ent.completados < ent.total && (
          <div className="alert center-summary-actions" style={{ marginBottom: 16, background: 'var(--ok-bg)', border: '1px solid var(--ok-line)' }}>
            <span>Tu entrenamiento: <b>{ent.completados} de {ent.total}</b> módulos completados.</span>
            <Link className="btn btn--primary" href={`/centro/${id}/entrenamiento`}>Continuar →</Link>
          </div>
        )}
        <div data-tour="resumen.ruta"><GrowthSummaryBand data={growth} onOpen={() => router.push(`/centro/${id}/ruta-nivel`)} /></div>

        {/* KPI Trimestral por rol — cada rol ve sus propios indicadores */}
        <div className="role-kpi-grid" data-tour="resumen.metas">
          <RoleKpi
            rol="Administrador"
            sub="Ventas y deserción"
            items={[
              { l: 'Nuevos ingresos venta', v: totals.nuevosIngresos, meta: 'Meta: ' + metaNuevosTrim, ok: nuevosOk, eval: true },
              { l: 'Deserción real', v: desReal, meta: 'Meta: <' + meta.desercion + '% mensual', ok: desercionOk, eval: true },
            ]}
          />
          <RoleKpi
            rol="Asistente"
            sub="Ventas y gestión de cobranza"
            items={[
              { l: 'Nuevos ingresos venta', v: totals.nuevosIngresos, meta: 'Meta: ' + metaNuevosTrim, ok: nuevosOk, eval: true },
              { l: 'Gestión de cobranza', v: ultCobranza, meta: 'Meta: ≤ ' + meta.cobranza + ' cobranza vencida', ok: cobranzaOk, eval: cobranzaEval },
            ]}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 20 }}>
          <Card l="Niños activos" v={totals.ninosActivos} s={totals.grupos > 0 ? 'Prom/grupo: ' + promGrupo.toFixed(1) : '—'} />
          <Card l="Nuevos ingresos venta" v={totals.nuevosIngresos} s={'Meta: ' + metaNuevosTrim + ' · ' + (metaNuevosTrim ? Math.round(totals.nuevosIngresos / metaNuevosTrim * 100) : 0) + '%'} warn={totals.nuevosIngresos < metaNuevosTrim} />
          <Card l="Nuevos activos" v={totals.nuevosActivos} s="Inicios de clase del trimestre" />
          <div className="kpi">
            <div className="kpi__top"><span className="label">Deserción real</span></div>
            <div className="kpi__value" style={desercionAlta ? { color: 'var(--bad)' } : undefined}>{desReal}</div>
            <div className="kpi__sub">
              {graduadosQ > 0
                ? <>{totals.desercion} bajas · <span style={{ color: 'var(--ok-text)', fontWeight: 600 }}>🎓 {graduadosQ} graduado{graduadosQ !== 1 ? 's' : ''}</span></>
                : 'Meta: <' + meta.desercion + '% mensual'}
            </div>
          </div>
          <Card l="Grupos activos" v={totals.grupos} s={totals.grupos > 0 ? 'GPN: $' + gpn.toFixed(2) : '—'} />
        </div>

        <div className="center-summary-grid">
          <div className="card" style={{ padding: 20 }}>
            <h3 style={sectionTitle}>Resultados por mes</h3>
            <div className="desktop-only"><TableScroller label="Resultados por mes">
            <table className="table">
              <caption className="sr-only">Resultados por mes</caption>
              <thead><tr>{['Mes', 'Ventas', 'Nuevos activos', 'Deserción', 'Niños', 'Cobranza', 'Meta'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{meses.map((m, i) => (
                <tr key={i} style={{ cursor: 'default' }}>
                  <td style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>{m.mes}</td>
                  <td className="num" style={{ fontWeight: 600, color: m.nuevos >= meta.nuevos ? 'var(--ok)' : 'var(--bad)' }}>{m.nuevos}</td>
                  <td className="num" style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{m.nuevosActivos}</td>
                  <td className="num" style={{ color: (m.desPct || 0) > meta.desercion ? 'var(--bad)' : 'var(--text-muted)' }}>{m.desercion}<span style={{ color: 'var(--text-faint)', fontWeight: 400 }}> · {(m.desPct || 0).toFixed(1)}%</span></td>
                  <td className="num" style={{ color: 'var(--text)' }}>{m.ninos}</td>
                  <td className="num" style={{ color: m.cobranza <= meta.cobranza ? 'var(--ok)' : 'var(--bad)', fontWeight: 600 }}>
                    {m.cobranza}
                    <span style={{ fontSize: 13, fontWeight: 400 }}> {m.cobranza <= meta.cobranza ? '✓' : '✗'}</span>
                  </td>
                  <td>
                    <span className={`pill ${m.cumpl === 'Sí' ? 'pill--ok' : 'pill--bad'}`}><span className="dot" />{m.cumpl}</span>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            </TableScroller></div>
            <div className="mobile-only operational-list center-month-cards">
              {meses.map(m => <OperationalCard key={m.mesNum} title={m.mes} fields={[
                { label: 'Ventas', value: m.nuevos },
                { label: 'Nuevos activos', value: m.nuevosActivos },
                { label: 'Deserción', value: `${m.desercion} · ${m.desPct.toFixed(1)}%` },
                { label: 'Niños', value: m.ninos },
                { label: 'Cobranza', value: m.cobranza },
                { label: 'Meta', value: m.cumpl },
              ]} />)}
            </div>
          </div>

          <div className="card" style={{ padding: 20 }} data-tour="resumen.embudo">
            <h3 style={sectionTitle}>Clase de prueba</h3>
            <div className="center-summary-triplet" style={{ marginBottom: 18 }}>
              {[
                { l: 'Invitados', v: totals.cpInv },
                { l: 'Asistieron', v: totals.cpAsi, p: totals.cpInv ? pctCpAsi + '%' : null },
                { l: 'Matriculados', v: totals.cpMat, p: totals.cpAsi ? pctCpMat + '%' : null },
              ].map((item, i) => (
                <div key={i} style={{ textAlign: 'center', flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '14px 8px' }}>
                  <div className="num" style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)' }}>{item.v}</div>
                  <div className="label" style={{ fontSize: 13, marginTop: 4 }}>{item.l}</div>
                  {item.p && <div className="num" style={{ fontSize: 13, color: 'var(--ok-text)', marginTop: 3 }}>{item.p}</div>}
                </div>
              ))}
            </div>

            <h3 style={sectionTitle}>Motivo deserción</h3>
            {[
              { l: 'Pérd. clase', n: totals.motivos.perdida },
              { l: 'Económico', n: totals.motivos.economico },
              { l: 'Técnica', n: totals.motivos.tecnica },
              { l: 'Horario', n: totals.motivos.horario },
              { l: 'Graduado 🎓', n: totals.motivos.graduado, good: true },
            ].map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span className="label center-summary-bar-label">{m.l}</span>
                <Bar val={m.n} max={maxMot} color={m.good ? 'var(--ts-green)' : 'var(--warn)'} />
                <span className="num" style={{ width: 24, fontSize: 13, fontWeight: 600, color: m.good ? 'var(--ts-green)' : 'var(--text)' }}>{m.n}</span>
              </div>
            ))}

            {graduacion && graduacion.graduados > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <h3 style={sectionTitle}>Graduados {period.year} · logro 🎓</h3>
                <div className="center-summary-triplet">
                  {[
                    { l: 'Graduados', v: graduacion.graduados },
                    { l: '% de las bajas', v: graduacion.pctBajas + '%' },
                    { l: '% del alumnado', v: graduacion.pctAlumnado + '%' },
                  ].map((x, i) => (
                    <div key={i} style={{ textAlign: 'center', flex: 1, background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', borderRadius: 'var(--r-sm)', padding: '10px 6px' }}>
                      <div className="num" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ok-text)' }}>{x.v}</div>
                      <div className="label" style={{ fontSize: 13, marginTop: 3 }}>{x.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={sectionTitle}>Origen nuevos ingresos</h3>
            {[
              { l: 'Marketing', n: totals.origen.marketing },
              { l: 'Centro', n: totals.origen.centro },
              { l: 'Activaciones', n: totals.origen.activaciones },
              { l: 'Referidos', n: totals.origen.referidos },
              { l: 'Medios', n: totals.origen.medios },
            ].map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span className="label center-summary-bar-label">{o.l}</span>
                <Bar val={o.n} max={maxOri} />
                <span className="num" style={{ width: 30, fontSize: 13, color: 'var(--text)' }}>{o.n}</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={sectionTitle}>Cumplimiento trimestral</h3>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 500, color: cumplColor(cumplPct), marginBottom: 10, letterSpacing: '-0.02em', lineHeight: 1 }}>{cumplPct}%</div>
            <div className="bar" style={{ height: 10, marginBottom: 16 }}>
              <div className="bar__fill" style={{ width: cumplPct + '%', background: cumplColor(cumplPct) }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Kpi l="Meses cumplidos" v={cumplCount + '/' + meses.length} />
              <Kpi l="Niños inicio trim." v={meses[0]?.ninosInicio || 0} />
              <Kpi l="Niños final trim." v={totals.ninosActivos} />
              <Kpi l="Nuevos ingresos venta" v={totals.nuevosIngresos} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
