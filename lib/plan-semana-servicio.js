import { leerEvidenciasPlan } from './semana-evidencias-servicio.js'
import { asegurarCierreSemana } from './estadisticas-semana/servicio.js'
import { sql, withTransaction } from './db.js'
import { fechaCivil, ultimasSemanas, zonaHorariaCentro, sumarDias, semanaAbierta } from './semana-cierre.mjs'
import { estadoCalendarioPlan } from './reunion-semanal.mjs'
import { claveFormula, pasosDe } from './condiciones/formulas.mjs'
import { lecturaCondicion, hayDiscrepancia } from './condiciones/lectura.mjs'
import { pendientesDesde, estadoPlan, primerPasoSinObjetivo, objetivosAlCambiarCondicion, validarObjetivo, ejecucionPlan, pasoPrevioPendiente, formulaAnteriorPendiente } from './plan-semana.mjs'
import { puedeCerrarMes, vePanelGerencia } from './current-user.mjs'

const iso = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value)
const fallo = () => { throw new Error('No autorizado.') }
const transaccion = (query, transaction) => transaction || (query === sql ? (work) => withTransaction(work, { isolationLevel: 'ReadCommitted' }) : (work) => work(query))

export async function leerLectura(centroId, semanaFin, { query = sql } = {}) {
  const semanas = ultimasSemanas(semanaFin, 12)
  const filas = await query`
    SELECT semana_fin, valor, estado FROM estadisticas_semana
    WHERE centro_id = ${centroId} AND codigo = 'ninos_activos'
      AND semana_fin = ANY(${semanas}::date[]) AND estado = 'cerrada'`
  const porSemana = new Map(filas.map((fila) => [iso(fila.semana_fin), fila.valor == null ? null : Number(fila.valor)]))
  return lecturaCondicion(semanas.map((fecha) => porSemana.get(fecha) ?? null))
}

