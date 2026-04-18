'use client'
import { useParams, useSearchParams } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'

const D = {
  meses:[
    {mes:'Enero',nuevos:33,desercion:29,ninos:234,cobranza:1,cumpl:'No'},
    {mes:'Febrero',nuevos:15,desercion:14,ninos:243,cobranza:3,cumpl:'Sí'},
    {mes:'Marzo',nuevos:8,desercion:18,ninos:232,cobranza:7,cumpl:'Sí'},
  ],
  origen:[{l:'Marketing',n:26,inv:60},{l:'Centro',n:29,inv:22},{l:'Activaciones',n:1,inv:6},{l:'Referidos',n:0,inv:0}],
  motivos:[{l:'Pérd. de clase',n:42},{l:'Económico',n:13},{l:'Técnica',n:0},{l:'Horario',n:1}],
}

function Bar({val,max,color='#533AB7'}) {
  return <div style={{flex:1,height:8,background:'#f0f0ec',borderRadius:4,overflow:'hidden'}}>
    <div style={{width:`${Math.min((val/max)*100,100)}%`,height:'100%',background:color,borderRadius:4}}/>
  </div>
}

export default function CentroPage() {
  const params = useParams()
  const sp = useSearchParams()
  const nombre = sp.get('nombre') || 'BRISAS DEL GOLF'

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f5f5f0'}}>
      <Sidebar rol="administradora" centroNombre={nombre} centroId={params.id}/>
      <main style={{flex:1,padding:28,overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:600,marginBottom:4}}>{nombre}</h1>
            <p style={{fontSize:12,color:'#888'}}>Primer Trimestre 2026</p>
          </div>
          <span style={{background:'#EEEDFE',color:'#533AB7',fontSize:12,padding:'5px 14px',borderRadius:20,fontWeight:600}}>88% cumplimiento</span>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[{l:'Niños activos',v:225,s:'Prom/grupo: 8.6'},{l:'Nuevos ingresos',v:56,s:'Meta: 60 · 93%',w:true},{l:'Deserción',v:61,s:'Meta máx: 55',w:true},{l:'Grupos activos',v:27,s:'GPN: 8.59'}]
            .map((m,i) => <div key={i} style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:10,padding:'14px 16px'}}>
              <label style={{fontSize:11,color:'#888',display:'block',marginBottom:6}}>{m.l}</label>
              <div style={{fontSize:24,fontWeight:600}}>{m.v}</div>
              <div style={{fontSize:11,marginTop:4,color:m.w?'#993C1D':'#888'}}>{m.s}</div>
            </div>)}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:18}}>
            <h3 style={{fontSize:12,fontWeight:600,color:'#666',marginBottom:14,textTransform:'uppercase',letterSpacing:'0.04em'}}>Resultados por mes</h3>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr>{['Mes','Nuevos','Deserción','Niños','Cobranza','Meta'].map(h =>
                <th key={h} style={{padding:'6px 8px',textAlign:'left',fontSize:10,fontWeight:500,color:'#aaa',borderBottom:'0.5px solid #f0f0ec'}}>{h}</th>
              )}</tr></thead>
              <tbody>{D.meses.map((m,i) =>
                <tr key={i}>
                  <td style={{padding:'9px 8px',borderBottom:'0.5px solid #f5f5f2',fontSize:13,fontWeight:500}}>{m.mes}</td>
                  <td style={{padding:'9px 8px',borderBottom:'0.5px solid #f5f5f2',fontSize:13,color:m.nuevos>=20?'#0F6E56':'#993C1D'}}>{m.nuevos}</td>
                  <td style={{padding:'9px 8px',borderBottom:'0.5px solid #f5f5f2',fontSize:13}}>{m.desercion}</td>
                  <td style={{padding:'9px 8px',borderBottom:'0.5px solid #f5f5f2',fontSize:13}}>{m.ninos}</td>
                  <td style={{padding:'9px 8px',borderBottom:'0.5px solid #f5f5f2',fontSize:13}}>{m.cobranza}</td>
                  <td style={{padding:'9px 8px',borderBottom:'0.5px solid #f5f5f2'}}>
                    <span style={{fontSize:10,padding:'2px 8px',borderRadius:8,fontWeight:500,background:m.cumpl==='Sí'?'#E1F5EE':'#FAECE7',color:m.cumpl==='Sí'?'#0F6E56':'#993C1D'}}>{m.cumpl}</span>
                  </td>
                </tr>
              )}</tbody>
            </table>
          </div>

          <div style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:18}}>
            <h3 style={{fontSize:12,fontWeight:600,color:'#666',marginBottom:14,textTransform:'uppercase',letterSpacing:'0.04em'}}>Clase de prueba</h3>
            <div style={{display:'flex',gap:16,marginBottom:16}}>
              {[{l:'Invitados',v:86},{l:'Asistieron',v:57,p:'66%'},{l:'Matriculados',v:30,p:'53%'}].map((item,i) =>
                <div key={i} style={{textAlign:'center',flex:1,background:'#f8f8f5',borderRadius:8,padding:'12px 8px'}}>
                  <div style={{fontSize:22,fontWeight:600}}>{item.v}</div>
                  <div style={{fontSize:11,color:'#888',marginTop:2}}>{item.l}</div>
                  {item.p && <div style={{fontSize:10,color:'#0F6E56',marginTop:2}}>{item.p}</div>}
                </div>
              )}
            </div>
            <h3 style={{fontSize:12,fontWeight:600,color:'#666',marginBottom:12,textTransform:'uppercase',letterSpacing:'0.04em'}}>Motivo deserción</h3>
            {D.motivos.map((m,i) => <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <span style={{width:100,fontSize:11,color:'#666',textAlign:'right'}}>{m.l}</span>
              <Bar val={m.n} max={Math.max(...D.motivos.map(x=>x.n))||1} color="#D85A30"/>
              <span style={{width:24,fontSize:12,fontWeight:500}}>{m.n}</span>
            </div>)}
          </div>

          <div style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:18}}>
            <h3 style={{fontSize:12,fontWeight:600,color:'#666',marginBottom:14,textTransform:'uppercase',letterSpacing:'0.04em'}}>Origen nuevos ingresos</h3>
            {D.origen.map((o,i) => <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <span style={{width:90,fontSize:11,color:'#666',textAlign:'right'}}>{o.l}</span>
              <Bar val={o.n} max={Math.max(...D.origen.map(x=>x.n))||1}/>
              <span style={{width:60,fontSize:11}}>{o.n} / {o.inv}</span>
            </div>)}
          </div>

          <div style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:18}}>
            <h3 style={{fontSize:12,fontWeight:600,color:'#666',marginBottom:12,textTransform:'uppercase',letterSpacing:'0.04em'}}>Cumplimiento trimestral</h3>
            <div style={{fontSize:36,fontWeight:700,color:'#533AB7',marginBottom:8}}>88%</div>
            <div style={{height:12,background:'#eee',borderRadius:6,overflow:'hidden',marginBottom:16}}>
              <div style={{height:'100%',width:'88%',background:'#533AB7',borderRadius:6}}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[{l:'Metas cumplidas',v:'29/33'},{l:'Niños inicio trim.',v:230},{l:'Niños final trim.',v:225},{l:'Nuevos activos',v:63}]
                .map((item,i) => <div key={i} style={{background:'#f8f8f5',borderRadius:8,padding:'10px 12px'}}>
                  <div style={{fontSize:11,color:'#888'}}>{item.l}</div>
                  <div style={{fontSize:16,fontWeight:600}}>{item.v}</div>
                </div>)}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
