'use client'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/Sidebar'

const CENTROS = [
  { nombre:'Brisas del Golf', admin:'Laura M.', ninos:225, nuevos:56, meta:60, desercion:61, cobranza:'No', cumpl:88, estado:'Parcial', tend:[70,80,88] },
  { nombre:'Anclas Mall', admin:'Karla S.', ninos:318, nuevos:72, meta:60, desercion:44, cobranza:'Sí', cumpl:96, estado:'Cumplido', tend:[80,90,96] },
  { nombre:'Calle 50', admin:'Ana R.', ninos:194, nuevos:38, meta:60, desercion:82, cobranza:'No', cumpl:61, estado:'Crítico', tend:[88,75,61] },
  { nombre:'Costa del Este', admin:'Mia P.', ninos:276, nuevos:63, meta:60, desercion:51, cobranza:'Sí', cumpl:94, estado:'Cumplido', tend:[82,88,94] },
  { nombre:'David', admin:'Rosa C.', ninos:148, nuevos:29, meta:60, desercion:67, cobranza:'No', cumpl:71, estado:'Parcial', tend:[82,76,71] },
  { nombre:'Condado del Rey', admin:'Paola V.', ninos:201, nuevos:51, meta:60, desercion:48, cobranza:'Sí', cumpl:89, estado:'Parcial', tend:[75,83,89] },
  { nombre:'Aguadulce', admin:'Yira F.', ninos:112, nuevos:22, meta:60, desercion:39, cobranza:'Sí', cumpl:78, estado:'Parcial', tend:[65,72,78] },
  { nombre:'Santiago', admin:'Gina L.', ninos:189, nuevos:61, meta:60, desercion:52, cobranza:'Sí', cumpl:97, estado:'Cumplido', tend:[85,92,97] },
  { nombre:'Chitre', admin:'Berta N.', ninos:179, nuevos:45, meta:60, desercion:55, cobranza:'No', cumpl:82, estado:'Parcial', tend:[88,85,82] },
]
const EC = { Cumplido:{bg:'#E1F5EE',color:'#0F6E56'}, Parcial:{bg:'#FAEEDA',color:'#854F0B'}, Crítico:{bg:'#FAECE7',color:'#993C1D'} }

function Spark({ v }) {
  const mx = Math.max(...v)
  return <div style={{display:'flex',alignItems:'flex-end',gap:3,height:28}}>
    {v.map((n,i) => <div key={i} style={{width:12,borderRadius:'2px 2px 0 0',height:`${n/mx*100}%`,background:i===v.length-1?'#533AB7':'#AFA9EC'}}/>)}
  </div>
}

export default function Dashboard() {
  const router = useRouter()
  const tot = CENTROS.reduce((a,c) => ({n:a.n+c.ninos,nv:a.nv+c.nuevos,d:a.d+c.desercion}), {n:0,nv:0,d:0})
  const meta = CENTROS.filter(c => c.nuevos>=c.meta).length
  const avg = Math.round(CENTROS.reduce((a,c) => a+c.cumpl,0)/CENTROS.length)

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f5f5f0'}}>
      <Sidebar rol="admin_general"/>
      <main style={{flex:1,padding:28,overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:600,marginBottom:4}}>Panel general — Q1 2026</h1>
            <p style={{fontSize:12,color:'#888'}}>{CENTROS.length} centros · Actualizado hoy</p>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
          {[{l:'Niños activos',v:tot.n.toLocaleString()},{l:'Nuevos ingresos',v:tot.nv},{l:'Deserción total',v:tot.d},{l:'Centros en meta',v:`${meta}/9`},{l:'Cumplimiento prom.',v:`${avg}%`}]
            .map((m,i) => <div key={i} style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:10,padding:'14px 16px'}}>
              <label style={{fontSize:11,color:'#888',display:'block',marginBottom:6}}>{m.l}</label>
              <div style={{fontSize:22,fontWeight:600}}>{m.v}</div>
            </div>)}
        </div>
        {CENTROS.filter(c=>c.estado==='Crítico').map(c =>
          <div key={c.nombre} style={{display:'flex',gap:10,alignItems:'center',padding:'8px 14px',background:'#FAECE7',borderRadius:8,marginBottom:6,fontSize:12}}>
            <strong style={{color:'#993C1D'}}>🔴 {c.nombre}</strong>
            <span style={{color:'#555'}}>— Deserción {c.desercion} supera la meta. Atención inmediata.</span>
          </div>
        )}
        <div style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:20,marginTop:8}}>
          <h2 style={{fontSize:14,fontWeight:600,marginBottom:16,color:'#444'}}>Estado de todos los centros</h2>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
              <thead><tr>{['Centro','Administradora','Niños','Nuevos','Deserción','Cobranza','Cumpl.','Tendencia','Estado'].map(h =>
                <th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:11,fontWeight:500,color:'#888',borderBottom:'0.5px solid #e8e8e4'}}>{h}</th>
              )}</tr></thead>
              <tbody>{CENTROS.map((c,i) =>
                <tr key={i} style={{cursor:'pointer'}} onClick={() => router.push(`/centro/demo?nombre=${encodeURIComponent(c.nombre.toUpperCase())}`)}
                  onMouseEnter={e=>e.currentTarget.style.background='#fafaf8'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'10px 12px',borderBottom:'0.5px solid #f0f0ec',fontWeight:500}}>{c.nombre}</td>
                  <td style={{padding:'10px 12px',borderBottom:'0.5px solid #f0f0ec',color:'#888'}}>{c.admin}</td>
                  <td style={{padding:'10px 12px',borderBottom:'0.5px solid #f0f0ec'}}>{c.ninos}</td>
                  <td style={{padding:'10px 12px',borderBottom:'0.5px solid #f0f0ec'}}>{c.nuevos}<span style={{fontSize:10,color:c.nuevos>=c.meta?'#0F6E56':'#993C1D',marginLeft:4}}>/{c.meta}</span></td>
                  <td style={{padding:'10px 12px',borderBottom:'0.5px solid #f0f0ec'}}>{c.desercion}</td>
                  <td style={{padding:'10px 12px',borderBottom:'0.5px solid #f0f0ec'}}><span style={{fontSize:10,padding:'2px 9px',borderRadius:10,fontWeight:500,background:c.cobranza==='Sí'?'#E1F5EE':'#FAECE7',color:c.cobranza==='Sí'?'#0F6E56':'#993C1D'}}>{c.cobranza}</span></td>
                  <td style={{padding:'10px 12px',borderBottom:'0.5px solid #f0f0ec'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontWeight:500}}>{c.cumpl}%</span>
                      <div style={{flex:1,minWidth:60,height:6,background:'#eee',borderRadius:3,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${c.cumpl}%`,background:'#533AB7',borderRadius:3}}/>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:'10px 12px',borderBottom:'0.5px solid #f0f0ec'}}><Spark v={c.tend}/></td>
                  <td style={{padding:'10px 12px',borderBottom:'0.5px solid #f0f0ec'}}><span style={{fontSize:10,padding:'2px 9px',borderRadius:10,fontWeight:500,...EC[c.estado]}}>{c.estado}</span></td>
                </tr>
              )}</tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
