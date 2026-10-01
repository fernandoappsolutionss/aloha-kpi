'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CONDICIONES, colorCondicion, nombreCondicion } from '../../lib/condiciones/formulas.mjs'
import { asignarCondicion, agregarObjetivo, editarObjetivo, marcarObjetivo, eliminarObjetivo } from '../../app/actions/semana'

const fechaInput = (value) => value ? new Date(value).toISOString().slice(0, 10) : ''

function FormularioObjetivo({ centroId, semanaFin, seccion, paso = null, ejecutar, ocupado }) {
  async function enviar(event) {
    event.preventDefault()
    const form = event.currentTarget
    const datos = Object.fromEntries(new FormData(form))
    if (await ejecutar(() => agregarObjetivo(centroId, semanaFin, { seccion, paso, ...datos }))) form.reset()
  }
  return <form className="semana-objetivo-form" onSubmit={enviar}>
    <label className="field"><span className="sr-only">Objetivo</span><input name="texto" className="input" placeholder="Escribe un objetivo" maxLength={500} required /></label>
    <label className="field"><span className="sr-only">Responsable</span><input name="responsable" className="input" placeholder="Responsable" maxLength={120} /></label>
    <label className="field"><span className="sr-only">Fecha</span><input name="fecha" className="input" type="date" /></label>
    <button type="submit" className="btn" disabled={ocupado}>Agregar objetivo</button>
  </form>
}

function Objetivo({ centroId, objetivo, puedeEscribir, ejecutar, ocupado }) {
  const [editando, setEditando] = useState(false)
  async function guardar(event) {
    event.preventDefault()
    const datos = Object.fromEntries(new FormData(event.currentTarget))
    if (await ejecutar(() => editarObjetivo(centroId, objetivo.id, datos))) setEditando(false)
  }
  return <li className="semana-objetivo">
    <div className="semana-objetivo__fila">
      {objetivo.seccion !== 'orden' && puedeEscribir && <label className="semana-objetivo__check"><input type="checkbox" checked={Boolean(objetivo.hecho)} disabled={ocupado} onChange={(e) => ejecutar(() => marcarObjetivo(centroId, objetivo.id, e.target.checked))} /><span className="sr-only">Marcar objetivo como hecho</span></label>}
      <span className={objetivo.hecho ? 'semana-objetivo--hecho' : ''}>{objetivo.texto}</span>
    </div>
    {(objetivo.responsable || objetivo.fecha) && <p className="h-sub">{objetivo.responsable || 'Sin responsable'}{objetivo.fecha ? ` · ${fechaInput(objetivo.fecha)}` : ''}</p>}
    {puedeEscribir && objetivo.seccion !== 'orden' && <div className="semana-objetivo__acciones">
      <button type="button" className="btn" disabled={ocupado} onClick={() => setEditando((v) => !v)}>{editando ? 'Cancelar' : 'Editar'}</button>
      <button type="button" className="btn" disabled={ocupado} onClick={() => { if (window.confirm('¿Eliminar este objetivo?')) ejecutar(() => eliminarObjetivo(centroId, objetivo.id)) }}>Eliminar</button>
    </div>}
    {editando && <form className="semana-objetivo-form" onSubmit={guardar}>
      <label className="field"><span className="sr-only">Texto del objetivo</span><input name="texto" className="input" defaultValue={objetivo.texto} maxLength={500} required /></label>
      <label className="field"><span className="sr-only">Responsable</span><input name="responsable" className="input" defaultValue={objetivo.responsable || ''} maxLength={120} /></label>
      <label className="field"><span className="sr-only">Fecha</span><input name="fecha" className="input" type="date" defaultValue={fechaInput(objetivo.fecha)} /></label>
      <button type="submit" className="btn btn--primary" disabled={ocupado}>Guardar cambios</button>
    </form>}
  </li>
}

