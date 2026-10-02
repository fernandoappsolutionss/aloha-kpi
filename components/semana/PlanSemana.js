'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CONDICIONES, colorCondicion, nombreCondicion } from '../../lib/condiciones/formulas.mjs'
import { asignarCondicion, agregarObjetivo, editarObjetivo, marcarObjetivo, eliminarObjetivo, verificarObjetivo } from '../../app/actions/semana'
import { updateGrowthRecommendation } from '../../app/actions/growth'

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
    <label className="field"><span className="sr-only">Responsable</span><input name="responsable" className="input" placeholder="Responsable" maxLength={120} required /></label>
    <label className="field"><span className="sr-only">Fecha</span><input name="fecha" className="input" type="date" required /></label>
    <label className="field"><span>Evidencia esperada</span><input name="evidencia_esperada" className="input" placeholder="Qué resultado demostrarás y dónde se comprueba" maxLength={1000} required /></label>
    <button type="submit" className="btn" disabled={ocupado}>Agregar objetivo</button>
  </form>
}

function Objetivo({ centroId, objetivo, puedeEscribir, puedeVerificar, ejecutar, ocupado }) {
  const [editando, setEditando] = useState(false)
  async function guardar(event) {
    event.preventDefault()
    const datos = Object.fromEntries(new FormData(event.currentTarget))
    if (await ejecutar(() => editarObjetivo(centroId, objetivo.id, datos))) setEditando(false)
  }
  return <li className="semana-objetivo">
    <div className="semana-objetivo__fila">

      <span className={objetivo.hecho ? 'semana-objetivo--hecho' : ''}>{objetivo.texto}</span>
    </div>
    {(objetivo.responsable || objetivo.fecha) && <p className="h-sub">{objetivo.responsable || 'Sin responsable'}{objetivo.fecha ? ` · ${fechaInput(objetivo.fecha)}` : ''}</p>}
    {objetivo.seccion !== 'orden' && <p className="h-sub">Evidencia esperada: {objetivo.evidencia_esperada || 'Pendiente de completar'} · {objetivo.verificado_at ? 'Verificada por coordinación' : objetivo.hecho ? 'Realizada · pendiente de verificación' : 'Pendiente'}</p>}
    {objetivo.evidencia_resultado && <p><strong>Resultado:</strong> {objetivo.evidencia_resultado}</p>}
    {puedeEscribir && objetivo.seccion !== 'orden' && !objetivo.hecho && <form onSubmit={event => { event.preventDefault(); const evidencia = new FormData(event.currentTarget).get('evidencia'); ejecutar(() => marcarObjetivo(centroId, objetivo.id, true, evidencia)) }}>
      <label className="field"><span>Evidencia del resultado</span><textarea name="evidencia" className="input" maxLength={2000} required placeholder="Qué se logró, dato obtenido y referencia para comprobarlo" /></label>
      <button className="btn" type="submit" disabled={ocupado}>Registrar acción realizada</button>
    </form>}
    {puedeVerificar && objetivo.hecho && !objetivo.verificado_at && objetivo.evidencia_resultado && <button className="btn btn--primary" disabled={ocupado} onClick={() => ejecutar(() => verificarObjetivo(centroId, objetivo.id))}>Verificar evidencia</button>}
    {puedeEscribir && objetivo.seccion !== 'orden' && <div className="semana-objetivo__acciones">
      {objetivo.hecho && <button className="btn" disabled={ocupado} onClick={() => ejecutar(() => marcarObjetivo(centroId, objetivo.id, false))}>Reabrir acción</button>}
      <button type="button" className="btn" disabled={ocupado} onClick={() => setEditando((v) => !v)}>{editando ? 'Cancelar' : 'Editar'}</button>
      <button type="button" className="btn" disabled={ocupado} onClick={() => { if (window.confirm('¿Eliminar este objetivo?')) ejecutar(() => eliminarObjetivo(centroId, objetivo.id)) }}>Eliminar</button>
    </div>}
    {editando && <form className="semana-objetivo-form" onSubmit={guardar}>
      <label className="field"><span className="sr-only">Texto del objetivo</span><input name="texto" className="input" defaultValue={objetivo.texto} maxLength={500} required /></label>
      <label className="field"><span className="sr-only">Responsable</span><input name="responsable" className="input" defaultValue={objetivo.responsable || ''} maxLength={120} required /></label>
      <label className="field"><span className="sr-only">Fecha</span><input name="fecha" className="input" type="date" defaultValue={fechaInput(objetivo.fecha)} required /></label>
      <label className="field"><span>Evidencia esperada</span><input name="evidencia_esperada" className="input" defaultValue={objetivo.evidencia_esperada || ''} maxLength={1000} required /></label>
      <p className="h-sub">Editar reabre la acción y exige comprobar de nuevo el resultado.</p>
      <button type="submit" className="btn btn--primary" disabled={ocupado}>Guardar cambios</button>
    </form>}
  </li>
}

