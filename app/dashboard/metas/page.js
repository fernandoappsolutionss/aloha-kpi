'use client'
import { useState } from 'react'
import Sidebar from '../../../components/Sidebar'

const METAS_INIT = {
  nuevos_mes: 20,
  desercion_mes: 18.4,
  cobranza_max: 1,
  gpn_min: 8,
  cp_conversion: 50,
}

export default function MetasPage() {
  const [metas, setMetas] = useState(METAS_INIT)
  const [saved, setSaved] = useState(false)

  function save() {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const campos = [
    { k:'nuevos_mes', l:'Meta nuevos ingresos por mes', desc:'Número mínimo de nuevas matrículas que cada centro debe lograr mensualmente.', suffix:'alumnos', tipo:'number' },
    { k:'desercion_mes', l:'Meta máxima de deserción por mes', desc:'Número máximo de retiros permitidos por mes. Si se supera, el mes no cumple.', suffix:'retiros', tipo:'number' },
    { k:'cobranza_max', l:'Meta máxima de cobranza vencida', desc:'Número máximo de facturas vencidas al cierre del mes.', suffix:'facturas', tipo:'number' },
    { k:'gpn_min', l:'Promedio mínimo niños por grupo (GPN)', desc:'Cada grupo activo debe tener al menos este número de alumnos en promedio.', suffix:'niños/grupo', tipo:'number' },
    { k:'cp_conversion', l:'Meta efectividad clase de prueba', desc:'Porcentaje mínimo de invitados que deben matricularse tras asistir a la clase de prueba.', suffix:'%', tipo:'number' },
  ]

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f5f5f0'}}>
      <Sidebar rol="admin_general"/>
      <main style={{flex:1,padding:28}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:600,marginBottom:4}}>Metas globales</h1>
            <p style={{fontSize:12,color:'#888'}}>Estas metas aplican a todos los centros · Q1 2026</p>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            {saved && <span style={{fontSize:12,color:'#0F6E56',fontWeight:500}}>✅ Metas guardadas</span>}
            <button onClick={save} style={{padding:'9px 20px',background:'#533AB7',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'}}>
              💾 Guardar metas
            </button>
          </div>
        </div>

        <div style={{background:'#EEEDFE',borderRadius:10,padding:'12px 18px',marginBottom:20,fontSize:12,color:'#533AB7',lineHeight:1.6}}>
          <strong>Nota:</strong> Los cambios en estas metas se aplicarán al cálculo de cumplimiento de todos los centros a partir del siguiente registro semanal.
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {campos.map(f => (
            <div key={f.k} style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:'20px 24px',display:'flex',alignItems:'center',gap:24}}>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,marginBottom:4,color:'#1a1a1a'}}>{f.l}</div>
                <div style={{fontSize:12,color:'#888',lineHeight:1.5}}>{f.desc}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                <input
                  type={f.tipo}
                  value={metas[f.k]}
                  min="0"
                  step={f.k==='desercion_mes'?'0.1':'1'}
                  onChange={e => setMetas({...metas,[f.k]:parseFloat(e.target.value)||0})}
                  style={{width:90,padding:'9px 12px',border:'1px solid #e0e0dc',borderRadius:8,fontSize:16,fontWeight:600,textAlign:'center',outline:'none',background:'#fafaf8',color:'#533AB7'}}
                />
                <span style={{fontSize:12,color:'#888',minWidth:80}}>{f.suffix}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:20,marginTop:20}}>
          <h3 style={{fontSize:13,fontWeight:600,color:'#444',marginBottom:16,textTransform:'uppercase',letterSpacing:'0.04em'}}>Resumen de metas actuales</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
            {campos.map(f => (
              <div key={f.k} style={{textAlign:'center',background:'#f8f8f5',borderRadius:8,padding:'12px 8px'}}>
                <div style={{fontSize:22,fontWeight:700,color:'#533AB7'}}>{metas[f.k]}</div>
                <div style={{fontSize:10,color:'#888',marginTop:4,lineHeight:1.4}}>{f.suffix}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
