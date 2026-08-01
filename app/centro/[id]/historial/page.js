'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import Sidebar from '../../../../components/Sidebar'
import { getHistorialCentro } from '../../../actions/centro'

const MES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

/* Paleta dark — verde Tessa como serie/acento principal, grises para secundarias */
const C = {
  green:  '#10B981',                  // serie principal / positivo
  greenDeep: '#059669',
  mut:    '#A6A6A6',                  // serie secundaria
  dim:    '#6E6E6E',                  // ejes / labels / serie terciaria
  faint:  '#4A4A4A',
  bad:    '#EF4444',
  warn:   '#F5B23B',
  text:   '#FAFAF7',
  track:  'rgba(255,255,255,0.10)',   // barras "meta"/fondo
}
const GRID = 'rgba(255,255,255,0.08)'

const calcPcv = (prom) => prom > 0 ? (120/prom) + 16 : 0
const calcGpn = (ninosFinal, pcv) => ninosFinal > 0 ? (((ninosFinal*108)*(1-pcv/100)-7800)/ninosFinal) : 0

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
    <div style={{background:'#181818',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'10px 14px',boxShadow:'0 8px 28px rgba(0,0,0,0.5)',fontSize:12}}>
      <p style={{fontWeight:700,color:C.text,marginBottom:6,fontFamily:'var(--font-mono)'}}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{color:p.color,margin:'2px 0'}}>{p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong></p>
      ))}
    </div>
  )
}

const axisTick = { fontSize: 11, fill: C.dim, fontFamily: 'var(--font-mono)' }
const legendStyle = { fontSize: 11, color: C.mut }

