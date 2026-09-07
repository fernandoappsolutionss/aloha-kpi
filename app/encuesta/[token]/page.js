import { encuestas } from '../../../lib/encuestas/server'
import EncuestaPublica from '../../../components/encuestas/EncuestaPublica'
import { notFound } from 'next/navigation'
export const dynamic='force-dynamic'
export const metadata={title:'Tu opinión cuenta · ALOHA Panamá',robots:{index:false,follow:false},referrer:'no-referrer'}
export default async function EncuestaPage({params,searchParams}) {
  const {token}=await params
  const {p}=await searchParams
  let datos
  try { datos=await encuestas.publica(token,typeof p==='string'?p:null) } catch { return <main className="survey-public" id="main-content"><h1>No pudimos cargar la encuesta</h1><p>Intenta nuevamente en unos minutos.</p></main> }
  if (!datos) notFound()
  return <EncuestaPublica token={token} individual={typeof p==='string'?p:null} datos={datos}/>
}
