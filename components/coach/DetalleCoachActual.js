'use client'
import { useEffect, useState } from 'react'
import { getOcupacionCoach } from '../../app/actions/ocupacion'
import DetalleRecurso from './DetalleRecurso'

export default function DetalleCoachActual({ centroId, coachId }) {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let vivo = true
    setDatos(null)
    setError('')
    getOcupacionCoach(centroId, coachId).then(res => {
      if (!vivo) return
      if (res) setDatos(res)
      else setError('Este coach no tiene una ficha operativa en el centro.')
    }).catch(() => { if (vivo) setError('No se pudo leer el horario de este coach. Cierra el detalle y vuelve a abrirlo.') })
    return () => { vivo = false }
  }, [centroId, coachId])
  if (error) return <p className="recurso-detalle__aviso" role="status">{error}</p>
  if (!datos) return <p role="status">Cargando grupos y horario…</p>
  return <DetalleRecurso recurso={datos} />
}
