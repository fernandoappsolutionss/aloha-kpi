'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CONDICIONES, colorCondicion, nombreCondicion, claveFormula, pasosDe } from '../../lib/condiciones/formulas.mjs'
import { asignarCondicion, agregarObjetivo, editarObjetivo, marcarObjetivo, eliminarObjetivo, verificarObjetivo, programarObjetivoHoy } from '../../app/actions/semana'
import AlineamientoSemana from './AlineamientoSemana'
import AyudaCondicion from './AyudaCondicion'
import { ejemplosFormula } from '../../lib/condiciones/ayuda.mjs'
import LecturaCondicion from './LecturaCondicion'
import ArranqueSemanal from './ArranqueSemanal'
import { calendarioPlan } from '../../lib/reunion-semanal.mjs'
import { pasoPrevioPendiente, formulaAnteriorPendiente, objetivoPreparado } from '../../lib/plan-semana.mjs'
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
    <label className="field"><span>Acción concreta</span><input name="texto" className="input" placeholder="Escribe un objetivo" maxLength={500} required /></label>
    <label className="field"><span>Responsable</span><input name="responsable" className="input" placeholder="Responsable" maxLength={120} required /></label>
    <label className="field"><span>Fecha</span><input name="fecha" className="input" type="date" required /></label>
    <label className="field"><span>Evidencia esperada</span><input name="evidencia_esperada" className="input" placeholder="Qué resultado demostrarás y dónde se comprueba" maxLength={1000} required /></label>
    <button type="submit" className="btn" disabled={ocupado}>Agregar objetivo</button>
  </form>
}

function ObjetivoRapido({ centroId, semanaFin, paso, formula, formulaAnterior, fundamento, ejecutar, ocupado }) {
  async function enviar(event) {
    event.preventDefault()
    const form = event.currentTarget
    if (await ejecutar(() => agregarObjetivo(centroId, semanaFin, {
      ...Object.fromEntries(new FormData(form)), ...formula, formulaAnterior, fundamento, seccion: 'formula', paso, rapido: true,
    }))) form.reset()
  }
  return <form className="semana-objetivo-rapido" onSubmit={enviar} aria-label={`Agregar objetivo al paso ${paso + 1}`}>
    <div className="semana-objetivo-rapido__fila"><label className="field"><span className="sr-only">Objetivo para este paso</span><input name="texto" className="input" placeholder="Objetivo para este paso" maxLength={500} required /></label><button className="btn btn--primary" type="submit" disabled={ocupado}>Agregar</button></div>
    <details className="semana-ayuda"><summary>Responsable, fecha y evidencia esperada</summary><p className="h-sub">Si no cambias estos detalles, queda a tu nombre y con fecha de cierre de esta semana. Completa la evidencia esperada antes de registrar el resultado.</p><div className="semana-objetivo-form">
      <label className="field"><span>Responsable</span><input name="responsable" className="input" maxLength={120} placeholder="Tú" /></label>
      <label className="field"><span>Fecha</span><input name="fecha" className="input" type="date" /></label>
      <label className="field"><span>Evidencia esperada</span><input name="evidencia_esperada" className="input" maxLength={1000} placeholder="Dónde comprobarás el resultado" /></label>
    </div></details>
  </form>
}

