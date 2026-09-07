'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { resumenProgreso } from '../../app/actions/entrenamiento'
import { resumenOficio } from '../../app/actions/entrenamiento-oficio'
import { tienePlanPropio } from '../../lib/entrenamiento/oficio/progreso'

// Ambos contadores usan el progreso personal y el catálogo que ya calcula
// cada entrenamiento. El plan de oficio varía según el puesto.
export default function useResumenEntrenamiento(rol, centroId) {
  const path = usePathname()
  const clave = `${rol}:${centroId}:${path}`
  const [datos, setDatos] = useState(null)
  useEffect(() => {
    let activo = true
    setDatos(null)
    if (!centroId || !tienePlanPropio(rol)) return
    const guardar = (tipo, resultado) => {
      if (activo) setDatos((previo) => ({ ...previo, clave, [tipo]: resultado }))
    }
    // Los recorridos requieren pantallas que coach y coordinador no usan.
    if (rol !== 'coach' && rol !== 'coordinador') {
      resumenProgreso()
        .then((r) => guardar('plataforma', r))
        .catch(() => guardar('plataforma', { error: true }))
    }
    resumenOficio()
      .then((r) => guardar('oficio', r?.error ? r : r?.modo === 'entrenamiento' ? r.avance : null))
      .catch(() => guardar('oficio', { error: true }))
    return () => { activo = false }
  }, [rol, centroId, path, clave])
  // Al cambiar de puesto, centro o página, no mostrar la respuesta anterior.
  return datos?.clave === clave ? datos : null
}
