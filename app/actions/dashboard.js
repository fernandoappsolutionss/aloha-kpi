'use server'
import { sql } from '../../lib/db'
import { requireAdmin } from '../../lib/auth'

const Q_MONTHS = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] }

// Datos crudos para el panel general (la página hace la agregación).
export async function getDashboardData() {
  await requireAdmin()
  const centros = await sql`SELECT id, nombre FROM centros ORDER BY nombre`
  const [metas] = await sql`SELECT * FROM metas WHERE anio = 2026 AND trimestre = 1`
  const rs = await sql`SELECT * FROM resumen_mes WHERE year = 2026 AND month BETWEEN 1 AND 3`
  const ks = await sql`SELECT * FROM kpi_semanas WHERE year = 2026 AND month BETWEEN 1 AND 3`
  const usuarios = await sql`SELECT nombre, centro_id FROM usuarios`
  return { centros, metas: metas || null, rs, ks, usuarios }
}

// Historial admin: agrupado por (centro, trimestre), calculado desde el
// esquema coherente (centro_id/year/month). Devuelve solo trimestres con datos.
export async function getHistorialAdmin(anio, centroSel, trimSel) {
  await requireAdmin()

  const centros = (centroSel && centroSel !== 'todos')
    ? await sql`SELECT id, nombre FROM centros WHERE id = ${centroSel}`
    : await sql`SELECT id, nombre FROM centros ORDER BY nombre`

  const trimestres = (trimSel && trimSel !== 'todos') ? [parseInt(trimSel)] : [1, 2, 3, 4]

  const out = []
  for (const c of centros) {
    const rs = await sql`SELECT * FROM resumen_mes WHERE centro_id = ${c.id} AND year = ${anio}`
    const ks = await sql`SELECT * FROM kpi_semanas WHERE centro_id = ${c.id} AND year = ${anio}`
    for (const t of trimestres) {
      const months = Q_MONTHS[t]
      const meses = months.map((mo) => {
        const r = rs.find((x) => x.month === mo)
        const ws = ks.filter((x) => x.month === mo)
        const nuevos = ws.reduce((a, w) => a + (w.ing_d1 || 0) + (w.ing_d2 || 0) + (w.ing_d3 || 0) + (w.ing_d4 || 0) + (w.ing_d5 || 0), 0)
        const des = ws.reduce((a, w) => a + (w.des_d1 || 0) + (w.des_d2 || 0) + (w.des_d3 || 0) + (w.des_d4 || 0) + (w.des_d5 || 0), 0)
        return {
          month: mo,
          nuevos, des,
          ninos: r?.ninos_final_mes || 0,
          grupos: r?.grupos_activos || 0,
          cp_inv: r?.cp_invitados || 0,
          cp_mat: r?.cp_matriculados || 0,
          tieneData: ws.length > 0 || !!r,
        }
      })
      if (meses.some((m) => m.tieneData)) {
        out.push({ key: `${c.id}-${anio}-${t}`, centro_id: c.id, centro_nombre: c.nombre, anio, trimestre: t, meses })
      }
    }
  }
  return out
}