export default function HistorialPage() {
  const { id } = useParams()
  const router = useRouter()
  const [centroNombre, setCentroNombre] = useState('')
  const [loading, setLoading] = useState(true)
  const [meses, setMeses] = useState([])
  const [vistaActiva, setVistaActiva] = useState('tendencias') // 'tendencias' | 'tabla' | 'detalle'
  const [mesDetalle, setMesDetalle] = useState(null)

  const loadHistorial = useCallback(async () => {
    setLoading(true)
    const { nombre, resumen, estados, cuadros } = await getHistorialCentro(id)
    if (nombre) setCentroNombre(nombre)

    // Calcular métricas derivadas
    const data = (resumen || []).map((r, i) => {
      const estado = estados?.find(e => e.year === r.year && e.month === r.month)
      const cuadro = cuadros?.find(q => q.year === r.year && q.month === r.month) || null
      const nI = r.ninos_inicio_mes || 0
      const gA = r.grupos_activos || 1
      const nA = r.nuevos_activos_mes || 0
      const totalDes = r.ninos_inicio_mes ? 0 : 0 // will compute from kpi_semanas
      const ninosFinal = r.ninos_final_mes || 0
      const promG = gA > 0 ? ninosFinal / gA : 0
      const pcv = calcPcv(promG)
      const gpn = calcGpn(ninosFinal, pcv)
      const prev = i > 0 ? resumen[i-1] : null
      const prevNF = prev ? (prev.ninos_final_mes || 0) : null

      return {
        mes: MES[r.month-1] + ' ' + r.year,
        mesLabel: MES_FULL[r.month-1] + ' ' + r.year,
        year: r.year, month: r.month,
        estado: estado?.estado || 'abierto',
        cerrado_at: estado?.cerrado_at,
        ninos_inicio: nI,
        ninos_final: ninosFinal,
        grupos_activos: gA,
        nuevos_activos: nA,
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
    })
    setMeses(data)
    setLoading(false)
  }, [id])

  useEffect(() => { loadHistorial() }, [loadHistorial])

  if (loading) return <div style={{display:'flex',minHeight:'100vh',alignItems:'center',justifyContent:'center',background:'var(--bg)',color:'var(--text-dim)',fontFamily:'var(--font-mono)'}}>Cargando historial…</div>

  const chartData = meses.filter(m => m.ninos_final > 0 || m.ninos_inicio > 0)
  const last = meses[meses.length - 1]
  const prev = meses[meses.length - 2]

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
            {/* KPIs resumen del último mes */}
            {last && (
              <div style={{ marginBottom: 26 }}>
                <h2 className="label" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Último mes registrado: {last.mesLabel}
                  <span className={`pill ${last.estado==='cerrado' ? 'pill--warn' : 'pill--ok'}`}>
                    <span className="dot" />{last.estado==='cerrado' ? 'Cerrado' : 'Abierto'}
                  </span>
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14 }}>
                  <StatCard label="Niños Final Mes" val={last.ninos_final} prev={prev?.ninos_final} color="var(--text)"/>
                  <StatCard label="Prom. Niños/Grupo" val={last.prom_grupo} prev={prev?.prom_grupo} color={last.cumple_prom?C.green:C.bad} meta={8} metaOp="≥"/>
                  <StatCard label="%CV" val={last.pcv} prev={prev?.pcv} unit="%" color="var(--text)" invertTrend/>
                  <StatCard label="GPN" val={last.gpn} prev={prev?.gpn} unit="" color={last.gpn>=0?C.green:C.bad}/>
                  <StatCard label="Nuevos Activos" val={last.nuevos_activos} prev={prev?.nuevos_activos} color={C.green} meta={last.meta_nuevos} metaOp="≥"/>
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
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill: 'rgba(255,255,255,0.04)' }}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle}/>
                      <Line type="monotone" dataKey="ninos_inicio" name="Inicio mes" stroke={C.mut} strokeWidth={2} dot={{r:4}}/>
                      <Line type="monotone" dataKey="ninos_final" name="Final mes" stroke={C.green} strokeWidth={2.5} dot={{r:4}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Gráfica 2: Nuevos vs Meta */}
                <ChartCard title="Nuevos Ingresos vs Meta">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                      <XAxis dataKey="mes" tick={axisTick} stroke={C.faint}/>
                      <YAxis tick={axisTick} stroke={C.faint}/>
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill: 'rgba(255,255,255,0.04)' }}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle}/>
                      <Bar dataKey="nuevos_activos" name="Nuevos activos" fill={C.green} radius={[4,4,0,0]}/>
                      <Bar dataKey="meta_nuevos" name="Meta mensual" fill={C.track} radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Gráfica 3: Promedio niños/grupo */}
                <ChartCard title="Promedio Niños por Grupo" sub="Meta: ≥ 8 niños/grupo">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                      <XAxis dataKey="mes" tick={axisTick} stroke={C.faint}/>
                      <YAxis tick={axisTick} stroke={C.faint} domain={[0,'auto']}/>
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill: 'rgba(255,255,255,0.04)' }}/>
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
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill: 'rgba(255,255,255,0.04)' }}/>
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
                      <YAxis tick={axisTick} stroke={C.faint}/>
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill: 'rgba(255,255,255,0.04)' }}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle}/>
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
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill: 'rgba(255,255,255,0.04)' }}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle}/>
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
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill: 'rgba(255,255,255,0.04)' }}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle}/>
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
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill: 'rgba(255,255,255,0.04)' }}/>
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
                        {['Mes','Estado','Niños Inicio','Niños Final','Grupos','Nuevos','Meta N','Prom/Grupo','%CV','GPN $','Cob.','Deser.'].map(h => (
                          <th key={h} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {meses.map((m, i) => {
                        const pr = i > 0 ? meses[i-1] : null
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
                            <td className="num" style={{ textAlign: 'center', color: m.nuevos_activos>=m.meta_nuevos?C.green:C.bad, fontWeight: 600 }}>{m.nuevos_activos}</td>
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
                    {meses.length > 1 && (
                      <tfoot style={{ background: 'var(--surface-3)', borderTop: '1px solid var(--border-strong)' }}>
                        <tr>
                          <td colSpan={2} className="label" style={{ padding: '12px 16px', color: 'var(--ts-green)' }}>PROMEDIO GENERAL</td>
                          <td className="num" style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{Math.round(meses.reduce((a,m)=>a+m.ninos_inicio,0)/meses.length)}</td>
                          <td className="num" style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{Math.round(meses.reduce((a,m)=>a+m.ninos_final,0)/meses.length)}</td>
                          <td className="num" style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{Math.round(meses.reduce((a,m)=>a+m.grupos_activos,0)/meses.length)}</td>
                          <td className="num" style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{Math.round(meses.reduce((a,m)=>a+m.nuevos_activos,0)/meses.length)}</td>
                          <td className="num" style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-dim)' }}>{meses[0]?.meta_nuevos}</td>
                          <td className="num" style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: meses.reduce((a,m)=>a+m.prom_grupo,0)/meses.length>=8?C.green:C.bad }}>
                            {(meses.reduce((a,m)=>a+m.prom_grupo,0)/meses.length).toFixed(2)}
                          </td>
                          <td className="num" style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>
                            {(meses.reduce((a,m)=>a+m.pcv,0)/meses.length).toFixed(1)}%
                          </td>
                          <td className="num" style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: C.green }}>
                            ${(meses.reduce((a,m)=>a+m.gpn,0)/meses.length).toFixed(2)}
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
              const conCuadro = meses.filter(m => m.cuadro)
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
                          <Tooltip content={<CustomTooltip/>} cursor={{ fill: 'rgba(255,255,255,0.04)' }}/>
                          <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle}/>
                          <Bar dataKey="cuadro_nuevos" name="Nuevos" fill={C.greenDeep} radius={[4,4,0,0]}/>
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
                          <Tooltip content={<CustomTooltip/>} cursor={{ fill: 'rgba(255,255,255,0.04)' }}/>
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
                          <tr>{['Mes','A pagar','Nuevos','Reinc.','Retirados','Grupos','Prom/grupo','Royalty','Congelado el'].map((h,i) => (
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
      </main>
    </div>
  )
}