function Objetivo({ centroId, objetivo, puedeEscribir, puedeVerificar, ejecutar, ocupado, bloqueo = null, anterior = null, preparar = false, hoy, enHoy = false }) {
  const [editando, setEditando] = useState(false)
  async function guardar(event) {
    event.preventDefault()
    const datos = Object.fromEntries(new FormData(event.currentTarget))
    if (await ejecutar(() => editarObjetivo(centroId, objetivo.id, datos))) setEditando(false)
  }
  const programadoHoy = Boolean(hoy) && fechaInput(objetivo.fecha_hoy) === hoy
  async function pasarHoy() {
    if (await ejecutar(() => programarObjetivoHoy(centroId, objetivo.id, { fechaVista: hoy, quitar: false }))) {
      document.getElementById('semana-hoy-title')?.focus()
    }
  }
  return <li className="semana-objetivo">
    <div className="semana-objetivo__fila">

      <span className={objetivo.hecho ? 'semana-objetivo--hecho' : ''}>{objetivo.texto}</span>
    </div>
    {(objetivo.responsable || objetivo.fecha) && <p className="h-sub">{objetivo.responsable || 'Sin responsable'}{objetivo.fecha ? ` · ${fechaInput(objetivo.fecha)}` : ''}</p>}
    {objetivo.seccion !== 'orden' && <p className="h-sub">Evidencia esperada: {objetivo.evidencia_esperada || 'Pendiente de completar'} · {objetivo.verificado_at ? 'Verificada por coordinación' : objetivo.hecho ? 'Realizada · pendiente de verificación' : 'Pendiente'}</p>}
    {!objetivoPreparado(objetivo) && objetivo.seccion !== 'orden' && <p className="h-sub">Objetivo guardado. Completa sus detalles para poder registrar el resultado.</p>}
    {objetivo.origen_formula && <p className="h-sub">Origen: {objetivo.origen_formula.nombre} · cierre {objetivo.origen_formula.semanaFin} · paso {objetivo.origen_formula.paso + 1}: {objetivo.origen_formula.textoPaso}</p>}
    {bloqueo != null && !objetivo.hecho && <p className="h-sub">Completa con evidencia el paso {bloqueo} antes de realizar esta acción.</p>}
    {anterior && !objetivo.hecho && <p className="h-sub">Primero termina la fórmula anterior de {anterior.nombre}, desde el paso {anterior.paso + 1}, en Urgentes o Pendientes.</p>}
    {!enHoy && objetivo.fecha_hoy && <p className="h-sub">{programadoHoy ? 'En Hoy' : `Programada el ${fechaInput(objetivo.fecha_hoy)}`}{objetivo.hora_hoy && ` · ${String(objetivo.hora_hoy).slice(0, 5)}`}</p>}
    {enHoy && <p className="label">{objetivo.seccion === 'formula' ? `Fórmula · paso ${Number(objetivo.paso) + 1}` : objetivo.seccion === 'urgente' ? 'Urgente' : 'Pendiente de la semana'}</p>}
    {objetivo.evidencia_resultado && <p><strong>Resultado:</strong> {objetivo.evidencia_resultado}</p>}
    {!preparar && puedeEscribir && objetivo.seccion !== 'orden' && !objetivo.hecho && <form onSubmit={event => { event.preventDefault(); const evidencia = new FormData(event.currentTarget).get('evidencia'); ejecutar(() => marcarObjetivo(centroId, objetivo.id, true, evidencia)) }}>
      <label className="field"><span>Evidencia del resultado</span><textarea name="evidencia" className="input" maxLength={2000} required placeholder="Qué se logró, dato obtenido y referencia para comprobarlo" /></label>
      <button className="btn" type="submit" disabled={ocupado || bloqueo != null || Boolean(anterior) || !objetivoPreparado(objetivo)}>Registrar acción realizada</button>
    </form>}
    {!preparar && puedeVerificar && objetivo.hecho && !objetivo.verificado_at && objetivo.evidencia_resultado && <button className="btn btn--primary" disabled={ocupado} onClick={() => ejecutar(() => verificarObjetivo(centroId, objetivo.id, { hechoAt: objetivo.hecho_at, evidencia: objetivo.evidencia_resultado }))}>Verificar evidencia</button>}
    {puedeEscribir && objetivo.seccion !== 'orden' && <div className="semana-objetivo__acciones">
      {hoy && !enHoy && !objetivo.hecho && <button type="button" className="btn btn--primary" disabled={ocupado || programadoHoy} aria-label={`Pasar a Hoy: ${objetivo.texto}`} onClick={pasarHoy}>{programadoHoy ? 'En Hoy ✓' : '→ Hoy'}</button>}
      {enHoy && <button type="button" className="btn" disabled={ocupado} onClick={() => ejecutar(() => programarObjetivoHoy(centroId, objetivo.id, { fechaVista: hoy, quitar: true }))}>← Quitar de Hoy</button>}
      {!preparar && objetivo.hecho && <button className="btn" disabled={ocupado} onClick={() => ejecutar(() => marcarObjetivo(centroId, objetivo.id, false))}>Reabrir acción</button>}
      <button type="button" className="btn" disabled={ocupado} onClick={() => setEditando((v) => !v)}>{editando ? 'Cancelar' : objetivoPreparado(objetivo) ? 'Editar' : 'Completar detalles'}</button>
      <button type="button" className="btn" disabled={ocupado} onClick={() => { if (window.confirm('¿Eliminar este objetivo?')) ejecutar(() => eliminarObjetivo(centroId, objetivo.id)) }}>Eliminar</button>
    </div>}
    {enHoy && puedeEscribir && <form className="semana-hoy__hora" onSubmit={e => { e.preventDefault(); ejecutar(() => programarObjetivoHoy(centroId, objetivo.id, { fechaVista: hoy, quitar: false, hora: new FormData(e.currentTarget).get('hora') })) }}>
      <label className="field"><span>Hora (opcional)</span><input key={objetivo.hora_hoy || ''} name="hora" type="time" className="input" defaultValue={String(objetivo.hora_hoy || '').slice(0, 5)} /></label><button className="btn" disabled={ocupado}>Guardar hora</button>
    </form>}
    {editando && <form className="semana-objetivo-form" onSubmit={guardar}>
      <label className="field"><span className="sr-only">Texto del objetivo</span><input name="texto" className="input" defaultValue={objetivo.texto} maxLength={500} required /></label>
      <label className="field"><span>Responsable</span><input name="responsable" className="input" defaultValue={objetivo.responsable || ''} maxLength={120} required /></label>
      <label className="field"><span>Fecha</span><input name="fecha" className="input" type="date" defaultValue={fechaInput(objetivo.fecha)} required /></label>
      <label className="field"><span>Evidencia esperada</span><input name="evidencia_esperada" className="input" defaultValue={objetivo.evidencia_esperada || ''} maxLength={1000} required /></label>
      <p className="h-sub">Editar reabre la acción y exige comprobar de nuevo el resultado.</p>
      <button type="submit" className="btn btn--primary" disabled={ocupado}>Guardar cambios</button>
    </form>}
  </li>
}

