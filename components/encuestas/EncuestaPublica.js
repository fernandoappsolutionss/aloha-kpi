'use client'
import {useState} from 'react'
import {PREGUNTAS,ESCALA} from '../../lib/encuestas/domain.mjs'
const mesLabel=(anio,mes)=>new Intl.DateTimeFormat('es-PA',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(anio,mes-1,1)))
export default function EncuestaPublica({token,individual,datos,permanente=false}) {
  const [vals,setVals]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false)
  const set=(k,v)=>setVals(x=>({...x,[k]:v}))
  async function enviar(e) {
    e.preventDefault();if(busy)return;setBusy(true);setError('')
    try {
      const res=await fetch(`/api/encuestas/${token}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...vals,individual})})
      const result=await res.json();if(!res.ok || result.error)throw new Error(result.error || 'No se pudo enviar.')
      setDone(true)
    }catch(e){setError(e.message || 'No se pudo conectar. Tus respuestas siguen aquí; vuelve a intentar.')}finally{setBusy(false)}
  }
  return <main className="survey-public" id="main-content">
    <div className="survey-public__brand"><img src="/ALOHA-LOGO.png" alt="ALOHA Mental Arithmetic" onError={e=>{e.currentTarget.style.display='none'}}/><span>ALOHA · PANAMÁ</span></div>
    <p className="label">{datos.nombre} · {mesLabel(datos.anio,datos.mes)}</p>
    <h1>{done?'Gracias por tu opinión':datos.abierta?'Tu opinión nos ayuda a mejorar':'Esta encuesta ya cerró'}</h1>
    {done?<div role="status" className="survey-box"><p>Tu respuesta quedó registrada. Si ya habías respondido este mes, conservamos tu primera respuesta.</p><p>El equipo del centro revisará lo que compartiste.</p></div>:!datos.abierta?permanente?<button className="btn" type="button" onClick={()=>window.location.reload()}>Abrir encuesta vigente</button>:<p>Solicita al centro el enlace del mes actual.</p>:<>
      <p>Cuéntanos cómo ha sido la experiencia de tu hijo. Te toma unos 2 minutos. Una respuesta por niño, cada mes.</p>
      <p className="h-sub">Tus respuestas son confidenciales para el equipo autorizado del centro y su supervisión. Usamos los datos del niño para evitar respuestas duplicadas; esta encuesta no es anónima.</p>
      <form onSubmit={enviar}>
        {!individual && <fieldset className="survey-box"><legend>Primero, validamos la ficha</legend>
          <label className="survey-field">Nombre completo del niño<input required maxLength={160} autoComplete="off" value={vals.nombre||''} onChange={e=>set('nombre',e.target.value)}/></label>
          <label className="survey-field">Teléfono del representante registrado en el centro<input required type="tel" autoComplete="tel" maxLength={30} value={vals.telefono||''} onChange={e=>set('telefono',e.target.value)}/></label>
          <p className="h-sub">Si los datos no coinciden, pide al centro tu enlace individual.</p>
        </fieldset>}
        {PREGUNTAS.map((p,index)=><fieldset className="survey-box" key={p.id}><legend>{index+1}. {p.texto}</legend>
          <div className="survey-options">{ESCALA.map((label,i)=><label className={`survey-option${vals[p.id]===i+1?' is-selected':''}`} key={i}>
            <input required type="radio" name={p.id} value={i+1} checked={vals[p.id]===i+1} onChange={()=>set(p.id,i+1)}/><b>{i+1}</b><span>{label}</span>
          </label>)}</div>
        </fieldset>)}
        <div className="survey-box"><label className="survey-field">¿Qué podemos mejorar? <span className="h-sub">Opcional</span><textarea rows={3} maxLength={1000} value={vals.mejorar||''} onChange={e=>set('mejorar',e.target.value)}/></label>
          <label className="survey-field">¿Qué te gustaría destacar? <span className="h-sub">Opcional</span><textarea rows={3} maxLength={1000} value={vals.destacar||''} onChange={e=>set('destacar',e.target.value)}/></label></div>
        <div className="survey-honeypot" aria-hidden="true"><label>Sitio web<input tabIndex={-1} autoComplete="off" value={vals.trampa||''} onChange={e=>set('trampa',e.target.value)}/></label></div>
        <label className="survey-consent"><input type="checkbox" required checked={!!vals.consentimiento} onChange={e=>set('consentimiento',e.target.checked)}/><span>Soy el representante del niño y acepto enviar estas respuestas al equipo autorizado de ALOHA.</span></label>
        {error&&<div role="alert" className="survey-error"><p>{error}</p>{permanente&&<button className="btn" type="button" onClick={()=>window.location.reload()}>Abrir encuesta vigente</button>}</div>}
        <button className="btn btn--primary" type="submit" disabled={busy}>{busy?'Guardando tu respuesta…':'Enviar mi opinión'}</button>
      </form></>}
  </main>
}
