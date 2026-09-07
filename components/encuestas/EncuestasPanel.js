'use client'
import {useEffect,useState,useRef} from 'react'
import Link from 'next/link'
import {cargarEncuesta,prepararEncuesta,registrarDifusionEncuesta} from '../../app/actions/encuestas'
import {PREGUNTAS,textoFoda} from '../../lib/encuestas/domain.mjs'
import {descargarArchivo,prepararCartel} from '../../lib/carteles/descargar.mjs'

export {descargarArchivo} from '../../lib/carteles/descargar.mjs'
export default function EncuestasPanel({centroId,anio,mes,compact=false,onResumen}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[linkManual,setLinkManual]=useState('')
  const revision=useRef(0)
  const [formato,setFormato]=useState('carta')
  async function cargar(version=revision.current) {
    const r=await cargarEncuesta(centroId,anio,mes)
    if(version!==revision.current)return
    if(r.error) {setError(r.error);return}setData(r);setError('');onResumen?.(r.resumen)
  }
  useEffect(()=>{const v=++revision.current;setBusy(false);setData(null);setError('');setStatus('');setLinkManual('');cargar(v)
    const timer=setInterval(()=>cargar(v),30000)
    const focus=()=>cargar(v);window.addEventListener('focus',focus)
    return()=>{revision.current++;clearInterval(timer);window.removeEventListener('focus',focus)}
  },[centroId,anio,mes])
  const base=()=>window.location.origin
  async function preparar() {
    const c=data?.campana || await prepararEncuesta(centroId,anio,mes)
    if(c.error)throw new Error(c.error)
    return c
  }
  async function ejecutar(tipo,p=null) {
    if(busy)return
    setBusy(true);setStatus('');setError('')
    const v=revision.current
    try {
      const c=await preparar(),url=`${base()}/encuesta/${c.token}${p?`?p=${p.token}`:''}`
      if(v!==revision.current)return
      if(tipo==='qr') {
        const archivo=await prepararCartel({tipo:'encuesta',centro:data.centro.nombre,centroId,enlace:url,anio,mes,formato})
        if(v!==revision.current)return
        descargarArchivo(archivo.blob,archivo.nombre)
      } else {
        setLinkManual(url)
        try {await navigator.clipboard.writeText(url)} catch {throw new Error('El navegador no permitió copiar. Usa el enlace visible y vuelve a pulsar Copiar enlace cuando esté permitido.')}
      }
      const r=await registrarDifusionEncuesta(centroId,c.id,tipo)
      if(r.error)throw new Error(`El recurso está listo, pero no se registró la difusión: ${r.error}`)
      if(v!==revision.current)return
      setStatus(tipo==='qr'?'Cartel PDF descargado y registrado. Imprime a tamaño real y renueva el cartel cada mes.':'Enlace copiado. Compártelo por mensaje directo con cada representante.')
      await cargar(v)
    } catch(e){if(v===revision.current)setError(e.message)} finally{if(v===revision.current)setBusy(false)}
  }
  const nombreMes=new Intl.DateTimeFormat('es-PA',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(anio,mes-1,1)))
  if(!data)return <section className="survey-box" data-tour="encuestas.panel"><h2>Encuesta de satisfacción</h2><p role={error?'alert':'status'}>{error||'Cargando la participación del mes…'}</p>{error&&<button className="btn" onClick={()=>cargar()}>Reintentar</button>}</section>
  const r=data.resumen
  return <section className="survey-panel" data-tour="encuestas.panel" aria-label="Encuesta de satisfacción mensual">
    <div className="survey-box survey-hero">
      <div><p className="label">{nombreMes} · RETENCIÓN</p><h2>Escucha a tus familias</h2><p>Comparte la encuesta durante el cierre de nivel y pide responder antes de salir. Cada respuesta ayuda a detectar qué debemos mejorar.</p></div>
      <span className={`pill ${r.cumple?'pill--ok':''}`} data-tour="encuestas.cumplimiento">{r.cumple?'✓ Hecho en Cumplimiento':data.abierta?'Pendiente de completar':'Mes cerrado'}</span>
    </div>
    <div className="survey-stats" data-tour="encuestas.progreso">
      <div className="survey-box"><span className="label">PARTICIPACIÓN</span><strong>{r.respuestas} <small>de {r.activos}</small></strong><p>{r.participacion}% de los niños del corte</p><progress max={r.activos||1} value={r.respuestas} aria-label="Niños con encuesta respondida"/></div>
      <div className="survey-box"><span className="label">META DEL MES</span><strong>{r.necesarias||'—'} <small>respuestas</small></strong><p>Más del 50% de los activos. {r.faltan>0?`Falta${r.faltan===1?'':'n'} ${r.faltan}.`:r.activos?'Participación alcanzada.':'Revisa el padrón activo.'}</p></div>
      <div className="survey-box"><span className="label">SATISFACCIÓN</span><strong>{r.satisfaccion===null?'—':`${r.satisfaccion}%`}</strong><p>{r.respuestas?'Padres que eligieron 4 o 5 en la valoración general.':'Aún no hay respuestas para medirla.'}</p></div>
    </div>
    <div className="survey-box" data-tour="encuestas.compartir">
      <h3>1. Comparte la encuesta del mes</h3>
      <p>La copia del enlace o descarga del QR queda registrada. Para marcar el mes también deben responder más de la mitad de los niños del corte.</p>
      <div className="survey-actions"><button className="btn btn--primary" disabled={busy||!data.abierta||!r.activos} onClick={()=>ejecutar('copiar')}>Copiar enlace</button><label className="survey-field">Tamaño del cartel<select value={formato} disabled={busy} onChange={e=>setFormato(e.target.value)}><option value="carta">Carta</option><option value="a4">A4</option></select></label><button className="btn" disabled={busy||!data.abierta||!r.activos} onClick={()=>ejecutar('qr')}>Descargar cartel PDF con QR</button><button className="btn" disabled={busy} onClick={()=>cargar()}>Actualizar respuestas</button></div>
      <p className="h-sub">Diseño ALOHA con nombre del centro, llamado a responder y QR del mes. Imprime en Carta o A4 a tamaño real.</p>
      {busy&&<p role="status">Preparando el recurso…</p>}
      <p className="h-sub">{r.compartida?'✓ Copia o descarga registrada.':'Aún no hay copia ni descarga registrada.'} {data.campana?`Corte de activos: ${String(data.campana.corte).slice(0,10)}. La lista y la meta quedan fijas este mes.`:'La encuesta y el corte se crean automáticamente al copiar o descargar por primera vez.'}</p>
      {!data.abierta&&<p>El enlace de este mes ya no recibe respuestas. Abre el mes actual para compartir una nueva encuesta.</p>}
      {linkManual&&<label className="survey-field">Enlace preparado<input readOnly value={linkManual} onFocus={e=>e.target.select()}/></label>}
      {status&&<p role="status">{status}</p>}{error&&<p role="alert" className="survey-error">{error}</p>}
    </div>
    <div className="survey-box" data-tour="encuestas.resultados"><h3>2. Revisa lo que dicen y llévalo al FODA</h3><p>{textoFoda(nombreMes,r)}</p>
      <p className="h-sub">Participación mide cuántos respondieron. Satisfacción mide cómo valoraron la experiencia; una participación completa también puede revelar problemas.</p>
      <Link className="btn" href={`/centro/${centroId}/foda`}>Abrir FODA</Link>{compact&&<Link className="btn" href={`/centro/${centroId}/encuestas?anio=${anio}&mes=${mes}`}>Ver resultados y enlaces individuales</Link>}
    </div>
    {!compact&&<>
      <div className="survey-box"><h3>Resultados por pregunta</h3>{PREGUNTAS.map(p=><p key={p.id}>{p.texto} <b>{r.promedios[p.id]===null?'Sin respuestas':`${r.promedios[p.id]} / 5`}</b></p>)}</div>
      <details className="survey-box" data-tour="encuestas.individuales"><summary>Participación por niño y enlaces individuales ({data.participantes.length})</summary><p>Los enlaces individuales validan la ficha sin pedir nombre ni teléfono. Compártelos solo con el representante de ese niño.</p>
        <div className="survey-roster">{data.participantes.map(p=><div className="survey-roster__row" key={p.id}><div><b>{p.nombre}</b><p className="h-sub">Grupo {p.grupo||'sin asignar'} · {p.respondida_at?'✓ Respondió':'Pendiente'}{!p.tiene_telefono?' · Usar enlace individual':''}</p></div><button className="btn" aria-label={`Copiar enlace de ${p.nombre}`} disabled={busy||!data.abierta||!!p.respondida_at} onClick={()=>ejecutar('individual',p)}>Copiar enlace individual</button></div>)}</div>
      </details>
      <details className="survey-box"><summary>Comentarios de las familias</summary>{data.respuestas.filter(x=>x.mejorar||x.destacar).length===0?<p>Sin comentarios por ahora.</p>:data.respuestas.filter(x=>x.mejorar||x.destacar).map((x,i)=><div className="survey-comment" key={i}>{x.mejorar&&<p><b>Para mejorar:</b> {x.mejorar}</p>}{x.destacar&&<p><b>Para destacar:</b> {x.destacar}</p>}</div>)}</details>
      <details className="survey-box"><summary>Últimas copias y descargas</summary>{data.difusiones?.length?data.difusiones.map((d,i)=><p key={i}>{d.nombre} · {d.tipo==='qr'?'Descarga del QR':d.tipo==='individual'?'Copia de enlace individual':'Copia del enlace'} · {new Date(d.created_at).toLocaleString('es-PA',{timeZone:'America/Panama'})}</p>):<p>Todavía no hay acciones registradas.</p>}</details>
    </>}
  </section>
}