function HoySemana({ centroId, semanaFin, hoy, objetivos, puedeEscribir, puedeVerificar, ejecutar, ocupado }) {
  const deHoy = objetivos.filter(o => hoy && fechaInput(o.fecha_hoy) === hoy)
    .sort((a, b) => String(a.hora_hoy || '99:99').localeCompare(String(b.hora_hoy || '99:99')) || Number(a.id) - Number(b.id))
  async function agregar(event) {
    event.preventDefault()
    const form = event.currentTarget
    if (await ejecutar(() => agregarObjetivo(centroId, semanaFin, { ...Object.fromEntries(new FormData(form)), seccion: 'pendiente', hoy: true, fechaVista: hoy }))) form.reset()
  }
  return <section data-tour="semana.hoy" className="semana-hoy" aria-labelledby="semana-hoy-title">
    <div className="semana-hoy__cabecera"><h3 id="semana-hoy-title" tabIndex={-1}>Hoy{hoy ? ` · ${hoy}` : ''}</h3><span>{deHoy.filter(o => o.hecho).length}/{deHoy.length}</span></div>
    <p className="h-sub">Pasa con → Hoy las actividades que vas a hacer. Su resultado queda también en el plan y en tu cumplimiento. Quitar de Hoy conserva la actividad semanal.</p>
    <ul className="semana-plan__objetivos">{deHoy.map(o => <Objetivo key={o.id} centroId={centroId} objetivo={o} hoy={hoy} enHoy puedeEscribir={puedeEscribir} puedeVerificar={puedeVerificar} ejecutar={ejecutar} ocupado={ocupado} bloqueo={pasoPrevioPendiente(o, objetivos)} anterior={o.seccion === 'formula' ? formulaAnteriorPendiente(objetivos) : null} />)}</ul>
    {!deHoy.length && <p className="h-sub">Pasa aquí lo que harás hoy o agrega una actividad abajo.</p>}
    {puedeEscribir && hoy && <form className="semana-hoy__nueva" aria-label="Agregar tarea para hoy" onSubmit={agregar}>
      <label className="field"><span>Tarea para hoy</span><input className="input" name="texto" placeholder="¿Qué vas a hacer?" maxLength={500} required /></label>
      <label className="field"><span>Hora (opcional)</span><input className="input" name="hora" type="time" /></label>
      <details className="semana-ayuda"><summary>Prueba o evidencia esperada</summary><label className="field"><span>Evidencia esperada</span><input className="input" name="evidencia_esperada" maxLength={1000} placeholder="Qué resultado demostrarás y dónde" /></label></details>
      <p className="h-sub">Queda a tu nombre, con fecha de hoy, también en Pendientes de la semana. Completa la evidencia esperada antes de registrar el resultado.</p>
      <button className="btn btn--primary" disabled={ocupado}>Agregar tarea a Hoy</button>
    </form>}
  </section>
}

