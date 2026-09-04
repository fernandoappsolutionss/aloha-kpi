'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { loadGrupoCoach, marcarAsistencia, guardarNotaCoach } from '../../actions/coach'
import OperationalCard from '../../../components/OperationalCard'
import TableScroller from '../../../components/TableScroller'
import Dialog, { useDialogCallback } from '../../../components/Dialog'

const STATES = [['presente','Presente'],['ausente','Ausente'],['justificada','Justificado']]
const fmtDia = f => `${String(f).slice(8,10)}/${String(f).slice(5,7)}`
const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Panama',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const dateLabel = f => `${f.corto} · ${f.etiqueta} · ${fmtDia(f.fecha)}`

export default function CoachPage() {
  const {token}=useParams()
  const [data,setData]=useState(null),[error,setError]=useState(''),[feedback,setFeedback]=useState('')
  const [marcas,setMarcas]=useState(new Map()),[busy,setBusy]=useState(new Set())
  const pending=useRef(new Set())
  const [selectedDate,setSelectedDate]=useState(''),[note,setNote]=useState(null)
  useEffect(()=>{
    let alive=true
    setData(null);setError('');setFeedback('')
    loadGrupoCoach(token).then(res=>{
      if(!alive)return
      if(res.error){setError(res.error);return}
      setData(res);setMarcas(new Map(res.asistencias.map(a=>[`${a.estudiante_id}|${a.fecha}`,a.estado])))
      const dates=(res.grupo.itinerario_clases?.semanas || []).flatMap(s=>s.fechas || []).sort()
      const current=today()
      setSelectedDate(dates.includes(current)?current:dates.filter(f=>f<current).at(-1)||dates[0]||'')
    }).catch(()=>{if(alive)setError('No se pudo cargar la lista. Intenta nuevamente.')})
    return ()=>{alive=false}
  },[token])
  const complete=useDialogCallback(callback=>callback(),token)
  const fechas=(data?.grupo.itinerario_clases?.semanas || []).flatMap(s=>(s.fechas||[]).map(fecha=>({fecha,corto:s.corto||'',etiqueta:s.etiqueta||'Clase'})))
  const current=today(), index=fechas.findIndex(f=>f.fecha===selectedDate)
  async function saveAttendance(est,fecha,value) {
    const key=`${est.id}|${fecha}`
    if(pending.current.has(key))return
    pending.current.add(key);setBusy(new Set(pending.current));setFeedback('')
    const previous=marcas.get(key)||''
    const update=value=>setMarcas(prev=>{const next=new Map(prev);if(value)next.set(key,value);else next.delete(key);return next})
    update(value)
    try {
      const res=await marcarAsistencia(token,est.id,fecha,value||null)
      if(res.error)throw new Error(res.error)
    }catch(e){complete(()=>{update(previous);setFeedback(e.message||'No se pudo guardar la asistencia.')})}
    finally{pending.current.delete(key);complete(()=>setBusy(new Set(pending.current)))}
  }
  function absences(est) {
    let count=0
    for(const f of fechas.filter(f=>f.fecha<=current).slice().reverse()) {
      const mark=marcas.get(`${est.id}|${f.fecha}`)
      if(mark==='ausente')count++
      else if(mark==='presente'||mark==='justificada')break
      if(count>=2)return true
    }
    return false
  }
  const noteButton=est=><button type="button" className="btn" aria-label={`Nota de ${est.nombre}`} onClick={()=>setNote(est)}>Nota{est.nota_coach?' · guardada':''}</button>
  return <main id="main-content" className="coach-page" data-page-state={error?'error':data?'ready':'loading'}>
    <div className="coach-content">
      <div className="label">ALOHA · Lista del coach</div>
      {!data?<><h1>Lista de asistencia</h1><div role={error?'alert':'status'}>{error||'Cargando…'}</div></>:<>
        <h1>Grupo {data.grupo.numero} · {data.grupo.itinerario}</h1>
        <p className="h-sub">{data.grupo.centro} · {data.grupo.coach||'Sin coach asignado'} · {data.grupo.horarioTexto}</p>
        <p>Escoge el estado de cada clase. Quitar marca deja la asistencia sin registrar. Con dos ausencias seguidas, avisa al administrador.</p>
        {feedback&&<div role="alert" className="alert alert--error">{feedback}</div>}
        {!fechas.length?<div role="status" className="alert">Este grupo aún no tiene itinerario generado. Pídele al administrador que le ponga fecha de inicio y horario.</div>:<>
          <div className="r9-mobile">
            <div className="coach-date">
              <label htmlFor="coach-date">Fecha de clase</label>
              <select id="coach-date" name="fecha" className="input" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}>{fechas.map(f=><option key={f.fecha} value={f.fecha}>{dateLabel(f)}</option>)}</select>
              <div className="attendance-actions"><button type="button" className="btn" disabled={index<=0} onClick={()=>setSelectedDate(fechas[index-1].fecha)}>Clase anterior</button><button type="button" className="btn" disabled={index>=fechas.length-1} onClick={()=>setSelectedDate(fechas[index+1].fecha)}>Clase siguiente</button></div>
              <div role="status">{fechas[index]?dateLabel(fechas[index]):'Sin fecha seleccionada'}</div>
            </div>
            <div className="operational-list">{data.estudiantes.map(est=>{
              const attendance=marcas.get(`${est.id}|${selectedDate}`)||'', disabled=busy.has(`${est.id}|${selectedDate}`)
              return <OperationalCard headingLevel={2} key={est.id} title={est.nombre} subtitle={`${est.itinerario} ${est.nivel}${est.estado==='baja_potencial'?' · baja potencial':''}`} status={absences(est)?'⚠ Dos ausencias seguidas':null}
                fields={[{label:'Clase',value:fechas[index]?dateLabel(fechas[index]):''},{label:'Asistencia',value:STATES.find(([v])=>v===attendance)?.[1]||'Sin marca'},{label:'Nota',value:est.nota_coach}]}
                actions={<div className="attendance-actions" role="group" aria-label={`Asistencia de ${est.nombre}`}>
                  {STATES.map(([value,label])=><button key={value} type="button" className="btn" aria-pressed={attendance===value} disabled={disabled} onClick={()=>saveAttendance(est,selectedDate,value)}>{label}</button>)}
                  {attendance&&<button type="button" className="btn" disabled={disabled} onClick={()=>saveAttendance(est,selectedDate,'')}>Quitar marca</button>}{noteButton(est)}
                </div>}/>
            })}</div>
          </div>
          <div className="r9-desktop"><TableScroller label="Asistencia de todas las clases" stickyFirstColumn><table className="table coach-table"><thead><tr><th>Niño</th>{fechas.map(f=><th key={f.fecha}>{dateLabel(f)}</th>)}<th>Nota</th></tr></thead><tbody>{data.estudiantes.map(est=><tr key={est.id}>
            <th scope="row">{est.nombre}{absences(est)&&<span> · ⚠ Dos ausencias seguidas</span>}<div>{est.itinerario} {est.nivel}</div></th>
            {fechas.map(f=><td key={f.fecha}><select className="input" aria-label={`Asistencia de ${est.nombre}, ${dateLabel(f)}`} value={marcas.get(`${est.id}|${f.fecha}`)||''} disabled={busy.has(`${est.id}|${f.fecha}`)} onChange={e=>saveAttendance(est,f.fecha,e.target.value)}><option value="">Sin marca</option>{STATES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></td>)}
            <td>{noteButton(est)}{est.nota_coach&&<div>{est.nota_coach}</div>}</td>
          </tr>)}</tbody></table></TableScroller></div>
        </>}
        <p>Los cambios se guardan al escoger un estado. Si un niño no aparece, el administrador debe revisar su grupo.</p>
      </>}
    </div>
    {note&&<CoachNote key={note.id} token={token} student={note} onClose={()=>setNote(null)} onSaved={text=>{setData(prev=>({...prev,estudiantes:prev.estudiantes.map(e=>e.id===note.id?{...e,nota_coach:text}:e)}));setNote(null)}}/>}
  </main>
}
function CoachNote({token,student,onClose,onSaved}) {
  const [text,setText]=useState(student.nota_coach||''),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const complete=useDialogCallback(onSaved,student.id)
  async function save(){setBusy(true);setError('');try{const r=await guardarNotaCoach(token,student.id,text);if(r.error){setError(r.error);return}complete(text.trim()||null)}catch{setError('No se pudo guardar la nota.')}finally{setBusy(false)}}
  return <Dialog open title={`Nota de ${student.nombre}`} onClose={onClose} closeDisabled={busy} className="coach-note" footer={<><button type="button" className="btn" disabled={busy} onClick={onClose}>Cancelar</button><button type="button" className="btn btn--primary" disabled={busy} onClick={save}>{busy?'Guardando…':'Guardar nota'}</button></>}>
    {error&&<div role="alert" className="alert alert--error">{error}</div>}
    <label htmlFor="coach-note">Puntuación, estado y observaciones</label><textarea id="coach-note" name="nota_coach" className="input" rows={4} value={text} onChange={e=>setText(e.target.value)}/>
  </Dialog>
}
