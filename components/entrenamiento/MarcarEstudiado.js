'use client'
import { useState } from 'react'
import { marcarEstudiado } from '../../app/actions/entrenamiento-oficio'
import { useGuia } from './GuiaModulo'

export default function MarcarEstudiado({ moduloId, yaEstudiado, bloqueado, motivoBloqueo }) {
  const guia = useGuia()
  const [listo, setListo] = useState(Boolean(yaEstudiado))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function marcar() {
    setGuardando(true)
    setError('')
    try {
      const r = await marcarEstudiado(moduloId)
      if (r?.error) {
        setError(r.error)
        return
      }
      setListo(true)
      guia?.completar('lectura', { durable: true })
    } catch {
      setError('No se pudo guardar. Recarga la página e intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="ofi-marcar" aria-live="polite">
      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {bloqueado && !listo && (
        <div className="alert alert--warn" role="note">{motivoBloqueo || 'Antes de marcar este módulo tienes que estudiar el anterior.'}</div>
      )}
      {listo ? (
        <span className="ent-pill ent-pill--ok">✓ Lección marcada como realizada</span>
      ) : bloqueado ? null : (
        <button type="button" className="btn btn--primary" onClick={marcar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Ya lo estudié'}
        </button>
      )}
    </div>
  )
}
