'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '../../../../components/Sidebar'
import CentroNavigation from '../../../../components/CentroNavigation'
import TrabajoSemanal from '../../../../components/semana/TrabajoSemanal'
import GuiaRutaPlan from '../../../../components/semana/GuiaRutaPlan'
import { getSemanaCentro, actualizarSemanaCentro } from '../../../actions/semana'
import { rangoSemana } from '../../../../lib/semana-cierre.mjs'

export default function SemanaPage() {
  const { id } = useParams()
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [error, setError] = useState('')
  const solicitud = useRef(0)

  async function cargar() {
    const turno = ++solicitud.current
    setCargando(true); setError(''); setDatos(null); setActualizando(false)
    try { const result = await getSemanaCentro(id); if (turno === solicitud.current) setDatos(result) }
    catch { if (turno === solicitud.current) setError('No se pudo cargar la semana de cierre.') }
    finally { if (turno === solicitud.current) setCargando(false) }
  }
  useEffect(() => { cargar() }, [id])
  useEffect(() => {
    // Ambos destinos aparecen después de la carga asíncrona.
    const anchor = window.location.hash.slice(1)
    if (!cargando && ['plan-batalla', 'semana-cuotas-title'].includes(anchor)) document.getElementById(anchor)?.scrollIntoView({ block: 'start' })
  }, [cargando])

  async function actualizar() {
    const turno = ++solicitud.current
    setActualizando(true); setError('')
    try { const result = await actualizarSemanaCentro(id); if (turno === solicitud.current) setDatos(result) }
    catch { if (turno === solicitud.current) setError('No se pudo actualizar la semana. Intenta de nuevo.') }
    finally { if (turno === solicitud.current) setActualizando(false) }
  }

  async function refrescarPlan() {
    const result = await getSemanaCentro(id)
    setDatos(result)
  }

  const rango = datos ? rangoSemana(datos.semanaAbierta) : null
  return <div className="shell">
    <Sidebar rol="usuario" centroNombre={datos?.centro?.nombre} centroId={id} />
    <main id="main-content" data-page-state={cargando ? 'loading' : error && !datos ? 'error' : 'ready'} className="main reports-page semana-page">
      <CentroNavigation centroId={id} />
      <div className="main__head" data-tour="semana.periodo">
        <div><div className="label" style={{ marginBottom: 10 }}>Mi centro · Semana de cierre</div><h1 className="h-title">Semana</h1>
          {rango && <p className="h-sub">Semana del {rango.desde} al {rango.hasta} · {datos.centro.nombre}</p>}
          {datos?.ultimoCalculo && <p className="h-sub">Último cálculo: {new Date(datos.ultimoCalculo).toLocaleString('es-PA', { timeZone: datos.centro.zonaHoraria })}</p>}
        </div>
        {datos?.puedeEscribir && <button type="button" className="btn btn--primary" onClick={actualizar} disabled={actualizando}>{actualizando ? 'Actualizando…' : 'Actualizar ahora'}</button>}
      </div>
      {cargando && <p role="status">Cargando semana…</p>}
      {error && <p role="alert" className="alert alert--error">{error} <button type="button" className="btn" onClick={cargar}>Reintentar</button></p>}
      {datos && !cargando && <>
        <p data-tour="semana.formacion"><Link className="btn" href={`/centro/${id}/entrenamiento/oficio#actualizacion-semanal`}>Actualización semanal · gráficas, condiciones y práctica de tu puesto →</Link></p>
        <nav aria-label="Secciones de la semana" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <a className="btn" href="#semana-cuotas-title">Ir a cuotas semanales</a>
          <a className="btn btn--primary" href="#plan-batalla">Ir al plan de batalla</a>
        </nav>
        <GuiaRutaPlan centroId={id} />
        <TrabajoSemanal centroId={id} datos={datos} onRefresh={refrescarPlan} />
      </>}
    </main>
  </div>
}
