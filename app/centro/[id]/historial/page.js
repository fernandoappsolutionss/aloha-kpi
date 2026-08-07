'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import Sidebar from '../../../../components/Sidebar'
import { getHistorialCentro } from '../../../actions/centro'

const MES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

/* Paleta conectada al tema: en light las barras grises ya no se pierden. */
const C = {
  green:  'var(--ts-green)',
  greenDeep: 'var(--ts-green-deep)',
  mut:    'var(--chart-muted)',
  dim:    'var(--text-dim)',
  faint:  'var(--chart-axis)',
  bad:    'var(--bad)',
  warn:   'var(--warn)',
  text:   'var(--text)',
  track:  'var(--chart-track)',
  cursor: 'var(--chart-cursor)',
}
const GRID = 'var(--chart-grid)'

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
const sumKey = (data, key) => data.reduce((acc, row) => acc + (Number(row[key]) || 0), 0)
const pctLabel = (value) => {
  if (!Number.isFinite(value)) return '0%'
  const digits = Math.abs(value) > 0 && Math.abs(value) < 10 ? 1 : 0
  return `${value.toFixed(digits)}%`
}
const sharePercentages = (data, keys) => {
  const totals = keys.reduce((acc, key) => ({ ...acc, [key]: sumKey(data, key) }), {})
  const total = Object.values(totals).reduce((acc, value) => acc + value, 0)
  return keys.reduce((acc, key) => ({ ...acc, [key]: total > 0 ? (totals[key] / total) * 100 : 0 }), {})
}
const funnelPercentages = (data, keys, baseKey) => {
  const base = sumKey(data, baseKey)
  return keys.reduce((acc, key) => ({ ...acc, [key]: base > 0 ? (sumKey(data, key) / base) * 100 : 0 }), {})
}

const Trend = ({ val, prev }) => {
  if (prev === undefined || prev === null) return null
  const diff = val - prev
  if (Math.abs(diff) < 0.01) return <span style={{color:C.dim,fontSize:11}}> →</span>
  return diff > 0
    ? <span style={{color:C.green,fontSize:11}}> ↑ {Math.abs(diff).toFixed(1)}</span>
    : <span style={{color:C.bad,fontSize:11}}> ↓ {Math.abs(diff).toFixed(1)}</span>
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{background:'var(--chart-tooltip-bg)',border:'1px solid var(--chart-tooltip-border)',borderRadius:8,padding:'10px 14px',boxShadow:'var(--chart-tooltip-shadow)',fontSize:12}}>
      <p style={{fontWeight:700,color:C.text,marginBottom:6,fontFamily:'var(--font-mono)'}}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{color:p.color,margin:'2px 0'}}>{p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong></p>
      ))}
    </div>
  )
}

const axisTick = { fontSize: 11, fill: C.dim, fontFamily: 'var(--font-mono)' }
const legendStyle = { fontSize: 11, color: C.mut }

const LegendWithPercent = ({ payload, percentages }) => {
  if (!payload?.length) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 6, color: 'var(--text-dim)', fontSize: 11 }}>
      {payload.map((item) => {
        const key = item.dataKey || item.payload?.dataKey || item.value
        const color = item.color || item.payload?.fill || item.payload?.stroke || 'var(--text-dim)'
        return (
          <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: color, flexShrink: 0 }} />
            <span>{item.value}</span>
            {percentages?.[key] !== undefined && (
              <span className="num" style={{ color: 'var(--text-muted)' }}>({pctLabel(percentages[key])})</span>
            )}
          </span>
        )
      })}
    </div>
  )
}

