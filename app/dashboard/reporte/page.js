'use client'
import Sidebar from '../../../components/Sidebar'

const CENTROS = [
  {nombre:'Anclas Mall',ninos:318,nuevos:72,desercion:44,cumpl:96},
  {nombre:'Santiago',ninos:189,nuevos:61,desercion:52,cumpl:97},
  {nombre:'Costa del Este',ninos:276,nuevos:63,desercion:51,cumpl:94},
  {nombre:'Condado del Rey',ninos:201,nuevos:51,desercion:48,cumpl:89},
  {nombre:'Brisas del Golf',ninos:225,nuevos:56,desercion:61,cumpl:88},
  {nombre:'Chitre',ninos:179,nuevos:45,desercion:55,cumpl:82},
  {nombre:'Aguadulce',ninos:112,nuevos:22,desercion:39,cumpl:78},
  {nombre:'David',ninos:148,nuevos:29,desercion:67,cumpl:71},
  {nombre:'Calle 50',ninos:194,nuevos:38,desercion:82,cumpl:61},
]
const tot = CENTROS.reduce((a,c)=>({ninos:a.ninos+c.ninos,nuevos:a.nuevos+c.nuevos,desercion:a.desercion+c.desercion}),{ninos:0,nuevos:0,desercion:0})

export default function ReportePage() {
  function exportCSV() {
    const rows = [['Centro','Niños Activos','Nuevos Ingresos','Deserción','% Cumplimiento'],
      ...CENTROS.map(c=>[c.nombre,c.ninos,c.nuevos,c.desercion,c.cumpl+'%']),
      ['TOTAL',tot.ninos,tot.nuevos,tot.desercion,'']
    ]
    const csv = rows.map(r=>r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = 'ALOHA_KPI_Q1_2026.csv'
    a.click()
  }

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f5f5f0'}}>
      <Sidebar rol="admin_general"/>
      <main style={{flex:1,padding:28}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:600,marginBottom:4}}>Reporte trimestral</h1>
            <p style={{fontSize:12,color:'#888'}}>Resumen consolidado Q1 2026 · 9 centros</p>
          </div>
          <button onClick={exportCSV} style={{padding:'9px 20px',background:'#533AB7',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'}}>
            📥 Exportar CSV
          </button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
          {[{l:'Total niños activos',v:tot.ninos.toLocaleString()},{l:'Nuevos ingresos',v:tot.nuevos},{l:'Deserción total',v:tot.desercion},{l:'Prom. cumplimiento',v:Math.round(CENTROS.reduce((a,c)=>a+c.cumpl,0)/CENTROS.length)+'%'}]
            .map((m,i)=><div key={i} style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:10,padding:'14px 18px'}}>
              <label style={{fontSize:11,color:'#888',display:'block',marginBottom:6}}>{m.l}</label>
              <div style={{fontSize:24,fontWeight:700}}>{m.v}</div>
            </div>)}
        </div>

        <div style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:20}}>
          <h2 style={{fontSize:13,fontWeight:600,color:'#444',marginBottom:16,textTransform:'uppercase',letterSpacing:'0.04em'}}>Detalle por centro</h2>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr>{['Centro','Niños activos','Nuevos ingresos','Meta (60)','Deserción','% Cumplimiento'].map(h=>
                <th key={h} style={{padding:'8px 14px',textAlign:'left',fontSize:11,fontWeight:600,color:'#888',borderBottom:'0.5px solid #e8e8e4',textTransform:'uppercase',letterSpacing:'0.04em'}}>{h}</th>
              )}</tr>
            </thead>
            <tbody>
              {CENTROS.map((c,i)=>(
                <tr key={i} onMouseEnter={e=>e.currentTarget.style.background='#fafaf8'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'11px 14px',borderBottom:'0.5px solid #f5f5f2',fontWeight:500}}>{c.nombre}</td>
                  <td style={{padding:'11px 14px',borderBottom:'0.5px solid #f5f5f2'}}>{c.ninos}</td>
                  <td style={{padding:'11px 14px',borderBottom:'0.5px solid #f5f5f2',color:c.nuevos>=60?'#0F6E56':'#993C1D',fontWeight:500}}>{c.nuevos}</td>
                  <td style={{padding:'11px 14px',borderBottom:'0.5px solid #f5f5f2'}}>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:8,fontWeight:500,background:c.nuevos>=60?'#E1F5EE':'#FAECE7',color:c.nuevos>=60?'#0F6E56':'#993C1D'}}>{c.nuevos>=60?'✓ Meta':'✗ No'}</span>
                  </td>
                  <td style={{padding:'11px 14px',borderBottom:'0.5px solid #f5f5f2',color:c.desercion>55?'#993C1D':'#0F6E56'}}>{c.desercion}</td>
                  <td style={{padding:'11px 14px',borderBottom:'0.5px solid #f5f5f2'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontWeight:600,color:c.cumpl>=85?'#0F6E56':c.cumpl>=70?'#854F0B':'#993C1D',width:36}}>{c.cumpl}%</span>
                      <div style={{flex:1,height:6,background:'#eee',borderRadius:3,overflow:'hidden'}}>
                        <div style={{height:'100%',width:c.cumpl+'%',background:c.cumpl>=85?'#1D9E75':c.cumpl>=70?'#EF9F27':'#D85A30',borderRadius:3}}/>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              <tr style={{background:'#EEEDFE'}}>
                <td style={{padding:'11px 14px',fontWeight:700,color:'#533AB7'}}>TOTALES</td>
                <td style={{padding:'11px 14px',fontWeight:700}}>{tot.ninos}</td>
                <td style={{padding:'11px 14px',fontWeight:700}}>{tot.nuevos}</td>
                <td style={{padding:'11px 14px'}}></td>
                <td style={{padding:'11px 14px',fontWeight:700}}>{tot.desercion}</td>
                <td style={{padding:'11px 14px',fontWeight:700,color:'#533AB7'}}>{Math.round(CENTROS.reduce((a,c)=>a+c.cumpl,0)/CENTROS.length)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
