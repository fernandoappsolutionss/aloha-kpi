'use client'
import { useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'

export default function FodaPage() {
  const params = useParams()
  const sp = useSearchParams()
  const nombre = sp.get('nombre') || 'BRISAS DEL GOLF'
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [foda, setFoda] = useState({
    oportunidades: 'Tendencias educativas digitales\nAlianzas con colegios locales\nEventos comunitarios del trimestre',
    amenazas: 'Competencia directa e indirecta\nFactores económicos familiares\nVacaciones escolares / verano',
    comentarios: '',
  })

  const fortalezas = ['Classdojo activo y completo','Padres conectados','Grupo Study activo','Centro en buen estado','Reuniones mensuales con equipo','Meta de deserción lograda']
  const debilidades = ['No se premió al Coach estrella','Sin encuestas de satisfacción al equipo','Meta de cobranza no cumplida','Meta de 20+ nuevos ingresos no alcanzada']

  async function save() { setSaving(true); await new Promise(r=>setTimeout(r,700)); setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),3000) }

  const cuads = [
    {t:'✅ Fortalezas',c:'#0F6E56',bc:'#1D9E75',auto:true,items:fortalezas},
    {t:'⚠ Debilidades',c:'#993C1D',bc:'#D85A30',auto:true,items:debilidades},
    {t:'🔵 Oportunidades',c:'#185FA5',bc:'#378ADD',k:'oportunidades',prompts:['Tendencias educativas: ¿nuevas demandas?','Alianzas locales: colegios, empresas','Eventos y actividades comunitarias']},
    {t:'🟡 Amenazas',c:'#854F0B',bc:'#EF9F27',k:'amenazas',prompts:['Competencia directa e indirecta','Factores económicos locales','Cambios en regulaciones']},
  ]

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f5f5f0'}}>
      <Sidebar rol="administradora" centroNombre={nombre} centroId={params.id}/>
      <main style={{flex:1,padding:28,overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div><h1 style={{fontSize:20,fontWeight:600,marginBottom:4}}>FODA Trimestral</h1>
            <p style={{fontSize:12,color:'#888'}}>{nombre} · Q1 2026</p></div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            {saved && <span style={{color:'#0F6E56',fontSize:12,fontWeight:500}}>✅ Guardado</span>}
            <button onClick={save} style={{padding:'9px 20px',background:'#533AB7',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'}}>{saving?'Guardando...':'💾 Guardar FODA'}</button>
          </div>
        </div>

        <div style={{background:'#EEEDFE',borderRadius:10,padding:'10px 16px',marginBottom:20,fontSize:12,color:'#533AB7'}}>
          💡 Las fortalezas y debilidades se generan automáticamente desde tu checklist de cumplimiento.
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {cuads.map(({t,c,bc,auto,items,k,prompts})=>(
            <div key={t} style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:18,borderTop:`3px solid ${bc}`}}>
              <h3 style={{fontSize:13,fontWeight:700,color:c,marginBottom:6}}>{t}</h3>
              {auto ? (
                <>
                  <p style={{fontSize:11,color:'#aaa',marginBottom:12,fontStyle:'italic'}}>Generado automáticamente del cumplimiento</p>
                  <ul style={{paddingLeft:16,display:'flex',flexDirection:'column',gap:6}}>
                    {items.map((f,i)=><li key={i} style={{fontSize:12,color:c==='#0F6E56'?'#333':'#993C1D',lineHeight:1.5}}>{f}</li>)}
                  </ul>
                </>
              ) : (
                <>
                  <p style={{fontSize:11,color:'#888',marginBottom:8}}>Editable por la administradora</p>
                  {prompts.map((p,i)=><p key={i} style={{fontSize:11,color:'#aaa',marginBottom:3,paddingLeft:8,borderLeft:'2px solid #eee'}}>{p}</p>)}
                  <textarea value={foda[k]} onChange={e=>setFoda({...foda,[k]:e.target.value})}
                    style={{width:'100%',padding:'10px 12px',border:'0.5px solid #e0e0dc',borderRadius:8,fontSize:13,resize:'vertical',marginTop:10,background:'#fafaf8',outline:'none',lineHeight:1.6,color:'#333',minHeight:100}}/>
                </>
              )}
            </div>
          ))}
        </div>

        <div style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:18,marginTop:16}}>
          <h3 style={{fontSize:13,fontWeight:600,marginBottom:6}}>💬 Comentarios del administrador</h3>
          <p style={{fontSize:12,color:'#888',marginBottom:12}}>Solicitudes de presupuesto, sugerencias, notas para la gerencia</p>
          <textarea value={foda.comentarios} onChange={e=>setFoda({...foda,comentarios:e.target.value})}
            style={{width:'100%',padding:'10px 12px',border:'0.5px solid #e0e0dc',borderRadius:8,fontSize:13,resize:'vertical',background:'#fafaf8',outline:'none',lineHeight:1.6,color:'#333',minHeight:100}}
            placeholder="Escribe aquí tus comentarios, solicitudes o sugerencias..."/>
          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:12,flexWrap:'wrap'}}>
            <span style={{fontSize:12,color:'#555',fontWeight:500}}>Estado:</span>
            {['Próximo trimestre','Negado','Aprobado','En proceso','Cumplido'].map(s=>(
              <button key={s} style={{padding:'4px 12px',border:'0.5px solid #ddd',borderRadius:6,background:'#f5f5f0',fontSize:11,color:'#666',cursor:'pointer'}}>{s}</button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
