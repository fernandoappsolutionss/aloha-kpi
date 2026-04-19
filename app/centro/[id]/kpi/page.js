'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import { supabase } from '../../../../lib/supabase'

const NOMBRES_MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const SEMANAS = [1, 2, 3, 4, 5]
const A = { blue:'#1B4580', blueMid:'#1D5FA6', green:'#4A8C3F', red:'#D63C3C', orange:'#E67E22', gray:'#F5F7FA', text:'#1A2744' }

// Fórmulas KPI ALOHA (según Excel)
const calcRes = (tipo, dias) => {
  const v = dias.map(x => parseInt(x) || 0)
  if (tipo === 'cob') { for (let i = v.length-1; i >= 0; i--) if (v[i] > 0) return v[i]; return 0 }
  return v.reduce((a,b) => a+b, 0)
}
const calcMeta = (tipo, ni, metaN) => {
  if (tipo === 'cob') return Math.round(ni * 0.015 / 5 * 10) / 10
  if (tipo === 'des') return Math.round(ni * 0.08 / 5 * 10) / 10
  return Math.round(metaN / 5 * 10) / 10
}
const cumple = (tipo, res, meta) => tipo === 'cob' ? meta > res : tipo === 'des' ? meta >= res : res >= meta
const emptyW = () => ({ cob:['','','','',''], des:['','','','',''], ing:['','','','',''] })