export default function HistorialPage() {
  const { id } = useParams()
  const router = useRouter()
  const [centroNombre, setCentroNombre] = useState('')
  const [loading, setLoading] = useState(true)
  const [meses, setMeses] = useState([])
  const [vistaActiva, setVistaActiva] = useState('tendencias') // 'tendencias' | 'tabla' | 'detalle'
  const [periodo, setPeriodo] = useState({ tipo: '12m', from: '', to: '' })
  const [mesDetalle, setMesDetalle] = useState(null)

  const loadHistorial = useCallback(async () => {
    setLoading(true)
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
      const cuadro = cuadros?.find(q => q.year === r.year && q.month === r.month) || null
      const semana = semanasPorMes.get(`${r.year}-${r.month}`) || null
      const rawInicio = Number(r.ninos_inicio_mes) || 0
      const nI = keyAnterior === key - 1 && cierreAnterior > 0 ? cierreAnterior : rawInicio
      const gA = r.grupos_activos || 1
      const nuevosSemanal = Number(semana?.nuevos_ingresos_venta) || 0
      const nuevosCuadro = Number(cuadro?.nuevos) || 0
      const nA = r.nuevos_activos_mes == null ? nuevosCuadro : Number(r.nuevos_activos_mes)
      const totalDes = Number(semana?.total_desercion) || 0
      const reincorporados = Number(cuadro?.reincorporados) || 0
      const rawFinal = Number(r.ninos_final_mes) || 0
      const cuadroFinal = Number(cuadro?.aPagar) || 0
      const ninosFinal = rawFinal > 0 ? rawFinal : (cuadroFinal > 0 ? cuadroFinal : Math.max(0, nI + nA + reincorporados - totalDes))
      const promG = gA > 0 ? ninosFinal / gA : 0
      const pcv = calcPcv(promG)
      const gpn = calcGpn(ninosFinal, pcv)
      const prevNF = keyAnterior === key - 1 ? cierreAnterior : null

      const row = {
        mes: MES[r.month-1] + ' ' + r.year,
        mesLabel: MES_FULL[r.month-1] + ' ' + r.year,
        year: r.year, month: r.month,
        estado: estado?.estado || 'abierto',
        cerrado_at: estado?.cerrado_at,
        ninos_inicio: nI,
        ninos_final: ninosFinal,
        grupos_activos: gA,
        nuevos_activos: nA,
        nuevos_ingresos_venta: nuevosSemanal,
        meta_nuevos: r.meta_nuevos_mensual || 20,
        cp_invitados: r.cp_invitados || 0,
        cp_asistieron: r.cp_asistieron || 0,
        cp_matriculados: r.cp_matriculados || 0,
        mot_tecnica: r.mot_tecnica || 0,
        mot_perdida_clase: r.mot_perdida_clase || 0,
        mot_economico: r.mot_economico || 0,
        mot_horario: r.mot_horario || 0,
        orig_referido: r.orig_referido || 0,
        orig_marketing: r.orig_marketing || 0,
        orig_centro: r.orig_centro || 0,
        orig_activaciones: r.orig_activaciones || 0,
        prom_grupo: parseFloat(promG.toFixed(2)),
        pcv: parseFloat(pcv.toFixed(1)),
        gpn: parseFloat(gpn.toFixed(2)),
        prev_ninos_final: prevNF,
        cumple_prom: promG >= 8,
        meta_cob: parseFloat(((nI * 0.015)).toFixed(1)),
        meta_des: parseFloat((nI * 0.08).toFixed(1)),
        // Foto congelada del Cuadro de Negocio (solo meses cerrados).
        cuadro,
        cuadro_aPagar: cuadro ? cuadro.aPagar : null,
        cuadro_nuevos: cuadro ? cuadro.nuevos : null,
        cuadro_retirados: cuadro ? cuadro.retirados : null,
        cuadro_royalty: cuadro ? Number(cuadro.royalty) || 0 : null,
      }
      cierreAnterior = ninosFinal
      keyAnterior = key
      return row
    })
    setMeses(data)
    setLoading(false)
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

  if (loading) return <div style={{display:'flex',minHeight:'100vh',alignItems:'center',justifyContent:'center',background:'var(--bg)',color:'var(--text-dim)',fontFamily:'var(--font-mono)'}}>Cargando historial…</div>

  const chartData = visibleMeses.filter(m => m.ninos_final > 0 || m.ninos_inicio > 0)
  const last = visibleMeses[visibleMeses.length - 1]
  const prev = visibleMeses[visibleMeses.length - 2]
  const originPct = sharePercentages(chartData, ['orig_referido', 'orig_marketing', 'orig_centro', 'orig_activaciones'])
  const desertionPct = sharePercentages(chartData, ['mot_perdida_clase', 'mot_economico', 'mot_tecnica', 'mot_horario'])
  const funnelPct = funnelPercentages(chartData, ['cp_invitados', 'cp_asistieron', 'cp_matriculados'], 'cp_invitados')
  const goalPct = {
    nuevos_ingresos_venta: sumKey(chartData, 'meta_nuevos') > 0 ? (sumKey(chartData, 'nuevos_ingresos_venta') / sumKey(chartData, 'meta_nuevos')) * 100 : 0,
    meta_nuevos: 100,
  }
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
      <button onClick={()=>setVistaActiva(v)} className={`btn${on ? ' btn--primary' : ''}`} style={{ padding: '9px 18px' }}>
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
        className={`btn${on ? ' btn--primary' : ''}`}
        style={{ padding: '7px 12px', fontSize: 12 }}
      >
        {label}
      </button>
    )
  }

  // Wrapper para cada tarjeta de gráfica.
  // minWidth:0 es imprescindible: como cada tarjeta es un ítem de un grid
  // `1fr 1fr` (cuyo min-width por defecto es `auto`), sin esto el
  // ResponsiveContainer de recharts mide ancho 0 y la gráfica sale en blanco.
  const ChartCard = ({ title, sub, children }) => (
    <div className="card" style={{ padding: 20, minWidth: 0 }}>
      <h3 className="panel__title" style={{ fontSize: 16, marginBottom: sub ? 4 : 16 }}>{title}</h3>
      {sub && <p className="h-sub" style={{ marginTop: 0, marginBottom: 12 }}>{sub}</p>}
      {children}
    </div>
  )

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={centroNombre || 'Centro'} centroId={id}/>
      <main className="main">

        {/* Header */}
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Análisis · Series mensuales</div>
            <h1 className="h-title">Historial &amp; Tendencias</h1>
            <p className="h-sub">{centroNombre} · {meses.length} mes(es) con datos</p>
          </div>
          <button onClick={()=>router.push('/centro/'+id+'/kpi')} className="btn">
            ‹ Volver al KPI
          </button>
        </div>

        {meses.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>Sin historial aún</p>
            <p className="h-sub" style={{ marginTop: 0 }}>Ingresa datos en el KPI Semanal y guarda para ver tendencias aquí.</p>
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
                      type="month"
                      value={periodo.from || defaultCustomFrom}
                      onChange={(e) => setPeriodo((p) => ({ ...p, tipo: 'custom', from: e.target.value }))}
                      className="input num"
                      style={{ width: 138, padding: '7px 10px', fontSize: 12 }}
                    />
                    <span style={{ color: 'var(--text-dim)' }}>→</span>
                    <input
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
                  <StatCard label="Nuevos Activos del Mes" val={last.nuevos_activos} prev={prev?.nuevos_activos} color={C.mut}/>
                  <StatCard label="Grupos Activos" val={last.grupos_activos} prev={prev?.grupos_activos} color="var(--text)"/>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {vistaBtn('tendencias','Tendencias')}
              {vistaBtn('comparativa','Comparativa')}
              {vistaBtn('tabla','Tabla detalle')}
              {vistaBtn('cuadro','Cuadro de negocio')}
            </div>

            {/* VISTA: TENDENCIAS */}
            {vistaActiva === 'tendencias' && chartData.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                {/* Gráfica 1: Niños (inicio vs final) */}
                <ChartCard title="Evolución de Niños por Mes">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                      <XAxis dataKey="mes" tick={axisTick} stroke={C.faint}/>
                      <YAxis tick={axisTick} stroke={C.faint}/>
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill: C.cursor }}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle}/>
                      <Line type="monotone" dataKey="ninos_inicio" name="Inicio mes" stroke={C.mut} strokeWidth={2} dot={{r:4}}/>
                      <Line type="monotone" dataKey="ninos_final" name="Final mes" stroke={C.green} strokeWidth={2.5} dot={{r:4}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Gráfica 2: ventas, nuevos activos y meta comercial */}
                <ChartCard title="Ventas, Activos y Meta" sub="La meta comercial aplica solo a ventas">
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                      <XAxis dataKey="mes" tick={axisTick} stroke={C.faint}/>
                      <YAxis tick={axisTick} stroke={C.faint}/>
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill: C.cursor }}/>
                      <Legend content={(props) => <LegendWithPercent {...props} percentages={goalPct} />}/>
                      <Bar dataKey="nuevos_ingresos_venta" name="Nuevos ingresos venta" fill={C.green} radius={[4,4,0,0]}/>
                      <Line type="monotone" dataKey="nuevos_activos" name="Nuevos activos" stroke={C.mut} strokeWidth={2.5} dot={{r:4,fill:'var(--surface-1)',stroke:C.mut,strokeWidth:2}}/>
                      <Line type="stepAfter" dataKey="meta_nuevos" name="Meta venta" stroke={C.warn} strokeWidth={2.5} strokeDasharray="6 5" dot={{r:3,fill:C.warn}}/>
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Gráfica 3: Promedio niños/grupo */}
                <ChartCard title="Promedio Niños por Grupo" sub="Meta: ≥ 8 niños/grupo">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                      <XAxis dataKey="mes" tick={axisTick} stroke={C.faint}/>
                      <YAxis tick={axisTick} stroke={C.faint} domain={[0,'auto']}/>
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill: C.cursor }}/>
                      <ReferenceLine y={8} stroke={C.warn} strokeDasharray="5 5" label={{value:'Meta 8',fill:C.warn,fontSize:10,position:'right'}}/>
                      <Line type="monotone" dataKey="prom_grupo" name="Prom. niños/grupo" stroke={C.green} strokeWidth={2.5} dot={{r:4,fill:C.green}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Gráfica 4: %CV y GPN */}
                <ChartCard title="%CV y GPN (Rentabilidad)" sub="%CV = Costo Variable. GPN = Ganancia por Niño">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                      <XAxis dataKey="mes" tick={axisTick} stroke={C.faint}/>
                      <YAxis yAxisId="left" tick={axisTick} stroke={C.faint} label={{value:'%CV',angle:-90,position:'insideLeft',fontSize:10,fill:C.dim}}/>
                      <YAxis yAxisId="right" orientation="right" tick={axisTick} stroke={C.faint} label={{value:'GPN $',angle:90,position:'insideRight',fontSize:10,fill:C.dim}}/>
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill: C.cursor }}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle}/>
                      <Line yAxisId="left" type="monotone" dataKey="pcv" name="%CV" stroke={C.mut} strokeWidth={2} dot={{r:4}}/>
                      <Line yAxisId="right" type="monotone" dataKey="gpn" name="GPN $" stroke={C.green} strokeWidth={2.5} dot={{r:4}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

              </div>
            )}

            {/* VISTA: COMPARATIVA */}
            {vistaActiva === 'comparativa' && chartData.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                {/* Origen de nuevos ingresos */}
                <ChartCard title="Origen de Nuevos Ingresos por Mes">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} stackOffset="expand">
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                      <XAxis dataKey="mes" tick={axisTick} stroke={C.faint}/>
                      <YAxis tick={axisTick} stroke={C.faint} tickFormatter={(value) => `${Math.round(value * 100)}%`}/>
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill: C.cursor }}/>
                      <Legend content={(props) => <LegendWithPercent {...props} percentages={originPct} />}/>
                      <Bar dataKey="orig_referido" name="Referido" fill={C.green} stackId="a" radius={[0,0,0,0]}/>
                      <Bar dataKey="orig_marketing" name="Marketing" fill={C.greenDeep} stackId="a"/>
                      <Bar dataKey="orig_centro" name="Centro" fill={C.mut} stackId="a"/>
                      <Bar dataKey="orig_activaciones" name="Activaciones" fill={C.dim} stackId="a" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Motivos deserción */}
                <ChartCard title="Motivos de Deserción por Mes">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                      <XAxis dataKey="mes" tick={axisTick} stroke={C.faint}/>
                      <YAxis tick={axisTick} stroke={C.faint}/>
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill: C.cursor }}/>
                      <Legend content={(props) => <LegendWithPercent {...props} percentages={desertionPct} />}/>
                      <Bar dataKey="mot_perdida_clase" name="Pérd. clase" fill={C.bad} stackId="b"/>
                      <Bar dataKey="mot_economico" name="Económico" fill={C.warn} stackId="b"/>
                      <Bar dataKey="mot_tecnica" name="Técnica" fill={C.mut} stackId="b"/>
                      <Bar dataKey="mot_horario" name="Horario" fill={C.dim} stackId="b" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Clase de prueba */}
                <ChartCard title="Clase de Prueba — Embudo">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                      <XAxis dataKey="mes" tick={axisTick} stroke={C.faint}/>
                      <YAxis tick={axisTick} stroke={C.faint}/>
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill: C.cursor }}/>
                      <Legend content={(props) => <LegendWithPercent {...props} percentages={funnelPct} />}/>
                      <Bar dataKey="cp_invitados" name="Invitados" fill={C.track} radius={[4,4,0,0]}/>
                      <Bar dataKey="cp_asistieron" name="Asistieron" fill={C.mut} radius={[4,4,0,0]}/>
                      <Bar dataKey="cp_matriculados" name="Matriculados" fill={C.green} radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Grupos activos */}
                <ChartCard title="Grupos Activos por Mes" sub="Más grupos = mayor capacidad de ingresos">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                      <XAxis dataKey="mes" tick={axisTick} stroke={C.faint}/>
                      <YAxis tick={axisTick} stroke={C.faint}/>
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill: C.cursor }}/>
                      <Bar dataKey="grupos_activos" name="Grupos activos" fill={C.green} radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

              </div>
            )}

            {/* VISTA: TABLA */}
            {vistaActiva === 'tabla' && (
              <div className="panel">
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        {['Mes','Estado','Niños Inicio','Niños Final','Grupos','Ingresos Venta','Nuevos Activos','Meta Venta','Prom/Grupo','%CV','GPN $','Cob.','Deser.'].map(h => (
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
                          <td colSpan={2} className="label" style={{ padding: '12px 16px', color: 'var(--ts-green)' }}>PROMEDIO GENERAL</td>
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
                  </table>
                </div>
              </div>
            )}

            {/* VISTA: CUADRO DE NEGOCIO (fotos congeladas de meses cerrados) */}
            {vistaActiva === 'cuadro' && (() => {
              const conCuadro = visibleMeses.filter(m => m.cuadro)
              if (conCuadro.length === 0) return (
                <div className="alert" style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn-line)', color: '#FCD34D' }}>
                  Aún no hay meses cerrados con foto del cuadro. Al cerrar un mes en KPI Semanal, su Cuadro de Negocio queda congelado y aparece aquí como historial.
                </div>
              )
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                    <ChartCard title="Niños a pagar y movimientos" sub="Foto congelada al cierre de cada mes">
                      <ResponsiveContainer width="100%" height={220}>
                        <ComposedChart data={conCuadro}>
                          <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                          <XAxis dataKey="mes" tick={axisTick} stroke={C.faint}/>
                          <YAxis tick={axisTick} stroke={C.faint}/>
                          <Tooltip content={<CustomTooltip/>} cursor={{ fill: C.cursor }}/>
                          <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle}/>
                          <Bar dataKey="cuadro_nuevos" name="Nuevos activos" fill={C.greenDeep} radius={[4,4,0,0]}/>
                          <Bar dataKey="cuadro_retirados" name="Retirados" fill={C.bad} radius={[4,4,0,0]}/>
                          <Line type="monotone" dataKey="cuadro_aPagar" name="Niños a pagar" stroke={C.green} strokeWidth={2.5} dot={{r:4}}/>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="Royalty mensual" sub={'Congelado con el cuadro de cada mes'}>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={conCuadro}>
                          <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                          <XAxis dataKey="mes" tick={axisTick} stroke={C.faint}/>
                          <YAxis tick={axisTick} stroke={C.faint}/>
                          <Tooltip content={<CustomTooltip/>} cursor={{ fill: C.cursor }}/>
                          <Line type="monotone" dataKey="cuadro_royalty" name="Royalty $" stroke={C.green} strokeWidth={2.5} dot={{r:4}}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </div>
                  <div className="panel">
                    <div className="panel__head">
                      <h3 className="panel__title">Cuadros congelados por mes</h3>
                      <span className="label">La misma foto que se entregó a la Junta</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>{['Mes','A pagar','Nuevos activos','Reinc.','Retirados','Grupos','Prom/grupo','Royalty','Congelado el'].map((h,i) => (
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
                              <td className="num" style={{ textAlign: 'center', fontWeight: 600, color: 'var(--ts-green)' }}>${Number(m.cuadro.royalty || 0).toFixed(2)}</td>
                              <td className="num" style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-dim)' }}>
                                {m.cuadro.cerrado_at ? String(m.cuadro.cerrado_at).slice(0, 10) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )
            })()}

            {chartData.length === 0 && (
              <div className="alert" style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn-line)', color: '#FCD34D' }}>
                Los meses tienen datos de configuración pero aún no hay suficiente información para graficar. Ingresa los datos en el KPI Semanal y guarda.
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
