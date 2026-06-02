'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import { getCentrosKpi } from '../../actions/dashboard'

const COLORS = {
  critico: { bg:'#FAECE7', border:'#F0997B', title:'#993C1D' },
  advertencia: { bg:'#FAEEDA', border:'#FAC775', title:'#854F0B' },
  info: { bg:'#E1F5EE', border:'#5DCAA5', title:'#0F6E56' },
}

function buildAlertas(centros) {
  const out = []
  for (const c of centros) {
    if (c.estado === 'Crítico') {
      out.push({ tipo:'critico', centro:c.nombre, icon:'🔴', fecha:'Q1 2026',
        msg:`Cumplimiento crítico (${c.cumpl}%). Nuevos ingresos ${c.nuevos}/${c.meta} y ${c.desercion} deserciones en el trimestre.` })
    } else if (c.estado === 'Parcial') {
      out.push({ tipo:'advertencia', centro:c.nombre, icon:'🟡', fecha:'Q1 2026',
        msg: c.nuevos < c.meta
          ? `Cumplimiento parcial (${c.cumpl}%). Faltan ${c.meta - c.nuevos} nuevos ingresos para alcanzar la meta.`
          : `Cumplimiento parcial (${c.cumpl}%). Revisar deserción y cobranza.` })
    } else {
      out.push({ tipo:'info', centro:c.nombre, icon:'🟢', fecha:'Q1 2026',
        msg:`Buen trimestre: ${c.cumpl}% de cumplimiento y ${c.nuevos} nuevos ingresos.` })
    }
  }
  return out
}

export default function AlertasPage() {
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCentrosKpi()
      .then((data) => setAlertas(buildAlertas(data || [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const criticas = alertas.filter(a => a.tipo === 'critico')
  const advertencias = alertas.filter(a => a.tipo === 'advertencia')
  const info = alertas.filter(a => a.tipo === 'info')

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f5f5f0'}}>
      <Sidebar rol="admin_general"/>
      <main style={{flex:1,padding:28}}>
        <div style={{marginBottom:24}}>
          <h1 style={{fontSize:20,fontWeight:600,marginBottom:4}}>Alertas</h1>
          <p style={{fontSize:12,color:'#888'}}>{criticas.length} críticas · {advertencias.length} advertencias · {info.length} positivas</p>
        </div>

        {loading ? (
          <div style={{padding:40,textAlign:'center',color:'#888'}}>Generando alertas...</div>
        ) : alertas.length === 0 ? (
          <div style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:48,textAlign:'center',color:'#aaa'}}>
            <div style={{fontSize:32,marginBottom:12}}>🔔</div>
            <div style={{fontSize:14,fontWeight:500}}>No hay alertas todavía</div>
            <div style={{fontSize:12,marginTop:6}}>Las alertas se generan a partir del cumplimiento de cada centro.</div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </main>
    </div>
  )
}
