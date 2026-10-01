'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '../../../components/Sidebar'
import GraficaSemanal from '../../../components/semana/GraficaSemanal'
import { colorCondicion, nombreCondicion } from '../../../lib/condiciones/formulas.mjs'
import { getReunionSemanal, aprobarCuotas, agregarOrden } from '../../actions/semana'

const mostrar = (valor) => valor == null ? 'Sin dato' : Number(valor).toLocaleString('es-PA')
const estados = { sin_condicion: 'Sin condición', incompleto: 'Plan incompleto', completo: 'Plan completo' }

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
    try { await work(); await cargar(); setMensaje(confirmacion); return true }
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
      {cargando && <p role="status">Cargando reunión…</p>}
      {error && <p role="alert" className="alert alert--error">{error} <button type="button" className="btn" onClick={cargar}>Reintentar</button></p>}
      {mensaje && <p role="status" className="alert">{mensaje}</p>}
      {datos && !cargando && <div className="semana-reunion__lista">
        {datos.centros.map((centro) => <section className="panel semana-reunion__centro" key={centro.id} aria-labelledby={`reunion-centro-${centro.id}`}>
          <div className="panel__head semana-reunion__head"><div><h2 className="panel__title" id={`reunion-centro-${centro.id}`}>{centro.nombre}</h2><p className="h-sub">Niños activos: {mostrar(centro.cerrada.ninos_activos)} · Δ última cerrada: {centro.deltaCerrada == null ? 'Sin dato' : `${centro.deltaCerrada > 0 ? '+' : ''}${centro.deltaCerrada}`}</p></div><Link className="btn" href={`/centro/${centro.id}/semana`}>Abrir Semana</Link></div>
          <GraficaSemanal puntos={centro.serie} titulo={`Niños activos de ${centro.nombre}`} unidad="niños" compacta />
          <div className="semana-reunion__estado"><span>{centro.condicion ? <span className="semana-condicion" style={{ '--condicion-color': colorCondicion(centro.condicion) }}>{nombreCondicion(centro.condicion)}</span> : 'Sin condición'}</span><span className={centro.plazoVencido && centro.estadoPlan !== 'completo' ? 'semana-plan--vencido' : ''}>{estados[centro.estadoPlan] || 'Sin condición'}</span><span>Lectura: {centro.lectura.condicion ? nombreCondicion(centro.lectura.condicion) : 'Sin dato'}</span></div>
          {centro.discrepancia && <p role="alert" className="alert alert--error">La condición asignada está por encima de lo que muestra la gráfica.</p>}
          <h3>Cuotas de la semana abierta</h3>
          <ul className="semana-reunion__cuotas">{datos.catalogo.map((meta) => <li key={meta.codigo}><span>{meta.nombre}</span><strong>{mostrar(centro.cuotas[meta.codigo]?.cuota ?? centro.cuotas[meta.codigo]?.propuesta)}</strong><span className="label">{centro.cuotas[meta.codigo]?.estado === 'aprobada' ? 'Aprobada' : centro.cuotas[meta.codigo]?.cuota != null ? 'Propuesta' : 'Sugerida'}</span></li>)}</ul>
          {centro.puedeAprobar && <div className="semana-reunion__acciones"><button className="btn btn--primary" type="button" disabled={ocupado || !datos.catalogo.some((meta) => centro.cuotas[meta.codigo]?.cuota != null || centro.cuotas[meta.codigo]?.propuesta != null)} onClick={() => aprobar(centro)}>Aprobar cuotas</button></div>}
          {centro.puedeAprobar && <form className="semana-reunion__orden" onSubmit={(event) => dejarOrden(event, centro)}><h3>Dejar una orden</h3><label className="field"><span>Texto</span><input className="input" name="texto" maxLength={500} required /></label><label className="field"><span>Fecha</span><input className="input" type="date" name="fecha" /></label><button className="btn" type="submit" disabled={ocupado}>Guardar orden</button></form>}
        </section>)}
        {!datos.centros.length && <p className="panel" style={{ padding: 20 }}>No hay centros en tu alcance.</p>}
      </div>}
    </main>
  </div>
}
