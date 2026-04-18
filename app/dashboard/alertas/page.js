'use client'
import Sidebar from '../../../components/Sidebar'

const ALERTAS = [
  { tipo:'critico', centro:'Calle 50', msg:'Deserción crítica: 82 retiros en el trimestre. Meta máxima: 55.', fecha:'Hoy', icon:'🔴' },
  { tipo:'critico', centro:'David', msg:'Solo 29 nuevos ingresos vs meta de 60. Cobranza sin cumplir 3 meses consecutivos.', fecha:'Hoy', icon:'🔴' },
  { tipo:'advertencia', centro:'Brisas del Golf', msg:'Nuevos ingresos cayeron de 33 (enero) a 8 (marzo). Tendencia negativa.', fecha:'Ayer', icon:'🟡' },
  { tipo:'advertencia', centro:'Aguadulce', msg:'Solo 22 nuevos ingresos en el trimestre. Revisar estrategia de ventas.', fecha:'Ayer', icon:'🟡' },
  { tipo:'advertencia', centro:'Chitre', msg:'Cobranza vencida sin cumplir meta en 2 de 3 meses.', fecha:'Hace 2 días', icon:'🟡' },
  { tipo:'info', centro:'Santiago', msg:'Excelente trimestre: 97% cumplimiento y 61 nuevos ingresos. Centro destacado.', fecha:'Esta semana', icon:'🟢' },
  { tipo:'info', centro:'Anclas Mall', msg:'Segundo mejor cumplimiento (96%). Meta de nuevos ingresos superada.', fecha:'Esta semana', icon:'🟢' },
]
const COLORS = {
  critico: { bg:'#FAECE7', border:'#F0997B', title:'#993C1D' },
  advertencia: { bg:'#FAEEDA', border:'#FAC775', title:'#854F0B' },
  info: { bg:'#E1F5EE', border:'#5DCAA5', title:'#0F6E56' },
}

export default function AlertasPage() {
  const criticas = ALERTAS.filter(a => a.tipo === 'critico')
  const advertencias = ALERTAS.filter(a => a.tipo === 'advertencia')
  const info = ALERTAS.filter(a => a.tipo === 'info')

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f5f5f0'}}>
      <Sidebar rol="admin_general"/>
      <main style={{flex:1,padding:28}}>
        <div style={{marginBottom:24}}>
          <h1 style={{fontSize:20,fontWeight:600,marginBottom:4}}>Alertas</h1>
          <p style={{fontSize:12,color:'#888'}}>{criticas.length} críticas · {advertencias.length} advertencias · {info.length} positivas</p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:24}}>
          {[{l:'Alertas críticas',v:criticas.length,c:'#993C1D',bg:'#FAECE7'},{l:'Advertencias',v:advertencias.length,c:'#854F0B',bg:'#FAEEDA'},{l:'Noticias positivas',v:info.length,c:'#0F6E56',bg:'#E1F5EE'}]
            .map((m,i) => <div key={i} style={{background:m.bg,borderRadius:10,padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:13,color:m.c,fontWeight:500}}>{m.l}</span>
              <span style={{fontSize:28,fontWeight:700,color:m.c}}>{m.v}</span>
            </div>)}
        </div>

        {[{t:'🔴 Críticas — Acción inmediata requerida', items:criticas},{t:'🟡 Advertencias — Revisar esta semana', items:advertencias},{t:'🟢 Positivas', items:info}]
          .map(({t, items}) => items.length > 0 && (
            <div key={t} style={{marginBottom:24}}>
              <h2 style={{fontSize:13,fontWeight:600,color:'#444',marginBottom:12,textTransform:'uppercase',letterSpacing:'0.04em'}}>{t}</h2>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {items.map((a,i) => (
                  <div key={i} style={{background:COLORS[a.tipo].bg,border:`0.5px solid ${COLORS[a.tipo].border}`,borderRadius:10,padding:'14px 18px',display:'flex',alignItems:'flex-start',gap:12}}>
                    <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{a.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <span style={{fontSize:13,fontWeight:600,color:COLORS[a.tipo].title}}>{a.centro}</span>
                        <span style={{fontSize:11,color:'#aaa'}}>{a.fecha}</span>
                      </div>
                      <p style={{fontSize:13,color:'#444',lineHeight:1.5}}>{a.msg}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </main>
    </div>
  )
}
