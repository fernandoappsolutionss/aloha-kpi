'use client'

import { useEffect, useRef, useState } from 'react'
import Dialog from './Dialog'
import { historialReiniciosOficio, reiniciarPuestoOficio } from '../app/actions/entrenamiento-oficio'
import { MOTIVOS_REINICIO } from '../lib/entrenamiento/oficio/reinicios.mjs'
import { nombreDeRol } from '../lib/entrenamiento/oficio/progreso'

export default function ReiniciarPuesto({ persona, modo, onClose, onReiniciado }) {
  const [motivo, setMotivo] = useState('')
  const [nota, setNota] = useState('')
  const [confirmado, setConfirmado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [historial, setHistorial] = useState(null)
  const solicitudId = useRef(null)
  const pendiente = useRef(false)
  const esHistorial = modo === 'historial'

  useEffect(() => {
    if (!esHistorial) return
    let vigente = true
    historialReiniciosOficio(persona.id)
      .then((r) => {
        if (!vigente) return
        if (r?.error) setError(r.error)
        else setHistorial(r.reinicios)
      })
      .catch(() => { if (vigente) setError('No se pudo cargar el historial. Cierra y vuelve a intentarlo.') })
    return () => { vigente = false }
  }, [persona.id, esHistorial])

  async function reiniciar(event) {
    event.preventDefault()
    if (pendiente.current || !motivo || !confirmado) return
    pendiente.current = true
    setEnviando(true)
    setError(null)
    // Se conserva al reintentar si se perdió la respuesta: no borra un avance
    // nuevo ni duplica el historial por un doble envío.
    solicitudId.current ||= crypto.randomUUID()
    try {
      const r = await reiniciarPuestoOficio(persona.id, { id: solicitudId.current, motivo, nota })
      if (r?.error) setError(r.error)
      else if (r?.ok) onReiniciado(persona)
      else setError('No se pudo confirmar el reinicio. Intenta de nuevo.')
    } catch {
      setError('No se pudo confirmar el reinicio. Intenta de nuevo.')
    } finally {
      pendiente.current = false
      setEnviando(false)
    }
  }

  return (
    <Dialog open title={esHistorial ? 'Historial de reinicios' : 'Reiniciar toma de puesto'}
      description={`${persona.nombre} · ${nombreDeRol(persona.rol)}`} onClose={onClose} closeDisabled={enviando}>
      <p className="h-sub" style={{ marginTop: 0, overflowWrap: 'anywhere' }}>{persona.email} · {persona.centro}</p>
      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {esHistorial ? (
        historial === null ? (!error && <p role="status">Cargando historial…</p>) : historial.length === 0 ? <p>Todavía no se ha reiniciado este puesto.</p> : (
          <div>
            <p className="h-sub">Últimos 20 reinicios. El avance anterior queda guardado con sus conceptos y firmas.</p>
            <ol style={{ paddingLeft: 22 }}>
              {historial.map((r) => (
                <li key={r.id} style={{ marginBottom: 20, overflowWrap: 'anywhere' }}>
                  <b>{MOTIVOS_REINICIO[r.motivo] || r.motivo}</b>
                  <div>{new Date(r.created_at).toLocaleString('es-PA', { timeZone: 'America/Panama', dateStyle: 'medium', timeStyle: 'short' })} (Panamá)</div>
                  <div>Persona: {r.persona.nombre} · {nombreDeRol(r.persona.rol)}</div>
                  <div>Reiniciado por {r.responsable.nombre || r.responsable.email}</div>
                  <div>Avance guardado: {r.estudiados} estudiados · {r.firmados} firmados · {r.conceptos} conceptos.</div>
                  {r.nota && <p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{r.nota}</p>}
                </li>
              ))}
            </ol>
          </div>
        )
      ) : (
        <form onSubmit={reiniciar}>
          <p>Esta persona empezará otra vez desde el primer módulo de su puesto. Se reinician el estudio, los cuestionarios, los conceptos y las firmas de las maniobras.</p>
          <p>Se guardará el avance anterior en el historial. Los recorridos del sistema y los datos del centro se conservan.</p>
          {(persona.centros || []).length > 1 && <p><b>El avance es de la cuenta: el reinicio aplica a todos sus centros.</b></p>}
          <label htmlFor="reinicio-motivo">Motivo</label>
          <select id="reinicio-motivo" className="input" required value={motivo} disabled={enviando} onChange={(e) => setMotivo(e.target.value)}>
            <option value="">Selecciona un motivo</option>
            {Object.entries(MOTIVOS_REINICIO).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <label htmlFor="reinicio-nota" style={{ display: 'block', marginTop: 16 }}>Nota (opcional)</label>
          <textarea id="reinicio-nota" className="input" rows={3} maxLength={500} value={nota} disabled={enviando}
            placeholder="Por ejemplo: nombre de quien entra o período del reentrenamiento."
            onChange={(e) => setNota(e.target.value)} />
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '20px 0' }}>
            <input type="checkbox" required checked={confirmado} disabled={enviando} onChange={(e) => setConfirmado(e.target.checked)} style={{ marginTop: 4 }} />
            <span>Confirmo que quiero reiniciar el puesto de <b>{persona.nombre}</b> y pedirle que repita el entrenamiento y sus maniobras.</span>
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={enviando}>Cancelar</button>
            <button type="submit" className="btn btn--danger" disabled={enviando || !motivo || !confirmado}>
              {enviando ? 'Reiniciando…' : 'Reiniciar puesto'}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
