import Link from 'next/link'
import { notFound } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import RevisionDatos from '../../../../components/higiene/RevisionDatos'
import { getRevisionDatos } from '../../../actions/higiene'
import { validPeriod } from '../../../../lib/revision-datos.mjs'

export const dynamic = 'force-dynamic'

export default async function RevisionPage({ params, searchParams }) {
  const { id } = await params
  const { problema, periodo } = await searchParams
  if (!['cp_classification_incomplete', 'population_mismatch'].includes(problema)
    || (periodo && !validPeriod(periodo))) notFound()
  const data = await getRevisionDatos(id, { problema, periodo })
  return <div className="shell"><Sidebar rol="usuario" centroId={id} centroNombre={data.centroNombre} />
    <main id="main-content" className="main" data-page-state="ready">
      <Link href={`/centro/${id}`}>← Volver al resumen del centro</Link>
      <RevisionDatos data={data} />
    </main>
  </div>
}