export async function cargarPlan(centroId, semanaFin, { query = sql, transaction, sesion, now = new Date() } = {}) {
  const run = transaccion(query, transaction)
  const { plan, objetivos } = await run(async (q) => {
    await q`INSERT INTO semana_planes (centro_id, semana_fin) VALUES (${centroId}, ${semanaFin}) ON CONFLICT (centro_id, semana_fin) DO NOTHING`
    const [plan] = await q`SELECT * FROM semana_planes WHERE centro_id = ${centroId} AND semana_fin = ${semanaFin} FOR UPDATE`
    if (!plan) throw new Error('No se pudo abrir el plan.')
    if (!plan.pendientes_copiados_at || Number(plan.arrastre_version || 0) < 1) {
      // Un contenedor vacío o una semana sin abrir no corta la continuidad.
      const [anterior] = await q`SELECT p.* FROM semana_planes p WHERE p.centro_id = ${centroId} AND p.semana_fin < ${semanaFin}
        AND (p.condicion IS NOT NULL OR EXISTS (SELECT 1 FROM semana_objetivos o WHERE o.plan_id=p.id))
        ORDER BY p.semana_fin DESC LIMIT 1 FOR SHARE OF p`
      if (anterior) {
        const previos = await q`SELECT * FROM semana_objetivos WHERE plan_id = ${anterior.id} ORDER BY orden, id`
        const existentes = await q`SELECT * FROM semana_objetivos WHERE plan_id = ${plan.id} ORDER BY orden, id`
        for (const [orden, objetivo] of pendientesDesde({ ...anterior, objetivos: previos }).entries()) {
          const existente = existentes.find(o => objetivo.origen_objetivo_id ? Number(o.origen_objetivo_id) === Number(objetivo.origen_objetivo_id) : o.texto === objetivo.texto)
          if (existente) {
            if (!existente.origen_formula && objetivo.origen_formula) await q`UPDATE semana_objetivos SET origen_formula=${JSON.stringify(objetivo.origen_formula)}::jsonb WHERE id=${existente.id}`
            continue
          }
          await q`INSERT INTO semana_objetivos (plan_id, seccion, paso, texto, responsable, fecha, origen_objetivo_id, orden, evidencia_esperada, origen_formula)
            VALUES (${plan.id}, 'pendiente', NULL, ${objetivo.texto}, ${objetivo.responsable}, ${objetivo.fecha}, ${objetivo.origen_objetivo_id}, ${orden}, ${objetivo.evidencia_esperada ?? null}, ${JSON.stringify(objetivo.origen_formula)}::jsonb)`
        }
      }
      await q`UPDATE semana_planes SET pendientes_copiados_at = now(), arrastre_version = 1 WHERE id = ${plan.id}`
    }
    const objetivos = await q`SELECT * FROM semana_objetivos WHERE plan_id = ${plan.id} ORDER BY orden, id`
    return { plan, objetivos }
  })
  const [[centro], estrategico, lectura] = await Promise.all([
    query`SELECT pais FROM centros WHERE id = ${centroId}`,
    query`SELECT id, title, action, responsible, due_date, status FROM growth_recommendations WHERE centro_id = ${centroId} AND status IN ('pending', 'postponed')
      AND kind IN (SELECT jsonb_array_elements(payload->'recommendations')->>'kind' FROM
        (SELECT payload FROM growth_snapshots WHERE centro_id=${centroId} ORDER BY snapshot_date DESC, updated_at DESC LIMIT 1) vigente)
      ORDER BY priority DESC, id`,
    leerLectura(centroId, semanaFin, { query }),
  ])
  if (!centro) throw new Error('Centro desconocido.')
  const { lectura_auto: _lecturaAuto, lectura_motivo: _lecturaMotivo, ...planPublico } = plan
  const adjuntos = await leerEvidenciasPlan(plan.id, { query })
  for (const objetivo of objetivos) objetivo.adjunto = adjuntos.find(a => Number(a.objetivo_id) === Number(objetivo.id)) || null
  const base = {
    plan: planPublico, hoy: fechaCivil(now, zonaHorariaCentro(centro)), objetivos, ejecucion: ejecucionPlan(objetivos),
    pasos: plan.condicion ? pasosDe({ condicion: plan.condicion, alcancePeligro: plan.alcance_peligro, varianteAfluencia: plan.variante_afluencia }) : [],
    estado: estadoPlan({ ...plan, objetivos }),
    pasoFaltante: primerPasoSinObjetivo({ ...plan, objetivos }),
    ...estadoCalendarioPlan(semanaFin, now, zonaHorariaCentro(centro)),
    estrategico,
  }
  return vePanelGerencia(sesion) || puedeAsignarCondicion(sesion)
    ? { ...base, lectura, discrepancia: hayDiscrepancia(plan.condicion, lectura.condicion) } : base
}

async function guardarCondicionEnPlan(q, plan, datos, fundamento, lectura, sesion) {
  const cambiaFormula = plan.condicion && claveFormula({ condicion: plan.condicion, alcancePeligro: plan.alcance_peligro, varianteAfluencia: plan.variante_afluencia }) !== claveFormula(datos)
  if (cambiaFormula) {
    const objetivos = await q`SELECT * FROM semana_objetivos WHERE plan_id = ${plan.id} ORDER BY orden, id`
    for (const objetivo of objetivosAlCambiarCondicion(objetivos, plan)) {
      await q`UPDATE semana_objetivos SET seccion = 'urgente', paso = NULL, origen_formula=${JSON.stringify(objetivo.origen_formula)}::jsonb WHERE id = ${objetivo.id} AND plan_id = ${plan.id}`
    }
    // Conservar también los pasos para los que nunca se preparó una acción.
    for (const pendiente of pendientesDesde({ ...plan, objetivos }).filter(o => o.origen_objetivo_id == null)) {
      await q`INSERT INTO semana_objetivos (plan_id, seccion, texto, origen_formula)
        VALUES (${plan.id}, 'urgente', ${pendiente.texto}, ${JSON.stringify(pendiente.origen_formula)}::jsonb)`
    }
  }
  await q`UPDATE semana_planes SET condicion = ${datos.condicion}, alcance_peligro = ${datos.condicion === 'peligro' ? (datos.alcancePeligro === 'superior' ? 'superior' : 'personal') : null},
    variante_afluencia = ${datos.condicion === 'afluencia' ? (datos.varianteAfluencia === 'financiera' ? 'financiera' : 'accion') : null},
    fundamento = ${fundamento}, asignada_por = ${sesion?.id}, asignada_at = now(), lectura_auto = ${lectura.condicion}, lectura_motivo = ${lectura.motivo}, updated_at = now()
    WHERE id = ${plan.id}`
}