export default function PlanSemana({ centroId, semanaFin, datos, puedeEscribir, puedeAsignar, puedeVerificar = false, onRefresh }) {
  const [seleccion, setSeleccion] = useState(datos.plan.condicion || '')
  const [alcance, setAlcance] = useState(datos.plan.alcance_peligro || 'personal')
  const [variante, setVariante] = useState(datos.plan.variante_afluencia || 'accion')
  const [fundamento, setFundamento] = useState(datos.plan.fundamento || '')
  const [cambiando, setCambiando] = useState(false)
  const [mas, setMas] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [accionesGuardadas, setAccionesGuardadas] = useState({})
  useEffect(() => {
    setSeleccion(datos.plan.condicion || '')
    setAlcance(datos.plan.alcance_peligro || 'personal')
    setVariante(datos.plan.variante_afluencia || 'accion')
    setCambiando(false)
  }, [datos.plan.condicion, datos.plan.alcance_peligro, datos.plan.variante_afluencia])

  async function ejecutar(work) {
    setOcupado(true); setError(''); setMensaje('')
    let guardado = false
    try { await work(); guardado = true; await onRefresh(); return true }
    catch (e) { setError(guardado ? 'Los cambios se guardaron. No se pudo actualizar la vista; recarga sin repetir la acción.' : e?.message || 'No se pudo guardar el plan.'); return false }
    finally { setOcupado(false) }
  }

  async function seguirAccion(item, command) {
    await ejecutar(async () => {
      const result = await updateGrowthRecommendation(centroId, item.id, command)
      setAccionesGuardadas((previas) => ({ ...previas, [item.id]: { status: result.status, due_date: result.due_date } }))
      setMensaje(result.refreshError || (command === 'complete' ? 'Tarea realizada. El resultado se verificará con las próximas estadísticas.' : command === 'postpone' ? 'Acción pospuesta siete días en Ruta de Nivel y en el plan.' : 'Acción descartada en Ruta de Nivel y en el plan.'))
    })
  }

  const estado = datos.estado === 'completo' ? 'Plan preparado' : datos.estado === 'sin_condicion' ? 'Pendiente de asignar condición' : `Completa acción, responsable, fecha y evidencia en el paso ${datos.pasoFaltante}`
  const objetivos = datos.objetivos || []
  const sinCondicion = !datos.plan.condicion
  const estrategico = datos.estrategico.map((item) => ({ ...item, ...accionesGuardadas[item.id] })).filter((item) => !['completed', 'dismissed'].includes(item.status))
  return <section data-tour="semana.plan" id="plan-batalla" className="panel semana-plan" aria-labelledby="semana-plan-title">
    <div className="panel__head semana-plan__head"><div><p className="label">Plan de batalla</p><h2 id="semana-plan-title" className="panel__title">Condición y plan — semana que cerró el {semanaFin}</h2></div>
      <div className={datos.plazoVencido && datos.estado !== 'completo' ? 'semana-plan--vencido' : ''}><strong>{estado}</strong><p className="h-sub">Plazo: viernes 10:00</p></div>
    </div>
    <p className="h-sub">{datos.ejecucion?.realizadas || 0} de {datos.ejecucion?.total || 0} acciones realizadas · {datos.ejecucion?.verificadas || 0} verificadas. Preparar la fórmula no equivale a haberla ejecutado.</p>
    {datos.plan.fundamento && <p><strong>Fundamento de la condición:</strong> {datos.plan.fundamento}</p>}
    {error && <p role="alert" className="alert alert--error">{error}</p>}
    {mensaje && <p role="status" className="alert">{mensaje}</p>}
    {'lectura' in datos && <p className="h-sub">Lectura automática de la gráfica: {datos.lectura.condicion ? nombreCondicion(datos.lectura.condicion) : 'Sin dato'} ({datos.lectura.motivo})</p>}
    {datos.discrepancia && <p className="alert alert--error" role="alert">La condición asignada está por encima de lo que muestra la gráfica</p>}

    <div data-tour="semana.condicion">
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
      <label className="field"><span>Datos y razonamiento de la condición</span><textarea className="input" value={fundamento} onChange={e => setFundamento(e.target.value)} maxLength={2000} placeholder="Qué muestran los últimos cierres, por qué corresponde esta condición y qué causa debes comprobar" required /></label>
      <div className="semana-plan__acciones"><button type="button" className="btn btn--primary" disabled={!seleccion || !fundamento.trim() || ocupado} onClick={async () => { if (await ejecutar(() => asignarCondicion(centroId, semanaFin, { condicion: seleccion, alcancePeligro: alcance, varianteAfluencia: variante, fundamento }))) setCambiando(false) }}>Guardar condición</button>{cambiando && <button type="button" className="btn" onClick={() => setCambiando(false)}>Cancelar</button>}</div>
    </div> : <p className="h-sub">{puedeEscribir ? 'La condición la asigna la administradora' : 'Condición pendiente de asignación.'}</p>)}

    </div>
    <div data-tour="semana.formula">
    {sinCondicion && <p className="h-sub">La fórmula y sus objetivos aparecerán al asignar la condición.</p>}
    {!sinCondicion && <section className="semana-plan__seccion"><h3>Fórmula</h3><ol className="semana-plan__pasos">{datos.pasos.map((texto, paso) => <li key={paso}><p>{texto}</p>
      <ul className="semana-plan__objetivos">{objetivos.filter((o) => o.seccion === 'formula' && Number(o.paso) === paso).map((o) => <Objetivo key={o.id} centroId={centroId} objetivo={o} puedeVerificar={puedeVerificar} puedeEscribir={puedeEscribir} ejecutar={ejecutar} ocupado={ocupado} />)}</ul>
      {puedeEscribir && <FormularioObjetivo centroId={centroId} semanaFin={semanaFin} seccion="formula" paso={paso} ejecutar={ejecutar} ocupado={ocupado} />}
    </li>)}</ol></section>}

    </div>
    {[['urgente', 'Urgentes'], ['pendiente', 'Pendientes'], ['orden', 'Órdenes del coordinador']].map(([seccion, titulo]) => <section className="semana-plan__seccion" key={seccion}><h3>{titulo}</h3>
      <ul className="semana-plan__objetivos">{objetivos.filter((o) => o.seccion === seccion).map((o) => <Objetivo key={o.id} centroId={centroId} objetivo={o} puedeVerificar={puedeVerificar} puedeEscribir={seccion !== 'orden' && puedeEscribir} ejecutar={ejecutar} ocupado={ocupado} />)}</ul>
      {puedeEscribir && seccion !== 'orden' && <FormularioObjetivo centroId={centroId} semanaFin={semanaFin} seccion={seccion} ejecutar={ejecutar} ocupado={ocupado} />}
    </section>)}
    <section className="semana-plan__seccion" aria-labelledby="plan-estrategico-title"><h3 id="plan-estrategico-title">Plan estratégico · Ruta de Nivel</h3><p className="h-sub">Estas son las mismas acciones de Ruta al próximo nivel. Lo que registres aquí también se actualiza allá. · <Link href={`/centro/${centroId}/ruta-nivel`}>Abrir la ruta y su historial</Link></p>
      {!estrategico.length && <p className="h-sub">No hay acciones estratégicas pendientes guardadas. Abre la ruta para revisar las recomendaciones del centro.</p>}
      <ul className="semana-plan__objetivos">{estrategico.map((item) => <li className="semana-objetivo" key={item.id}><strong>{item.title}</strong><p>{item.action}</p><p className="h-sub">{item.responsible || 'Sin responsable'}{item.due_date ? ` · ${item.status === 'postponed' ? 'Pospuesta hasta ' : 'Fecha: '}${fechaInput(item.due_date)}` : ''}</p>
        {puedeEscribir && <div className="semana-objetivo__acciones" aria-label={`Seguimiento de ${item.title}`}>
          <button type="button" className="btn btn--primary" disabled={ocupado} onClick={() => seguirAccion(item, 'complete')}>Marcar tarea realizada</button>
          {item.status !== 'postponed' && <button type="button" className="btn" disabled={ocupado} onClick={() => seguirAccion(item, 'postpone')}>Posponer 7 días</button>}
          <button type="button" className="btn" disabled={ocupado} onClick={() => seguirAccion(item, 'dismiss')}>Descartar</button>
        </div>}
      </li>)}</ul>
    </section>
  </section>
}
