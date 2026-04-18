'use client'
import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import { supabase } from '../../../../lib/supabase'

const METAS = { cob: 0.69, des: 3.68, ing: 4 }
const MESES_N = ['', 'Enero', 'Febrero', 'Marzo']
const initSems = () => Array.from({length:5},(_,i) => ({semana:i+1,cob:[0,0,0,0,0],des:[0,0,0,0,0],ing:[0,0,0,0,0]}))
const calc = (arr, tipo) => tipo==='cob' ? Math.min(...arr) : arr.reduce((a,b)=>a+b,0)

export default function KPIPage() {
  const params = useParams()
  const sp = useSearchParams()
  const nombre = sp.get('nombre') || localStorage.getItem('aloha_centro_nombre') || 'MI CENTRO'
  const centroId = params.id === 'demo' ? null : params.id

  const [mes, setMes] = useState(1)
  const [sems, setSems] = useState(initSems())
  const [resumen, setResumen] = useState({ni:0,nf:0,grupos:0,cp_inv:0,cp_as:0,cp_mat:0,mot_p:0,mot_e:0,mot_t:0,mot_h:0,or_ref:0,or_mkt:0,or_cen:0,or_act:0,or_med:0})
  const [trimestreId, setTrimestreId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  useEffect(() => { loadData() }, [mes, centroId])

  async function loadData() {
    if (!centroId) { setLoading(false); return }
    setLoading(true)
    try {
      // Get or create trimestre
      let { data: trim } = await supabase
        .from('trimestres')
        .select('id')
        .eq('centro_id', centroId)
        .eq('anio', 2026)
        .eq('trimestre', 1)
        .single()

      if (!trim) {
        const { data: newTrim } = await supabase
          .from('trimestres')
          .insert({ centro_id: centroId, anio: 2026, trimestre: 1 })
          .select('id').single()
        trim = newTrim
      }
      setTrimestreId(trim.id)

      // Load semanas for this mes
      const { data: semsData } = await supabase
        .from('kpi_semanas')
        .select('*')
        .eq('trimestre_id', trim.id)
        .eq('mes', mes)
        .order('semana')

      if (semsData && semsData.length > 0) {
        const loaded = initSems()
        semsData.forEach(s => {
          const idx = s.semana - 1
          loaded[idx].cob = [s.cob_d1,s.cob_d2,s.cob_d3,s.cob_d4,s.cob_d5]
          loaded[idx].des = [s.des_d1,s.des_d2,s.des_d3,s.des_d4,s.des_d5]
          loaded[idx].ing = [s.ing_d1,s.ing_d2,s.ing_d3,s.ing_d4,s.ing_d5]
        })
        setSems(loaded)
      } else {
        setSems(initSems())
      }

      // Load resumen mes
      const { data: res } = await supabase
        .from('resumen_mes')
        .select('*')
        .eq('trimestre_id', trim.id)
        .eq('mes', mes)
        .single()

      if (res) {
        setResumen({ni:res.ninos_inicio_mes||0,nf:res.ninos_final_mes||0,grupos:res.grupos_activos||0,
          cp_inv:res.cp_invitados||0,cp_as:res.cp_asistieron||0,cp_mat:res.cp_matriculados||0,
          mot_p:res.mot_perdida_clase||0,mot_e:res.mot_economico||0,mot_t:res.mot_tecnica||0,mot_h:res.mot_horario||0,
          or_ref:res.orig_referido||0,or_mkt:res.orig_marketing||0,or_cen:res.orig_centro||0,or_act:res.orig_activaciones||0,or_med:res.orig_medios||0})
      } else {
        setResumen({ni:0,nf:0,grupos:0,cp_inv:0,cp_as:0,cp_mat:0,mot_p:0,mot_e:0,mot_t:0,mot_h:0,or_ref:0,or_mkt:0,or_cen:0,or_act:0,or_med:0})
      }
    } catch (e) { setStatus('Error cargando datos: ' + e.message) }
    setLoading(false)
  }

  function upd(si, tipo, di, val) {
    setSems(prev => { const n = prev.map(s => ({...s,[tipo]:[...s[tipo]]})); n[si][tipo][di]=parseInt(val)||0; return n })
  }

  async function save() {
    if (!centroId) { setStatus('Modo demo — conéctate con tu cuenta real para guardar.'); return }
    setSaving(true); setStatus('')
    try {
      // Upsert cada semana
      for (const sem of sems) {
        await supabase.from('kpi_semanas').upsert({
          trimestre_id: trimestreId, mes, semana: sem.semana,
          cob_d1:sem.cob[0],cob_d2:sem.cob[1],cob_d3:sem.cob[2],cob_d4:sem.cob[3],cob_d5:sem.cob[4],
          des_d1:sem.des[0],des_d2:sem.des[1],des_d3:sem.des[2],des_d4:sem.des[3],des_d5:sem.des[4],
          ing_d1:sem.ing[0],ing_d2:sem.ing[1],ing_d3:sem.ing[2],ing_d4:sem.ing[3],ing_d5:sem.ing[4],
          updated_at: new Date().toISOString()
        }, { onConflict: 'trimestre_id,mes,semana' })
      }
      // Upsert resumen mes
      await supabase.from('resumen_mes').upsert({
        trimestre_id: trimestreId, mes,
        ninos_inicio_mes:resumen.ni, ninos_final_mes:resumen.nf, grupos_activos:resumen.grupos,
        cp_invitados:resumen.cp_inv, cp_asistieron:resumen.cp_as, cp_matriculados:resumen.cp_mat,
        mot_perdida_clase:resumen.mot_p, mot_economico:resumen.mot_e, mot_tecnica:resumen.mot_t, mot_horario:resumen.mot_h,
        orig_referido:resumen.or_ref, orig_marketing:resumen.or_mkt, orig_centro:resumen.or_cen,
        orig_activaciones:resumen.or_act, orig_medios:resumen.or_med,
        updated_at: new Date().toISOString()
      }, { onConflict: 'trimestre_id,mes' })
      setSaved(true); setStatus('✅ Datos guardados correctamente en Supabase.')
      setTimeout(() => { setSaved(false); setStatus('') }, 4000)
    } catch (e) { setStatus('❌ Error guardando: ' + e.message) }
    setSaving(false)
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
          <div>
            <h1 style={{fontSize:20,fontWeight:600,marginBottom:4}}>Registro KPI Semanal</h1>
            <p style={{fontSize:12,color:'#888'}}>{nombre} · Q1 2026</p>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {status && <span style={{fontSize:12,color:status.includes('❌')?'#993C1D':'#0F6E56',fontWeight:500,maxWidth:300}}>{status}</span>}
            <button onClick={save} disabled={saving||loading} style={{padding:'9px 20px',background:'#533AB7',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',opacity:saving?0.7:1}}>
              {saving?'Guardando...':'💾 Guardar'}
            </button>
          </div>
        </div>

        {loading && <div style={{padding:20,textAlign:'center',color:'#888'}}>Cargando datos...</div>}

        {!loading && <>
          <div style={{display:'flex',marginBottom:20,borderBottom:'0.5px solid #e8e8e4'}}>
            {['Enero','Febrero','Marzo'].map((m,i)=>
              <button key={m} onClick={()=>setMes(i+1)}
                style={{padding:'9px 20px',background:'none',border:'none',fontSize:13,cursor:'pointer',borderBottom:mes===i+1?'2px solid #533AB7':'2px solid transparent',color:mes===i+1?'#533AB7':'#888',fontWeight:mes===i+1?600:400,marginBottom:-1}}>
                {m}
              </button>
            )}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
            {[
              {l:'Nuevos ingresos',v:totIng,ok:totIng>=20,meta:'Meta mes: 20'},
              {l:'Deserción total',v:totDes,ok:totDes<=18.4,meta:'Meta máx: 18.4'},
              {l:'Cobranza vencida',v:totCob,ok:totCob<=1,meta:'Meta: ≤ 1'}
            ].map((m,i)=><div key={i} style={{background:'#fff',border:`1.5px solid ${m.ok?'#5DCAA5':'#F0997B'}`,borderRadius:10,padding:'16px 18px'}}>
              <label style={{fontSize:11,color:'#888',display:'block',marginBottom:6,fontWeight:500}}>{m.l}</label>
              <div style={{fontSize:28,fontWeight:700,color:m.ok?'#0F6E56':'#993C1D'}}>{m.v}</div>
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
                      <td style={{padding:'6px 6px'}}>
                        <span style={{padding:'4px 12px',borderRadius:6,fontWeight:600,fontSize:13,background:ok?'#E1F5EE':'#FAECE7',color:ok?'#0F6E56':'#993C1D'}}>{r}</span>
                      </td>
                      <td style={{padding:'6px 10px'}}>
                        <span style={{fontSize:11,fontWeight:600,color:ok?'#0F6E56':'#993C1D'}}>{ok?'Sí ✓':'No ✗'}</span>
                      </td>
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
                  <input type="number" min="0" value={resumen[f.k]||''} onChange={e=>setResumen({...resumen,[f.k]:parseInt(e.target.value)||0})}
                    style={{width:80,padding:'6px 8px',border:'0.5px solid #e0e0dc',borderRadius:6,fontSize:13,textAlign:'center',background:'#fafaf8',outline:'none'}} placeholder="0"/>
                </div>)}
              </div>
            ))}
          </div>
          <div style={{textAlign:'right',marginTop:20}}>
            <button onClick={save} disabled={saving} style={{padding:'10px 24px',background:'#533AB7',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'}}>
              {saving?'Guardando...':'💾 Guardar todos los datos'}
            </button>
          </div>
        </>}
      </main>
    </div>
  )
}