export async function asignarCondicionEn(centroId, semanaFin, datos, { query = sql, transaction, sesion, now = new Date() } = {}) {
  pasosDe(datos)
  await asegurarCierreSemana(centroId, semanaFin, { query, now })
  const fundamento = String(datos.fundamento || '').trim()
  if (!fundamento || fundamento.length > 2000) throw new Error('Explica con datos por qué asignas esta condición (hasta 2000 caracteres).')
  await cargarPlan(centroId, semanaFin, { query, transaction, sesion, now })
  const lectura = await leerLectura(centroId, semanaFin, { query })
  await transaccion(query, transaction)(async (q) => {
    const [plan] = await q`SELECT * FROM semana_planes WHERE centro_id = ${centroId} AND semana_fin = ${semanaFin} FOR UPDATE`
    if (!plan) fallo()
    await guardarCondicionEnPlan(q, plan, datos, fundamento, lectura, sesion)
  })
  return await cargarPlan(centroId, semanaFin, { query, transaction, sesion, now })
}

export async function agregarObjetivoEn(centroId, semanaFin, datos, { query = sql, transaction, sesion, now = new Date() } = {}) {
  if (!['formula', 'urgente', 'pendiente'].includes(datos?.seccion)) throw new Error('Sección inválida.')
  const paraHoy = datos.hoy === true
  if (paraHoy && datos.seccion !== 'pendiente') throw new Error('Las tareas nuevas de Hoy se guardan en Pendientes.')
  const hoy = paraHoy ? await validarDiaPlan(centroId, semanaFin, datos.fechaVista, query, now) : null
  const hora = paraHoy ? validarHoraHoy(datos.hora) : null
  const rapido = datos.seccion === 'formula' && datos.rapido === true
  if (rapido) {
    pasosDe(datos)
    if (typeof datos.formulaAnterior !== 'string') throw new Error('Actualiza la fórmula antes de agregar el objetivo.')
    if (String(datos.fundamento || '').trim().length > 2000) throw new Error('El fundamento admite hasta 2000 caracteres.')
    const [centro] = await query`SELECT pais FROM centros WHERE id=${centroId}`
    if (!centro || semanaFin !== sumarDias(semanaAbierta(now, zonaHorariaCentro(centro)), -7)) throw new Error('El objetivo corresponde al plan de la semana actual.')
    await asegurarCierreSemana(centroId, semanaFin, { query, now })
  }
  const { texto, responsable, fecha, evidencia_esperada } = validarObjetivo(rapido || paraHoy ? {
    ...datos, responsable: datos.responsable || sesion?.nombre, fecha: datos.fecha || hoy || sumarDias(semanaFin, 7),
  } : datos, { borrador: rapido || paraHoy })
  await cargarPlan(centroId, semanaFin, { query, transaction, sesion, now })
  const paso = datos.seccion === 'formula' ? Number(datos.paso) : null
  return await transaccion(query, transaction)(async (q) => {
    const [plan] = await q`SELECT * FROM semana_planes WHERE centro_id = ${centroId} AND semana_fin = ${semanaFin} FOR UPDATE`
    if (!plan) fallo()
    if (rapido) {
      const guardada = claveFormula({ condicion: plan.condicion, alcancePeligro: plan.alcance_peligro, varianteAfluencia: plan.variante_afluencia }) || ''
      if (guardada !== datos.formulaAnterior) throw new Error('La condición cambió en otra sesión. Actualiza la página antes de agregar el objetivo.')
      if (guardada !== claveFormula(datos)) {
        if (!puedeAsignarCondicion(sesion)) fallo()
        await guardarCondicionEnPlan(q, plan, datos, String(datos.fundamento || '').trim() || null, await leerLectura(centroId, semanaFin, { query: q }), sesion)
        plan.condicion = datos.condicion; plan.alcance_peligro = datos.alcancePeligro; plan.variante_afluencia = datos.varianteAfluencia
      }
    }
    if (datos.seccion === 'formula' && (!Number.isInteger(paso) || paso < 0 || !plan.condicion || paso >= pasosDe({ condicion: plan.condicion, alcancePeligro: plan.alcance_peligro, varianteAfluencia: plan.variante_afluencia }).length)) throw new Error('Paso inválido.')
    const [objetivo] = await q`INSERT INTO semana_objetivos (plan_id, seccion, paso, texto, responsable, fecha, creado_por, evidencia_esperada)
      VALUES (${plan.id}, ${datos.seccion}, ${paso}, ${texto}, ${responsable}, ${fecha}, ${sesion?.id}, ${evidencia_esperada}) RETURNING *`
    if (paraHoy) await q`UPDATE semana_objetivos SET fecha_hoy=${hoy}, hora_hoy=${hora} WHERE id=${objetivo.id}`
    return paraHoy ? { ...objetivo, fecha_hoy: hoy, hora_hoy: hora } : objetivo
  })
}

