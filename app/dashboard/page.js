'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/Sidebar'
import { supabase } from '../../lib/supabase'

const A = { blue:'#1B4580', blueMid:'#1D5FA6', green:'#4A8C3F', greenLime:'#B8D432', gray:'#F0F3F8', text:'#1A2744' }

const CENTROS_DEMO = [
  {nombre:'Brisas del Golf',admin:'Laura M.',ninos:225,nuevos:56,meta:60,desercion:61,cobranza:'No',cumpl:88,estado:'Parcial'},
  {nombre:'Anclas Mall',admin:'Karla S.',ninos:318,nuevos:72,meta:60,desercion:44,cobranza:'Sí',cumpl:96,estado:'Cumplido'},
  {nombre:'Calle 50',admin:'Ana R.',ninos:194,nuevos:38,meta:60,desercion:82,cobranza:'No',cumpl:61,estado:'Crítico'},
  {nombre:'Costa del Este',admin:'Mia P.',ninos:276,nuevos:63,meta:60,desercion:51,cobranza:'Sí',cumpl:94,estado:'Cumplido'},
  {nombre:'David',admin:'Rosa C.',ninos:148,nuevos:29,meta:60,desercion:67,cobranza:'No',cumpl:71,estado:'Parcial'},
  {nombre:'Condado del Rey',admin:'Paola V.',ninos:201,nuevos:51,meta:60,desercion:48,cobranza:'Sí',cumpl:89,estado:'Parcial'},
  {nombre:'Aguadulce',admin:'Yira F.',ninos:112,nuevos:22,meta:60,desercion:39,cobranza:'Sí',cumpl:78,estado:'Parcial'},
  {nombre:'Santiago',admin:'Gina L.',ninos:189,nuevos:61,meta:60,desercion:52,cobranza:'Sí',cumpl:97,estado:'Cumplido'},
  {nombre:'Chitre',admin:'Berta N.',ninos:179,nuevos:45,meta:60,desercion:55,cobranza:'No',cumpl:82,estado:'Parcial'},
]

const ESTADO_STYLE = {
  Cumplido: { bg:'#E6F4EC', color:'#2D7D46', dot:'#4A8C3F' },
  Parcial:  { bg:'#FEF3CD', color:'#92600A', dot:'#D97706' },
  Crítico:  { bg:'#FBE8E8', color:'#B91C1C', dot:'#D63C3C' },
}