export default function KPIPage() {
  const { id } = useParams()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [centroNombre, setCentroNombre] = useState('')
  const [mesEstado, setMesEstado] = useState('abierto')
  const [saving, setSaving] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState({ ninos_inicio:0, grupos_activos:0, meta_nuevos_mensual:20, nuevos_activos_mes:0, cp_invitados:0, cp_asistieron:0, cp_matriculados:0, mot_tecnica:0, mot_perdida_clase:0, mot_economico:0, mot_horario:0, orig_referido:0, orig_marketing:0, orig_centro:0, orig_activaciones:0, orig_medios:0 })
  const [semanas, setSemanas] = useState(SEMANAS.map(() => emptyW()))
  const [historial, setHistorial] = useState([])

  const loadData = useCallback(async () => {
    setLoading(true); setStatus('')
    const { data: c } = await supabase.from('centros').select('nombre').eq('id', id).single()
    if (c) setCentroNombre(c.nombre)

    // Estado del mes actual
    const { data: mes } = await supabase.from('mes_kpi').select('estado').eq('centro_id', id).eq('year', year).eq('month', month).single()
    setMesEstado(mes?.estado || 'abierto')

    // Resumen del mes
    const { data: res } = await supabase.from('resumen_mes').select('*').eq('centro_id', id).eq('year', year).eq('month', month).single()
    if (res) {
      setConfig({ ninos_inicio: res.ninos_inicio_mes||0, grupos_activos: res.grupos_activos||0, meta_nuevos_mensual: res.meta_nuevos_mensual||20, nuevos_activos_mes: res.nuevos_activos_mes||0, cp_invitados: res.cp_invitados||0, cp_asistieron: res.cp_asistieron||0, cp_matriculados: res.cp_matriculados||0, mot_tecnica: res.mot_tecnica||0, mot_perdida_clase: res.mot_perdida_clase||0, mot_economico: res.mot_economico||0, mot_horario: res.mot_horario||0, orig_referido: res.orig_referido||0, orig_marketing: res.orig_marketing||0, orig_centro: res.orig_centro||0, orig_activaciones: res.orig_activaciones||0, orig_medios: res.orig_medios||0 })
    } else {
      setConfig({ ninos_inicio:0, grupos_activos:0, meta_nuevos_mensual:20, nuevos_activos_mes:0, cp_invitados:0, cp_asistieron:0, cp_matriculados:0, mot_tecnica:0, mot_perdida_clase:0, mot_economico:0, mot_horario:0, orig_referido:0, orig_marketing:0, orig_centro:0, orig_activaciones:0, orig_medios:0 })
    }

    // Semanas
    const { data: kpi } = await supabase.from('kpi_semanas').select('*').eq('centro_id', id).eq('year', year).eq('month', month).order('semana')
    const sems = SEMANAS.map(s => {
      const r = kpi?.find(x => x.semana === s)
      if (!r) return emptyW()
      return { cob:[r.cob_d1??'',r.cob_d2??'',r.cob_d3??'',r.cob_d4??'',r.cob_d5??''], des:[r.des_d1??'',r.des_d2??'',r.des_d3??'',r.des_d4??'',r.des_d5??''], ing:[r.ing_d1??'',r.ing_d2??'',r.ing_d3??'',r.ing_d4??'',r.ing_d5??''] }
    })
    setSemanas(sems)

    // Historial: meses cerrados
    const { data: hist } = await supabase.from('mes_kpi').select('year,month,estado,cerrado_at').eq('centro_id', id).eq('estado','cerrado').order('year', {ascending:false}).order('month', {ascending:false})
    setHistorial(hist || [])
    setLoading(false)
  }, [id, year, month])

  useEffect(() => { loadData() }, [loadData])

  const navMonth = (dir) => {
    let m = month + dir, y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m); setYear(y)
  }

  async function handleSave() {
    if (mesEstado === 'cerrado') { setStatus('❌ Este mes está cerrado. No se puede editar.'); return }
    setSaving(true); setStatus('')
    try {
      const configData = { centro_id: id, year, month, ninos_inicio_mes: parseInt(config.ninos_inicio)||0, grupos_activos: parseInt(config.grupos_activos)||0, meta_nuevos_mensual: parseInt(config.meta_nuevos_mensual)||20, nuevos_activos_mes: parseInt(config.nuevos_activos_mes)||0, cp_invitados: parseInt(config.cp_invitados)||0, cp_asistieron: parseInt(config.cp_asistieron)||0, cp_matriculados: parseInt(config.cp_matriculados)||0, mot_tecnica: parseInt(config.mot_tecnica)||0, mot_perdida_clase: parseInt(config.mot_perdida_clase)||0, mot_economico: parseInt(config.mot_economico)||0, mot_horario: parseInt(config.mot_horario)||0, orig_referido: parseInt(config.orig_referido)||0, orig_marketing: parseInt(config.orig_marketing)||0, orig_centro: parseInt(config.orig_centro)||0, orig_activaciones: parseInt(config.orig_activaciones)||0, orig_medios: parseInt(config.orig_medios)||0, updated_at: new Date().toISOString() }
      const { error: rErr } = await supabase.from('resumen_mes').upsert(configData, { onConflict: 'centro_id,year,month' })
      if (rErr) throw new Error(rErr.message)
      for (let i = 0; i < SEMANAS.length; i++) {
        const s = semanas[i]
        const kData = { centro_id: id, year, month, semana: i+1, cob_d1:parseInt(s.cob[0])||0, cob_d2:parseInt(s.cob[1])||0, cob_d3:parseInt(s.cob[2])||0, cob_d4:parseInt(s.cob[3])||0, cob_d5:parseInt(s.cob[4])||0, des_d1:parseInt(s.des[0])||0, des_d2:parseInt(s.des[1])||0, des_d3:parseInt(s.des[2])||0, des_d4:parseInt(s.des[3])||0, des_d5:parseInt(s.des[4])||0, ing_d1:parseInt(s.ing[0])||0, ing_d2:parseInt(s.ing[1])||0, ing_d3:parseInt(s.ing[2])||0, ing_d4:parseInt(s.ing[3])||0, ing_d5:parseInt(s.ing[4])||0, updated_at: new Date().toISOString() }
        const { error: kErr } = await supabase.from('kpi_semanas').upsert(kData, { onConflict: 'centro_id,year,month,semana' })
        if (kErr) throw new Error('Sem '+(i+1)+': '+kErr.message)
      }
      setStatus('✅ KPI de ' + NOMBRES_MES[month-1] + ' ' + year + ' guardado.')
    } catch(e) { setStatus('❌ Error: ' + e.message) }
    setSaving(false)
  }

  async function handleCerrarMes() {
    if (!confirm('¿Cerrar ' + NOMBRES_MES[month-1] + ' ' + year + '? El mes quedará bloqueado como historial y no podrá editarse.')) return
    setCerrando(true)
    await handleSave()
    const { error } = await supabase.from('mes_kpi').upsert({ centro_id: id, year, month, estado: 'cerrado', cerrado_at: new Date().toISOString() }, { onConflict: 'centro_id,year,month' })
    if (!error) { setMesEstado('cerrado'); setStatus('🔒 Mes cerrado. Datos guardados como historial.') }
    else setStatus('❌ Error al cerrar: ' + error.message)
    setCerrando(false)
  }

  async function handleReabrirMes() {
    if (!confirm('¿Reabrir ' + NOMBRES_MES[month-1] + ' ' + year + ' para edición?')) return
    const { error } = await supabase.from('mes_kpi').upsert({ centro_id: id, year, month, estado: 'abierto', cerrado_at: null }, { onConflict: 'centro_id,year,month' })
    if (!error) { setMesEstado('abierto'); setStatus('✅ Mes reabierto para edición.') }
  }

  const ni = parseInt(config.ninos_inicio)||0
  const nA = parseInt(config.nuevos_activos_mes)||0
  const gA = parseInt(config.grupos_activos)||1
  const metaN = parseInt(config.meta_nuevos_mensual)||20
  const totalDes = semanas.reduce((a,s) => a + s.des.reduce((b,v) => b+(parseInt(v)||0), 0), 0)
  const totalIng = semanas.reduce((a,s) => a + s.ing.reduce((b,v) => b+(parseInt(v)||0), 0), 0)
  const ninosFinal = Math.max(0, ni + nA - totalDes)
  const promG = gA > 0 ? ninosFinal / gA : 0
  const pcv = promG > 0 ? (120/promG) + 16 : 0
  const gpn = ninosFinal > 0 ? (((ninosFinal*108)*(1-pcv/100)-7800)/ninosFinal) : 0

  const upd = (semIdx, tipo, di, val) => setSemanas(p => p.map((s,i) => i===semIdx ? {...s,[tipo]:s[tipo].map((d,j) => j===di?val:d)} : s))
  const inp = (val, onChange, disabled) => <input type="number" min="0" value={val} onChange={e=>onChange(e.target.value)} disabled={disabled} style={{width:60,padding:'4px 6px',border:'1px solid #D0D7E3',borderRadius:6,fontSize:13,textAlign:'center',background:disabled?'#F0F0F0':'#fff',outline:'none'}}/>
  const badge = ok => <span style={{padding:'2px 8px',borderRadius:10,fontSize:11,fontWeight:700,background:ok?'#E6F4EC':'#FBE8E8',color:ok?A.green:A.red}}>{ok?'Sí ✓':'No ✗'}</span>
  const locked = mesEstado === 'cerrado'

  const kpiRow = (tipo, label, semIdx) => {
    const s = semanas[semIdx], dias = s[tipo]
    const res = calcRes(tipo, dias), meta = calcMeta(tipo, ni, metaN)
    const ok = cumple(tipo, res, meta)
    return (
      <tr key={tipo} style={{background:'#F9FAFC'}}>
        <td style={{padding:'6px 10px',width:200,fontWeight:600,color:A.text,fontSize:11}}>{label}</td>
        {dias.map((d,di) => <td key={di} style={{padding:'4px 3px',textAlign:'center'}}>{inp(d, v => upd(semIdx,tipo,di,v), locked)}</td>)}
        <td style={{padding:'4px 8px',textAlign:'center',fontWeight:700,color:tipo==='cob'?A.blue:tipo==='des'?A.red:A.green,minWidth:50}}>{res}</td>
        <td style={{padding:'4px 6px',textAlign:'center',color:'#666',fontSize:11}}>{meta}</td>
        <td style={{padding:'4px 6px',textAlign:'center'}}>{badge(ok)}</td>
      </tr>
    )
  }

  if (loading) return <div style={{display:'flex',minHeight:'100vh',alignItems:'center',justifyContent:'center'}}>Cargando...</div>

  return (
    <div style={{display:'flex',minHeight:'100vh',background:A.gray}}>
      <Sidebar rol="usuario" centroNombre={centroNombre} centroId={id}/>
      <main style={{flex:1,padding:24,overflowY:'auto'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div>
            <h1 style={{fontSize:18,fontWeight:700,color:A.text}}>Registro KPI Mensual</h1>
            <p style={{fontSize:12,color:'#8896A9'}}>{centroNombre}</p>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            {!locked ? (
              <>
                <button onClick={handleSave} disabled={saving} style={{padding:'9px 22px',background:`linear-gradient(135deg,${A.blue},${A.blueMid})`,color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:saving?'wait':'pointer',opacity:saving?0.7:1,boxShadow:'0 4px 12px rgba(27,69,128,0.25)'}}>
                  {saving?'Guardando...':'💾 Guardar'}
                </button>
                <button onClick={handleCerrarMes} disabled={cerrando} style={{padding:'9px 18px',background:'linear-gradient(135deg,#4A8C3F,#3A7A30)',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 12px rgba(74,140,63,0.25)'}}>
                  {cerrando?'Cerrando...':'🔒 Cerrar Mes'}
                </button>
              </>
            ) : (
              <button onClick={handleReabrirMes} style={{padding:'9px 18px',background:'linear-gradient(135deg,#E67E22,#D35400)',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                🔓 Reabrir Mes
              </button>
            )}
          </div>
        </div>

        {/* Estado del mes */}
        {locked && (
          <div style={{background:'#FFF8E1',border:'1px solid #F9A825',borderRadius:10,padding:'10px 16px',marginBottom:16,fontSize:13,color:'#856404',fontWeight:600}}>
            🔒 Mes cerrado — Solo lectura. Los datos están guardados como historial.
          </div>
        )}

        {status && (
          <div style={{padding:'10px 16px',borderRadius:8,marginBottom:16,background:status.includes('❌')?'#FBE8E8':status.includes('🔒')?'#FFF8E1':'#E6F4EC',color:status.includes('❌')?A.red:status.includes('🔒')?'#856404':A.green,fontSize:13,fontWeight:500}}>
            {status}
          </div>
        )}

        {/* Navegador de mes */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <button onClick={()=>navMonth(-1)} style={{padding:'8px 14px',background:'#fff',border:'1px solid #E8EBF0',borderRadius:8,cursor:'pointer',fontSize:16}}>‹</button>
          <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:10,padding:'10px 28px',textAlign:'center',minWidth:180,boxShadow:'0 1px 6px rgba(0,0,0,0.06)'}}>
            <p style={{fontSize:18,fontWeight:800,color:A.blue,margin:0}}>{NOMBRES_MES[month-1]}</p>
            <p style={{fontSize:13,color:'#8896A9',margin:0}}>{year}</p>
          </div>
          <button onClick={()=>navMonth(1)} style={{padding:'8px 14px',background:'#fff',border:'1px solid #E8EBF0',borderRadius:8,cursor:'pointer',fontSize:16}}>›</button>
          {historial.length > 0 && (
            <div style={{marginLeft:16,display:'flex',gap:6,flexWrap:'wrap'}}>
              <span style={{fontSize:11,color:'#8896A9',alignSelf:'center'}}>Historial cerrado:</span>
              {historial.map(h => (
                <button key={h.year+'-'+h.month} onClick={()=>{setYear(h.year);setMonth(h.month)}}
                  style={{padding:'4px 10px',background:year===h.year&&month===h.month?A.blue:'#F0F4FF',color:year===h.year&&month===h.month?'#fff':A.blueMid,border:'1px solid #C5D5F5',borderRadius:20,fontSize:11,cursor:'pointer',fontWeight:600}}>
                  {NOMBRES_MES[h.month-1].slice(0,3)} {h.year}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Config del mes */}
        <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,padding:16,marginBottom:16,boxShadow:'0 1px 6px rgba(27,69,128,0.06)'}}>
          <h3 style={{fontSize:11,fontWeight:700,color:A.blue,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:12}}>Configuración — {NOMBRES_MES[month-1]} {year}</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
            {[['Niños inicio mes','ninos_inicio'],['Grupos activos','grupos_activos'],['Meta nuevos (mensual)','meta_nuevos_mensual'],['Nuevos activos mes','nuevos_activos_mes']].map(([lbl,key]) => (
              <div key={key}>
                <label style={{fontSize:11,color:'#4A5568',fontWeight:600,display:'block',marginBottom:4}}>{lbl}</label>
                <input type="number" min="0" value={config[key]} disabled={locked}
                  onChange={e=>setConfig(c=>({...c,[key]:e.target.value}))}
                  style={{width:'100%',padding:'8px 10px',border:'1.5px solid #E8EBF0',borderRadius:8,fontSize:13,background:locked?'#F0F0F0':'#F5F7FA',boxSizing:'border-box'}}/>
              </div>
            ))}
          </div>
        </div>

        {/* Indicadores calculados */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:16}}>
          {[
            {l:'Total Deserción',v:totalDes,c:A.red},
            {l:'Total Nuevos',v:totalIng,c:A.green},
            {l:'Niños Final Mes',v:ninosFinal,c:A.blue},
            {l:'Prom. Niños/Grupo',v:promG.toFixed(2),c:promG>=8?A.green:A.red,m:'≥ 8',ok:promG>=8},
            {l:'%CV',v:pcv.toFixed(1)+'%',c:'#7B68EE'},
          ].map(({l,v,c,m,ok}) => (
            <div key={l} style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:10,padding:'10px 12px',textAlign:'center',boxShadow:'0 1px 4px rgba(27,69,128,0.05)'}}>
              <p style={{fontSize:10,color:'#8896A9',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>{l}</p>
              <p style={{fontSize:20,fontWeight:800,color:c,margin:0}}>{v}</p>
              {m && <p style={{fontSize:10,color:ok?A.green:A.red,fontWeight:600,marginTop:2}}>{ok?'✓ meta '+m:'✗ meta '+m}</p>}
            </div>
          ))}
        </div>

        {/* GPN */}
        <div style={{background:gpn>=0?'#E6F4EC':'#FBE8E8',border:'1px solid '+(gpn>=0?'#4A8C3F':A.red),borderRadius:10,padding:'10px 18px',marginBottom:16,display:'flex',alignItems:'center',gap:14}}>
          <span style={{fontSize:12,fontWeight:700,color:gpn>=0?A.green:A.red}}>GPN — Ganancia por Niño:</span>
          <span style={{fontSize:22,fontWeight:800,color:gpn>=0?A.green:A.red}}>${gpn.toFixed(2)}</span>
          <span style={{fontSize:11,color:'#666',flex:1}}>= ((niños final × 108) × (1 − %CV/100) − 7800) ÷ niños final</span>
        </div>

        {/* Tabla KPI semanal */}
        <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,overflow:'hidden',boxShadow:'0 1px 6px rgba(27,69,128,0.06)',marginBottom:20}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:`linear-gradient(135deg,${A.blue},${A.blueMid})`}}>
                <th style={{padding:'10px',textAlign:'left',fontSize:11,fontWeight:700,color:'#fff',width:200}}>Semana / Indicador</th>
                {['Día 1','Día 2','Día 3','Día 4','Día 5'].map(d=><th key={d} style={{padding:'10px 3px',textAlign:'center',fontSize:11,fontWeight:700,color:'#fff',width:70}}>{d}</th>)}
                <th style={{padding:'10px',textAlign:'center',fontSize:11,fontWeight:700,color:'#fff',width:65}}>Resultado</th>
                <th style={{padding:'10px',textAlign:'center',fontSize:11,fontWeight:700,color:'#fff',width:60}}>Meta</th>
                <th style={{padding:'10px',textAlign:'center',fontSize:11,fontWeight:700,color:'#fff',width:65}}>¿Cumple?</th>
              </tr>
            </thead>
            <tbody>
              {SEMANAS.map((s,i) => (
                <>
                  <tr key={'sh'+i} style={{background:'#F0F4FF'}}>
                    <td colSpan={9} style={{padding:'6px 12px',fontSize:11,fontWeight:700,color:A.blue,textTransform:'uppercase',letterSpacing:'0.08em'}}>Semana {s}</td>
                  </tr>
                  {kpiRow('cob','Cobranza Vencida (N°)',i)}
                  {kpiRow('des','Deserción (Retirados)',i)}
                  {kpiRow('ing','Nuevos Ingresos - Ventas',i)}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Clase de prueba / Motivos / Origen */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:20}}>
          {[
            {title:'Clase de Prueba',color:A.blue,fields:[['Invitados','cp_invitados'],['Asistieron','cp_asistieron'],['Matriculados','cp_matriculados']]},
            {title:'Motivo Deserción',color:A.red,fields:[['Técnica','mot_tecnica'],['Pérdida de clase','mot_perdida_clase'],['Económico','mot_economico'],['Horario','mot_horario']]},
            {title:'Origen Nuevos Ingresos',color:A.green,fields:[['Referido','orig_referido'],['Marketing','orig_marketing'],['Centro','orig_centro'],['Activaciones','orig_activaciones'],['Medios','orig_medios']]},
          ].map(({title,color,fields}) => (
            <div key={title} style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,overflow:'hidden',boxShadow:'0 1px 6px rgba(27,69,128,0.06)'}}>
              <div style={{background:color,color:'#fff',padding:'7px 14px',fontSize:11,fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase'}}>{title}</div>
              <div style={{padding:14}}>
                {fields.map(([lbl,key]) => (
                  <div key={key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:9}}>
                    <span style={{fontSize:12,color:A.text}}>{lbl}</span>
                    <input type="number" min="0" value={config[key]} disabled={locked}
                      onChange={e=>setConfig(c=>({...c,[key]:e.target.value}))}
                      style={{width:65,padding:'5px 8px',border:'1.5px solid #E8EBF0',borderRadius:6,fontSize:13,textAlign:'center',background:locked?'#F0F0F0':'#F5F7FA'}}/>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Nota fórmulas */}
        <div style={{background:'#F0F4FF',border:'1px solid #C5D5F5',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#4A5568'}}>
          <strong style={{color:A.blue}}>Fórmulas ALOHA:</strong> Cobranza = último día | Deserción = suma | Nuevos = suma | Meta Cob = niños×1.5%÷5 | Meta Des = niños×8%÷5 | %CV = (120÷prom)+16 | GPN = ((niños×108)×(1−%CV%)−7800)÷niños
        </div>
      </main>
    </div>
  )
}
