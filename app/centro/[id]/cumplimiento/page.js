'use client'
import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import { supabase } from '../../../../lib/supabase'

const CHECKS = [
  {g:'Classdojo',items:[{k:'classdojo_activo',l:'Classdojo activo'},{k:'ninos_completos_classdojo',l:'Niños completos en Classdojo'},{k:'padres_conectados',l:'Padres conectados'},{k:'muro_informacion',l:'Muro con información'},{k:'bienvenida',l:'Bienvenida publicada'},{k:'calendario',l:'Calendario publicado'},{k:'clase_padres',l:'Clase de padres'},{k:'fotos_grupo',l:'Fotos de grupo'},{k:'seguimiento_evolucion',l:'Seguimiento evolución'},{k:'asistente_classdojo',l:'Asistente activa'},{k:'portafolio',l:'Portafolio con retroalimentación'}]},
  {g:'Study',items:[{k:'grupo_study',l:'Grupo creado en Study'},{k:'ninos_activos_study',l:'Niños activos completos'},{k:'niveles_actualizados',l:'Niveles actualizados'},{k:'coach_activo',l:'Coach activo'},{k:'ninos_trabajando_study',l:'Niños trabajando (gráfica)'},{k:'asistencia_dias',l:'Asistencia con días trabajados'}]},
  {g:'Centro físico',items:[{k:'centro_buen_estado',l:'Centro en buen estado'},{k:'aromatizante',l:'Aromatizante en recepción'},{k:'mesa_cafe',l:'Mesa de café y té'},{k:'brochure',l:'Brochure en recepción'},{k:'cartel_qr',l:'Cartel QR para Google'},{k:'wifi_gratis',l:'Mensaje WIFI Gratis'},{k:'saludo_cordial',l:'Saludo cordial a padres'},{k:'encuestas_satisfaccion',l:'Encuestas de satisfacción'}]},
  {g:'Equipo',items:[{k:'coach_estrella',l:'Premiar Coach estrella del mes'},{k:'reuniones_mensuales',l:'Reuniones mensuales con equipo'},{k:'monitoreo_camaras',l:'Monitoreo de cámaras'},{k:'actividades_equipo',l:'Actividades internas del equipo'},{k:'encuestas_equipo',l:'Encuestas al equipo (semestral)'}]},
  {g:'Metas KPI',items:[{k:'meta_cobranza',l:'Meta de cobranza lograda'},{k:'meta_desercion',l:'Meta de deserción lograda'},{k:'meta_nuevos_ingresos',l:'Meta 20+ nuevos ingresos'}]},
]
const DEFS = {classdojo_activo:'si',ninos_completos_classdojo:'si',padres_conectados:'si',muro_informacion:'si',bienvenida:'si',calendario:'si',clase_padres:'si',fotos_grupo:'si',seguimiento_evolucion:'si',asistente_classdojo:'si',portafolio:'si',grupo_study:'si',ninos_activos_study:'si',niveles_actualizados:'si',coach_activo:'si',ninos_trabajando_study:'si',asistencia_dias:'si',centro_buen_estado:'si',aromatizante:'si',mesa_cafe:'si',brochure:'si',cartel_qr:'si',wifi_gratis:'si',saludo_cordial:'si',encuestas_satisfaccion:'si',coach_estrella:'no',reuniones_mensuales:'si',monitoreo_camaras:'si',actividades_equipo:'si',encuestas_equipo:'no',meta_cobranza:'no',meta_desercion:'si',meta_nuevos_ingresos:'no'}

