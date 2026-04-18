'use client'
import { useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'

const METAS = { cob: 0.69, des: 3.68, ing: 4 }
const initSems = () => Array.from({length:5},(_,i) => ({semana:i+1,cob:[0,0,0,0,0],des:[0,0,0,0,0],ing:[0,0,0,0,0]}))
const calc = (arr, tipo) => tipo==='cob' ? Math.min(...arr) : arr.reduce((a,b)=>a+b,0)

export default function KPIPage() {
  const params = useParams()
  const sp = useSearchParams()
  const nombre = sp.get('nombre') || 'BRISAS DEL GOLF'
  const [mes, setMes] = useState(1)
  const [sems, setSems] = useState(initSems())
  const [res, setRes] = useState({ni:230,nf:0,grupos:25,cp_inv:0,cp_as:0,cp_mat:0,mot_p:0,mot_e:0,mot_t:0,mot_h:0,or_ref:0,or_mkt:0,or_cen:0,or_act:0,or_med:0})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function upd(si, tipo, di, val) {
    setSems(prev => { const n = prev.map(s => ({...s,[tipo]:[...s[tipo]]})); n[si][tipo][di]=parseInt(val)||0; return n })
    setSaved(false)
  }
  async function save() {
    setSaving(true); await new Promise(r=>setTimeout(r,800)); setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),3000)
  }

  const totIng = sems.reduce((a,s)=>a+calc(s.ing,'ing'),0)
  const totDes = sems.reduce((a,s)=>a+calc(s.des,'des'),0)
  const totCob = calc(sems.map(s=>calc(s.cob,'cob')),'cob')

  const tipos = [{k:'cob',l:'Cobranza vencida (N°)',c:'#533AB7'},{k:'des',l:'Deserción (retirados)',c:'#D85A30'},{k:'ing',l:'Nuevos ingresos — ventas',c:'#0F6E56'}]

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f5f5f0'}}>
      <Sidebar rol="administradora" centroNombre={nombre} centroId={params.id}/>
      <main style={{flex:1,padding:28,overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div><h1 style={{fontSize:20,fontWeight:600,marginBottom:4}}>Registro KPI Semanal</h1>
            <p style={{fontSize:12,color:'#888'}}>{nombre} · Q1 2026</p></div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {saved && <span style={{fontSize:12,color:'#0F6E56',fontWeight:500}}>✅ Guardado</span>}
            <button onClick={save} disabled={saving} style={{padding:'9px 20px',background:'#533AB7',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'}}>
              {saving?'Guardando...':'💾 Guardar'}
            </button>
          </div>
        </div>

        <div style={{display:'flex',marginBottom:20,borderBottom:'0.5px solid #e8e8e4'}}>
          {['Enero','Febrero','Marzo'].map((m,i)=>
            <button key={m} onClick={()=>{setMes(i+1);setSems(initSems())}}
              style={{padding:'9px 20px',background:'none',border:'none',fontSize:13,cursor:'pointer',borderBottom:mes===i+1?'2px solid #533AB7':'2px solid transparent',color:mes===i+1?'#533AB7':'#888',fontWeight:mes===i+1?600:400,marginBottom:-1}}>
              {m}
            </button>
          )}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
          {[{l:'Nuevos ingresos',v:totIng,ok:totIng>=20,meta:'Meta: 20'},{l:'Deserción total',v:totDes,meta:'Meta máx: 18.4'},{l:'Cobranza vencida',v:totCob,ok:totCob<=1,meta:'Meta: ≤ 1'}]
            .map((m,i)=><div key={i} style={{background:'#fff',border:`1.5px solid ${m.ok===false?'#F0997B':m.ok?'#5DCAA5':'#e8e8e4'}`,borderRadius:10,padding:'16px 18px'}}>
              <label style={{fontSize:11,color:'#888',display:'block',marginBottom:6,fontWeight:500}}>{m.l}</label>
              <div style={{fontSize:28,fontWeight:700,color:m.ok===false?'#993C1D':m.ok?'#0F6E56':'#1a1a1a'}}>{m.v}</div>
              <div style={{fontSize:11,color:'#888'}}>{m.meta}</div>
            </div>)}
        </div>

        {tipos.map(({k,l,c}) => (
          <div key={k} style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:18,marginBottom:16}}>
            <h3 style={{fontSize:12,fontWeight:600,marginBottom:14,textTransform:'uppercase',letterSpacing:'0.04em',color:c}}>{l}</h3>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr>
                  <th style={{padding:'7px 10px',textAlign:'left',fontSize:11,fontWeight:500,color:'#aaa',borderBottom:'0.5px solid #f0f0ec'}}>Semana</th>
                  {['Día 1','Día 2','Día 3','Día 4','Día 5'].map(d=><th key={d} style={{padding:'7px 10px',textAlign:'left',fontSize:11,fontWeight:500,color:'#aaa',borderBottom:'0.5px solid #f0f0ec'}}>{d}</th>)}
                  <th style={{padding:'7px 10px',textAlign:'left',fontSize:11,fontWeight:500,color:'#aaa',borderBottom:'0.5px solid #f0f0ec'}}>Resultado</th>
                  <th style={{padding:'7px 10px',textAlign:'left',fontSize:11,fontWeight:500,color:'#aaa',borderBottom:'0.5px solid #f0f0ec'}}>¿Cumple?</th>
                </tr></thead>
                <tbody>{sems.map((sem,si)=>{
                  const r = calc(sem[k],k)
                  const meta = k==='cob'?METAS.cob:k==='des'?METAS.des:METAS.ing
                  const ok = k==='cob'?r<=meta:k==='des'?r<=meta:r>=meta
                  return <tr key={si}>
                    <td style={{padding:'6px 10px',fontWeight:500,fontSize:12,color:'#555'}}>Sem {sem.semana}</td>
                    {sem[k].map((val,di)=><td key={di} style={{padding:'6px 6px'}}>
                      <input type="number" min="0" value={val||''} onChange={e=>upd(si,k,di,e.target.value)}
                        style={{width:56,padding:'6px 8px',border:'0.5px solid #e0e0dc',borderRadius:6,fontSize:13,textAlign:'center',background:'#fafaf8',outline:'none'}} placeholder="0"/>
                    </td>)}
                    <td style={{padding:'6px 6px'}}><span style={{padding:'4px 12px',borderRadius:6,fontWeight:600,fontSize:13,background:ok?'#E1F5EE':'#FAECE7',color:ok?'#0F6E56':'#993C1D'}}>{r}</span></td>
                    <td style={{padding:'6px 10px'}}><span style={{fontSize:11,fontWeight:600,color:ok?'#0F6E56':'#993C1D'}}>{ok?'Sí ✓':'No ✗'}</span></td>
                  </tr>
                })}</tbody>
              </table>
            </div>
          </div>
        ))}

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {[
            {t:'Niños y grupos',fields:[{l:'Niños inicio del mes',k:'ni'},{l:'Niños final del mes',k:'nf'},{l:'Grupos activos',k:'grupos'}]},
            {t:'Clase de prueba',fields:[{l:'Invitados',k:'cp_inv'},{l:'Asistieron',k:'cp_as'},{l:'Matriculados',k:'cp_mat'}]},
            {t:'Motivo deserción',fields:[{l:'Pérdida de clase',k:'mot_p'},{l:'Económico',k:'mot_e'},{l:'Técnica',k:'mot_t'},{l:'Horario',k:'mot_h'}]},
            {t:'Origen nuevos ingresos',fields:[{l:'Referido',k:'or_ref'},{l:'Marketing',k:'or_mkt'},{l:'Centro',k:'or_cen'},{l:'Activaciones',k:'or_act'},{l:'Medios',k:'or_med'}]},
          ].map(({t,fields})=>(
            <div key={t} style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:18}}>
              <h3 style={{fontSize:12,fontWeight:600,color:'#666',marginBottom:14,textTransform:'uppercase',letterSpacing:'0.04em'}}>{t}</h3>
              {fields.map(f=><div key={f.k} style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingBottom:10,marginBottom:10,borderBottom:'0.5px solid #f5f5f2'}}>
                <label style={{fontSize:12,color:'#555',flex:1}}>{f.l}</label>
                <input type="number" min="0" value={res[f.k]} onChange={e=>setRes({...res,[f.k]:parseInt(e.target.value)||0})}
                  style={{width:80,padding:'6px 8px',border:'0.5px solid #e0e0dc',borderRadius:6,fontSize:13,textAlign:'center',background:'#fafaf8',outline:'none'}}/>
              </div>)}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
