'use server'
import { sql } from '../../lib/db'
import { requireAdmin } from '../../lib/auth'
import { getCurrentPeriod } from '../../lib/period'
import { nivelPorNinos, siguienteNivel } from '../../lib/nivel'
import { CUMPLIMIENTO_KEYS } from '../../lib/checklist'

const Q_MONTHS = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] }

const Q_OF = (m) => Math.floor((m - 1) / 3) + 1

// Lista de meses {year, month} entre dos extremos, inclusive.
function monthList(fromY, fromM, toY, toM) {
  const out = []
  let y = fromY, m = fromM
  while (y * 100 + m <= toY * 100 + toM) {
    out.push({ year: y, month: m })
    m++; if (m > 12) { m = 1; y++ }
  }
  return out
}

// Métricas agregadas por centro sobre un RANGO de meses [desde, hasta].
// Es la base del panel: sirve igual para un trimestre (3 meses) que para un
// rango mensual (ej. últimos 12 meses). Calcula todo en el servidor.
export async function getCentrosKpiRango(fromY, fromM, toY, toM) {
  await requireAdmin()
  const lo = fromY * 100 + fromM, hi = toY * 100 + toM
  const mlist = monthList(fromY, fromM, toY, toM)
  const nMeses = mlist.length || 1
  const toQ = Q_OF(toM) // metas/objetivos = los del trimestre del mes final del rango

  const centros = await sql`SELECT id, nombre FROM centros ORDER BY nombre`
  const [metas] = await sql`SELECT * FROM metas WHERE anio = ${toY} AND trimestre = ${toQ}`
  const rs = await sql`SELECT * FROM resumen_mes WHERE (year * 100 + month) BETWEEN ${lo} AND ${hi}`
  const ks = await sql`SELECT * FROM kpi_semanas WHERE (year * 100 + month) BETWEEN ${lo} AND ${hi}`
  const usuarios = await sql`SELECT nombre, centro_id FROM usuarios`

  // Cumplimiento REAL = checklist (hoja "Cumplimiento" de los Excel). Se toman
  // solo las celdas (trimestre, mes) cuyo mes calendario cae dentro del rango.
  const cumpRows = await sql`
    SELECT t.centro_id AS centro_id, t.anio AS anio, t.trimestre AS trimestre, cu.*
    FROM cumplimiento cu JOIN trimestres t ON t.id = cu.trimestre_id
    WHERE t.anio BETWEEN ${fromY} AND ${toY}
  `
  const cumpAgg = {}
  for (const row of cumpRows) {
    const calMonth = (row.trimestre - 1) * 3 + row.mes
    const v = row.anio * 100 + calMonth
    if (v < lo || v > hi) continue
    const e = cumpAgg[row.centro_id] || { si: 0, tot: 0 }
    for (const k of CUMPLIMIENTO_KEYS) { e.tot++; if (row[k] === 'si') e.si++ }
    cumpAgg[row.centro_id] = e
  }

  const metaNuevosMes = metas?.meta_nuevos_ingresos_mes || 20
  const metaDesMes = Number(metas?.meta_desercion_mes || 8) // % máximo de deserción mensual
  const metaCobMes = metas?.meta_cobranza_max || 1

  return centros.map((c) => {
    const crs = rs.filter((r) => r.centro_id === c.id)
    const cks = ks.filter((k) => k.centro_id === c.id)
    const admin = usuarios.find((u) => u.centro_id === c.id)?.nombre || '—'
    const months = mlist.map(({ year, month }) => {
      const r = crs.find((x) => x.year === year && x.month === month)
      const ws = cks.filter((x) => x.year === year && x.month === month)
      const nuevos = ws.reduce((s, w) => s + (w.ing_d1||0)+(w.ing_d2||0)+(w.ing_d3||0)+(w.ing_d4||0)+(w.ing_d5||0), 0)
      const desercion = ws.reduce((s, w) => s + (w.des_d1||0)+(w.des_d2||0)+(w.des_d3||0)+(w.des_d4||0)+(w.des_d5||0), 0)
      let cob = 0
      if (ws.length) { const last = [...ws].sort((a, b) => b.semana - a.semana)[0]; cob = last.cob_d5||last.cob_d4||last.cob_d3||last.cob_d2||last.cob_d1||0 }
      const has = ws.length > 0 || !!r
      const ninosIni = r?.ninos_inicio_mes || 0
      const desPct = ninosIni > 0 ? (desercion / ninosIni) * 100 : (desercion > 0 ? 100 : 0)
      const ok = nuevos >= metaNuevosMes && desPct <= metaDesMes && cob <= metaCobMes
      return { nuevos, desercion, desPct, cob, ok, has, ninosInicio: ninosIni, ninosFinal: r?.ninos_final_mes || 0, nuevosActivos: r?.nuevos_activos_mes||0, grupos: r?.grupos_activos||0 }
    })
    const totNuevos = months.reduce((s, m) => s + m.nuevos, 0)
    const totDes = months.reduce((s, m) => s + m.desercion, 0)
    const graduados = crs.reduce((s, r) => s + (r.mot_graduado || 0), 0)
    const desercionReal = Math.max(0, totDes - graduados)
    const conDatos = months.filter((m) => m.has)
    const last = conDatos.length ? conDatos[conDatos.length - 1] : months[months.length - 1]
    // El cierre del mes (ninos_final_mes, lo escribe "Sincronizar con KPI"
    // desde el Cuadro de Negocio) manda; si aún no está, se estima con
    // inicio + nuevos − deserción capturada en las semanas.
    const ninos = last.ninosFinal > 0 ? last.ninosFinal : Math.max(0, last.ninosInicio + last.nuevosActivos - last.desercion)
    // % de cumplimiento = checklist real de los Excel (no el cálculo de metas).
    const metasCumpl = Math.round((months.filter((m) => m.ok).length / nMeses) * 100)
    const ag = cumpAgg[c.id]
    const cumpl = ag && ag.tot ? Math.round((ag.si / ag.tot) * 100) : 0
    const estado = cumpl >= 85 ? 'Cumplido' : cumpl >= 70 ? 'Parcial' : 'Crítico'
    let trend = '→'
    if (conDatos.length >= 2) {
      const a = conDatos[conDatos.length - 2].nuevos
      const b = conDatos[conDatos.length - 1].nuevos
      trend = b > a ? '↑' : b < a ? '↓' : '→'
    }
    // Nivel del centro = niños vs umbrales (igual que el Excel; sin condición de deserción).
    const nivel = nivelPorNinos(ninos)
    const desOkActual = months.every((m) => m.has && m.ninosInicio > 0 && (m.desercion / m.ninosInicio) * 100 < 8)
    const nivelEnCurso = nivel
    const sig = siguienteNivel(ninos)
    // Niños por grupo (ocupación) — driver de rentabilidad.
    const grupos = last.grupos || 0
    const metaGpn = Number(metas?.gpn_min || 8)
    const ninosGrupo = grupos > 0 ? ninos / grupos : 0
    const gpnBajo = grupos > 0 && ninosGrupo < metaGpn
    return {
      id: c.id, nombre: c.nombre, admin, ninos,
      nuevos: totNuevos, meta: metaNuevosMes * nMeses, desercion: totDes, graduados, desercionReal,
      cobranza: last.cob <= metaCobMes ? 'Sí' : 'No', cumpl, metasCumpl, estado, trend,
      nivel, nivelEnCurso, sig, desOkActual,
      grupos, ninosGrupo, gpnBajo, metaGpn,
    }
  })
}

// Compatibilidad: métricas por (año, trimestre). Usado por ranking, alertas y
// reporte. Delega en el cálculo por rango con los 3 meses del trimestre.
export async function getCentrosKpi(year, quarter) {
  if (!year || !quarter) { const p = getCurrentPeriod(); year = year || p.year; quarter = quarter || p.quarter }
  const qm = Q_MONTHS[quarter] || [1, 2, 3]
  return getCentrosKpiRango(year, qm[0], year, qm[qm.length - 1])
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

// Serie mensual de niños (suma de todos los centros) para un rango [desde, hasta].
export async function getNinosSerie(desdeY, desdeM, hastaY, hastaM) {
  await requireAdmin()
  const lo = desdeY * 100 + desdeM
  const hi = hastaY * 100 + hastaM
  return await sql`
    SELECT year, month, SUM(ninos_final_mes)::int ninos, SUM(nuevos_activos_mes)::int nuevos
    FROM resumen_mes
    WHERE (year * 100 + month) BETWEEN ${lo} AND ${hi}
    GROUP BY year, month ORDER BY year, month
  `
}