export default function CumplimientoPage() {
  const params = useParams()
  const sp = useSearchParams()
  const [nombre, setNombre] = useState('Centro')
  useEffect(() => { supabase.from('centros').select('nombre').eq('id', params.id).single().then(({data}) => { if (data) setNombre(data.nombre) }) }, [params.id])
  const centroId = params.id === 'demo' ? null : params.id

  const [mes, setMes] = useState(1)
  const [vals, setVals] = useState(DEFS)
  const [trimestreId, setTrimestreId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  const allKeys = CHECKS.flatMap(g => g.items.map(i => i.k))
  const totalSi = allKeys.filter(k => vals[k]==='si').length
  const pct = Math.round(totalSi/allKeys.length*100)

  useEffect(() => { loadData() }, [mes, centroId])

  async function loadData() {
    if (!centroId) { setLoading(false); return }
    setLoading(true)
    try {
      let { data: trim } = await supabase.from('trimestres').select('id').eq('centro_id', centroId).eq('anio',2026).eq('trimestre',1).single()
      if (!trim) {
        const { data: nt } = await supabase.from('trimestres').insert({centro_id:centroId,anio:2026,trimestre:1}).select('id').single()
        trim = nt
      }
      setTrimestreId(trim.id)
      const { data: cum } = await supabase.from('cumplimiento').select('*').eq('trimestre_id',trim.id).eq('mes',mes).single()
      if (cum) {
        const loaded = {}
        allKeys.forEach(k => { loaded[k] = cum[k] || 'no' })
        setVals(loaded)
      } else {
        setVals({...DEFS})
      }
    } catch (e) { setStatus('Error cargando: ' + e.message) }
    setLoading(false)
  }

  function toggle(k, v) { setVals(prev => ({...prev,[k]:v})) }

  async function save() {
    if (!centroId) { setStatus('Modo demo — conéctate con cuenta real para guardar.'); return }
    setSaving(true); setStatus('')
    try {
      const payload = { trimestre_id: trimestreId, mes, updated_at: new Date().toISOString(), ...vals }
      const { error } = await supabase.from('cumplimiento').upsert(payload, { onConflict: 'trimestre_id,mes' })
      if (error) throw error
      setStatus('✅ Cumplimiento guardado correctamente.')
      setTimeout(() => setStatus(''), 4000)
    } catch (e) { setStatus('❌ Error: ' + e.message) }
    setSaving(false)
  }

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f5f5f0'}}>
      <Sidebar rol="usuario" centroNombre={nombre} centroId={params.id}/>
      <main style={{flex:1,padding:28,overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div><h1 style={{fontSize:20,fontWeight:600,marginBottom:4}}>Cumplimiento mensual</h1>
            <p style={{fontSize:12,color:'#888'}}>{nombre} · Q1 2026</p></div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            {status && <span style={{fontSize:12,color:status.includes('❌')?'#993C1D':'#0F6E56',fontWeight:500}}>{status}</span>}
            <button onClick={save} disabled={saving||loading} style={{padding:'9px 20px',background:'#533AB7',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'}}>
              {saving?'Guardando...':'💾 Guardar'}
            </button>
          </div>
        </div>

        <div style={{display:'flex',marginBottom:20,borderBottom:'0.5px solid #e8e8e4'}}>
          {['Enero','Febrero','Marzo'].map((m,i)=>
            <button key={m} onClick={()=>setMes(i+1)} style={{padding:'9px 20px',background:'none',border:'none',fontSize:13,cursor:'pointer',borderBottom:mes===i+1?'2px solid #533AB7':'2px solid transparent',color:mes===i+1?'#533AB7':'#888',fontWeight:mes===i+1?600:400,marginBottom:-1}}>{m}</button>
          )}
        </div>

        {loading ? <div style={{padding:20,textAlign:'center',color:'#888'}}>Cargando...</div> : <>
          <div style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:'18px 20px',marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:'#444'}}>Cumplimiento del mes</div>
                <div style={{fontSize:12,color:'#888',marginTop:2}}>{totalSi} de {allKeys.length} criterios cumplidos</div>
              </div>
              <div style={{fontSize:36,fontWeight:700,color:pct>=85?'#0F6E56':pct>=70?'#854F0B':'#993C1D'}}>{pct}%</div>
            </div>
            <div style={{height:10,background:'#eee',borderRadius:5,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${pct}%`,background:pct>=85?'#1D9E75':pct>=70?'#EF9F27':'#D85A30',borderRadius:5,transition:'width 0.3s'}}/>
            </div>
          </div>

          {CHECKS.map(group => (
            <div key={group.g} style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:'16px 20px',marginBottom:12}}>
              <h3 style={{fontSize:11,fontWeight:700,color:'#533AB7',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:12,paddingBottom:8,borderBottom:'0.5px solid #f0f0ec'}}>{group.g}</h3>
              {group.items.map(item => (
                <div key={item.k} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:'0.5px solid #f8f8f5'}}>
                  <span style={{fontSize:13,color:'#333',flex:1,paddingRight:16}}>{item.l}</span>
                  <div style={{display:'flex',gap:6,flexShrink:0}}>
                    <button onClick={()=>toggle(item.k,'si')} style={{padding:'4px 14px',borderRadius:6,border:'0.5px solid',fontSize:12,cursor:'pointer',background:vals[item.k]==='si'?'#E1F5EE':'#f5f5f0',color:vals[item.k]==='si'?'#0F6E56':'#888',borderColor:vals[item.k]==='si'?'#5DCAA5':'#ddd',fontWeight:vals[item.k]==='si'?600:400}}>Sí</button>
                    <button onClick={()=>toggle(item.k,'no')} style={{padding:'4px 14px',borderRadius:6,border:'0.5px solid',fontSize:12,cursor:'pointer',background:vals[item.k]==='no'?'#FAECE7':'#f5f5f0',color:vals[item.k]==='no'?'#993C1D':'#888',borderColor:vals[item.k]==='no'?'#F0997B':'#ddd',fontWeight:vals[item.k]==='no'?600:400}}>No</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>}
      </main>
    </div>
  )
}
