'use server'
import { sql } from '../../lib/db'
import { requireAdmin } from '../../lib/auth'

const Q_MONTHS = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] }

// Métricas agregadas por centro (Q1 2026) — usado por panel, ranking,
// alertas y reporte. Calcula todo en el servidor para mantener consistencia.
export async function getCentrosKpi() {
  await requireAdmin()
  const centros = await sql`SELECT id, nombre FROM centros ORDER BY nombre`
  const [metas] = await sql`SELECT * FROM metas WHERE anio = 2026 AND trimestre = 1`
  const rs = await sql`SELECT * FROM resumen_mes WHERE year = 2026 AND month BETWEEN 1 AND 3`
  const ks = await sql`SELECT * FROM kpi_semanas WHERE year = 2026 AND month BETWEEN 1 AND 3`
  const usuarios = await sql`SELECT nombre, centro_id FROM usuarios`

  const metaNuevosMes = metas?.meta_nuevos_ingresos_mes || 20
  const metaDesMes = Number(metas?.meta_desercion_mes || 18.4)
  const metaCobMes = metas?.meta_cobranza_max || 1

  return centros.map((c) => {
    const crs = rs.filter((r) => r.centro_id === c.id)
    const cks = ks.filter((k) => k.centro_id === c.id)
    const admin = usuarios.find((u) => u.centro_id === c.id)?.nombre || '—'
    const months = [1, 2, 3].map((mo) => {
      const r = crs.find((x) => x.month === mo)
      const ws = cks.filter((x) => x.month === mo)
      const nuevos = ws.reduce((s, w) => s + (w.ing_d1||0)+(w.ing_d2||0)+(w.ing_d3||0)+(w.ing_d4||0)+(w.ing_d5||0), 0)
      const desercion = ws.reduce((s, w) => s + (w.des_d1||0)+(w.des_d2||0)+(w.des_d3||0)+(w.des_d4||0)+(w.des_d5||0), 0)
      let cob = 0
      if (ws.length) { const last = [...ws].sort((a, b) => b.semana - a.semana)[0]; cob = last.cob_d5||last.cob_d4||last.cob_d3||last.cob_d2||last.cob_d1||0 }
      const has = ws.length > 0 || !!r
      const ok = nuevos >= metaNuevosMes && desercion <= metaDesMes && cob <= metaCobMes
      return { nuevos, desercion, cob, ok, has, ninosInicio: r?.ninos_inicio_mes||0, nuevosActivos: r?.nuevos_activos_mes||0 }
    })
    const totNuevos = months.reduce((s, m) => s + m.nuevos, 0)
    const totDes = months.reduce((s, m) => s + m.desercion, 0)
    const last = months[2]
    const ninos = Math.max(0, last.ninosInicio + last.nuevosActivos - last.desercion)
    const cumpl = Math.round((months.filter((m) => m.ok).length / 3) * 100)
    const estado = cumpl >= 85 ? 'Cumplido' : cumpl >= 70 ? 'Parcial' : 'Crítico'
    const conDatos = months.filter((m) => m.has)
    let trend = '→'
    if (conDatos.length >= 2) {
      const a = conDatos[conDatos.length - 2].nuevos
      const b = conDatos[conDatos.length - 1].nuevos
      trend = b > a ? '↑' : b < a ? '↓' : '→'
    }
    return {
      id: c.id, nombre: c.nombre, admin, ninos,
      nuevos: totNuevos, meta: metaNuevosMes * 3, desercion: totDes,
      cobranza: last.cob <= metaCobMes ? 'Sí' : 'No', cumpl, estado, trend,
    }
  })
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
