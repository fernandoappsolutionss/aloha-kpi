'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import CentroNavigation from '../../../../components/CentroNavigation'
import PeriodSelector from '../../../../components/PeriodSelector'
import PeticionesPanel from '../../../../components/peticiones/PeticionesPanel'
import { useCurrentAccess } from '../../../../components/useCurrentAccess'
import { getCentroNombre } from '../../../actions/centros'
import { getCurrentPeriod, readStoredPeriod, writeStoredPeriod, periodLabel } from '../../../../lib/period'

export default function PeticionesPage() {
  const { id } = useParams()
  const access = useCurrentAccess()
  const [nombre, setNombre] = useState('Centro')
  const [period, setPeriod] = useState(getCurrentPeriod())
  const [status, setStatus] = useState('')

  useEffect(() => { getCentroNombre(id).then((n) => { if (n) setNombre(n) }).catch(() => {}) }, [id])
  useEffect(() => { setPeriod(readStoredPeriod()) }, [])

  function changePeriod(next) { writeStoredPeriod(next); setPeriod(next) }

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre} centroId={id} />
      <main id="main-content" data-page-state="ready" className="main reports-page">
        <CentroNavigation centroId={id} />
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Mi centro · {periodLabel(period.year, period.quarter)}</div>
            <h1 className="h-title">Peticiones</h1>
            <p className="h-sub">{nombre} · Comentarios y peticiones</p>
          </div>
          <PeriodSelector value={period} onChange={changePeriod} />
        </div>
        {status && <p role={status.startsWith('Error') ? 'alert' : 'status'}>{status}</p>}
        {access.isReadonlyGlobal && <div className="alert" role="status" style={{ marginBottom: 16 }}>Solo lectura: puedes consultar peticiones y descargar soportes.</div>}
        {id !== 'demo' && <PeticionesPanel centroId={id} anio={period.year} trimestre={period.quarter} onStatus={setStatus} canWrite={access.canWriteOperations} />}
      </main>
    </div>
  )
}
