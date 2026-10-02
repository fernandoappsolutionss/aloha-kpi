'use server'
import { sql } from '../../lib/db.js'
import { requireCentroAccess, requireCurrentWriteCentro, requireCurrentMaster, requireCurrentPuedeCerrarMes, requireCurrentCoordinacion } from '../../lib/auth.js'
import { puedeEscribirCentro, esAdminDe } from '../../lib/current-user.mjs'
import { alcancePanel } from '../../lib/alcance.js'
import { fechaCivil, rangoSemana, semanaAbierta, sumarDias, ultimasSemanas, zonaHorariaCentro } from '../../lib/semana-cierre.mjs'
import { ESTADISTICAS_CENTRO } from '../../lib/estadisticas-semana/catalogo.mjs'
import { armarSeries, armarTablero } from '../../lib/estadisticas-semana/presentacion.mjs'
import { calcularSemanaCentro, guardarSemanaCentro, leerSerieCentros } from '../../lib/estadisticas-semana/servicio.js'
import { cargarPlan, asignarCondicionEn, agregarObjetivoEn, editarObjetivoEn, marcarObjetivoEn, eliminarObjetivoEn, puedeAsignarCondicion } from '../../lib/plan-semana-servicio.js'
import { enriquecerTableroConPlanes } from '../../lib/plan-semana.mjs'
import { lecturaCondicion } from '../../lib/condiciones/lectura.mjs'
import { prepararCuotas, evaluarCuotasCerradas, ordenarReunion, periodosCentro } from '../../lib/cuotas-semana.mjs'
import { leerCuotasCentros, metasDeSemana, guardarCuotasEn, agregarOrdenEn } from '../../lib/cuotas-semana-servicio.js'

async function vistaCentro(centroId, session) {
  const [centro] = await sql`SELECT id, nombre, pais FROM centros WHERE id = ${centroId}`
  if (!centro) throw new Error('Centro desconocido.')
  const zonaHoraria = zonaHorariaCentro(centro)
  const abierta = semanaAbierta(new Date(), zonaHoraria)
  const semanas = ultimasSemanas(abierta, 12)
  const [filas, filasCuotas, metas] = await Promise.all([
    leerSerieCentros([Number(centroId)], semanas),
    leerCuotasCentros([Number(centroId)], semanas),
    metasDeSemana(abierta),
  ])
  const { series: baseSeries, resumen } = armarSeries(semanas, filas)
  const { series, cuotas } = prepararCuotas({ catalogo: ESTADISTICAS_CENTRO, series: baseSeries, resumen, filasCuotas, metas, semanaAbierta: abierta, hoy: fechaCivil(new Date(), zonaHoraria) })
  const fechas = filas.map((fila) => fila.calculado_at).filter(Boolean).map((fecha) => new Date(fecha).getTime())
  const ultimaCerrada = sumarDias(abierta, -7)
  const plan = await cargarPlan(centroId, ultimaCerrada, { sesion: session })
  return {
    centro: { id: centro.id, nombre: centro.nombre, zonaHoraria },
    semanaAbierta: abierta,
    ultimaCerrada,
    semanas,
    catalogo: ESTADISTICAS_CENTRO,
    series,
    resumen,
    ultimoCalculo: fechas.length ? new Date(Math.max(...fechas)).toISOString() : null,
    puedeEscribir: puedeEscribirCentro(session, centroId),
    puedeAsignar: puedeAsignarCondicion(session),
    puedeAprobar: esAdminDe(session, centroId),
    cuotas,
    plan,
  }
}

export async function getSemanaCentro(centroId) {
  const session = await requireCentroAccess(centroId)
  if (session.rol === 'coach') throw new Error('No autorizado para este centro')
  return await vistaCentro(centroId, session)
}

export async function actualizarSemanaCentro(centroId) {
  const session = await requireCurrentWriteCentro(centroId)
  const [centro] = await sql`SELECT id, pais FROM centros WHERE id = ${centroId}`
  if (!centro) throw new Error('Centro desconocido.')
  const abierta = semanaAbierta(new Date(), zonaHorariaCentro(centro))
  const resultados = await calcularSemanaCentro(centroId, abierta)
  await guardarSemanaCentro(centroId, abierta, resultados)
  return await vistaCentro(centroId, session)
}

export async function recalcularSemanaCentro(centroId, semanaFin) {
  const session = await requireCurrentMaster()
  rangoSemana(semanaFin)
  const [centro] = await sql`SELECT id, pais FROM centros WHERE id = ${centroId}`
  if (!centro) throw new Error('Centro desconocido.')
  if (semanaFin >= fechaCivil(new Date(), zonaHorariaCentro(centro))) throw new Error('Solo se recalculan semanas cerradas.')
  const resultados = await calcularSemanaCentro(centroId, semanaFin)
  await guardarSemanaCentro(centroId, semanaFin, resultados, { estado: 'cerrada', forzar: true })
  return await vistaCentro(centroId, session)
}

