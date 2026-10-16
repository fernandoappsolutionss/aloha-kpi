'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import CentroNavigation from '../../../../components/CentroNavigation'
import Link from 'next/link'
import TableScroller from '../../../../components/TableScroller'
import GraficaMensualHca from '../../../../components/GraficaMensualHca'
import { COMPARATIVA_HCA, CUADRO_HCA, numeroRegistrado, resumenComparativo, mesesConCuadro } from '../../../../lib/historial-graficas-hca.mjs'
import { getHistorialCentro } from '../../../actions/centro'
import { balanceMensual, finalVisibleKpi, inicioVisibleKpi, valorHistorialMes } from '../../../../lib/inicios-clase.mjs'

const MES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

/* Colores de los indicadores y las tablas conectados al tema. */
const C = {
  green:  'var(--ok-text)',
  mut:    'var(--chart-muted)',
  dim:    'var(--text-dim)',
  bad:    'var(--bad)',
}

const calcPcv = (prom) => prom > 0 ? (120/prom) + 16 : 0
const calcGpn = (ninosFinal, pcv) => ninosFinal > 0 ? (((ninosFinal*108)*(1-pcv/100)-7800)/ninosFinal) : 0
const monthKey = (m) => (m.year * 12) + m.month
const monthKeyToInput = (key) => {
  const year = Math.floor((key - 1) / 12)
  const month = ((key - 1) % 12) + 1
  return `${year}-${String(month).padStart(2, '0')}`
}
const parseMonthInput = (value) => {
  if (!value) return null
  const [year, month] = value.split('-').map(Number)
  return Number.isFinite(year) && Number.isFinite(month) ? (year * 12) + month : null
}
const Trend = ({ val, prev }) => {
  if (prev === undefined || prev === null) return null
  const diff = val - prev
  if (Math.abs(diff) < 0.01) return <span style={{color:C.dim,fontSize:13}}> →</span>
  return diff > 0
    ? <span style={{color:C.green,fontSize:13}}> ↑ {Math.abs(diff).toFixed(1)}</span>
    : <span style={{color:C.bad,fontSize:13}}> ↓ {Math.abs(diff).toFixed(1)}</span>
}

