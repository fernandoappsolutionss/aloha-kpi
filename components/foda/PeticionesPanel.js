'use client'
import { useCallback, useEffect, useState } from 'react'
import { listPeticiones } from '../../app/actions/peticiones'
import ComentarioForm from './ComentarioForm'
import PeticionDraftForm from './PeticionDraftForm'
import PeticionesList from './PeticionesList'

export default function PeticionesPanel({ centroId, anio, trimestre, onStatus }) {
  const [mode, setMode] = useState('comentario')
  const [data, setData] = useState({ items: [], drafts: [], permissions: { canChangeStatus: false }, capabilities: { uploadsAvailable: false } })
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    setLoading(true)
    const result = await listPeticiones(centroId, anio, trimestre)
    if (result?.error) onStatus(`Error: ${result.error}`)
    else setData(result)
    setLoading(false)
  }, [centroId, anio, trimestre, onStatus])
  useEffect(() => { refresh() }, [refresh])
  return (
    <section className="card foda-requests">
      <h3 className="panel__title">Comentarios y peticiones del administrador</h3>
      <div className="foda-request-tabs" role="tablist" aria-label="Tipo de registro">
        <button type="button" role="tab" aria-selected={mode === 'comentario'} onClick={() => setMode('comentario')}>Comentario</button>
        <button type="button" role="tab" aria-selected={mode === 'peticion'} onClick={() => setMode('peticion')}>Petición</button>
      </div>
      {mode === 'comentario'
        ? <ComentarioForm disabled={loading} centroId={centroId} anio={anio} trimestre={trimestre} onCreate={refresh} onStatus={onStatus} />
        : <PeticionDraftForm centroId={centroId} anio={anio} trimestre={trimestre} drafts={data.drafts} uploadsAvailable={data.capabilities.uploadsAvailable} onRefresh={refresh} onStatus={onStatus} />}
      <PeticionesList items={data.items} permissions={data.permissions} uploadsAvailable={data.capabilities.uploadsAvailable} centroId={centroId} onRefresh={refresh} onStatus={onStatus} />
    </section>
  )
}
