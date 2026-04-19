'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import Sidebar from '../../../../components/Sidebar'
import { supabase } from '../../../../lib/supabase'

const MES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const A = { blue:'#1B4580', blueMid:'#1D5FA6', green:'#4A8C3F', red:'#D63C3C', lime:'#B8D432', orange:'#E67E22', purple:'#7B68EE', gray:'#F5F7FA', text:'#1A2744' }

const calcPcv = (prom) => prom > 0 ? (120/prom) + 16 : 0
const calcGpn = (ninosFinal, pcv) => ninosFinal > 0 ? (((ninosFinal*108)*(1-pcv/100)-7800)/ninosFinal) : 0

const Trend = ({ val, prev }) => {
  if (prev === undefined || prev === null) return null
  const diff = val - prev
  if (Math.abs(diff) < 0.01) return <span style={{color:'#8896A9',fontSize:11}}> →</span>
  return diff > 0
    ? <span style={{color:A.green,fontSize:11}}> ↑ {Math.abs(diff).toFixed(1)}</span>
    : <span style={{color:A.red,fontSize:11}}> ↓ {Math.abs(diff).toFixed(1)}</span>
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:8,padding:'10px 14px',boxShadow:'0 4px 12px rgba(0,0,0,0.1)',fontSize:12}}>
      <p style={{fontWeight:700,color:A.text,marginBottom:6}}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{color:p.color,margin:'2px 0'}}>{p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong></p>
      ))}
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
  const [mesDetalle, setMesDetalle] = useState(null)

  const loadHistorial = useCallback(async () => {
    setLoading(true)
    const { data: c } = await supabase.from('centros').select('nombre').eq('id', id).single()
    if (c) setCentroNombre(c.nombre)

    // Todos los meses (abiertos y cerrados) con datos
    const { data: resumen } = await supabase
      .from('resumen_mes')
      .select('*')
      .eq('centro_id', id)
      .order('year', { ascending: true })
      .order('month', { ascending: true })

    const { data: estados } = await supabase
      .from('mes_kpi')
      .select('year,month,estado,cerrado_at')
      .eq('centro_id', id)

    // Calcular métricas derivadas
    const data = (resumen || []).map((r, i) => {
      const estado = estados?.find(e => e.year === r.year && e.month === r.month)
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
      }
    })
    setMeses(data)
    setLoading(false)
  }, [id])

  useEffect(() => { loadHistorial() }, [loadHistorial])

  if (loading) return <div style={{display:'flex',minHeight:'100vh',alignItems:'center',justifyContent:'center',color:A.blue,fontWeight:600}}>Cargando historial...</div>

  const chartData = meses.filter(m => m.ninos_final > 0 || m.ninos_inicio > 0)
  const last = meses[meses.length - 1]
  const prev = meses[meses.length - 2]

  const StatCard = ({ label, val, prev, unit='', color=A.blue, meta, metaOp, invertTrend }) => {
    const prevVal = prev
    const diff = prevVal !== undefined ? val - prevVal : null
    const trendUp = diff !== null && diff !== 0 ? diff > 0 : null
    const trendGood = invertTrend ? (trendUp === false) : (trendUp === true)
    return (
      <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,padding:'16px 18px',boxShadow:'0 2px 8px rgba(27,69,128,0.06)'}}>
        <p style={{fontSize:10,color:'#8896A9',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>{label}</p>
        <p style={{fontSize:24,fontWeight:800,color,margin:0}}>{typeof val==='number'?val.toFixed(unit==='%'?1:0):val}{unit}</p>
        {diff !== null && diff !== 0 && (
          <p style={{fontSize:11,color:trendGood?A.green:A.red,fontWeight:600,marginTop:4}}>
            {diff > 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}{unit} vs mes anterior
          </p>
        )}
        {meta && <p style={{fontSize:10,color:'#8896A9',marginTop:4}}>Meta: {metaOp} {meta}</p>}
      </div>
    )
  }

  const vistaBtn = (v, label) => (
    <button onClick={()=>setVistaActiva(v)} style={{padding:'8px 18px',borderRadius:8,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,background:vistaActiva===v?A.blue:'#fff',color:vistaActiva===v?'#fff':'#4A5568',boxShadow:'0 1px 4px rgba(0,0,0,0.08)'}}>
      {label}
    </button>
  )

  return (
    <div style={{display:'flex',minHeight:'100vh',background:A.gray}}>
      <Sidebar rol="usuario" centroNombre={centroNombre || 'Centro'} centroId={id}/>
      <main style={{flex:1,padding:24,overflowY:'auto'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <div>
            <h1 style={{fontSize:18,fontWeight:700,color:A.text}}>Historial & Tendencias</h1>
            <p style={{fontSize:12,color:'#8896A9'}}>{centroNombre} · {meses.length} mes(es) con datos</p>
          </div>
          <button onClick={()=>router.push('/centro/'+id+'/kpi')}
            style={{padding:'9px 20px',background:'#fff',border:'1px solid #E8EBF0',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',color:A.blue}}>
            ← Volver al KPI
          </button>
        </div>

        {meses.length === 0 ? (
          <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,padding:48,textAlign:'center'}}>
            <p style={{fontSize:18,fontWeight:700,color:'#8896A9',marginBottom:8}}>Sin historial aún</p>
            <p style={{fontSize:13,color:'#8896A9'}}>Ingresa datos en el KPI Semanal y guarda para ver tendencias aquí.</p>
          </div>
        ) : (
          <>
            {/* KPIs resumen del último mes */}
            {last && (
              <div style={{marginBottom:24}}>
                <h2 style={{fontSize:13,fontWeight:700,color:'#8896A9',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:12}}>
                  Último mes registrado: {last.mesLabel} {last.estado==='cerrado'?'🔒':'📝'}
                </h2>
                <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12}}>
                  <StatCard label="Niños Final Mes" val={last.ninos_final} prev={prev?.ninos_final} color={A.blue}/>
                  <StatCard label="Prom. Niños/Grupo" val={last.prom_grupo} prev={prev?.prom_grupo} color={last.cumple_prom?A.green:A.red} meta={8} metaOp="≥"/>
                  <StatCard label="%CV" val={last.pcv} prev={prev?.pcv} unit="%" color="#7B68EE" invertTrend/>
                  <StatCard label="GPN" val={last.gpn} prev={prev?.gpn} unit="" color={last.gpn>=0?A.green:A.red}/>
                  <StatCard label="Nuevos Activos" val={last.nuevos_activos} prev={prev?.nuevos_activos} color={A.green} meta={last.meta_nuevos} metaOp="≥"/>
                  <StatCard label="Grupos Activos" val={last.grupos_activos} prev={prev?.grupos_activos} color={A.orange}/>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{display:'flex',gap:6,marginBottom:20}}>
              {vistaBtn('tendencias','📈 Tendencias')}
              {vistaBtn('comparativa','📊 Comparativa')}
              {vistaBtn('tabla','📋 Tabla detalle')}
            </div>

            {/* VISTA: TENDENCIAS */}
            {vistaActiva === 'tendencias' && chartData.length > 0 && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>

                {/* Gráfica 1: Niños (inicio vs final) */}
                <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(27,69,128,0.06)'}}>
                  <h3 style={{fontSize:13,fontWeight:700,color:A.text,marginBottom:16}}>Evolución de Niños por Mes</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F6"/>
                      <XAxis dataKey="mes" tick={{fontSize:11}} />
                      <YAxis tick={{fontSize:11}}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/>
                      <Line type="monotone" dataKey="ninos_inicio" name="Inicio mes" stroke={A.blueMid} strokeWidth={2} dot={{r:4}}/>
                      <Line type="monotone" dataKey="ninos_final" name="Final mes" stroke={A.blue} strokeWidth={2.5} dot={{r:4}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Gráfica 2: Nuevos vs Meta */}
                <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(27,69,128,0.06)'}}>
                  <h3 style={{fontSize:13,fontWeight:700,color:A.text,marginBottom:16}}>Nuevos Ingresos vs Meta</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F6"/>
                      <XAxis dataKey="mes" tick={{fontSize:11}}/>
                      <YAxis tick={{fontSize:11}}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/>
                      <Bar dataKey="nuevos_activos" name="Nuevos activos" fill={A.green} radius={[4,4,0,0]}/>
                      <Bar dataKey="meta_nuevos" name="Meta mensual" fill="#E8EBF0" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Gráfica 3: Promedio niños/grupo */}
                <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(27,69,128,0.06)'}}>
                  <h3 style={{fontSize:13,fontWeight:700,color:A.text,marginBottom:4}}>Promedio Niños por Grupo</h3>
                  <p style={{fontSize:11,color:'#8896A9',marginBottom:12}}>Meta: ≥ 8 niños/grupo</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F6"/>
                      <XAxis dataKey="mes" tick={{fontSize:11}}/>
                      <YAxis tick={{fontSize:11}} domain={[0,'auto']}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <ReferenceLine y={8} stroke={A.orange} strokeDasharray="5 5" label={{value:'Meta 8',fill:A.orange,fontSize:10,position:'right'}}/>
                      <Line type="monotone" dataKey="prom_grupo" name="Prom. niños/grupo" stroke={A.green} strokeWidth={2.5} dot={{r:4,fill:A.green}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Gráfica 4: %CV y GPN */}
                <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(27,69,128,0.06)'}}>
                  <h3 style={{fontSize:13,fontWeight:700,color:A.text,marginBottom:4}}>%CV y GPN (Rentabilidad)</h3>
                  <p style={{fontSize:11,color:'#8896A9',marginBottom:12}}>%CV = Costo Variable. GPN = Ganancia por Niño</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F6"/>
                      <XAxis dataKey="mes" tick={{fontSize:11}}/>
                      <YAxis yAxisId="left" tick={{fontSize:11}} label={{value:'%CV',angle:-90,position:'insideLeft',fontSize:10}}/>
                      <YAxis yAxisId="right" orientation="right" tick={{fontSize:11}} label={{value:'GPN $',angle:90,position:'insideRight',fontSize:10}}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/>
                      <Line yAxisId="left" type="monotone" dataKey="pcv" name="%CV" stroke="#7B68EE" strokeWidth={2} dot={{r:4}}/>
                      <Line yAxisId="right" type="monotone" dataKey="gpn" name="GPN $" stroke={A.orange} strokeWidth={2.5} dot={{r:4}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>

              </div>
            )}

            {/* VISTA: COMPARATIVA */}
            {vistaActiva === 'comparativa' && chartData.length > 0 && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>

                {/* Origen de nuevos ingresos */}
                <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(27,69,128,0.06)'}}>
                  <h3 style={{fontSize:13,fontWeight:700,color:A.text,marginBottom:16}}>Origen de Nuevos Ingresos por Mes</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} stackOffset="expand">
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F6"/>
                      <XAxis dataKey="mes" tick={{fontSize:11}}/>
                      <YAxis tick={{fontSize:11}}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/>
                      <Bar dataKey="orig_referido" name="Referido" fill={A.green} stackId="a" radius={[0,0,0,0]}/>
                      <Bar dataKey="orig_marketing" name="Marketing" fill={A.blue} stackId="a"/>
                      <Bar dataKey="orig_centro" name="Centro" fill={A.lime} stackId="a"/>
                      <Bar dataKey="orig_activaciones" name="Activaciones" fill={A.orange} stackId="a" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Motivos deserción */}
                <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(27,69,128,0.06)'}}>
                  <h3 style={{fontSize:13,fontWeight:700,color:A.text,marginBottom:16}}>Motivos de Deserción por Mes</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F6"/>
                      <XAxis dataKey="mes" tick={{fontSize:11}}/>
                      <YAxis tick={{fontSize:11}}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/>
                      <Bar dataKey="mot_perdida_clase" name="Pérd. clase" fill={A.red} stackId="b"/>
                      <Bar dataKey="mot_economico" name="Económico" fill={A.orange} stackId="b"/>
                      <Bar dataKey="mot_tecnica" name="Técnica" fill="#7B68EE" stackId="b"/>
                      <Bar dataKey="mot_horario" name="Horario" fill="#8896A9" stackId="b" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Clase de prueba */}
                <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(27,69,128,0.06)'}}>
                  <h3 style={{fontSize:13,fontWeight:700,color:A.text,marginBottom:16}}>Clase de Prueba — Embudo</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F6"/>
                      <XAxis dataKey="mes" tick={{fontSize:11}}/>
                      <YAxis tick={{fontSize:11}}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/>
                      <Bar dataKey="cp_invitados" name="Invitados" fill="#E8EBF0" radius={[4,4,0,0]}/>
                      <Bar dataKey="cp_asistieron" name="Asistieron" fill={A.blueMid} radius={[4,4,0,0]}/>
                      <Bar dataKey="cp_matriculados" name="Matriculados" fill={A.green} radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Rentabilidad trimestral */}
                <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(27,69,128,0.06)'}}>
                  <h3 style={{fontSize:13,fontWeight:700,color:A.text,marginBottom:4}}>Grupos Activos por Mes</h3>
                  <p style={{fontSize:11,color:'#8896A9',marginBottom:12}}>Más grupos = mayor capacidad de ingresos</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F6"/>
                      <XAxis dataKey="mes" tick={{fontSize:11}}/>
                      <YAxis tick={{fontSize:11}}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Bar dataKey="grupos_activos" name="Grupos activos" fill={A.orange} radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

              </div>
            )}

            {/* VISTA: TABLA */}
            {vistaActiva === 'tabla' && (
              <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,overflow:'hidden',boxShadow:'0 2px 8px rgba(27,69,128,0.06)'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead style={{background:`linear-gradient(135deg,${A.blue},${A.blueMid})`}}>
                    <tr>
                      {['Mes','Estado','Niños Inicio','Niños Final','Grupos','Nuevos','Meta N','Prom/Grupo','%CV','GPN $','Cob.','Deser.'].map(h => (
                        <th key={h} style={{padding:'10px 10px',textAlign:'center',fontSize:10,fontWeight:700,color:'#fff',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {meses.map((m, i) => {
                      const pr = i > 0 ? meses[i-1] : null
                      return (
                        <tr key={m.mes} style={{background:i%2===0?'#fff':'#F9FAFC',cursor:'pointer'}}
                          onMouseEnter={e=>e.currentTarget.style.background='#EEF3FB'}
                          onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'#fff':'#F9FAFC'}>
                          <td style={{padding:'10px 12px',fontWeight:700,color:A.text,whiteSpace:'nowrap'}}>{m.mesLabel}</td>
                          <td style={{padding:'10px 8px',textAlign:'center'}}>
                            <span style={{padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:700,background:m.estado==='cerrado'?'#FFF8E1':'#E6F4EC',color:m.estado==='cerrado'?'#856404':A.green}}>
                              {m.estado==='cerrado'?'🔒 Cerrado':'📝 Abierto'}
                            </span>
                          </td>
                          <td style={{padding:'10px 8px',textAlign:'center'}}>{m.ninos_inicio}</td>
                          <td style={{padding:'10px 8px',textAlign:'center',fontWeight:600}}>
                            {m.ninos_final}
                            {pr && <Trend val={m.ninos_final} prev={pr.ninos_final}/>}
                          </td>
                          <td style={{padding:'10px 8px',textAlign:'center'}}>{m.grupos_activos}</td>
                          <td style={{padding:'10px 8px',textAlign:'center',color:m.nuevos_activos>=m.meta_nuevos?A.green:A.red,fontWeight:600}}>{m.nuevos_activos}</td>
                          <td style={{padding:'10px 8px',textAlign:'center',color:'#666'}}>{m.meta_nuevos}</td>
                          <td style={{padding:'10px 8px',textAlign:'center',color:m.cumple_prom?A.green:A.red,fontWeight:600}}>
                            {m.prom_grupo}
                            {pr && <Trend val={m.prom_grupo} prev={pr.prom_grupo}/>}
                          </td>
                          <td style={{padding:'10px 8px',textAlign:'center',color:'#7B68EE',fontWeight:600}}>
                            {m.pcv}%
                            {pr && <Trend val={m.pcv} prev={pr.pcv}/>}
                          </td>
                          <td style={{padding:'10px 8px',textAlign:'center',color:m.gpn>=0?A.green:A.red,fontWeight:600}}>
                            ${m.gpn.toFixed(2)}
                            {pr && <Trend val={m.gpn} prev={pr.gpn}/>}
                          </td>
                          <td style={{padding:'10px 8px',textAlign:'center',color:'#666'}}>{m.meta_cob.toFixed(1)}</td>
                          <td style={{padding:'10px 8px',textAlign:'center',color:'#666'}}>{m.meta_des.toFixed(1)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {meses.length > 1 && (
                    <tfoot style={{background:'#F0F4FF',borderTop:'2px solid #E8EBF0'}}>
                      <tr>
                        <td colSpan={2} style={{padding:'10px 12px',fontWeight:700,color:A.blue,fontSize:11}}>PROMEDIO GENERAL</td>
                        <td style={{padding:'10px 8px',textAlign:'center',fontWeight:700}}>{Math.round(meses.reduce((a,m)=>a+m.ninos_inicio,0)/meses.length)}</td>
                        <td style={{padding:'10px 8px',textAlign:'center',fontWeight:700}}>{Math.round(meses.reduce((a,m)=>a+m.ninos_final,0)/meses.length)}</td>
                        <td style={{padding:'10px 8px',textAlign:'center',fontWeight:700}}>{Math.round(meses.reduce((a,m)=>a+m.grupos_activos,0)/meses.length)}</td>
                        <td style={{padding:'10px 8px',textAlign:'center',fontWeight:700}}>{Math.round(meses.reduce((a,m)=>a+m.nuevos_activos,0)/meses.length)}</td>
                        <td style={{padding:'10px 8px',textAlign:'center',fontWeight:700,color:'#666'}}>{meses[0]?.meta_nuevos}</td>
                        <td style={{padding:'10px 8px',textAlign:'center',fontWeight:700,color:meses.reduce((a,m)=>a+m.prom_grupo,0)/meses.length>=8?A.green:A.red}}>
                          {(meses.reduce((a,m)=>a+m.prom_grupo,0)/meses.length).toFixed(2)}
                        </td>
                        <td style={{padding:'10px 8px',textAlign:'center',fontWeight:700,color:'#7B68EE'}}>
                          {(meses.reduce((a,m)=>a+m.pcv,0)/meses.length).toFixed(1)}%
                        </td>
                        <td style={{padding:'10px 8px',textAlign:'center',fontWeight:700,color:A.green}}>
                          ${(meses.reduce((a,m)=>a+m.gpn,0)/meses.length).toFixed(2)}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {chartData.length === 0 && (
              <div style={{background:'#FFF8E1',border:'1px solid #F9A825',borderRadius:10,padding:'16px 20px',fontSize:13,color:'#856404'}}>
                ⚠️ Los meses tienen datos de configuración pero aún no hay suficiente información para graficar. Ingresa los datos en el KPI Semanal y guarda.
              </div>
            )}

          </>
        )}
      </main>
    </div>
  )
}
