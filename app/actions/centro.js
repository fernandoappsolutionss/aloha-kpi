'use server'
import { sql } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { nivelPorNinos, siguienteNivel } from '../../lib/nivel'
import { quarterMetrics } from '../../lib/kpi-calc'

const Q_MONTHS = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] }

// Datos crudos del trimestre para la página de resumen del centro.
export async function getCentroResumen(centroId, year, trimestre) {
  await requireCentroAccess(centroId)
  const months = Q_MONTHS[trimestre] || [1, 2, 3]
  const lo = months[0], hi = months[months.length - 1]

  const [c] = await sql`SELECT nombre FROM centros WHERE id = ${centroId}`
  const [metas] = await sql`SELECT * FROM metas WHERE anio = ${year} AND trimestre = ${trimestre}`
  const rs = await sql`
    SELECT * FROM resumen_mes
    WHERE centro_id = ${centroId} AND year = ${year} AND month BETWEEN ${lo} AND ${hi}
    ORDER BY month
  `
  const ks = await sql`
    SELECT * FROM kpi_semanas
    WHERE centro_id = ${centroId} AND year = ${year} AND month BETWEEN ${lo} AND ${hi}
  `

  // Nivel GANADO = cierre del trimestre ANTERIOR. En curso + próximo = trimestre actual.
  const prevQ = trimestre > 1 ? trimestre - 1 : 4
  const prevY = trimestre > 1 ? year : year - 1
  const pqm = Q_MONTHS[prevQ]
  const prs = await sql`SELECT * FROM resumen_mes WHERE centro_id = ${centroId} AND year = ${prevY} AND month BETWEEN ${pqm[0]} AND ${pqm[2]}`
  const pks = await sql`SELECT * FROM kpi_semanas WHERE centro_id = ${centroId} AND year = ${prevY} AND month BETWEEN ${pqm[0]} AND ${pqm[2]}`
  const pm = quarterMetrics(prs, pks, centroId, pqm)
  const cur = quarterMetrics(rs, ks, centroId, months)
  const nivel = pm.desOk ? nivelPorNinos(pm.ninos) : 0
  const nivelEnCurso = cur.desOk ? nivelPorNinos(cur.ninos) : 0
  const sig = siguienteNivel(cur.ninos)

  return { nombre: c?.nombre || '', metas: metas || null, rs, ks, nivel, nivelEnCurso, sig, ninosActual: cur.ninos, desOkActual: cur.desOk }
}

// Todos los meses con datos (para la vista de historial/tendencias del centro).
export async function getHistorialCentro(centroId) {
  await requireCentroAccess(centroId)
  const [c] = await sql`SELECT nombre FROM centros WHERE id = ${centroId}`
  const resumen = await sql`
    SELECT * FROM resumen_mes WHERE centro_id = ${centroId}
    ORDER BY year ASC, month ASC
  `
  const estados = await sql`
    SELECT year, month, estado, cerrado_at FROM mes_kpi WHERE centro_id = ${centroId}
  `
  return { nombre: c?.nombre || '', resumen, estados }
}
