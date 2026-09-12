'use client'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CUMPLIMIENTO_AYUDA } from '../../lib/cumplimiento-ayuda.mjs'
import { CUMPLIMIENTO_LABELS } from '../../lib/checklist'
import audios from '../../lib/entrenamiento/audio-manifest-actualizaciones.json'
import { audioDisponible } from '../../lib/entrenamiento/audio-disponible.mjs'

// Repetir, recargar u omitir el paso práctico también deja visible su ejemplo.
export function AyudaDuranteTour({ onOpen }) {
  const params = useSearchParams()
  const mostrarEjemplo = params.get('tour') === 'cumplimiento' && params.get('paso') === '4'
  useEffect(() => { if (mostrarEjemplo) onOpen('asistencia_dias') }, [mostrarEjemplo, onOpen])
  return null
}

export function BotonAyudaCumplimiento({ clave, abierta, onClick, tour }) {
  return <button type="button" id={`ayuda-boton-${clave}`} className="compliance-help-trigger"
    aria-label={`Cómo cumplir: ${CUMPLIMIENTO_LABELS[clave]}`} aria-expanded={abierta}
    aria-controls={abierta ? `ayuda-${clave}` : undefined} data-tour={tour} onClick={onClick}>
    <span aria-hidden="true">{abierta ? '−' : '+'}</span> Cómo cumplir
  </button>
}

export default function AyudaCumplimiento({ clave, onClose, nivelTitulo: Titulo = 'h4' }) {
  const ayuda = CUMPLIMIENTO_AYUDA[clave]
  const audio = audioDisponible(audios[`cumplimiento-ayuda/${clave}`])
  const [falloAudio, setFalloAudio] = useState(false)
  const [intentoAudio, setIntentoAudio] = useState(0)
  const audioRef = useRef(null)
  useEffect(() => {
    const reproductor = audioRef.current
    return () => { reproductor?.pause() }
  }, [intentoAudio])
  if (!ayuda) return null
  return <section id={`ayuda-${clave}`} aria-labelledby={`ayuda-titulo-${clave}`} className="compliance-help" data-tour="cumplimiento.ayuda">
    <div className="compliance-help__head">
      <Titulo id={`ayuda-titulo-${clave}`}>{CUMPLIMIENTO_LABELS[clave]}</Titulo>
      <button type="button" className="compliance-help__close" aria-label={`Cerrar ayuda: ${CUMPLIMIENTO_LABELS[clave]}`} onClick={onClose}>Cerrar</button>
    </div>
    <p className="compliance-help__label">Qué hacer</p>
    <ol>{ayuda.como.map(paso => <li key={paso}>{paso}</li>)}</ol>
    <div className="compliance-help__example"><p className="compliance-help__label">Ejemplo práctico</p><p>{ayuda.ejemplo}</p></div>
    <p className="compliance-help__label">Qué evitar</p>
    <ul>{ayuda.evitar.map(error => <li key={error}>{error}</li>)}</ul>
    <p className="compliance-help__label">Cómo comprobarlo</p>
    <p>{ayuda.evidencia}</p>
    <div className="compliance-help__audio">
      <p className="compliance-help__label">Escucha la guía con la voz de Fernando</p>
      {audio ? <audio key={intentoAudio} ref={audioRef} controls preload="none" aria-label={`Audio guía: ${CUMPLIMIENTO_LABELS[clave]}`}
        src={`/entrenamiento/${audio.file}`} onError={() => setFalloAudio(true)} onCanPlay={() => setFalloAudio(false)} />
        : <p>El audio aún no está disponible. Puedes consultar la guía escrita.</p>}
      {falloAudio && <p role="alert">No se pudo cargar el audio. <button type="button" className="compliance-help-trigger" onClick={() => { setFalloAudio(false); setIntentoAudio(n => n + 1) }}>Reintentar audio</button></p>}
    </div>
    <p className="compliance-help__source">{ayuda.fuente.referencia}. {ayuda.fuente.tipo === 'manual' ? 'Ejemplo orientativo para aplicar el proceso.' : ayuda.fuente.tipo === 'operativa' ? 'Aplica el procedimiento y calendario acordados en tu centro.' : ''}</p>
  </section>
}