function validarHoraHoy(hora) {
  if (hora == null || hora === '') return null
  if (typeof hora !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) throw new Error('Hora inválida.')
  return hora
}

async function validarDiaPlan(centroId, semanaFin, fechaVista, query, now) {
  const [centro] = await query`SELECT pais FROM centros WHERE id=${centroId}`
  if (!centro || iso(semanaFin) !== sumarDias(semanaAbierta(now, zonaHorariaCentro(centro)), -7)) throw new Error('Hoy corresponde al plan de la semana actual.')
  const hoy = fechaCivil(now, zonaHorariaCentro(centro))
  if (fechaVista !== hoy) throw new Error('Cambió el día del centro. Actualiza la página antes de planificar Hoy.')
  return hoy
}

export async function programarObjetivoHoyEn(centroId, objetivoId, datos, { query = sql, transaction, now = new Date() } = {}) {
  if (!datos || typeof datos.quitar !== 'boolean') throw new Error('Acción de Hoy inválida.')
  const hora = validarHoraHoy(datos.hora)
  return transaccion(query, transaction)(async q => {
    const actual = await objetivoEditable(q, centroId, objetivoId)
    const hoy = await validarDiaPlan(centroId, actual.plan.semana_fin, datos.fechaVista, q, now)
    const [objetivo] = await q`UPDATE semana_objetivos SET fecha_hoy=${datos.quitar ? null : hoy}, hora_hoy=${datos.quitar ? null : hora} WHERE id=${objetivoId} RETURNING *`
    return objetivo
  })
}

async function objetivoEditable(q, centroId, objetivoId) {
  // Todos los escritores toman primero el plan: la comprobación de secuencia
  // y el cambio de condición ven una misma versión, sin bloqueo invertido.
  const [identidad] = await q`SELECT plan_id FROM semana_objetivos WHERE id=${objetivoId}
    AND seccion IN ('formula','urgente','pendiente') AND plan_id IN (SELECT id FROM semana_planes WHERE centro_id=${centroId})`
  if (!identidad) fallo()
  const [plan] = await q`SELECT * FROM semana_planes WHERE id=${identidad.plan_id} AND centro_id=${centroId} FOR UPDATE`
  if (!plan) fallo()
  const [objetivo] = await q`SELECT * FROM semana_objetivos WHERE id=${objetivoId}
    AND seccion IN ('formula','urgente','pendiente') AND plan_id IN (SELECT id FROM semana_planes WHERE centro_id=${centroId}) FOR UPDATE`
  if (!objetivo) fallo()
  return { ...objetivo, plan }
}

