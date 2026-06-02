'use server'
import { sql } from '../../lib/db'
import { requireAdmin } from '../../lib/auth'
import { getCurrentPeriod } from '../../lib/period'
import { nivelPorNinos, siguienteNivel } from '../../lib/nivel'
import { quarterMetrics } from '../../lib/kpi-calc'

const Q_MONTHS = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] }

// Métricas agregadas por centro para un (año, trimestre). Por defecto usa el
// trimestre actual. Usado por panel, ranking, alertas y reporte. Calcula todo
// en el servidor para mantener consistencia.
export async function getCentrosKpi(year, quarter) {
  await requireAdmin()
  if (!year || !quarter) { const p = getCurrentPeriod(); year = year || p.year; quarter = quarter || p.quarter }
  const qm = Q_MONTHS[quarter] || [1, 2, 3]
  const lo = qm[0], hi = qm[qm.length - 1]
  const centros = await sql`SELECT id, nombre FROM centros ORDER BY nombre`
  const [metas] = await sql`SELECT * FROM metas WHERE anio = ${year} AND trimestre = ${quarter}`
  const rs = await sql`SELECT * FROM resumen_mes WHERE year = ${year} AND month BETWEEN ${lo} AND ${hi}`
  const ks = await sql`SELECT * FROM kpi_semanas WHERE year = ${year} AND month BETWEEN ${lo} AND ${hi}`
  const usuarios = await sql`SELECT nombre, centro_id FROM usuarios`
  // Trimestre anterior → define el nivel GANADO que aplica a este trimestre.
  const prevQ = quarter > 1 ? quarter - 1 : 4
  const prevY = quarter > 1 ? year : year - 1
  const pqm = Q_MONTHS[prevQ]
  const prs = await sql`SELECT * FROM resumen_mes WHERE year = ${prevY} AND month BETWEEN ${pqm[0]} AND ${pqm[2]}`
  const pks = await sql`SELECT * FROM kpi_semanas WHERE year = ${prevY} AND month BETWEEN ${pqm[0]} AND ${pqm[2]}`

  const metaNuevosMes = metas?.meta_nuevos_ingresos_mes || 20
  const metaDesMes = Number(metas?.meta_desercion_mes || 8) // % máximo de deserción mensual
  const metaCobMes = metas?.meta_cobranza_max || 1

  return centros.map((c) => {
    const crs = rs.filter((r) => r.centro_id === c.id)
    const cks = ks.filter((k) => k.centro_id === c.id)
    const admin = usuarios.find((u) => u.centro_id === c.id)?.nombre || '—'
    const months = qm.map((mo) => {
      const r = crs.find((x) => x.month === mo)
      const ws = cks.filter((x) => x.month === mo)
      const nuevos = ws.reduce((s, w) => s + (w.ing_d1||0)+(w.ing_d2||0)+(w.ing_d3||0)+(w.ing_d4||0)+(w.ing_d5||0), 0)
      const desercion = ws.reduce((s, w) => s + (w.des_d1||0)+(w.des_d2||0)+(w.des_d3||0)+(w.des_d4||0)+(w.des_d5||0), 0)
      let cob = 0
      if (ws.length) { const last = [...ws].sort((a, b) => b.semana - a.semana)[0]; cob = last.cob_d5||last.cob_d4||last.cob_d3||last.cob_d2||last.cob_d1||0 }
      const has = ws.length > 0 || !!r
      const ninosIni = r?.ninos_inicio_mes || 0
      const desPct = ninosIni > 0 ? (desercion / ninosIni) * 100 : (desercion > 0 ? 100 : 0)
      const ok = nuevos >= metaNuevosMes && desPct <= metaDesMes && cob <= metaCobMes
      return { nuevos, desercion, desPct, cob, ok, has, ninosInicio: ninosIni, nuevosActivos: r?.nuevos_activos_mes||0, grupos: r?.grupos_activos||0 }
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
    // Nivel GANADO: se obtiene al cerrar el TRIMESTRE ANTERIOR cumpliendo la condición.
    const pm = quarterMetrics(prs, pks, c.id, pqm)
    const nivel = pm.desOk ? nivelPorNinos(pm.ninos) : 0
    // En curso (motivación): lo que ganaría si el trimestre actual cerrara hoy.
    const desOkActual = months.every((m) => m.has && m.ninosInicio > 0 && (m.desercion / m.ninosInicio) * 100 < 8)
    const nivelEnCurso = desOkActual ? nivelPorNinos(ninos) : 0
    const sig = siguienteNivel(ninos)
    // Niños por grupo (ocupación) — driver de rentabilidad.
    const grupos = last.grupos || 0
    const metaGpn = Number(metas?.gpn_min || 8)
    const ninosGrupo = grupos > 0 ? ninos / grupos : 0
    const gpnBajo = grupos > 0 && ninosGrupo < metaGpn
    return {
      id: c.id, nombre: c.nombre, admin, ninos,
      nuevos: totNuevos, meta: metaNuevosMes * 3, desercion: totDes,
      cobranza: last.cob <= metaCobMes ? 'Sí' : 'No', cumpl, estado, trend,
      nivel, nivelEnCurso, sig, desOkActual,
      grupos, ninosGrupo, gpnBajo, metaGpn,
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
