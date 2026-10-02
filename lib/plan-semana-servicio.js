import { sql, withTransaction } from './db.js'
import { fechaCivil, plazoCondicionVencido, sumarDias, ultimasSemanas, zonaHorariaCentro } from './semana-cierre.mjs'
import { claveFormula, pasosDe } from './condiciones/formulas.mjs'
import { lecturaCondicion, hayDiscrepancia } from './condiciones/lectura.mjs'
import { pendientesDesde, estadoPlan, primerPasoSinObjetivo, objetivosAlCambiarCondicion, validarObjetivo, ejecucionPlan } from './plan-semana.mjs'
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
    if (!plan.pendientes_copiados_at) {
      const anteriorFin = sumarDias(semanaFin, -7)
      const [anterior] = await q`SELECT * FROM semana_planes WHERE centro_id = ${centroId} AND semana_fin = ${anteriorFin}`
      if (anterior) {
        const previos = await q`SELECT * FROM semana_objetivos WHERE plan_id = ${anterior.id} ORDER BY orden, id`
        for (const [orden, objetivo] of pendientesDesde({ ...anterior, objetivos: previos }).entries()) {
          await q`INSERT INTO semana_objetivos (plan_id, seccion, paso, texto, responsable, fecha, origen_objetivo_id, orden, evidencia_esperada)
            VALUES (${plan.id}, 'pendiente', NULL, ${objetivo.texto}, ${objetivo.responsable}, ${objetivo.fecha}, ${objetivo.origen_objetivo_id}, ${orden}, ${objetivo.evidencia_esperada ?? null})`
        }
      }
      await q`UPDATE semana_planes SET pendientes_copiados_at = now() WHERE id = ${plan.id}`
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
  const base = {
    plan: planPublico, objetivos, ejecucion: ejecucionPlan(objetivos),
    pasos: plan.condicion ? pasosDe({ condicion: plan.condicion, alcancePeligro: plan.alcance_peligro, varianteAfluencia: plan.variante_afluencia }) : [],
    estado: estadoPlan({ ...plan, objetivos }),
    pasoFaltante: primerPasoSinObjetivo({ ...plan, objetivos }),
    plazoVencido: plazoCondicionVencido(semanaFin, now, zonaHorariaCentro(centro)),
    estrategico,
  }
  return vePanelGerencia(sesion) ? { ...base, lectura, discrepancia: hayDiscrepancia(plan.condicion, lectura.condicion) } : base
}

export async function asignarCondicionEn(centroId, semanaFin, datos, { query = sql, transaction, sesion, now = new Date() } = {}) {
  pasosDe(datos)
  const [centro] = await query`SELECT pais FROM centros WHERE id = ${centroId}`
  if (!centro) throw new Error('Centro desconocido.')
  const hoy = fechaCivil(now, zonaHorariaCentro(centro))
  if (semanaFin >= hoy) throw new Error('La condición exige una semana cerrada.')
  const [foto] = await query`SELECT estado FROM estadisticas_semana WHERE centro_id = ${centroId} AND semana_fin = ${semanaFin} AND codigo = 'ninos_activos'`
  if (foto?.estado !== 'cerrada') throw new Error('La condición exige una semana cerrada.')
  const fundamento = String(datos.fundamento || '').trim()
  if (!fundamento || fundamento.length > 2000) throw new Error('Explica con datos por qué asignas esta condición (hasta 2000 caracteres).')
  await cargarPlan(centroId, semanaFin, { query, transaction, sesion, now })
  const lectura = await leerLectura(centroId, semanaFin, { query })
  await transaccion(query, transaction)(async (q) => {
    const [plan] = await q`SELECT * FROM semana_planes WHERE centro_id = ${centroId} AND semana_fin = ${semanaFin} FOR UPDATE`
    if (!plan) fallo()
    const cambiaFormula = plan.condicion && claveFormula({ condicion: plan.condicion, alcancePeligro: plan.alcance_peligro, varianteAfluencia: plan.variante_afluencia }) !== claveFormula(datos)
    if (cambiaFormula) {
      const objetivos = await q`SELECT * FROM semana_objetivos WHERE plan_id = ${plan.id} ORDER BY orden, id`
      for (const objetivo of objetivosAlCambiarCondicion(objetivos)) {
        await q`UPDATE semana_objetivos SET seccion = 'urgente', paso = NULL WHERE id = ${objetivo.id} AND plan_id = ${plan.id}`
      }
    }
    await q`UPDATE semana_planes SET condicion = ${datos.condicion}, alcance_peligro = ${datos.condicion === 'peligro' ? (datos.alcancePeligro === 'superior' ? 'superior' : 'personal') : null},
      variante_afluencia = ${datos.condicion === 'afluencia' ? (datos.varianteAfluencia === 'financiera' ? 'financiera' : 'accion') : null},
      fundamento = ${fundamento}, asignada_por = ${sesion?.id}, asignada_at = now(), lectura_auto = ${lectura.condicion}, lectura_motivo = ${lectura.motivo}, updated_at = now()
      WHERE id = ${plan.id}`
  })
  return await cargarPlan(centroId, semanaFin, { query, transaction, sesion, now })
}

export async function agregarObjetivoEn(centroId, semanaFin, datos, { query = sql, transaction, sesion, now = new Date() } = {}) {
  if (!['formula', 'urgente', 'pendiente'].includes(datos?.seccion)) throw new Error('Sección inválida.')
  const { texto, responsable, fecha, evidencia_esperada } = validarObjetivo(datos)
  await cargarPlan(centroId, semanaFin, { query, transaction, sesion, now })
  const paso = datos.seccion === 'formula' ? Number(datos.paso) : null
  return await transaccion(query, transaction)(async (q) => {
    const [plan] = await q`SELECT * FROM semana_planes WHERE centro_id = ${centroId} AND semana_fin = ${semanaFin} FOR UPDATE`
    if (!plan) fallo()
    if (datos.seccion === 'formula' && (!Number.isInteger(paso) || paso < 0 || !plan.condicion || paso >= pasosDe({ condicion: plan.condicion, alcancePeligro: plan.alcance_peligro, varianteAfluencia: plan.variante_afluencia }).length)) throw new Error('Paso inválido.')
    const [objetivo] = await q`INSERT INTO semana_objetivos (plan_id, seccion, paso, texto, responsable, fecha, creado_por, evidencia_esperada)
      VALUES (${plan.id}, ${datos.seccion}, ${paso}, ${texto}, ${responsable}, ${fecha}, ${sesion?.id}, ${evidencia_esperada}) RETURNING *`
    return objetivo
  })
}

async function objetivoEditable(q, centroId, objetivoId) {
  const [objetivo] = await q`SELECT * FROM semana_objetivos WHERE id=${objetivoId}
    AND seccion IN ('formula','urgente','pendiente') AND plan_id IN (SELECT id FROM semana_planes WHERE centro_id=${centroId}) FOR UPDATE`
  if (!objetivo) fallo()
  return objetivo
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

export async function eliminarObjetivoEn(centroId, objetivoId, { query = sql } = {}) {
  const [objetivo] = await query`DELETE FROM semana_objetivos WHERE id = ${objetivoId}
    AND seccion IN ('formula','urgente','pendiente') AND plan_id IN (SELECT id FROM semana_planes WHERE centro_id = ${centroId}) RETURNING id`
  if (!objetivo) fallo()
  return objetivo
}

export function puedeAsignarCondicion(sesion) { return puedeCerrarMes(sesion) }