export default function PlanSemana({ centroId, semanaFin, datos, puedeEscribir, puedeAsignar, onRefresh }) {
  const [seleccion, setSeleccion] = useState(datos.plan.condicion || '')
  const [alcance, setAlcance] = useState(datos.plan.alcance_peligro || 'personal')
  const [variante, setVariante] = useState(datos.plan.variante_afluencia || 'accion')
  const [cambiando, setCambiando] = useState(false)
  const [mas, setMas] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    setSeleccion(datos.plan.condicion || '')
    setAlcance(datos.plan.alcance_peligro || 'personal')
    setVariante(datos.plan.variante_afluencia || 'accion')
    setCambiando(false)
  }, [datos.plan.condicion, datos.plan.alcance_peligro, datos.plan.variante_afluencia])

  async function ejecutar(work) {
    setOcupado(true); setError('')
    try { await work(); await onRefresh(); return true }
    catch (e) { setError(e?.message || 'No se pudo guardar el plan.'); return false }
    finally { setOcupado(false) }
  }

  const estado = datos.estado === 'completo' ? 'Plan completo' : datos.estado === 'sin_condicion' ? 'Sin condición' : `Falta un objetivo en el paso ${datos.pasoFaltante}`
  const objetivos = datos.objetivos || []
  const sinCondicion = !datos.plan.condicion
  return <section className="panel semana-plan" aria-labelledby="semana-plan-title">
    <div className="panel__head semana-plan__head"><div><p className="label">Plan de batalla</p><h2 id="semana-plan-title" className="panel__title">Condición y plan — semana que cerró el {semanaFin}</h2></div>
      <div className={datos.plazoVencido && datos.estado !== 'completo' ? 'semana-plan--vencido' : ''}><strong>{estado}</strong><p className="h-sub">Plazo: viernes 10:00</p></div>
    </div>
    {error && <p role="alert" className="alert alert--error">{error}</p>}
    {'lectura' in datos && <p className="h-sub">Lectura de la gráfica: {datos.lectura.condicion ? nombreCondicion(datos.lectura.condicion) : 'Sin dato'} ({datos.lectura.motivo})</p>}
    {datos.discrepancia && <p className="alert alert--error" role="alert">La condición asignada está por encima de lo que muestra la gráfica</p>}

    {!sinCondicion && !cambiando && <div className="semana-plan__condicion"><span className="semana-condicion" style={{ '--condicion-color': colorCondicion(datos.plan.condicion) }}>{nombreCondicion(datos.plan.condicion)}</span>
      {puedeAsignar && <button type="button" className="btn" onClick={() => setCambiando(true)}>Cambiar</button>}</div>}
    {(sinCondicion || cambiando) && (puedeAsignar ? <div className="semana-plan__selector">
      {cambiando && <p className="h-sub">Al cambiar la condición, los objetivos de la fórmula pasarán a Urgentes.</p>}
      <div className="semana-condiciones" role="group" aria-label="Elegir condición">
        {CONDICIONES.filter((c) => c.visible || mas).map((c) => <button type="button" key={c.codigo} className={`semana-condiciones__opcion${seleccion === c.codigo ? ' semana-condiciones__opcion--activa' : ''}`} style={{ '--condicion-color': c.color }} aria-pressed={seleccion === c.codigo} onClick={() => setSeleccion(c.codigo)}>{c.nombre}</button>)}
      </div>
      {!mas && <button type="button" className="btn" onClick={() => setMas(true)}>Más condiciones</button>}
      {seleccion === 'peligro' && <fieldset className="semana-plan__variantes"><legend>Peligro</legend><label><input type="radio" name="alcance" checked={alcance === 'personal'} onChange={() => setAlcance('personal')} /> Personal</label><label><input type="radio" name="alcance" checked={alcance === 'superior'} onChange={() => setAlcance('superior')} /> Para el superior</label></fieldset>}
      {seleccion === 'afluencia' && <fieldset className="semana-plan__variantes"><legend>Afluencia</legend><label><input type="radio" name="variante" checked={variante === 'accion'} onChange={() => setVariante('accion')} /> De acción</label><label><input type="radio" name="variante" checked={variante === 'financiera'} onChange={() => setVariante('financiera')} /> Financiera</label></fieldset>}
      <div className="semana-plan__acciones"><button type="button" className="btn btn--primary" disabled={!seleccion || ocupado} onClick={async () => { if (await ejecutar(() => asignarCondicion(centroId, semanaFin, { condicion: seleccion, alcancePeligro: alcance, varianteAfluencia: variante }))) setCambiando(false) }}>Guardar condición</button>{cambiando && <button type="button" className="btn" onClick={() => setCambiando(false)}>Cancelar</button>}</div>
    </div> : <p className="h-sub">{puedeEscribir ? 'La condición la asigna la administradora' : 'Condición pendiente de asignación.'}</p>)}

    {!sinCondicion && <section className="semana-plan__seccion"><h3>Fórmula</h3><ol className="semana-plan__pasos">{datos.pasos.map((texto, paso) => <li key={paso}><p>{texto}</p>
      <ul className="semana-plan__objetivos">{objetivos.filter((o) => o.seccion === 'formula' && Number(o.paso) === paso).map((o) => <Objetivo key={o.id} centroId={centroId} objetivo={o} puedeEscribir={puedeEscribir} ejecutar={ejecutar} ocupado={ocupado} />)}</ul>
      {puedeEscribir && <FormularioObjetivo centroId={centroId} semanaFin={semanaFin} seccion="formula" paso={paso} ejecutar={ejecutar} ocupado={ocupado} />}
    </li>)}</ol></section>}

    {[['urgente', 'Urgentes'], ['pendiente', 'Pendientes'], ['orden', 'Órdenes del coordinador']].map(([seccion, titulo]) => <section className="semana-plan__seccion" key={seccion}><h3>{titulo}</h3>
      <ul className="semana-plan__objetivos">{objetivos.filter((o) => o.seccion === seccion).map((o) => <Objetivo key={o.id} centroId={centroId} objetivo={o} puedeEscribir={seccion !== 'orden' && puedeEscribir} ejecutar={ejecutar} ocupado={ocupado} />)}</ul>
      {puedeEscribir && seccion !== 'orden' && <FormularioObjetivo centroId={centroId} semanaFin={semanaFin} seccion={seccion} ejecutar={ejecutar} ocupado={ocupado} />}
    </section>)}
    <section className="semana-plan__seccion"><h3>Plan estratégico</h3><p className="h-sub">Recomendaciones pendientes de Ruta al próximo nivel · <Link href={`/centro/${centroId}/ruta-nivel`}>Abrir la ruta</Link></p>
      <ul className="semana-plan__objetivos">{datos.estrategico.map((item) => <li className="semana-objetivo" key={item.id}><strong>{item.title}</strong><p>{item.action}</p><p className="h-sub">{item.responsible || 'Sin responsable'}{item.due_date ? ` · ${fechaInput(item.due_date)}` : ''}</p></li>)}</ul>
    </section>
  </section>
}