export default function HistorialPage() {
  const { id } = useParams()
  const sp = useSearchParams()
  const [centroNombre, setCentroNombre] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [meses, setMeses] = useState([])
  const [vistaActiva, setVistaActiva] = useState(() => ['tendencias','comparativa','tabla','cuadro'].includes(sp.get('vista')) ? sp.get('vista') : 'tendencias') // 'tendencias' | 'tabla' | 'detalle'
  const [periodo, setPeriodo] = useState(() => ({ tipo: ['3m','12m','custom'].includes(sp.get('rango')) ? sp.get('rango') : '12m', from: sp.get('from') || '', to: sp.get('to') || '' }))
  const [mesDetalle, setMesDetalle] = useState(null)

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('vista', vistaActiva); url.searchParams.set('rango', periodo.tipo)
    for(const key of ['from','to']) { if(periodo[key]) url.searchParams.set(key,periodo[key]); else url.searchParams.delete(key) }
    window.history.replaceState(null, '', url)
  }, [vistaActiva, periodo])

  const loadHistorial = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
    const { nombre, resumen, estados, semanas, cuadros } = await getHistorialCentro(id)
    if (nombre) setCentroNombre(nombre)

    // Calcular métricas derivadas con el mismo encadenamiento que usa KPI mensual.
    const semanasPorMes = new Map((semanas || []).map((s) => [`${s.year}-${s.month}`, s]))
    const rows = [...(resumen || [])].sort((a, b) => monthKey(a) - monthKey(b))
    let cierreAnterior = null
    let keyAnterior = null
    const data = rows.map((r) => {
      const key = monthKey(r)
      const estado = estados?.find(e => e.year === r.year && e.month === r.month)
      const estadoMes = estado?.estado || 'abierto'
      const cuadro = cuadros?.find(q => q.year === r.year && q.month === r.month) || null
      const usaCuadroVivo = estadoMes !== 'cerrado' && cuadro?.vivo === true
      const semana = semanasPorMes.get(`${r.year}-${r.month}`) || null
      const rawInicio = Number(r.ninos_inicio_mes) || 0
      const arrastrado = keyAnterior === key - 1 && cierreAnterior != null ? cierreAnterior : null
      const nI = inicioVisibleKpi({ estado: estadoMes, guardado: rawInicio, arrastrado })
      const gA = valorHistorialMes({ estado: estadoMes, guardado: r.grupos_activos, cuadro, campo: 'gruposActivos' })
      const nuevosSemanal = Number(semana?.nuevos_ingresos_venta) || 0
      const nuevosCuadro = Number(cuadro?.nuevos) || 0
      const nA = valorHistorialMes({ estado: estadoMes, guardado: r.nuevos_activos_mes, cuadro, campo: 'nuevos' })
      const desercionSemanal = Number(semana?.total_desercion) || 0
      const totalDes = usaCuadroVivo && cuadro?.retirados != null
        ? Number(cuadro.retirados) || 0
        : desercionSemanal
      const reincorporados = Number(cuadro?.reincorporados) || 0
      const rawFinal = Number(r.ninos_final_mes) || 0
      const cuadroFinal = Number(cuadro?.aPagar) || 0
      const calculadoFinal = usaCuadroVivo
        ? Math.max(0, balanceMensual({ inicio: nI, nuevosActivos: nA, reincorporados, retirados: totalDes }))
        : (rawFinal > 0 ? rawFinal : (cuadroFinal > 0 ? cuadroFinal : Math.max(0, nI + nA + reincorporados - totalDes)))
      const ninosFinal = finalVisibleKpi({ estado: estadoMes, guardado: r.ninos_final_mes, calculado: calculadoFinal })
      const promG = gA > 0 ? ninosFinal / gA : 0
      const pcv = calcPcv(promG)
      const gpn = calcGpn(ninosFinal, pcv)
      const prevNF = keyAnterior === key - 1 ? cierreAnterior : null

      const row = {
        mes: MES[r.month-1] + ' ' + r.year,
        mesLabel: MES_FULL[r.month-1] + ' ' + r.year,
        year: r.year, month: r.month,
        estado: estadoMes,
        cerrado_at: estado?.cerrado_at,
        ninos_inicio: nI,
        ninos_final: ninosFinal,
        grupos_activos: gA,
        nuevos_activos: nA,
        activados: nA + reincorporados,
        reincorporados,
        nuevos_ingresos_venta: nuevosSemanal,
        meta_nuevos: r.meta_nuevos_mensual || 20,
        cp_invitados: numeroRegistrado(r.cp_invitados),
        cp_asistieron: numeroRegistrado(r.cp_asistieron),
        cp_matriculados: numeroRegistrado(r.cp_matriculados),
        mot_tecnica: numeroRegistrado(r.mot_tecnica),
        mot_perdida_clase: numeroRegistrado(r.mot_perdida_clase),
        mot_economico: numeroRegistrado(r.mot_economico),
        mot_horario: numeroRegistrado(r.mot_horario),
        orig_referido: numeroRegistrado(r.orig_referido),
        orig_marketing: numeroRegistrado(r.orig_marketing),
        orig_centro: numeroRegistrado(r.orig_centro),
        orig_activaciones: numeroRegistrado(r.orig_activaciones),
        prom_grupo: parseFloat(promG.toFixed(2)),
        pcv: parseFloat(pcv.toFixed(1)),
        gpn: parseFloat(gpn.toFixed(2)),
        prev_ninos_final: prevNF,
        cumple_prom: promG >= 8,
        meta_cob: parseFloat(((nI * 0.015)).toFixed(1)),
        meta_des: parseFloat((nI * 0.08).toFixed(1)),
        // Foto congelada o cálculo vivo; la vista de Cuadro solo lista las fotos cerradas.
        cuadro,
        cuadro_aPagar: cuadro ? cuadro.aPagar : null,
        cuadro_nuevos: cuadro ? cuadro.nuevos : null,
        cuadro_retirados: cuadro ? cuadro.retirados : null,
        cuadro_royalty: numeroRegistrado(cuadro?.royalty),
      }
      cierreAnterior = ninosFinal
      keyAnterior = key
      return row
    })
    setMeses(data)
    } catch { setError('No se pudo cargar el historial. Intenta nuevamente.') }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { loadHistorial() }, [loadHistorial])

  const firstMonth = meses[0] || null
  const latestMonth = meses[meses.length - 1] || null
  const latestInput = latestMonth ? monthKeyToInput(monthKey(latestMonth)) : ''
  const defaultCustomFrom = latestMonth ? monthKeyToInput(monthKey(latestMonth) - 11) : ''
  const visibleMeses = useMemo(() => {
    if (!meses.length) return []
    if (periodo.tipo === '3m' || periodo.tipo === '12m') {
      const latest = monthKey(meses[meses.length - 1])
      const start = latest - (periodo.tipo === '3m' ? 2 : 11)
      return meses.filter((m) => monthKey(m) >= start && monthKey(m) <= latest)
    }

    let from = parseMonthInput(periodo.from) ?? (firstMonth ? monthKey(firstMonth) : null)
    let to = parseMonthInput(periodo.to) ?? (latestMonth ? monthKey(latestMonth) : null)
    if (from === null || to === null) return meses
    if (from > to) [from, to] = [to, from]
    return meses.filter((m) => {
      const key = monthKey(m)
      return key >= from && key <= to
    })
  }, [meses, periodo, firstMonth, latestMonth])

  if (loading) return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={centroNombre || 'Centro'} centroId={id} />
      <main id="main-content" data-page-state="loading" className="main reports-page">
        <CentroNavigation centroId={id} />
        <div className="empty" role="status">Cargando historial…</div>
      </main>
    </div>
  )

  const last = visibleMeses[visibleMeses.length - 1]
  const prev = visibleMeses[visibleMeses.length - 2]
  const visibleRangeLabel = visibleMeses.length
    ? `${visibleMeses[0].mesLabel} - ${visibleMeses[visibleMeses.length - 1].mesLabel}`
    : 'Sin meses en este rango'

  const StatCard = ({ label, val, prev, unit='', color='var(--text)', meta, metaOp, invertTrend }) => {
    const prevVal = prev
    const diff = prevVal !== undefined ? val - prevVal : null
    const trendUp = diff !== null && diff !== 0 ? diff > 0 : null
    const trendGood = invertTrend ? (trendUp === false) : (trendUp === true)
    return (
      <div className="kpi" style={{ padding: '16px 18px' }}>
        <div className="kpi__top"><span className="label">{label}</span></div>
        <div className="kpi__value num" style={{ fontSize: 26, color }}>{typeof val==='number' ? val.toFixed(unit==='%'?1:0) : val}{unit}</div>
        {diff !== null && diff !== 0 && (
          <div className="kpi__sub" style={{ color: trendGood ? C.green : C.bad }}>
            {diff > 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}{unit} vs mes anterior
          </div>
        )}
        {meta && <div className="kpi__sub">Meta: {metaOp} {meta}</div>}
      </div>
    )
  }

  const vistaBtn = (v, label) => {
    const on = vistaActiva === v
    return (
      <button type="button" aria-pressed={on} onClick={()=>setVistaActiva(v)} className={`btn${on ? ' btn--primary' : ''}`} style={{ padding: '9px 18px' }}>
        {label}
      </button>
    )
  }

  const filtroBtn = (tipo, label) => {
    const on = periodo.tipo === tipo
    return (
      <button
        type="button"
        onClick={() => setPeriodo((p) => ({
          tipo,
          from: tipo === 'custom' ? (p.from || defaultCustomFrom) : p.from,
          to: tipo === 'custom' ? (p.to || latestInput) : p.to,
        }))}
        aria-pressed={on}
        className={`btn${on ? ' btn--primary' : ''}`}
        style={{ padding: '7px 12px', fontSize: 12 }}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={centroNombre || 'Centro'} centroId={id}/>
      <main id="main-content" data-page-state={error ? 'error' : 'ready'} className="main reports-page">
        <CentroNavigation centroId={id} />
        {error && <div role="alert">{error}<button type="button" className="btn" onClick={loadHistorial}>Reintentar</button></div>}

        {/* Header */}
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Análisis · Series mensuales</div>
            <h1 className="h-title">Historial &amp; Tendencias</h1>
            <p className="h-sub">{centroNombre} · {meses.length} mes(es) con datos</p>
          </div>
          <Link href={`/centro/${id}/kpi`} className="btn">
            ‹ Volver al KPI
          </Link>
        </div>

        {meses.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>Sin historial aún</p>
            <p className="h-sub" style={{ marginTop: 0 }}>Ingresa datos en el KPI Mensual y guarda para ver tendencias aquí.</p>
          </div>
        ) : (
          <>
            {/* Filtro de rango */}
            <div className="card" style={{ padding: '12px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div className="label">Rango visible</div>
                <p className="h-sub" style={{ marginTop: 3 }}>{visibleRangeLabel} · {visibleMeses.length} de {meses.length} mes(es)</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {filtroBtn('3m', 'Últimos 3 meses')}
                {filtroBtn('12m', 'Últimos 12 meses')}
                {filtroBtn('custom', 'Personalizado')}
                {periodo.tipo === 'custom' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <input
                      aria-label="Desde mes" name="from"
                      type="month"
                      value={periodo.from || defaultCustomFrom}
                      onChange={(e) => setPeriodo((p) => ({ ...p, tipo: 'custom', from: e.target.value }))}
                      className="input num"
                      style={{ width: 138, padding: '7px 10px', fontSize: 12 }}
                    />
                    <span style={{ color: 'var(--text-dim)' }}>→</span>
                    <input
                      aria-label="Hasta mes" name="to"
                      type="month"
                      value={periodo.to || latestInput}
                      onChange={(e) => setPeriodo((p) => ({ ...p, tipo: 'custom', to: e.target.value }))}
                      className="input num"
                      style={{ width: 138, padding: '7px 10px', fontSize: 12 }}
                    />
                  </span>
                )}
              </div>
            </div>

            {visibleMeses.length === 0 ? (
              <div className="alert" style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn-line)', color: 'var(--warn)' }}>
                No hay meses registrados en el rango seleccionado.
              </div>
            ) : (
              <>
            {/* KPIs resumen del último mes */}
            {last && (
              <div style={{ marginBottom: 26 }}>
                <h2 className="label" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Último mes visible: {last.mesLabel}
                  <span className={`pill ${last.estado==='cerrado' ? 'pill--warn' : 'pill--ok'}`}>
                    <span className="dot" />{last.estado==='cerrado' ? 'Cerrado' : 'Abierto'}
                  </span>
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14 }}>
                  <StatCard label="Niños Final Mes" val={last.ninos_final} prev={prev?.ninos_final} color="var(--text)"/>
                  <StatCard label="Prom. Niños/Grupo" val={last.prom_grupo} prev={prev?.prom_grupo} color={last.cumple_prom?C.green:C.bad} meta={8} metaOp="≥"/>
                  <StatCard label="%CV" val={last.pcv} prev={prev?.pcv} unit="%" color="var(--text)" invertTrend/>
                  <StatCard label="GPN" val={last.gpn} prev={prev?.gpn} unit="" color={last.gpn>=0?C.green:C.bad}/>
                  <StatCard label="Nuevos Ingresos Venta" val={last.nuevos_ingresos_venta} prev={prev?.nuevos_ingresos_venta} color={C.green} meta={last.meta_nuevos} metaOp="≥"/>
                  <StatCard label="Activados en el mes" val={last.activados} prev={prev?.activados} color={C.mut}/>
                  <StatCard label="Reincorporados" val={last.reincorporados} prev={prev?.reincorporados} color={C.mut}/>
                  <StatCard label="Grupos Activos" val={last.grupos_activos} prev={prev?.grupos_activos} color="var(--text)"/>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="history-view-tabs" role="group" aria-label="Vistas del historial">
              {vistaBtn('tendencias','Tendencias')}
              {vistaBtn('comparativa','Comparativa')}
              {vistaBtn('tabla','Tabla detalle')}
              {vistaBtn('cuadro','Cuadro de negocio')}
            </div>

            {/* VISTA: TENDENCIAS — una estadística y una escala por gráfica. */}
            {vistaActiva === 'tendencias' && visibleMeses.length > 0 && <>
              <p className="hca-history-guide">Lectura HCA · Tramos rectos por mes, azul cuando mejora y rojo cuando empeora. El mes abierto es provisional. Estas tendencias mensuales complementan la lectura semanal del plan de batalla.</p>
              <div className="reports-grid">
                <GraficaMensualHca centroId={id} titulo="Niños al cierre del mes" campo="ninos_final" unidad="niños" rows={visibleMeses} todas={meses} descripcion="El cierre del mes abierto incluye los inicios y retiros programados; todavía no es un cierre confirmado."/>
                <GraficaMensualHca centroId={id} titulo="Nuevos ingresos por venta" campo="nuevos_ingresos_venta" unidad="inscritos" rows={visibleMeses} todas={meses} meta="meta_nuevos"/>
                <GraficaMensualHca centroId={id} titulo="Activados en el mes" campo="activados" unidad="niños" rows={visibleMeses} todas={meses} descripcion="Primeros inicios de clase más reincorporaciones. La fecha de venta puede ser de otro mes; las reincorporaciones no son ventas nuevas."/>
                <GraficaMensualHca centroId={id} titulo="Promedio de niños por grupo" campo="prom_grupo" unidad="niños/grupo" rows={visibleMeses} todas={meses} meta={8}/>
                <GraficaMensualHca centroId={id} titulo="Costo variable (%CV)" campo="pcv" unidad="%" rows={visibleMeses} todas={meses} inversa descripcion="Eje inverso: los valores menores se ubican arriba. Reducir el costo variable es mejorar."/>
                <GraficaMensualHca centroId={id} titulo="Ganancia por niño (GPN)" campo="gpn" unidad="$ por niño" rows={visibleMeses} todas={meses}/>
              </div>
            </>}

            {/* VISTA: COMPARATIVA — cada subproducto conserva su propia serie. */}
            {vistaActiva === 'comparativa' && visibleMeses.length > 0 && <>
              <p className="hca-history-guide">Lectura HCA · Una estadística por gráfica, periodos iguales y escala propia. Los retiros son inversos. Los totales incluyen el avance provisional de los meses abiertos.</p>
              {COMPARATIVA_HCA.map(grupo => <section key={grupo.id} className="hca-history-group" aria-labelledby={`comparativa-${grupo.id}`}>
                <h2 id={`comparativa-${grupo.id}`} className="panel__title">{grupo.titulo}</h2>
                <p className="h-sub">{grupo.descripcion}</p>
                <div className="reports-grid">{grupo.series.map(serie => {
                  const resumen = resumenComparativo(visibleMeses, grupo, serie.campo)
                  const total = resumen.total == null ? 'Sin dato' : new Intl.NumberFormat('es-PA', {maximumFractionDigits: 1}).format(resumen.total)
                  const porcentaje = resumen.porcentaje == null ? '' : ` · ${resumen.porcentaje.toFixed(1)}% ${grupo.base ? 'respecto a invitados' : 'del total de esta categoría'}`
                  return <GraficaMensualHca key={serie.campo} centroId={id} {...serie} rows={visibleMeses} todas={meses}
                    descripcion={serie.contextual ? grupo.descripcion : `${resumen.completo ? 'Total' : 'Total parcial registrado'} del rango: ${total} ${serie.unidad}${porcentaje}.${resumen.completo ? '' : ' Hay meses sin cifra registrada.'}`}/>
                })}</div>
              </section>)}
            </>}

            {/* VISTA: TABLA */}
            {vistaActiva === 'tabla' && (
              <div className="panel">
                <TableScroller label="Historial mensual" stickyFirstColumn>
                  <table className="table">
                    <thead>
                      <tr>
                        {['Mes','Estado','Niños Inicio','Niños Final','Grupos','Ingresos Venta','Primeros inicios','Meta Venta','Prom/Grupo','%CV','GPN $','Cob.','Deser.'].map(h => (
                          <th key={h} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleMeses.map((m, i) => {
                        const pr = i > 0 ? visibleMeses[i-1] : null
                        return (
                          <tr key={m.mes} style={{ cursor: 'default' }}>
                            <td style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}>{m.mesLabel}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`pill ${m.estado==='cerrado' ? 'pill--warn' : 'pill--ok'}`}>
                                <span className="dot" />{m.estado==='cerrado' ? 'Cerrado' : 'Abierto'}
                              </span>
                            </td>
                            <td className="num" style={{ textAlign: 'center' }}>{m.ninos_inicio}</td>
                            <td className="num" style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text)' }}>
                              {m.ninos_final}
                              {pr && <Trend val={m.ninos_final} prev={pr.ninos_final}/>}
                            </td>
                            <td className="num" style={{ textAlign: 'center' }}>{m.grupos_activos}</td>
                            <td className="num" style={{ textAlign: 'center', color: m.nuevos_ingresos_venta>=m.meta_nuevos?C.green:C.bad, fontWeight: 600 }}>{m.nuevos_ingresos_venta}</td>
                            <td className="num" style={{ textAlign: 'center', color: C.mut, fontWeight: 600 }}>{m.nuevos_activos}</td>
                            <td className="num" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>{m.meta_nuevos}</td>
                            <td className="num" style={{ textAlign: 'center', color: m.cumple_prom?C.green:C.bad, fontWeight: 600 }}>
                              {m.prom_grupo}
                              {pr && <Trend val={m.prom_grupo} prev={pr.prom_grupo}/>}
                            </td>
                            <td className="num" style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {m.pcv}%
                              {pr && <Trend val={m.pcv} prev={pr.pcv}/>}
                            </td>
                            <td className="num" style={{ textAlign: 'center', color: m.gpn>=0?C.green:C.bad, fontWeight: 600 }}>
                              ${m.gpn.toFixed(2)}
                              {pr && <Trend val={m.gpn} prev={pr.gpn}/>}
                            </td>
                            <td className="num" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>{m.meta_cob.toFixed(1)}</td>
                            <td className="num" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>{m.meta_des.toFixed(1)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    {visibleMeses.length > 1 && (
                      <tfoot style={{ background: 'var(--surface-3)', borderTop: '1px solid var(--border-strong)' }}>
                        <tr>
                          <td colSpan={2} className="label" style={{ padding: '12px 16px', color: 'var(--ok-text)' }}>PROMEDIO GENERAL</td>
                          <td className="num" style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{Math.round(visibleMeses.reduce((a,m)=>a+m.ninos_inicio,0)/visibleMeses.length)}</td>
                          <td className="num" style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{Math.round(visibleMeses.reduce((a,m)=>a+m.ninos_final,0)/visibleMeses.length)}</td>
                          <td className="num" style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{Math.round(visibleMeses.reduce((a,m)=>a+m.grupos_activos,0)/visibleMeses.length)}</td>
                          <td className="num" style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{Math.round(visibleMeses.reduce((a,m)=>a+m.nuevos_ingresos_venta,0)/visibleMeses.length)}</td>
                          <td className="num" style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: C.mut }}>{Math.round(visibleMeses.reduce((a,m)=>a+m.nuevos_activos,0)/visibleMeses.length)}</td>
                          <td className="num" style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-dim)' }}>{visibleMeses[0]?.meta_nuevos}</td>
                          <td className="num" style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: visibleMeses.reduce((a,m)=>a+m.prom_grupo,0)/visibleMeses.length>=8?C.green:C.bad }}>
                            {(visibleMeses.reduce((a,m)=>a+m.prom_grupo,0)/visibleMeses.length).toFixed(2)}
                          </td>
                          <td className="num" style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>
                            {(visibleMeses.reduce((a,m)=>a+m.pcv,0)/visibleMeses.length).toFixed(1)}%
                          </td>
                          <td className="num" style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: C.green }}>
                            ${(visibleMeses.reduce((a,m)=>a+m.gpn,0)/visibleMeses.length).toFixed(2)}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table></TableScroller>
              </div>
            )}

            {/* VISTA: CUADRO DE NEGOCIO (fotos congeladas de meses cerrados) */}
            {vistaActiva === 'cuadro' && (() => {
              const conCuadro = mesesConCuadro(visibleMeses)
              if (conCuadro.length === 0) return (
                <div className="alert" style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn-line)', color: 'var(--warn-text)' }}>
                  Aún no hay meses cerrados con foto del cuadro. Al cerrar un mes en KPI Mensual, su Cuadro de Negocio queda congelado y aparece aquí como historial.
                </div>
              )
              return (
                <>
                  <p className="hca-history-guide">Lectura HCA · Datos de las fotos congeladas del cuadro. Los retiros se leen en sentido inverso; los meses sin foto interrumpen el trazo.</p>
                  <div className="reports-grid" style={{marginBottom:20}}>
                    {CUADRO_HCA.map(serie => <GraficaMensualHca key={serie.campo} centroId={id} {...serie} rows={conCuadro} todas={mesesConCuadro(meses)}
                      descripcion={serie.descripcion || 'Fuente: foto congelada del cuadro al cierre del mes.'}/>)}
                  </div>
                  <div className="panel">
                    <div className="panel__head">
                      <h3 className="panel__title">Cuadros congelados por mes</h3>
                      <span className="label">La misma foto que se entregó a la Junta</span>
                    </div>
                    <TableScroller label="Historial mensual" stickyFirstColumn>
                      <table className="table">
                        <thead>
                          <tr>{['Mes','A pagar','Primeros inicios','Reinc.','Retirados','Grupos','Prom/grupo','Royalty','Congelado el'].map((h,i) => (
                            <th key={h} style={i > 0 ? { textAlign: 'center', whiteSpace: 'nowrap' } : undefined}>{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody>
                          {conCuadro.map(m => (
                            <tr key={m.mes} style={{ cursor: 'default' }}>
                              <td style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}>🔒 {m.mesLabel}</td>
                              <td className="num" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{m.cuadro.aPagar}</td>
                              <td className="num" style={{ textAlign: 'center', color: C.green }}>{m.cuadro.nuevos}</td>
                              <td className="num" style={{ textAlign: 'center', color: C.green }}>{m.cuadro.reincorporados}</td>
                              <td className="num" style={{ textAlign: 'center', color: m.cuadro.retirados > 0 ? C.bad : 'var(--text-dim)' }}>{m.cuadro.retirados}</td>
                              <td className="num" style={{ textAlign: 'center' }}>{m.cuadro.gruposActivos}</td>
                              <td className="num" style={{ textAlign: 'center', color: (m.cuadro.promedio ?? 0) >= 8 ? C.green : C.bad }}>
                                {m.cuadro.promedio == null ? '—' : Number(m.cuadro.promedio).toFixed(1)}
                              </td>
                              <td className="num" style={{ textAlign: 'center', fontWeight: 600, color: 'var(--ok-text)' }}>{m.cuadro_royalty == null ? 'Sin dato' : `$${m.cuadro_royalty.toFixed(2)}`}</td>
                              <td className="num" style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-dim)' }}>
                                {m.cuadro.cerrado_at ? String(m.cuadro.cerrado_at).slice(0, 10) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table></TableScroller>
                  </div>
                </>
              )
            })()}

            {visibleMeses.length === 0 && (
              <div className="alert" style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn-line)', color: 'var(--warn-text)' }}>
                No hay meses registrados en este rango. Selecciona otro periodo para consultar el historial.
              </div>
            )}

              </>
            )}

          </>
        )}
      </main>
    </div>
  )
}
