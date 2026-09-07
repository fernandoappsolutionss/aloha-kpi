'use client'
import {useState,useEffect} from 'react'
import {useParams,useSearchParams} from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import CentroNavigation from '../../../../components/CentroNavigation'
import EncuestasPanel from '../../../../components/encuestas/EncuestasPanel'
import { useCurrentAccess } from '../../../../components/useCurrentAccess'
import {periodoPanama} from '../../../../lib/encuestas/domain.mjs'
import {getCentroNombre} from '../../../actions/centros'
export default function EncuestasPage() {
  const {id}=useParams(),search=useSearchParams()
  const access=useCurrentAccess()
  const [p,setP]=useState(()=>periodoPanama())
  const [nombre,setNombre]=useState('Centro')
  useEffect(()=>{let active=true;getCentroNombre(id).then(n=>{if(active&&n)setNombre(n)}).catch(()=>{});return()=>{active=false}},[id])
  useEffect(()=>{const anio=Number(search.get('anio')),mes=Number(search.get('mes'));if(anio>=2026&&anio<=2100&&mes>=1&&mes<=12)setP({anio,mes})},[search])
  return <div className="shell"><Sidebar centroId={id} centroNombre={nombre}/><main className="main" id="main-content">
    <CentroNavigation centroId={id}/><div className="survey-page-head"><div><p className="label">MI CENTRO · KPI MENSUAL</p><h1 className="h-title">Encuestas de satisfacción</h1><p className="h-sub">Escuchar, medir y actuar. Una encuesta por centro y mes.</p></div>
      <label className="survey-field">Mes de la encuesta<input type="month" min="2026-09" value={`${p.anio}-${String(p.mes).padStart(2,'0')}`} onChange={e=>{if(/^\d{4}-\d{2}$/.test(e.target.value)){const[a,m]=e.target.value.split('-').map(Number);setP({anio:a,mes:m})}}}/></label>
    </div>{access.isReadonlyGlobal&&<div className="alert" role="status" style={{marginBottom:16}}>Administrador General · Solo lectura: puedes consultar resultados y participación, sin copiar enlaces ni registrar difusión.</div>}<EncuestasPanel key={`${id}-${p.anio}-${p.mes}`} centroId={Number(id)} anio={p.anio} mes={p.mes} canWrite={access.canWriteOperations}/>
  </main></div>
}