export default function PlanSemana({ centroId, semanaFin, datos, puedeEscribir, puedeAsignar, puedeVerificar = false, onRefresh, prioridades, ajustes, cuotas = {}, vista = 'todo' }) {
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
    try { const r = await work(); if (r?.error) throw new Error(r.error); guardado = true; await onRefresh(); return true }
    catch (e) { setError(guardado ? 'Los cambios se guardaron. No se pudo actualizar la vista; recarga sin repetir la acción.' : e?.message || 'No se pudo guardar el plan.'); return false }
    finally { setOcupado(false) }
  }

  async function seguirAccion(item, command) {
    await ejecutar(async () => {
      const result = await updateGrowthRecommendation(centroId, item.id, command)
      if (result?.error) throw new Error(result.error)
      setAccionesGuardadas((previas) => ({ ...previas, [item.id]: { status: result.status, due_date: result.due_date } }))
      setMensaje(result.refreshError || (command === 'complete' ? 'Tarea realizada. El resultado se verificará con las próximas estadísticas.' : command === 'postpone' ? 'Acción pospuesta siete días en Ruta de Nivel y en el plan.' : 'Acción descartada en Ruta de Nivel y en el plan.'))
    })
  }

  const preparar = vista === 'condicion'
  const formulaGuardada = { condicion: datos.plan.condicion, alcancePeligro: datos.plan.alcance_peligro, varianteAfluencia: datos.plan.variante_afluencia }
  const formula = vista === 'acciones' ? formulaGuardada : { condicion: seleccion, alcancePeligro: alcance, varianteAfluencia: variante }
  const claveGuardada = claveFormula(formulaGuardada) || ''
  const clave = claveFormula(formula) || ''
  const pasos = formula.condicion ? pasosDe(formula) : []
  const ejemplo = ejemplosFormula[clave]
  const estado = datos.plan.condicion && !datos.plan.fundamento ? 'Condición elegida · falta explicar los datos' : datos.estado === 'completo' ? 'Plan preparado' : datos.estado === 'sin_condicion' ? 'Pendiente de asignar condición' : `Completa acción, responsable, fecha y evidencia en el paso ${datos.pasoFaltante}`
  const objetivos = datos.objetivos || []
  const objetivosFormula = clave === claveGuardada ? objetivos.filter(o => o.seccion === 'formula') : []
  const sinCondicion = !datos.plan.condicion
  const calendario = calendarioPlan(semanaFin)
  const estrategico = datos.estrategico.map((item) => ({ ...item, ...accionesGuardadas[item.id] })).filter((item) => !['completed', 'dismissed'].includes(item.status))
  return <section data-tour="semana.plan" id="plan-batalla" className="panel semana-plan" aria-labelledby="semana-plan-title">
    <div className="panel__head semana-plan__head"><div><p className="label">Plan de batalla</p><h2 id="semana-plan-title" className="panel__title">Plan del {calendario.desde} al {calendario.hasta}</h2><p className="h-sub">Condición basada en la semana que cerró el {semanaFin}.</p></div>
      <div className={datos.plazoVencido && datos.estado !== 'completo' ? 'semana-plan--vencido' : ''}><strong>{estado}</strong><p className="h-sub">{datos.preparacion ? 'Preparación · sin plazo vencido' : `Plazo: viernes 10:00 · ${calendario.reunion}, hora del centro`}</p></div>
    </div>
    <ArranqueSemanal ultimaCerrada={semanaFin} />
    <p className="h-sub">{datos.ejecucion?.realizadas || 0} de {datos.ejecucion?.total || 0} acciones realizadas · {datos.ejecucion?.verificadas || 0} verificadas. Preparar la fórmula no equivale a haberla ejecutado.</p>
    {datos.plan.fundamento && clave === claveGuardada && <p><strong>Fundamento de la condición:</strong> {datos.plan.fundamento}</p>}
    {error && <p role="alert" className="alert alert--error">{error}</p>}
    {mensaje && <p role="status" className="alert">{mensaje}</p>}
    {ajustes}
    {vista !== 'acciones' && <>
    <AyudaCondicion condicion={seleccion} centroId={centroId} />
    {'lectura' in datos && <LecturaCondicion lectura={datos.lectura} />}
    {sinCondicion && <p className="h-sub">En la reunión: revisa la gráfica, confirma la condición con su fundamento, acuerda las cuotas y escribe las acciones con responsable, fecha y evidencia. Los resultados llegan del sistema; las decisiones del plan las guardas aquí.</p>}
    {datos.discrepancia && <p className="alert alert--error" role="alert">La condición asignada está por encima de lo que muestra la gráfica</p>}

    <div data-tour="semana.condicion">
    {!sinCondicion && !cambiando && <div className="semana-plan__condicion"><span className="semana-condicion" style={{ '--condicion-color': colorCondicion(datos.plan.condicion) }}>{nombreCondicion(datos.plan.condicion)}</span>
      {puedeAsignar && <button type="button" className="btn" onClick={() => setCambiando(true)}>Cambiar</button>}</div>}
    {(sinCondicion || cambiando) && (puedeAsignar ? <div className="semana-plan__selector">
      {cambiando && <p className="h-sub">Al cambiar la condición, los objetivos de la fórmula pasarán a Urgentes.</p>}
      <div className="semana-condiciones" role="group" aria-label="Elegir condición">
        {CONDICIONES.filter((c) => c.visible || mas).map((c) => <button type="button" key={c.codigo} className={`semana-condiciones__opcion${seleccion === c.codigo ? ' semana-condiciones__opcion--activa' : ''}`} style={{ '--condicion-color': c.color }} aria-pressed={seleccion === c.codigo} disabled={ocupado} onClick={() => { setSeleccion(c.codigo); if (seleccion !== c.codigo) setFundamento('') }}>{c.nombre}</button>)}
      </div>
      {!mas && <button type="button" className="btn" onClick={() => setMas(true)}>Más condiciones</button>}
      {seleccion === 'peligro' && <fieldset className="semana-plan__variantes"><legend>Peligro</legend><label><input type="radio" name="alcance" disabled={ocupado} checked={alcance === 'personal'} onChange={() => { setAlcance('personal'); setFundamento('') }} /> Personal</label><label><input type="radio" name="alcance" disabled={ocupado} checked={alcance === 'superior'} onChange={() => { setAlcance('superior'); setFundamento('') }} /> Para el superior</label></fieldset>}
      {seleccion === 'afluencia' && <fieldset className="semana-plan__variantes"><legend>Afluencia</legend><label><input type="radio" name="variante" disabled={ocupado} checked={variante === 'accion'} onChange={() => { setVariante('accion'); setFundamento('') }} /> De acción</label><label><input type="radio" name="variante" disabled={ocupado} checked={variante === 'financiera'} onChange={() => { setVariante('financiera'); setFundamento('') }} /> Financiera</label></fieldset>}
      {/* Elegir la condición solo la marca en pantalla: se guarda con el botón de
          abajo. Antes ese botón vivía en un <details> plegado y la gente se iba
          creyendo que ya había quedado. Con una condición elegida el bloque se
          abre solo y dice qué falta. */}
      {seleccion && !fundamento.trim() && <p className="h-sub semana-plan__pendiente" role="status">Condición elegida, todavía sin guardar: escribe el fundamento y pulsa «Guardar condición».</p>}
      <details className="semana-ayuda" open={Boolean(seleccion)}><summary>Explicar y guardar la condición</summary><label className="field"><span>Datos y razonamiento de la condición</span><textarea className="input" value={fundamento} onChange={e => setFundamento(e.target.value)} maxLength={2000} placeholder="Qué muestran los últimos cierres, por qué corresponde esta condición y qué causa debes comprobar" required /></label>
      <div className="semana-plan__acciones"><button type="button" className="btn btn--primary" disabled={!seleccion || !fundamento.trim() || ocupado} onClick={async () => { if (await ejecutar(() => asignarCondicion(centroId, semanaFin, { condicion: seleccion, alcancePeligro: alcance, varianteAfluencia: variante, fundamento }))) { setCambiando(false); setMensaje('Condición guardada.') } }}>Guardar condición</button>{cambiando && <button type="button" className="btn" onClick={() => { setCambiando(false); setSeleccion(datos.plan.condicion || ''); setAlcance(datos.plan.alcance_peligro || 'personal'); setVariante(datos.plan.variante_afluencia || 'accion'); setFundamento(datos.plan.fundamento || '') }}>Cancelar</button>}</div></details>
    </div> : <p className="h-sub">{puedeEscribir ? 'La condición la asigna la administradora' : 'Condición pendiente de asignación.'}</p>)}

    {!sinCondicion && !cambiando && puedeAsignar && <details className="semana-ayuda"><summary>Explicar y guardar la condición</summary><label className="field"><span>Datos y razonamiento de la condición</span><textarea className="input" value={fundamento} onChange={e => setFundamento(e.target.value)} maxLength={2000} placeholder="Qué muestran los cierres y por qué corresponde esta condición" /></label><button className="btn" disabled={ocupado || !fundamento.trim()} onClick={() => ejecutar(() => asignarCondicion(centroId, semanaFin, { ...formulaGuardada, fundamento }))}>Guardar fundamento</button></details>}
    </div>
    </>}
    <div className="semana-plan__trabajo">
    <HoySemana centroId={centroId} semanaFin={semanaFin} hoy={datos.hoy} objetivos={objetivos} puedeEscribir={puedeEscribir} puedeVerificar={puedeVerificar} ejecutar={ejecutar} ocupado={ocupado} />
    <div className="semana-plan__planificacion">
    <div data-tour="semana.formula">
    {!formula.condicion && <p className="h-sub">Elige una condición para ver sus pasos y agregar tus objetivos.</p>}
    {formula.condicion && <section className="semana-plan__seccion semana-formula" style={{ '--condicion-color': colorCondicion(formula.condicion) }}><h3>Fórmula de {nombreCondicion(formula.condicion)}{formula.condicion === 'peligro' ? ` · ${formula.alcancePeligro === 'superior' ? 'para el superior' : 'personal'}` : formula.condicion === 'afluencia' ? ` · ${formula.varianteAfluencia === 'financiera' ? 'financiera' : 'de acción'}` : ''}</h3>{clave !== claveGuardada && <p className="h-sub">Al agregar el primer objetivo se guardará esta condición. Puedes explicar sus datos al preparar el plan.</p>}<p className="h-sub">Prepara las acciones de todos los pasos. Ejecútalas en orden: completa las del paso anterior con evidencia antes de registrar las del siguiente. Coordinación verifica después el resultado.</p>{ejemplo && <details className="semana-ayuda"><summary>Ver un ejemplo: del paso a una acción comprobable</summary><p><strong>Paso:</strong> {ejemplo[0]}</p><p><strong>Acción:</strong> {ejemplo[1]}</p><p><strong>Responsable:</strong> {ejemplo[2]} · <strong>Fecha:</strong> acuerda un día de esta semana.</p><p><strong>Evidencia:</strong> {ejemplo[4]}</p><p className="h-sub">Ejemplo de entrenamiento. No se guarda como una acción ni cuenta como realizado.</p></details>}<ol className="semana-plan__pasos">{pasos.map((texto, paso) => <li key={`${clave}:${paso}`}><h4>Paso {paso + 1}</h4><p>{texto}</p><p className="h-sub">{objetivosFormula.filter(o => o.seccion === 'formula' && Number(o.paso) === paso && o.hecho).length} de {objetivosFormula.filter(o => o.seccion === 'formula' && Number(o.paso) === paso).length} acciones realizadas</p>
      <ul className="semana-plan__objetivos">{objetivosFormula.filter((o) => o.seccion === 'formula' && Number(o.paso) === paso).map((o) => <Objetivo key={o.id} centroId={centroId} objetivo={o} hoy={datos.hoy} preparar={preparar} anterior={o.seccion === 'formula' ? formulaAnteriorPendiente(objetivos) : null} bloqueo={pasoPrevioPendiente(o, objetivos)} puedeVerificar={puedeVerificar} puedeEscribir={puedeEscribir} ejecutar={ejecutar} ocupado={ocupado} />)}</ul>
      {vista !== 'acciones' && puedeEscribir && <ObjetivoRapido centroId={centroId} semanaFin={semanaFin} paso={paso} formula={formula} formulaAnterior={claveGuardada} fundamento={fundamento} ejecutar={ejecutar} ocupado={ocupado || (clave !== claveGuardada && !puedeAsignar)} />}
    </li>)}</ol></section>}

    </div>
    <AlineamientoSemana centroId={centroId} semanaFin={semanaFin} items={datos.plan.alineamiento || []} cuotas={cuotas} puedeEscribir={puedeEscribir} ejecutar={ejecutar} ocupado={ocupado} />
    </div>
    </div>
    {!preparar && <>
    {[['urgente', 'Urgentes'], ['pendiente', 'Pendientes'], ['orden', 'Órdenes del coordinador']].map(([seccion, titulo]) => <section className="semana-plan__seccion" key={seccion}><h3>{titulo}</h3>
      <ul className="semana-plan__objetivos">{objetivos.filter((o) => o.seccion === seccion).map((o) => <Objetivo key={o.id} centroId={centroId} objetivo={o} hoy={datos.hoy} preparar={preparar} anterior={o.seccion === 'formula' ? formulaAnteriorPendiente(objetivos) : null} bloqueo={pasoPrevioPendiente(o, objetivos)} puedeVerificar={puedeVerificar} puedeEscribir={seccion !== 'orden' && puedeEscribir} ejecutar={ejecutar} ocupado={ocupado} />)}</ul>
      {puedeEscribir && seccion !== 'orden' && <FormularioObjetivo centroId={centroId} semanaFin={semanaFin} seccion={seccion} ejecutar={ejecutar} ocupado={ocupado} />}
    </section>)}
    {prioridades || <section className="semana-plan__seccion" aria-labelledby="plan-estrategico-title"><h3 id="plan-estrategico-title">Plan estratégico · Ruta de Nivel</h3><p className="h-sub">Estas son las mismas acciones de Ruta al próximo nivel. Lo que registres aquí también se actualiza allá. · <Link href={`/centro/${centroId}/ruta-nivel`}>Abrir la ruta y su historial</Link></p>
      {!estrategico.length && <p className="h-sub">No hay acciones estratégicas pendientes guardadas. Abre la ruta para revisar las recomendaciones del centro.</p>}
      <ul className="semana-plan__objetivos">{estrategico.map((item) => <li className="semana-objetivo" key={item.id}><strong>{item.title}</strong><p>{item.action}</p><p className="h-sub">{item.responsible || 'Sin responsable'}{item.due_date ? ` · ${item.status === 'postponed' ? 'Pospuesta hasta ' : 'Fecha: '}${fechaInput(item.due_date)}` : ''}</p>
        {puedeEscribir && <div className="semana-objetivo__acciones" aria-label={`Seguimiento de ${item.title}`}>
          <button type="button" className="btn btn--primary" disabled={ocupado} onClick={() => seguirAccion(item, 'complete')}>Marcar tarea realizada</button>
          {item.status !== 'postponed' && <button type="button" className="btn" disabled={ocupado} onClick={() => seguirAccion(item, 'postpone')}>Posponer 7 días</button>}
          <button type="button" className="btn" disabled={ocupado} onClick={() => seguirAccion(item, 'dismiss')}>Descartar</button>
        </div>}
      </li>)}</ul>
    </section>}
    </>}
  </section>
}
