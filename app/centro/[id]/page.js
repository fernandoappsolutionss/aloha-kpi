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
import { getDisciplinaTrimestre } from '../../actions/cumplimiento'
import { resumenProgreso } from '../../actions/entrenamiento'
import { getCurrentPeriod, readStoredPeriod, writeStoredPeriod, periodLabel } from '../../../lib/period'
import PeriodSelector from '../../../components/PeriodSelector'
import GrowthSummaryBand from '../../../components/growth/GrowthSummaryBand'
import GrowthBriefing from '../../../components/growth/GrowthBriefing'
import SemaforoProducto, { SemaforoPill } from '../../../components/SemaforoProducto'
import { evaluarProducto, mesesProducto, normalizarMetas, semaforo as calcularSemaforo, verdictoCrecimiento, dec1 } from '../../../lib/marcadores.mjs'
import AlertaDesercionCoach from '../../../components/coach/AlertaDesercionCoach'
import AlertaHigieneDatos from '../../../components/higiene/AlertaHigieneDatos'

const NOMBRES_MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const Q_MONTHS = { 1:[1,2,3], 2:[4,5,6], 3:[7,8,9], 4:[10,11,12] }

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
  const [disciplina, setDisciplina] = useState(null)
  const [graduacion, setGraduacion] = useState(null)
  const [growth, setGrowth] = useState(null)
  const [growthFallo, setGrowthFallo] = useState(false)
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
      setGrowthFallo(false)
      try {
        const year = period.year
        const trimestre = period.quarter
        const months = Q_MONTHS[trimestre] || [1, 2, 3]

        const [summary, growthData, disciplinaData] = await Promise.all([
          getCentroResumen(id, year, trimestre),
          getCentroGrowth(id).catch((error) => {
            console.error('[CentroPage] no se pudo cargar la ruta de nivel:', error)
            // `null` = no se pudo CALCULAR. No es lo mismo que "no hay
            // tendencia": si esto se confundiera, un centro que se desangra
            // bajaría de ROJO a AMARILLO por un fallo de red.
            setGrowthFallo(true)
            return null
          }),
          getDisciplinaTrimestre(id, year, trimestre).catch((error) => {
            console.error('[CentroPage] no se pudo cargar la disciplina operativa:', error)
            return null
          }),
        ])
        if (!active) return
        if (!summary || summary.error) throw new Error(summary?.error || 'No se pudo cargar el resumen.')
        const { nombre: cNombre, metas: m, rs, ks, meses: mesesCalc, graduacion: grad } = summary
        if (cNombre) setNombre(cNombre)
        setDisciplina(disciplinaData || null)
        setGraduacion(grad || null)
        setGrowth(growthData)

        // Una sola normalización de metas en todo el producto. Neon devuelve
        // las columnas `numeric` como STRING ("8", "3"): aquí se normalizaba a
        // mano y `cobranza` se quedaba sin Number(), que es exactamente la
        // trampa de "8" > 8.9 que ya nos mordió una vez.
        const metaFetched = normalizarMetas(m)
        setMeta(metaFetched)

        // El encadenamiento lo resuelve el servidor (quarterMetrics): inicio
        // heredado del cierre anterior y cierre real del mes cuando existe.
        // La derivación mes a mes vive en lib/marcadores.mjs para que el
        // Resumen y la pantalla de Cumplimiento juzguen las metas con el mismo
        // número. Ahí se corrige además la deserción: el % se mide sobre la
        // deserción REAL (bajas − graduados), no sobre las bajas brutas —
        // graduarse es un logro y no puede tumbarte la meta.
        const mensual = mesesProducto({ months, rs, ks, mesesCalc }).map((m) => {
          // Un mes sin cobranza declarada NO cumple la meta del mes: no se
          // aprueba por silencio (antes un mes en blanco valía 0 = perfecto).
          const cumple = m.tieneDatos
            && m.ventas >= metaFetched.nuevos
            && m.desPct <= metaFetched.desercion
            && m.cobranzaRegistrada
            && m.cobranza <= metaFetched.cobranza
          return {
            ...m,
            mes: NOMBRES_MES[m.mesNum - 1],
            // Alias del vocabulario que ya usa el resto de la pantalla.
            nuevos: m.ventas,
            desercion: m.bajas,
            ninos: m.ninosFin,
            cumpl: cumple ? 'Sí' : 'No',
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
  const maxMot = Math.max(totals.motivos.tecnica, totals.motivos.perdida, totals.motivos.economico, totals.motivos.horario, totals.motivos.graduado, 1)
  const maxOri = Math.max(totals.origen.marketing, totals.origen.centro, totals.origen.activaciones, totals.origen.referidos, totals.origen.medios, 1)
  const graduadosQ = totals.motivos.graduado || 0
  const desReal = Math.max(0, totals.desercion - graduadosQ)

  // ── MARCADOR 1 · PRODUCTO (manda y pinta el semáforo) ──────────────────────
  // Las tres metas de resultado se juzgan en UN solo sitio (lib/marcadores.mjs)
  // y de ahí salen tanto el semáforo como los KPI por rol. El crecimiento no se
  // recalcula: es el monthlyNet que el motor ya produce con medianas de los 6
  // cierres anteriores (growth.projection.scenarios.base).
  const producto = evaluarProducto({ meses, metas: meta, anio: period.year })
  // El motor de crecimiento NO recibe periodo: `calculateCentroGrowth` siempre
  // proyecta desde HOY. Estampar ese número sobre un trimestre pasado es
  // mentir: al abrir ANCLAS en Q3-2025 el semáforo seguía diciendo "pierde 2,7
  // niños al mes", que es el dato de septiembre de 2026. Mientras el motor no
  // acepte una ventana, la tendencia sólo se muestra en el trimestre corriente.
  const periodoActual = getCurrentPeriod()
  const esPeriodoCorriente = period.year === periodoActual.year && period.quarter === periodoActual.quarter
  const netMensual = esPeriodoCorriente ? (growth?.projection?.scenarios?.base?.monthlyNet ?? null) : null
  const crecimiento = verdictoCrecimiento(netMensual)
  const estado = calcularSemaforo({
    metasFallidas: producto.metasFallidas,
    metasQueFallan: producto.metasQueFallan,
    crecimiento,
    netMensual,
    confianza: esPeriodoCorriente ? (growth?.metrics?.confidence?.level ?? null) : null,
    sinDatos: producto.sinDatos,
    registroCompleto: producto.registroCompleto,
    mesesSinRegistrar: producto.mesesSinRegistrar,
    mesesSinCobranza: producto.mesesSinCobranza,
    graduadosMedianos: esPeriodoCorriente ? (growth?.metrics?.medians?.graduates ?? null) : null,
    retirosMedianos: esPeriodoCorriente ? (growth?.metrics?.medians?.withdrawals ?? null) : null,
    crecimientoNoDisponible: esPeriodoCorriente && growthFallo,
  })
  const metaNuevosTrim = producto.metaQ
  const desercionAlta = producto.P2 === false
  const nuevosOk = producto.P1 === true
  const desercionOk = producto.P2 === true
  const cobranzaEval = !producto.sinDatos
  const cobranzaOk = producto.P3 === true
  // La tarjeta enseña el PEOR mes de cobranza, no el último: el centro fallaba
  // por Julio (16 vencidas) y la pantalla mostraba el número de Septiembre.
  // Un mes sin ningún cob_* escrito ya NO vale 0 ("cobranza perfecta"): vale
  // "sin registrar", y se dice.
  const peorCobranza = producto.peorCobranza ? producto.peorCobranza.cobranza : '—'
  const peorCobranzaMes = producto.peorCobranza ? NOMBRES_MES[producto.peorCobranza.mesNum - 1] : null
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
            <SemaforoPill semaforo={estado} />
          </div>
        </div>

        {/* El semáforo va ARRIBA de todo y a ancho completo: si el centro no
            está creciendo, eso tiene que ser lo primero que se vea. */}
        <SemaforoProducto semaforo={estado} producto={producto} />

        {/* "Dónde se está yendo la gente" — justo debajo del semáforo, como
            pidió Fernando. Se dibuja sola sólo si algún coach dispara los 4
            candados; sin alerta no ocupa espacio. */}
        <AlertaDesercionCoach centroId={id} anio={period.year} trimestre={period.quarter} />

        {/* "Lo que falta por cargar" — la confianza baja bloquea el VERDE del
            semáforo, y hasta ahora eso se veía como una etiqueta gris sin
            salida. Esta lista dice qué falta, con nombre y número, y no se
            puede descartar: se va sola cuando el dato está cargado. Recibe el
            payload de crecimiento que la página ya tiene en memoria para no
            volver a correr el motor. */}
        <AlertaHigieneDatos centroId={id} growth={growth} />

        {/* El entrenamiento va DESPUÉS del semáforo y sin fondo verde: antes
            era la primera caja con color de la pantalla, y en un centro en rojo
            lo primero que se veía era un banner verde hablando de módulos de
            curso. Con el centro en alerta roja, la siguiente acción no es
            terminar un módulo: se oculta. */}
        {!isAdmin && ent && ent.completados < ent.total && estado.color !== 'rojo' && (
          <div className="alert center-summary-actions" style={{ marginBottom: 16, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
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
              { l: 'Nuevos ingresos venta', v: totals.nuevosIngresos, meta: 'Meta: ' + metaNuevosTrim, ok: nuevosOk, eval: producto.P1 !== null },
              { l: 'Deserción real', v: desReal, meta: producto.peorDesercion ? 'Peor mes ' + dec1(producto.peorDesercion.pct) + '% · meta ≤' + meta.desercion + '%' : 'Meta: ≤' + meta.desercion + '% mensual', ok: desercionOk, eval: producto.P2 !== null },
            ]}
          />
          <RoleKpi
            rol="Asistente"
            sub="Ventas y gestión de cobranza"
            items={[
              { l: 'Nuevos ingresos venta', v: totals.nuevosIngresos, meta: 'Meta: ' + metaNuevosTrim, ok: nuevosOk, eval: producto.P1 !== null },
              { l: 'Gestión de cobranza', v: peorCobranza, meta: (peorCobranzaMes ? 'Peor mes: ' + peorCobranzaMes + ' · ' : producto.mesesSinCobranza.length ? 'Sin registrar en ' + producto.mesesSinCobranza.length + ' mes(es) · ' : '') + 'meta ≤ ' + meta.cobranza + ' vencidas', ok: cobranzaOk, eval: producto.P3 !== null },
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
                  {/* Deserción REAL (bajas − graduados), que es contra lo que
                      se juzga la meta. Las bajas totales quedan a la vista para
                      que el graduado no desaparezca del relato. */}
                  <td className="num" style={{ color: (m.desPct || 0) > meta.desercion ? 'var(--bad)' : 'var(--text-muted)' }}>{m.desReal}<span style={{ color: 'var(--text-faint)', fontWeight: 400 }}> · {(m.desPct || 0).toFixed(1)}%{m.graduados > 0 ? ` (${m.bajas} bajas, ${m.graduados} 🎓)` : ''}</span></td>
                  <td className="num" style={{ color: 'var(--text)' }}>{m.ninos}</td>
                  <td className="num" style={{ color: !m.cobranzaRegistrada ? 'var(--text-dim)' : m.cobranza <= meta.cobranza ? 'var(--ok)' : 'var(--bad)', fontWeight: 600 }}>
                    {m.cobranzaRegistrada ? m.cobranza : 'sin registrar'}
                    {m.cobranzaRegistrada && <span style={{ fontSize: 13, fontWeight: 400 }}> {m.cobranza <= meta.cobranza ? '✓' : '✗'}</span>}
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
                { label: 'Deserción real', value: `${m.desReal} · ${m.desPct.toFixed(1)}%${m.graduados > 0 ? ` (${m.bajas} bajas)` : ''}` },
                { label: 'Niños', value: m.ninos },
                { label: 'Cobranza', value: m.cobranzaRegistrada ? m.cobranza : 'sin registrar' },
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

          {/* MARCADOR 2 · DISCIPLINA OPERATIVA. Es soporte: va deliberadamente
              más pequeño, sin barra de color propia y sin promediarse jamás con
              Producto. Un 100% de disciplina junto a un semáforo rojo se lee
              como texto, no como logro. El denominador de meses va siempre a la
              vista: ahí es donde se escondía el 88% fantasma. */}
          <div className="card disciplina" style={{ padding: 20 }}>
            <h3 style={sectionTitle}>Disciplina operativa</h3>
            <div className="disciplina__valor">{disciplina?.pct != null ? `${disciplina.pct}%` : 'Sin registrar'}</div>
            <div className="disciplina__denominador">
              {disciplina
                ? `${disciplina.mesesRegistrados} de ${meses.length || 3} meses registrados · ${disciplina.puntos} de ${disciplina.maximo} puntos`
                : 'No se pudo cargar el checklist del trimestre.'}
            </div>
            <p className="disciplina__nota">
              Son las 30 actividades del checklist. No pintan el semáforo: el producto valioso es que el centro crezca.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
              <Kpi l="Meses en meta" v={cumplCount + '/' + meses.length} />
              <Kpi l="Niños inicio trim." v={meses[0]?.ninosInicio || 0} />
              <Kpi l="Niños final trim." v={totals.ninosActivos} />
              <Kpi l="Nuevos ingresos venta" v={totals.nuevosIngresos} />
            </div>
            <Link className="btn" style={{ marginTop: 14 }} href={`/centro/${id}/cumplimiento`}>Ver el checklist →</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
