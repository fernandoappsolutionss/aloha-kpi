'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import CentroNavigation from '../../../../components/CentroNavigation'
import TarjetaEstadistica from '../../../../components/semana/TarjetaEstadistica'
import PlanSemana from '../../../../components/semana/PlanSemana'
import CuotasSemana from '../../../../components/semana/CuotasSemana'
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
      <div className="main__head">
        <div><div className="label" style={{ marginBottom: 10 }}>Mi centro · Semana de cierre</div><h1 className="h-title">Semana</h1>
          {rango && <p className="h-sub">Semana del {rango.desde} al {rango.hasta} · {datos.centro.nombre}</p>}
          {datos?.ultimoCalculo && <p className="h-sub">Último cálculo: {new Date(datos.ultimoCalculo).toLocaleString('es-PA', { timeZone: datos.centro.zonaHoraria })}</p>}
        </div>
        {datos?.puedeEscribir && <button type="button" className="btn btn--primary" onClick={actualizar} disabled={actualizando}>{actualizando ? 'Actualizando…' : 'Actualizar ahora'}</button>}
      </div>
      {cargando && <p role="status">Cargando semana…</p>}
      {error && <p role="alert" className="alert alert--error">{error} <button type="button" className="btn" onClick={cargar}>Reintentar</button></p>}
      {datos && !cargando && <>
        <div className="semana-grid">{datos.catalogo.map((meta) => <TarjetaEstadistica key={meta.codigo} meta={meta} principal={meta.principal} serie={datos.series[meta.codigo]} resumen={datos.resumen[meta.codigo]} cuota={datos.cuotas[meta.codigo]} />)}</div>
        <CuotasSemana centroId={id} semanaFin={datos.semanaAbierta} catalogo={datos.catalogo} resumen={datos.resumen} cuotas={datos.cuotas} puedeEscribir={datos.puedeEscribir} puedeAprobar={datos.puedeAprobar} onRefresh={refrescarPlan} />
        <PlanSemana centroId={id} semanaFin={datos.ultimaCerrada} datos={datos.plan} puedeEscribir={datos.puedeEscribir} puedeAsignar={datos.puedeAsignar} onRefresh={refrescarPlan} />
      </>}
    </main>
  </div>
}