export default function DashboardPage() {
  const router = useRouter()
  const [centros, setCentros] = useState(CENTROS_DEMO)
  const [nombre, setNombre] = useState('')
  const critcos = centros.filter(c => c.estado === 'Crítico').length

  useEffect(() => {
    setNombre(localStorage.getItem('aloha_nombre') || 'Administrador')
  }, [])

  const totNinos = centros.reduce((a,c)=>a+c.ninos,0)
  const totNuevos = centros.reduce((a,c)=>a+c.nuevos,0)
  const totDes = centros.reduce((a,c)=>a+c.desercion,0)
  const promCumpl = Math.round(centros.reduce((a,c)=>a+c.cumpl,0)/centros.length)
  const enMeta = centros.filter(c=>c.nuevos>=c.meta).length

  return (
    <div style={{display:'flex',minHeight:'100vh',background:A.gray}}>
      <Sidebar rol="admin_general"/>
      <main style={{flex:1,padding:28,overflowY:'auto'}}>

        {/* Header */}
        <div style={{marginBottom:24}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <h1 style={{fontSize:22,fontWeight:800,color:A.text,marginBottom:4}}>
                Hola, {nombre.split(' ')[0]} 👋
              </h1>
              <p style={{fontSize:13,color:'#6B7A99'}}>Panel general · Q1 2026 · {centros.length} centros activos</p>
            </div>
            {critcos > 0 && (
              <div style={{background:'#FBE8E8',border:'1px solid #F0A0A0',borderRadius:10,padding:'10px 16px',display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:20}}>🔴</span>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'#B91C1C'}}>{critcos} centro{critcos>1?'s':''} en estado crítico</div>
                  <div style={{fontSize:11,color:'#C0392B'}}>Requiere atención inmediata</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:14,marginBottom:24}}>
          {[
            {label:'Niños activos',value:totNinos.toLocaleString(),icon:'👧',color:A.blueMid,sub:'en todos los centros'},
            {label:'Nuevos ingresos',value:totNuevos,icon:'✨',color:A.green,sub:'Q1 2026'},
            {label:'Deserción total',value:totDes,icon:'📉',color:'#D97706',sub:'en el trimestre'},
            {label:'Centros en meta',value:`${enMeta}/${centros.length}`,icon:'🎯',color:A.blue,sub:'meta de ingresos'},
            {label:'Cumplimiento prom.',value:`${promCumpl}%`,icon:'📊',color:promCumpl>=85?A.green:promCumpl>=70?'#D97706':'#D63C3C',sub:'promedio general'},
          ].map((m,i)=>(
            <div key={i} style={{background:'#fff',border:'1px solid #E0E6F0',borderRadius:12,padding:'16px 18px',boxShadow:'0 2px 8px rgba(27,69,128,0.06)',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${m.color},${m.color}80)`}}/>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
                <span style={{fontSize:22}}>{m.icon}</span>
                <span style={{fontSize:10,color:'#8896A9',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'right',lineHeight:1.3}}>{m.label}</span>
              </div>
              <div style={{fontSize:28,fontWeight:800,color:m.color,lineHeight:1}}>{m.value}</div>
              <div style={{fontSize:11,color:'#8896A9',marginTop:4}}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{background:'#fff',border:'1px solid #E0E6F0',borderRadius:14,overflow:'hidden',boxShadow:'0 2px 12px rgba(27,69,128,0.07)'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #E8EBF0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <h2 style={{fontSize:15,fontWeight:700,color:A.text}}>Estado de todos los centros</h2>
            <span style={{fontSize:12,color:'#8896A9'}}>Q1 2026</span>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{background:'#F5F8FF'}}>
                {['Centro','Administradora','Niños','Nuevos','Deserción','Cobranza','Cumpl.','Tendencia','Estado'].map(h=>
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'#6B7A99',borderBottom:'1px solid #E8EBF0',textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {centros.map((c,i)=>{
                const st = ESTADO_STYLE[c.estado]
                return (
                  <tr key={i}
                    style={{cursor:'pointer',transition:'background 0.15s'}}
                    onClick={()=>router.push('/dashboard/ranking')}
                    onMouseEnter={e=>e.currentTarget.style.background='#F0F5FF'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'12px 14px',borderBottom:'1px solid #F0F2F8',fontWeight:700,color:A.text}}>{c.nombre}</td>
                    <td style={{padding:'12px 14px',borderBottom:'1px solid #F0F2F8',color:'#6B7A99',fontSize:12}}>{c.admin}</td>
                    <td style={{padding:'12px 14px',borderBottom:'1px solid #F0F2F8',fontWeight:600}}>{c.ninos}</td>
                    <td style={{padding:'12px 14px',borderBottom:'1px solid #F0F2F8',fontWeight:700,color:c.nuevos>=c.meta?A.green:'#D63C3C',fontSize:14}}>{c.nuevos} <span style={{fontSize:11,color:'#B0BAC9',fontWeight:400}}>/{c.meta}</span></td>
                    <td style={{padding:'12px 14px',borderBottom:'1px solid #F0F2F8',color:c.desercion>55?'#D63C3C':'#4A5568'}}>{c.desercion}</td>
                    <td style={{padding:'12px 14px',borderBottom:'1px solid #F0F2F8'}}>
                      <span style={{fontSize:11,padding:'2px 10px',borderRadius:20,fontWeight:600,background:c.cobranza==='Sí'?'#E6F4EC':'#FBE8E8',color:c.cobranza==='Sí'?'#2D7D46':'#B91C1C'}}>{c.cobranza}</span>
                    </td>
                    <td style={{padding:'12px 14px',borderBottom:'1px solid #F0F2F8'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontWeight:700,color:c.cumpl>=85?A.green:c.cumpl>=70?'#D97706':'#D63C3C',minWidth:32}}>{c.cumpl}%</span>
                        <div style={{flex:1,height:5,background:'#EEF0F6',borderRadius:3,overflow:'hidden',minWidth:60}}>
                          <div style={{height:'100%',width:c.cumpl+'%',background:c.cumpl>=85?'#4A8C3F':c.cumpl>=70?'#EF9F27':'#D63C3C',borderRadius:3,transition:'width 0.3s'}}/>
                        </div>
                      </div>
                    </td>
                    <td style={{padding:'12px 14px',borderBottom:'1px solid #F0F2F8',fontSize:18,textAlign:'center',color:c.nuevos>=c.meta?A.green:'#D63C3C'}}>
                      {c.nuevos>=c.meta?'↑':'↓'}
                    </td>
                    <td style={{padding:'12px 14px',borderBottom:'1px solid #F0F2F8'}}>
                      <span style={{fontSize:11,padding:'3px 10px',borderRadius:20,fontWeight:600,background:st.bg,color:st.color,display:'flex',alignItems:'center',gap:5,width:'fit-content'}}>
                        <span style={{width:6,height:6,borderRadius:3,background:st.dot,flexShrink:0}}/>
                        {c.estado}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