async function cargarTablero() {
  const { centros, sesion } = await alcancePanel()
  const now = new Date()
  const abierta = semanaAbierta(now, 'America/Panama')
  const semanas = ultimasSemanas(abierta, 12)
  const periodos = periodosCentro(centros, now)
  const todasSemanas = [...new Set([...semanas, ...Object.values(periodos).flatMap((periodo) => periodo.semanas)])]
  const cierres = [...new Set(Object.values(periodos).map((periodo) => periodo.ultimaCerrada))]
  const abiertas = [...new Set(Object.values(periodos).map((periodo) => periodo.semanaAbierta))]
  const ids = centros.map((centro) => centro.id)
  const [filas, filasCuotas, metasEntradas, planes] = await Promise.all([
    leerSerieCentros(ids, todasSemanas),
    leerCuotasCentros(ids, todasSemanas),
    Promise.all(abiertas.map(async (semana) => [semana, await metasDeSemana(semana)])),
    ids.length ? sql`SELECT * FROM semana_planes WHERE centro_id = ANY(${ids}::int[]) AND semana_fin = ANY(${cierres}::date[])` : [],
  ])
  const metasPorSemana = new Map(metasEntradas)
  const tablero = armarTablero(centros, semanas, filas)
  const ultimaCerrada = sumarDias(abierta, -7)
  const planIds = planes.map((plan) => plan.id)
  const objetivos = planIds.length ? await sql`SELECT plan_id, seccion, paso FROM semana_objetivos WHERE plan_id = ANY(${planIds}::bigint[])` : []
  const presentados = centros.map((centro) => {
    const periodo = periodos[centro.id]
    const propias = filas.filter((fila) => Number(fila.centro_id) === Number(centro.id))
    const cuotasCentro = filasCuotas.filter((fila) => Number(fila.centro_id) === Number(centro.id))
    const base = { ...armarTablero([centro], periodo.semanas, propias).centros[0], pais: centro.pais }
    const planCentro = planes.filter((plan) => Number(plan.centro_id) === Number(centro.id) && (plan.semana_fin instanceof Date ? plan.semana_fin.toISOString().slice(0, 10) : String(plan.semana_fin).slice(0, 10)) === periodo.ultimaCerrada)
    const conPlan = enriquecerTableroConPlanes([base], planCentro, objetivos, periodo.ultimaCerrada, now)[0]
    const { series, resumen } = armarSeries(periodo.semanas, propias)
    const cuotaVista = prepararCuotas({ catalogo: ESTADISTICAS_CENTRO, series, resumen, filasCuotas: cuotasCentro, metas: metasPorSemana.get(periodo.semanaAbierta), semanaAbierta: periodo.semanaAbierta, hoy: periodo.hoy })
    const evaluacionCuotas = evaluarCuotasCerradas({ catalogo: ESTADISTICAS_CENTRO, series, filasCuotas: cuotasCentro, semanaFin: periodo.ultimaCerrada })
    return { ...conPlan, semanaAbierta: periodo.semanaAbierta, ultimaCerrada: periodo.ultimaCerrada, serie: cuotaVista.series.ninos_activos, cuotas: cuotaVista.cuotas,
      cuotasCumplidas: evaluacionCuotas.porcentaje, evaluacionCuotas,
      puedeAprobar: esAdminDe(sesion, centro.id),
      lectura: lecturaCondicion(base.serie.filter((punto) => punto.semanaFin <= periodo.ultimaCerrada).map((punto) => punto.valor)) }
  })
  return { semanaAbierta: abierta, ultimaCerrada, semanas, catalogo: ESTADISTICAS_CENTRO, centros: presentados, consolidada: tablero.consolidada }
}

export async function getTableroSemanal() {
  return await cargarTablero()
}

export async function getReunionSemanal() {
  const tablero = await cargarTablero()
  return { ...tablero, centros: ordenarReunion(tablero.centros) }
}

export async function asignarCondicion(centroId, semanaFin, datos) {
  const sesion = await requireCurrentPuedeCerrarMes(centroId)
  return await asignarCondicionEn(centroId, semanaFin, datos, { sesion })
}

export async function agregarObjetivo(centroId, semanaFin, datos) {
  const sesion = await requireCurrentWriteCentro(centroId)
  return await agregarObjetivoEn(centroId, semanaFin, datos, { sesion })
}

export async function editarObjetivo(centroId, objetivoId, datos) {
  await requireCurrentWriteCentro(centroId)
  return await editarObjetivoEn(centroId, objetivoId, datos)
}

export async function marcarObjetivo(centroId, objetivoId, hecho) {
  await requireCurrentWriteCentro(centroId)
  return await marcarObjetivoEn(centroId, objetivoId, hecho)
}

export async function eliminarObjetivo(centroId, objetivoId) {
  await requireCurrentWriteCentro(centroId)
  return await eliminarObjetivoEn(centroId, objetivoId)
}

export async function guardarCuotas(centroId, semanaFin, cuotas) {
  const sesion = await requireCurrentWriteCentro(centroId)
  return await guardarCuotasEn(centroId, semanaFin, cuotas, { actorId: sesion.id })
}

export async function aprobarCuotas(centroId, semanaFin, cuotas) {
  const sesion = await requireCurrentCoordinacion(centroId)
  return await guardarCuotasEn(centroId, semanaFin, cuotas, { actorId: sesion.id, aprobar: true })
}

export async function agregarOrden(centroId, semanaFin, datos) {
  const sesion = await requireCurrentCoordinacion(centroId)
  return await agregarOrdenEn(centroId, semanaFin, datos, { actorId: sesion.id })
}
