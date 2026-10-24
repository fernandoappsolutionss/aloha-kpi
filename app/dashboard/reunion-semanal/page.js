'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '../../../components/Sidebar'
import LecturaCondicion from '../../../components/semana/LecturaCondicion'
import GraficaSemanal from '../../../components/semana/GraficaSemanal'
import CondicionSemanal from '../../../components/semana/CondicionSemanal'
import ArranqueSemanal from '../../../components/semana/ArranqueSemanal'
import { getReunionSemanal, aprobarCuotas, agregarOrden } from '../../actions/semana'

const mostrar = (valor) => valor == null ? 'Sin dato' : Number(valor).toLocaleString('es-PA')
const estados = { sin_condicion: 'Preparar condición y plan en la reunión', incompleto: 'Plan incompleto', completo: 'Plan preparado' }

export default function ReunionSemanalPage() {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  async function cargar() {
    setCargando(true); setError('')
    try { setDatos(await getReunionSemanal()) }
    catch { setError('No se pudo cargar la reunión semanal.') }
    finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [])

  async function ejecutar(work, confirmacion) {
    setOcupado(true); setError(''); setMensaje('')
    try { const r = await work(); if (r?.error) throw new Error(r.error); await cargar(); setMensaje(confirmacion); return true }
    catch (cause) { setError(cause?.message || 'No se pudo guardar.'); return false }
    finally { setOcupado(false) }
  }

  async function aprobar(centro) {
    const cuotas = Object.fromEntries(datos.catalogo.flatMap((meta) => {
      const valor = centro.cuotas[meta.codigo]?.cuota ?? centro.cuotas[meta.codigo]?.propuesta
      return valor == null ? [] : [[meta.codigo, valor]]
    }))
    await ejecutar(() => aprobarCuotas(centro.id, centro.semanaAbierta, cuotas), `Cuotas de ${centro.nombre} aprobadas.`)
  }

  async function dejarOrden(event, centro) {
    event.preventDefault()
    const form = event.currentTarget
    const valores = Object.fromEntries(new FormData(form))
    if (await ejecutar(() => agregarOrden(centro.id, centro.ultimaCerrada, valores), `Orden registrada para ${centro.nombre}.`)) form.reset()
  }

  return <div className="shell">
    <Sidebar rol="admin_general" />
    <main id="main-content" className="main operations-page semana-reunion" data-page-state={cargando ? 'loading' : error && !datos ? 'error' : 'ready'}>
      <div className="main__head"><div><p className="label">Panel · Semana de cierre</p><h1 className="h-title">Reunión semanal</h1><p className="h-sub">Primero el centro que más creció. Al que va abajo se le pide su plan.</p></div></div>
      <section className="panel" style={{ padding: 20 }} aria-label="Procedimiento de la reunión">
        <h2>Recorrido de la reunión</h2>
        <ol><li>Revisar los resultados del último jueves y el origen de cada cifra.</li><li>La administradora guarda la condición y su fundamento en Condición y fórmula.</li><li>Revisar las cinco cuotas y aprobar los valores acordados.</li><li>Abrir el plan y revisar acciones, responsables, fechas y evidencia esperada.</li><li>Durante la semana, registrar resultados en Mis acciones; coordinación verifica la evidencia.</li></ol>
        <p>«Plan preparado» indica que están completos sus datos; no es una aprobación del resultado. La aprobación de cuotas y la verificación de acciones se registran por separado.</p>
      </section>
      {cargando && <p role="status">Cargando reunión…</p>}
      {error && <p role="alert" className="alert alert--error">{error} <button type="button" className="btn" onClick={cargar}>Reintentar</button></p>}
      {mensaje && <p role="status" className="alert">{mensaje}</p>}
      {datos && !cargando && <div className="semana-reunion__lista">
        <ArranqueSemanal ultimaCerrada={datos.centros.map(c => c.ultimaCerrada).sort()[0]} />
        {datos.centros.map((centro) => <section className="panel semana-reunion__centro" key={centro.id} aria-labelledby={`reunion-centro-${centro.id}`}>
          <div className="panel__head semana-reunion__head"><div><h2 className="panel__title" id={`reunion-centro-${centro.id}`}>{centro.nombre}</h2><p className="h-sub">Niños activos: {mostrar(centro.cerrada.ninos_activos)} · Δ última cerrada: {centro.deltaCerrada == null ? 'Sin dato' : `${centro.deltaCerrada > 0 ? '+' : ''}${centro.deltaCerrada}`}</p></div><Link className="btn" href={`/centro/${centro.id}/semana`}>Abrir Semana</Link></div>
          <GraficaSemanal puntos={centro.serie} titulo={`Niños activos de ${centro.nombre}`} unidad="niños" compacta />
          <p className="h-sub">Cierre observado: {centro.ultimaCerrada} · Plan: {centro.desde} al {centro.hasta}{centro.preparacion ? ' · Preparación' : ''}</p>
          <div className="semana-reunion__estado"><CondicionSemanal condicion={centro.condicion} lectura={centro.lectura} /><span className={centro.plazoVencido && centro.estadoPlan !== 'completo' ? 'semana-plan--vencido' : ''}>Estado del plan: {estados[centro.estadoPlan] || 'Pendiente'}{centro.plazoVencido && centro.estadoPlan !== 'completo' ? ' · Plazo vencido' : ''}</span></div><LecturaCondicion lectura={centro.lectura} />
          {centro.discrepancia && <p role="alert" className="alert alert--error">La condición asignada está por encima de la referencia automática. Revisa los datos y el fundamento antes de decidir.</p>}
          <div className="semana-cuotas__acciones"><Link className="btn" href={`/centro/${centro.id}/semana/condicion`}>Revisar condición y plan</Link><Link className="btn" href={`/centro/${centro.id}/semana/acciones`}>Revisar acciones y evidencias</Link><Link className="btn" href={`/centro/${centro.id}/semana#semana-cuotas-title`}>Editar cuotas</Link></div>
          <h3>Cuotas de la semana abierta · cierre {centro.semanaAbierta}</h3>
          <ul className="semana-reunion__cuotas">{datos.catalogo.map((meta) => <li key={meta.codigo}><span>{meta.nombre}</span><strong>{mostrar(centro.cuotas[meta.codigo]?.cuota ?? centro.cuotas[meta.codigo]?.propuesta)}</strong><span className="label">{centro.cuotas[meta.codigo]?.estado === 'aprobada' ? 'Aprobada' : centro.cuotas[meta.codigo]?.cuota != null ? 'Propuesta' : 'Sugerida'}</span></li>)}</ul>
          {centro.puedeAprobar && <div className="semana-reunion__acciones"><button className="btn btn--primary" type="button" disabled={ocupado || !datos.catalogo.some((meta) => centro.cuotas[meta.codigo]?.cuota != null || centro.cuotas[meta.codigo]?.propuesta != null)} onClick={() => aprobar(centro)}>Aprobar cuotas</button></div>}
          {centro.puedeAprobar && <form className="semana-reunion__orden" onSubmit={(event) => dejarOrden(event, centro)}><h3>Dejar una orden</h3><label className="field"><span>Texto</span><input className="input" name="texto" maxLength={500} required /></label><label className="field"><span>Fecha</span><input className="input" type="date" name="fecha" /></label><button className="btn" type="submit" disabled={ocupado}>Guardar orden</button></form>}
        </section>)}
        {!datos.centros.length && <p className="panel" style={{ padding: 20 }}>No hay centros en tu alcance.</p>}
      </div>}
    </main>
  </div>
}
