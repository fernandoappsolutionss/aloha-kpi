'use client'
import { useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'

const CHECKS = [{"g":"Classdojo","items":[{"k":"cd_activo","l":"Classdojo activo"},{"k":"cd_ninos","l":"Niños completos"},{"k":"cd_padres","l":"Padres conectados"},{"k":"cd_muro","l":"Muro con información"},{"k":"cd_bienvenida","l":"Bienvenida publicada"},{"k":"cd_calendar","l":"Calendario publicado"},{"k":"cd_clase_padres","l":"Clase de padres"},{"k":"cd_fotos","l":"Fotos de grupo"},{"k":"cd_seguimiento","l":"Seguimiento evolución"},{"k":"cd_asistente","l":"Asistente activa"},{"k":"cd_portafolio","l":"Portafolio con retroalimentación"}]},{"g":"Study","items":[{"k":"st_grupo","l":"Grupo creado"},{"k":"st_ninos","l":"Niños activos completos"},{"k":"st_niveles","l":"Niveles actualizados"},{"k":"st_coach","l":"Coach activo"},{"k":"st_trabajando","l":"Niños trabajando"},{"k":"st_asistencia","l":"Asistencia registrada"}]},{"g":"Centro físico","items":[{"k":"fi_estado","l":"Centro en buen estado"},{"k":"fi_aroma","l":"Aromatizante renovado"},{"k":"fi_cafe","l":"Mesa de café y té"},{"k":"fi_brochure","l":"Brochure en recepción"},{"k":"fi_qr","l":"Cartel QR Google"},{"k":"fi_wifi","l":"Mensaje WIFI Gratis"},{"k":"fi_saludo","l":"Saludo cordial"},{"k":"fi_encuesta","l":"Encuestas de satisfacción"}]},{"g":"Equipo","items":[{"k":"eq_coach","l":"Premiar Coach estrella"},{"k":"eq_reunion","l":"Reuniones mensuales"},{"k":"eq_camaras","l":"Monitoreo cámaras"},{"k":"eq_actividad","l":"Actividades internas"},{"k":"eq_encuesta","l":"Encuestas equipo (semestral)"}]},{"g":"Metas KPI","items":[{"k":"m_cob","l":"Meta cobranza lograda"},{"k":"m_des","l":"Meta deserción lograda"},{"k":"m_ing","l":"Meta 20+ nuevos ingresos"}]}];
const DEFS = {"cd_activo":"si","cd_ninos":"si","cd_padres":"si","cd_muro":"si","cd_bienvenida":"si","cd_calendar":"si","cd_clase_padres":"si","cd_fotos":"si","cd_seguimiento":"si","cd_asistente":"si","cd_portafolio":"si","st_grupo":"si","st_ninos":"si","st_niveles":"si","st_coach":"si","st_trabajando":"si","st_asistencia":"si","fi_estado":"si","fi_aroma":"si","fi_cafe":"si","fi_brochure":"si","fi_qr":"si","fi_wifi":"si","fi_saludo":"si","fi_encuesta":"si","eq_coach":"no","eq_reunion":"si","eq_camaras":"si","eq_actividad":"si","eq_encuesta":"no","m_cob":"no","m_des":"si","m_ing":"no"};

export default function CumplimientoPage() {
  const params = useParams()
  const sp = useSearchParams()
  const nombre = sp.get('nombre') || 'BRISAS DEL GOLF'
  const [mes, setMes] = useState(3)
  const [vals, setVals] = useState(DEFS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const allKeys = CHECKS.flatMap(g => g.items.map(i => i.k))
  const totalSi = allKeys.filter(k => vals[k]==='si').length
  const pct = Math.round(totalSi/allKeys.length*100)

  function toggle(k, v) { setVals(prev=>({...prev,[k]:v})); setSaved(false) }
  async function save() { setSaving(true); await new Promise(r=>setTimeout(r,600)); setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),3000) }

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f5f5f0'}}>
      <Sidebar rol="administradora" centroNombre={nombre} centroId={params.id}/>
      <main style={{flex:1,padding:28,overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div><h1 style={{fontSize:20,fontWeight:600,marginBottom:4}}>Cumplimiento mensual</h1>
            <p style={{fontSize:12,color:'#888'}}>{nombre} · Q1 2026</p></div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            {saved && <span style={{color:'#0F6E56',fontSize:12,fontWeight:500}}>✅ Guardado</span>}
            <button onClick={save} style={{padding:'9px 20px',background:'#533AB7',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'}}>{saving?'Guardando...':'💾 Guardar'}</button>
          </div>
        </div>

        <div style={{display:'flex',marginBottom:20,borderBottom:'0.5px solid #e8e8e4'}}>
          {['Enero','Febrero','Marzo'].map((m,i)=>
            <button key={m} onClick={()=>setMes(i+1)} style={{padding:'9px 20px',background:'none',border:'none',fontSize:13,cursor:'pointer',borderBottom:mes===i+1?'2px solid #533AB7':'2px solid transparent',color:mes===i+1?'#533AB7':'#888',fontWeight:mes===i+1?600:400,marginBottom:-1}}>{m}</button>
          )}
        </div>

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
      </main>
    </div>
  )
}
