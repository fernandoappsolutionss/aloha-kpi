import { encuestas } from '../../../../lib/encuestas/server'
import EncuestaPublica from '../../../../components/encuestas/EncuestaPublica'
import { notFound } from 'next/navigation'

export const dynamic='force-dynamic'
export const metadata={title:'Encuesta de satisfacción · ALOHA Panamá',robots:{index:false,follow:false},referrer:'no-referrer'}

export default async function EncuestaCentroPage({params}) {
  const {token}=await params
  let actual
  try { actual=await encuestas.vigente(token) } catch {
    return <main className="survey-public" id="main-content"><h1>La encuesta no está disponible por ahora</h1><p>Vuelve a intentar en unos minutos. Si continúa, consulta en recepción.</p><a className="btn" href={`/encuesta/centro/${encodeURIComponent(token)}`}>Volver a intentar</a></main>
  }
  if (!actual) notFound()
  // Conserva la URL permanente en el navegador. La respuesta se envía al
  // token del mes mostrado, por lo que un formulario viejo nunca contamina otro mes.
  return <EncuestaPublica key={actual.token} token={actual.token} datos={actual.datos} permanente/>
}
