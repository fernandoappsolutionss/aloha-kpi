// El glosario del oficio: lo que va a la vista de la barrera de la palabra sin aclarar.
// Server Component; el buscador es una isla cliente que recibe los términos
// por props (así el archivo del glosario no entra al bundle de otra ruta).
import Link from 'next/link'
import Sidebar from '../../../../../../components/Sidebar'
import GlosarioOficio from '../../../../../../components/entrenamiento/GlosarioOficio'
import { getCentroNombre } from '../../../../../actions/centros'
import { GLOSARIO } from '../../../../../../lib/entrenamiento/oficio/glosario'

export default async function GlosarioPage({ params }) {
  const { id } = await params
  const nombre = await getCentroNombre(id).catch(() => null)

  const terminos = Object.entries(GLOSARIO)
    .map(([slug, g]) => ({ slug, termino: g.termino, variantes: g.variantes || [], que: g.que, ejemplo: g.ejemplo || '', noConfundir: g.noConfundir || '', tambien: g.tambien || '' }))
    .sort((a, b) => a.termino.localeCompare(b.termino, 'es'))

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre || 'Centro'} centroId={id} />
      {/* id + data-page-state: el "Saltar al contenido" del layout apunta a
          #main-content, y sin el estado la ruta no entra al barrido R10. */}
      <main className="main ent-page ofi-glosario" id="main-content" data-page-state={terminos.length === 0 ? 'error' : 'ready'}>
        <Link className="tour-card__link" href={`/centro/${id}/entrenamiento/oficio`}>← Volver a mi puesto</Link>
        <div className="main__head"><div>
          <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>Entrenamiento de oficio</div>
          <h1 className="h-title">Glosario</h1>
          <p className="h-sub">
            La palabra que pasaste por encima es la razón por la que te quedaste en blanco. Búscala aquí antes de seguir leyendo, no después.
          </p>
        </div></div>
        {terminos.length === 0
          ? <div className="card" style={{ padding: 24 }}><p className="h-sub" style={{ margin: 0 }}>El glosario todavía no está cargado.</p></div>
          : <GlosarioOficio terminos={terminos} />}
      </main>
    </div>
  )
}
