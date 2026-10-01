'use server'
import { sql } from '../../lib/db.js'
import { requireCentroAccess, requireCurrentWriteCentro, requireCurrentMaster, requireCurrentPuedeCerrarMes } from '../../lib/auth.js'
import { puedeEscribirCentro } from '../../lib/current-user.mjs'
import { alcancePanel } from '../../lib/alcance.js'
import { fechaCivil, rangoSemana, semanaAbierta, sumarDias, ultimasSemanas, zonaHorariaCentro } from '../../lib/semana-cierre.mjs'
import { ESTADISTICAS_CENTRO } from '../../lib/estadisticas-semana/catalogo.mjs'
import { armarSeries, armarTablero } from '../../lib/estadisticas-semana/presentacion.mjs'
import { calcularSemanaCentro, guardarSemanaCentro, leerSerieCentros } from '../../lib/estadisticas-semana/servicio.js'
import { cargarPlan, asignarCondicionEn, agregarObjetivoEn, editarObjetivoEn, marcarObjetivoEn, eliminarObjetivoEn, puedeAsignarCondicion } from '../../lib/plan-semana-servicio.js'
import { enriquecerTableroConPlanes } from '../../lib/plan-semana.mjs'

async function vistaCentro(centroId, session) {
  const [centro] = await sql`SELECT id, nombre, pais FROM centros WHERE id = ${centroId}`
  if (!centro) throw new Error('Centro desconocido.')
  const zonaHoraria = zonaHorariaCentro(centro)
  const abierta = semanaAbierta(new Date(), zonaHoraria)
  const semanas = ultimasSemanas(abierta, 12)
  const filas = await leerSerieCentros([Number(centroId)], semanas)
  const { series, resumen } = armarSeries(semanas, filas)
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

export async function getTableroSemanal() {
  const { centros } = await alcancePanel()
  const abierta = semanaAbierta(new Date(), 'America/Panama')
  const semanas = ultimasSemanas(abierta, 12)
  const filas = await leerSerieCentros(centros.map((centro) => centro.id), semanas)
  const tablero = armarTablero(centros, semanas, filas)
  const ultimaCerrada = sumarDias(abierta, -7)
  const ids = centros.map((centro) => centro.id)
  const planes = ids.length ? await sql`SELECT * FROM semana_planes WHERE centro_id = ANY(${ids}::int[]) AND semana_fin = ${ultimaCerrada}` : []
  const planIds = planes.map((plan) => plan.id)
  const objetivos = planIds.length ? await sql`SELECT plan_id, seccion, paso FROM semana_objetivos WHERE plan_id = ANY(${planIds}::bigint[])` : []
  const conPais = tablero.centros.map((centro) => ({ ...centro, pais: centros.find((c) => Number(c.id) === Number(centro.id))?.pais }))
  return { semanaAbierta: abierta, semanas, centros: enriquecerTableroConPlanes(conPais, planes, objetivos, ultimaCerrada), consolidada: tablero.consolidada }
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
