'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {resumenEncuestasTrimestre} from '../../app/actions/encuestas'
export default function EncuestasFoda({centroId,anio,trimestre}) {
  const [data,setData]=useState(null)
  useEffect(()=>{let active=true;setData(null);resumenEncuestasTrimestre(Number(centroId),anio,trimestre).then(r=>{if(active)setData(r)}).catch(()=>{if(active)setData({error:'No se pudieron cargar las encuestas.'})});return()=>{active=false}},[centroId,anio,trimestre])
  return <section className="survey-box"><p className="label">DATOS PARA TU FODA</p><h2>Satisfacción de las familias</h2>
    {!data?<p role="status">Cargando encuestas del trimestre…</p>:data.error?<p role="alert">{data.error}</p>:data.meses.map(m=><p key={m.mes}>{m.texto} <Link href={`/centro/${centroId}/encuestas?anio=${anio}&mes=${m.mes}`}>Ver encuesta</Link></p>)}
    <p className="h-sub">Revisa los comentarios, identifica qué debes mejorar y registra la acción en tu FODA. El porcentaje de satisfacción se calcula sobre respuestas recibidas, no sobre todos los activos.</p>
  </section>
}
