'use client'
import Sidebar from '../../../components/Sidebar'

const CENTROS = [
  { pos:1, nombre:'Santiago', admin:'Gina L.', cumpl:97, nuevos:61, ninos:189, trend:'↑' },
  { pos:2, nombre:'Anclas Mall', admin:'Karla S.', cumpl:96, nuevos:72, ninos:318, trend:'↑' },
  { pos:3, nombre:'Costa del Este', admin:'Mia P.', cumpl:94, nuevos:63, ninos:276, trend:'↑' },
  { pos:4, nombre:'Condado del Rey', admin:'Paola V.', cumpl:89, nuevos:51, ninos:201, trend:'→' },
  { pos:5, nombre:'Brisas del Golf', admin:'Laura M.', cumpl:88, nuevos:56, ninos:225, trend:'→' },
  { pos:6, nombre:'Chitre', admin:'Berta N.', cumpl:82, nuevos:45, ninos:179, trend:'↓' },
  { pos:7, nombre:'Aguadulce', admin:'Yira F.', cumpl:78, nuevos:22, ninos:112, trend:'↑' },
  { pos:8, nombre:'David', admin:'Rosa C.', cumpl:71, nuevos:29, ninos:148, trend:'↓' },
  { pos:9, nombre:'Calle 50', admin:'Ana R.', cumpl:61, nuevos:38, ninos:194, trend:'↓' },
]
const MEDAL = { 1:'🥇', 2:'🥈', 3:'🥉' }

export default function RankingPage() {
  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f5f5f0'}}>
      <Sidebar rol="admin_general"/>
      <main style={{flex:1,padding:28}}>
        <div style={{marginBottom:24}}>
          <h1 style={{fontSize:20,fontWeight:600,marginBottom:4}}>Ranking de centros</h1>
          <p style={{fontSize:12,color:'#888'}}>Clasificación por % de cumplimiento — Q1 2026</p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
          {CENTROS.slice(0,3).map(c => (
            <div key={c.pos} style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:20,textAlign:'center',borderTop:`3px solid ${c.pos===1?'#BA7517':c.pos===2?'#888780':'#993C1D'}`}}>
              <div style={{fontSize:32,marginBottom:8}}>{MEDAL[c.pos]}</div>
              <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>{c.nombre}</div>
              <div style={{fontSize:12,color:'#888',marginBottom:12}}>{c.admin}</div>
              <div style={{fontSize:36,fontWeight:700,color:'#533AB7'}}>{c.cumpl}%</div>
              <div style={{fontSize:12,color:'#888',marginTop:4}}>cumplimiento</div>
              <div style={{display:'flex',justifyContent:'center',gap:16,marginTop:16,fontSize:12}}>
                <span style={{color:'#0F6E56'}}>{c.nuevos} nuevos</span>
                <span style={{color:'#555'}}>{c.ninos} niños</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:20}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr>{['Pos.','Centro','Administradora','Cumplimiento','Nuevos ing.','Niños activos','Tendencia'].map(h=>
                <th key={h} style={{padding:'8px 14px',textAlign:'left',fontSize:11,fontWeight:600,color:'#888',borderBottom:'0.5px solid #e8e8e4',textTransform:'uppercase',letterSpacing:'0.04em'}}>{h}</th>
              )}</tr>
            </thead>
            <tbody>
              {CENTROS.map(c => (
                <tr key={c.pos} onMouseEnter={e=>e.currentTarget.style.background='#fafaf8'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'12px 14px',borderBottom:'0.5px solid #f5f5f2'}}>
                    <span style={{fontWeight:700,color:c.pos<=3?'#BA7517':'#888'}}>{MEDAL[c.pos]||c.pos}</span>
                  </td>
                  <td style={{padding:'12px 14px',borderBottom:'0.5px solid #f5f5f2',fontWeight:500}}>{c.nombre}</td>
                  <td style={{padding:'12px 14px',borderBottom:'0.5px solid #f5f5f2',color:'#888'}}>{c.admin}</td>
                  <td style={{padding:'12px 14px',borderBottom:'0.5px solid #f5f5f2'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontWeight:600,color:c.cumpl>=85?'#0F6E56':c.cumpl>=70?'#854F0B':'#993C1D'}}>{c.cumpl}%</span>
                      <div style={{flex:1,height:6,background:'#eee',borderRadius:3,overflow:'hidden',minWidth:80}}>
                        <div style={{height:'100%',width:`${c.cumpl}%`,background:c.cumpl>=85?'#1D9E75':c.cumpl>=70?'#EF9F27':'#D85A30',borderRadius:3}}/>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:'12px 14px',borderBottom:'0.5px solid #f5f5f2'}}>{c.nuevos}</td>
                  <td style={{padding:'12px 14px',borderBottom:'0.5px solid #f5f5f2'}}>{c.ninos}</td>
                  <td style={{padding:'12px 14px',borderBottom:'0.5px solid #f5f5f2',fontSize:16,color:c.trend==='↑'?'#0F6E56':c.trend==='↓'?'#993C1D':'#888'}}>{c.trend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
