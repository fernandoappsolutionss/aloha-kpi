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
    try {
      const result = await listPeticiones(centroId, anio, trimestre)
      if (result?.error) onStatus(`Error: ${result.error}`)
      else setData(result)
    } catch {
      // Un rechazo a nivel de transporte (red caída, sesión vencida) no debe
      // dejar el panel cargando para siempre sin ninguna señal.
      onStatus('Error: no se pudo cargar el panel de peticiones.')
    } finally {
      setLoading(false)
    }
  }, [centroId, anio, trimestre, onStatus])
  useEffect(() => { refresh() }, [refresh])
  return (
    <section className="card foda-requests" data-peticiones-state={loading ? 'loading' : 'ready'}>
      <h3 className="panel__title">Comentarios y peticiones del administrador</h3>
      <div className="foda-request-tabs" role="tablist" aria-label="Tipo de registro">
        {['comentario','peticion'].map(value => <button key={value} type="button" role="tab" id={`peticiones-tab-${value}`} aria-controls="peticiones-form-panel" aria-selected={mode===value} tabIndex={mode===value ? 0 : -1} onClick={()=>setMode(value)} onKeyDown={event => { const next = event.key==='Home' ? 'comentario' : event.key==='End' ? 'peticion' : ['ArrowRight','ArrowLeft'].includes(event.key) ? mode==='comentario' ? 'peticion' : 'comentario' : null; if(next) { event.preventDefault(); setMode(next); document.getElementById(`peticiones-tab-${next}`)?.focus() } }}>{value==='comentario' ? 'Comentario' : 'Petición'}</button>)}
      </div>
      <div role="tabpanel" id="peticiones-form-panel" aria-labelledby={`peticiones-tab-${mode}`}>
      {mode === 'comentario'
        ? <ComentarioForm disabled={loading} centroId={centroId} anio={anio} trimestre={trimestre} onCreate={refresh} onStatus={onStatus} />
        : <PeticionDraftForm centroId={centroId} anio={anio} trimestre={trimestre} drafts={data.drafts} uploadsAvailable={data.capabilities.uploadsAvailable} onRefresh={refresh} onStatus={onStatus} />}
      </div>
      <PeticionesList items={data.items} permissions={data.permissions} uploadsAvailable={data.capabilities.uploadsAvailable} centroId={centroId} onRefresh={refresh} onStatus={onStatus} />
    </section>
  )
}