export async function editarObjetivoEn(centroId, objetivoId, datos, { query = sql, transaction } = {}) {
  return transaccion(query, transaction)(async q => {
    await objetivoEditable(q, centroId, objetivoId)
    const { texto, responsable, fecha, evidencia_esperada } = validarObjetivo(datos)
    const [objetivo] = await q`UPDATE semana_objetivos SET texto=${texto}, responsable=${responsable}, fecha=${fecha}, evidencia_esperada=${evidencia_esperada},
      hecho=false, hecho_at=NULL, evidencia_resultado=NULL, verificado_at=NULL, verificado_por=NULL WHERE id=${objetivoId} RETURNING *`
    return objetivo
  })
}

export async function marcarObjetivoEn(centroId, objetivoId, hecho, { query = sql, transaction, evidencia } = {}) {
  if (typeof hecho !== 'boolean') throw new Error('Valor inválido.')
  return transaccion(query, transaction)(async q => {
    const actual = await objetivoEditable(q, centroId, objetivoId)
    const resultado = String(evidencia || '').trim()
    if (hecho) {
      validarObjetivo({ ...actual, fecha: iso(actual.fecha) })
      if (!resultado || resultado.length > 2000) throw new Error('Indica la evidencia del resultado (hasta 2000 caracteres).')
      const objetivos = await q`SELECT * FROM semana_objetivos WHERE plan_id=${actual.plan_id} ORDER BY orden, id`
      const anterior = formulaAnteriorPendiente(objetivos)
      if (actual.seccion === 'formula' && anterior) throw new Error(`Termina la fórmula anterior de ${anterior.nombre}, empezando por el paso ${anterior.paso + 1}, antes de ejecutar la nueva.`)
      const previo = pasoPrevioPendiente(actual, objetivos)
      if (previo != null) throw new Error(`Completa con evidencia las acciones del paso ${previo} antes de realizar este paso de la fórmula.`)
    }
    const [objetivo] = await q`UPDATE semana_objetivos SET hecho=${hecho}, hecho_at=${hecho ? new Date() : null},
      evidencia_resultado=${hecho ? resultado : null}, verificado_at=NULL, verificado_por=NULL WHERE id=${objetivoId} RETURNING *`
    return objetivo
  })
}

export async function verificarObjetivoEn(centroId, objetivoId, { query = sql, transaction, actorId, revision } = {}) {
  return transaccion(query, transaction)(async q => {
    const actual = await objetivoEditable(q, centroId, objetivoId)
    if (!actual.hecho || !actual.evidencia_resultado) throw new Error('La acción debe estar realizada con evidencia antes de verificarla.')
    if (!revision?.hechoAt || new Date(revision.hechoAt).getTime() !== new Date(actual.hecho_at).getTime() || revision.evidencia !== actual.evidencia_resultado) throw new Error('La evidencia cambió. Actualiza la vista y revisa el resultado antes de verificarlo.')
    const [objetivo] = await q`UPDATE semana_objetivos SET verificado_at=now(), verificado_por=${actorId} WHERE id=${objetivoId} RETURNING *`
    return objetivo
  })
}

export async function eliminarObjetivoEn(centroId, objetivoId, { query = sql, transaction } = {}) {
  return transaccion(query, transaction)(async q => {
    await objetivoEditable(q, centroId, objetivoId)
    const [objetivo] = await q`DELETE FROM semana_objetivos WHERE id=${objetivoId} RETURNING id`
    return objetivo
  })
}

export function puedeAsignarCondicion(sesion) { return puedeCerrarMes(sesion) }
