'use server'
import { sql } from '../../lib/db.js'
import { requireCentroAccess, requireCurrentWriteCentro, requireCurrentMaster } from '../../lib/auth.js'
import { puedeEscribirCentro } from '../../lib/current-user.mjs'
import { alcancePanel } from '../../lib/alcance.js'
import { fechaCivil, rangoSemana, semanaAbierta, sumarDias, ultimasSemanas, zonaHorariaCentro } from '../../lib/semana-cierre.mjs'
import { ESTADISTICAS_CENTRO } from '../../lib/estadisticas-semana/catalogo.mjs'
import { armarSeries, armarTablero } from '../../lib/estadisticas-semana/presentacion.mjs'
import { calcularSemanaCentro, guardarSemanaCentro, leerSerieCentros } from '../../lib/estadisticas-semana/servicio.js'

async function vistaCentro(centroId, session) {
  const [centro] = await sql`SELECT id, nombre, pais FROM centros WHERE id = ${centroId}`
  if (!centro) throw new Error('Centro desconocido.')
  const zonaHoraria = zonaHorariaCentro(centro)
  const abierta = semanaAbierta(new Date(), zonaHoraria)
  const semanas = ultimasSemanas(abierta, 12)
  const filas = await leerSerieCentros([Number(centroId)], semanas)
  const { series, resumen } = armarSeries(semanas, filas)
  const fechas = filas.map((fila) => fila.calculado_at).filter(Boolean).map((fecha) => new Date(fecha).getTime())
  return {
    centro: { id: centro.id, nombre: centro.nombre, zonaHoraria },
    semanaAbierta: abierta,
    ultimaCerrada: sumarDias(abierta, -7),
    semanas,
    catalogo: ESTADISTICAS_CENTRO,
    series,
    resumen,
    ultimoCalculo: fechas.length ? new Date(Math.max(...fechas)).toISOString() : null,
    puedeEscribir: puedeEscribirCentro(session, centroId),
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
  return { semanaAbierta: abierta, semanas, ...armarTablero(centros, semanas, filas) }
}
