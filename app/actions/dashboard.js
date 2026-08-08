'use server'
import { sql } from '../../lib/db'
import { requireAdmin } from '../../lib/auth'
import { getCurrentPeriod } from '../../lib/period'
import { nivelPorNinos, siguienteNivel } from '../../lib/nivel'
import { CUMPLIMIENTO_KEYS } from '../../lib/checklist'
import { hoyISO } from '../../lib/operaciones'
import { movimientosVivosMes, periodosAbiertosOperativos, resumenConCuadroVivo } from '../../lib/inicios-clase.mjs'
import { motivosParaKpi } from '../../lib/cuadro-calc'
import { superponerKpiAbiertos } from '../../lib/kpi-semanal-service'

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

async function aplicarMesesAbiertosVivos(rows, prevRows, lo, hi, centroIds = []) {
  try {
    const estados = await sql`
      SELECT centro_id, year, month, estado FROM mes_kpi
      WHERE (year * 100 + month) BETWEEN ${lo} AND ${hi}
    `
    let actualizadas = rows.map((row) => ({
      ...row,
      estado_mes: estados.find((estado) =>
        Number(estado.centro_id) === Number(row.centro_id) &&
        Number(estado.year) === Number(row.year) &&
        Number(estado.month) === Number(row.month)
      )?.estado || 'abierto',
    }))
    const ids = new Set(centroIds.map(Number))
    for (const row of [...rows, ...prevRows]) ids.add(Number(row.centro_id))
    const [yearActual, monthActual] = hoyISO().split('-').map(Number)
    const candidatos = periodosAbiertosOperativos({
      resumenes: rows,
      estados,
      centroIds: [...ids],
      desde: lo,
      hasta: hi,
      periodoActual: yearActual * 100 + monthActual,
    })
    if (!candidatos.length) return actualizadas

    const [estudiantes, grupos, eventos] = await Promise.all([
      sql`SELECT id, centro_id, grupo_id, nombre, estado, fecha_inscripcion FROM estudiantes`,
      sql`SELECT id, centro_id, numero, estado, fecha_inicio_clases FROM grupos`,
      sql`
        SELECT id, centro_id, estudiante_id, tipo, motivo, fecha, year, month, a_grupo_id
        FROM estudiante_eventos
        WHERE ((year * 100 + month) BETWEEN ${lo} AND ${hi}) OR tipo IN ('inscripcion', 'retiro')
        ORDER BY fecha, id
      `,
    ])
    const agruparPorCentro = (items) => {
      const agrupados = new Map()
      for (const item of items) {
        const centroId = Number(item.centro_id)
        const grupo = agrupados.get(centroId) || []
        grupo.push(item)
        agrupados.set(centroId, grupo)
      }
      return agrupados
    }
    const estudiantesPorCentro = agruparPorCentro(estudiantes)
    const gruposPorCentro = agruparPorCentro(grupos)
    const eventosPorCentro = agruparPorCentro(eventos)
    for (const candidato of candidatos) {
      const { centroId, year, month, estado } = candidato
      const movimientos = movimientosVivosMes({
        estudiantes: estudiantesPorCentro.get(centroId) || [],
        grupos: gruposPorCentro.get(centroId) || [],
        eventos: eventosPorCentro.get(centroId) || [],
        year,
        month,
      })
      const previousYear = month === 1 ? year - 1 : year
      const previousMonth = month === 1 ? 12 : month - 1
      const fila = actualizadas.find((item) =>
        Number(item.centro_id) === centroId && Number(item.year) === year && Number(item.month) === month
      )
      const anterior = actualizadas.find((item) =>
        Number(item.centro_id) === centroId &&
        Number(item.year) === previousYear &&
        Number(item.month) === previousMonth
      ) || prevRows.find((item) =>
        Number(item.centro_id) === centroId &&
        Number(item.year ?? previousYear) === previousYear &&
        Number(item.month ?? previousMonth) === previousMonth
      )

      actualizadas = resumenConCuadroVivo(actualizadas, {
        centroId,
        year,
        month,
        estado,
        cuadro: movimientos,
        inicioArrastrado: anterior?.ninos_final_mes ?? fila?.ninos_inicio_mes,
        motivos: motivosParaKpi(movimientos.deserciones),
      })
    }
    return actualizadas
  } catch (error) {
    console.error('[dashboard] no se pudo aplicar el balance vivo de los meses abiertos:', error)
    return rows
  }
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
  let rs = await sql`SELECT * FROM resumen_mes WHERE (year * 100 + month) BETWEEN ${lo} AND ${hi}`
  let ks = await sql`SELECT * FROM kpi_semanas WHERE (year * 100 + month) BETWEEN ${lo} AND ${hi}`
  // (g1-16) Superposición en vivo: en meses abiertos >= gate las ventas y
  // retiros del panel salen del módulo, con el mismo helper que KPI Semanal.
  ;({ filas: ks } = await superponerKpiAbiertos({
    filas: ks,
    centroIds: centros.map((centro) => centro.id),
    desde: lo,
    hasta: hi,
  }))
  const usuarios = await sql`SELECT nombre, centro_id FROM usuarios`
  // Semilla del ENCADENAMIENTO: cierre del mes anterior al rango. Un mes
  // recién abierto (sin cierre) hereda los niños del eslabón anterior en vez
  // de mostrar 0 en el panel.
  const py = fromM === 1 ? fromY - 1 : fromY
  const pm = fromM === 1 ? 12 : fromM - 1
  const prevRows = await sql`SELECT centro_id, ninos_final_mes, grupos_activos FROM resumen_mes WHERE year = ${py} AND month = ${pm}`
  rs = await aplicarMesesAbiertosVivos(rs, prevRows, lo, hi, centros.map((centro) => centro.id))

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
    const prev = prevRows.find((r) => r.centro_id === c.id)
    let cadena = prev?.ninos_final_mes || 0
    let cadenaGrupos = prev?.grupos_activos || 0
    const months = mlist.map(({ year, month }) => {
      const r = crs.find((x) => x.year === year && x.month === month)
      const ws = cks.filter((x) => x.year === year && x.month === month)
      const nuevos = ws.reduce((s, w) => s + (w.ing_d1||0)+(w.ing_d2||0)+(w.ing_d3||0)+(w.ing_d4||0)+(w.ing_d5||0), 0)
      const desercionSemanal = ws.reduce((s, w) => s + (w.des_d1||0)+(w.des_d2||0)+(w.des_d3||0)+(w.des_d4||0)+(w.des_d5||0), 0)
      const desercion = r?.retiros_operativos_mes ?? desercionSemanal
      let cob = 0
      if (ws.length) { const last = [...ws].sort((a, b) => b.semana - a.semana)[0]; cob = last.cob_d5||last.cob_d4||last.cob_d3||last.cob_d2||last.cob_d1||0 }
      const has = ws.length > 0 || !!r
      const balanceDeclarado = !!r && (r.balance_vivo === true || r.estado_mes === 'cerrado')
      // Encadenado: sin inicio guardado, el mes hereda el cierre del anterior.
      const ninosIni = balanceDeclarado && r.ninos_inicio_mes != null
        ? Number(r.ninos_inicio_mes)
        : (r?.ninos_inicio_mes || 0) > 0 ? r.ninos_inicio_mes : cadena
      const nuevosActivos = r?.nuevos_activos_mes || 0
      const ninosFinal = balanceDeclarado && r.ninos_final_mes != null
        ? Number(r.ninos_final_mes)
        : (r?.ninos_final_mes || 0) > 0 ? r.ninos_final_mes : Math.max(0, ninosIni + nuevosActivos - desercion)
      if (has) { cadena = ninosFinal; if ((r?.grupos_activos || 0) > 0) cadenaGrupos = r.grupos_activos }
      const desPct = ninosIni > 0 ? (desercion / ninosIni) * 100 : (desercion > 0 ? 100 : 0)
      const ok = nuevos >= metaNuevosMes && desPct <= metaDesMes && cob <= metaCobMes
      return { nuevos, desercion, desPct, cob, ok, has, ninosInicio: ninosIni, ninosFinal, nuevosActivos, grupos: (r?.grupos_activos || 0) > 0 ? r.grupos_activos : cadenaGrupos }
    })
    const totNuevos = months.reduce((s, m) => s + m.nuevos, 0)
    const totDes = months.reduce((s, m) => s + m.desercion, 0)
    const graduados = crs.reduce((s, r) => s + (r.mot_graduado || 0), 0)
    const desercionReal = Math.max(0, totDes - graduados)
    const conDatos = months.filter((m) => m.has)
    const last = conDatos.length ? conDatos[conDatos.length - 1] : months[months.length - 1]
    // ninosFinal ya viene encadenado: cierre real del mes si existe, o el
    // eslabón anterior + nuevos − deserción para meses aún en curso.
    const ninos = last.ninosFinal
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
  const centroIds = new Set(centros.map((centro) => Number(centro.id)))
  const lo = Number(anio) * 100 + 1
  const hi = Number(anio) * 100 + 12
  let resumen = (await sql`SELECT * FROM resumen_mes WHERE year = ${anio}`)
    .filter((row) => centroIds.has(Number(row.centro_id)))
  let semanas = (await sql`SELECT * FROM kpi_semanas WHERE year = ${anio}`)
    .filter((row) => centroIds.has(Number(row.centro_id)))
  // (g1-16) Mismo helper compartido: meses abiertos >= gate ven el cálculo vivo.
  ;({ filas: semanas } = await superponerKpiAbiertos({
    filas: semanas,
    centroIds: [...centroIds],
    desde: lo,
    hasta: hi,
  }))
  const prevRows = (await sql`SELECT centro_id, ninos_final_mes, grupos_activos FROM resumen_mes WHERE year = ${Number(anio) - 1} AND month = 12`)
    .filter((row) => centroIds.has(Number(row.centro_id)))
  resumen = await aplicarMesesAbiertosVivos(resumen, prevRows, lo, hi, [...centroIds])

  const out = []
  for (const c of centros) {
    const rs = resumen.filter((row) => Number(row.centro_id) === Number(c.id))
    const ks = semanas.filter((row) => Number(row.centro_id) === Number(c.id))
    for (const t of trimestres) {
      const months = Q_MONTHS[t]
      const meses = months.map((mo) => {
        const r = rs.find((x) => x.month === mo)
        const ws = ks.filter((x) => x.month === mo)
        const nuevos = ws.reduce((a, w) => a + (w.ing_d1 || 0) + (w.ing_d2 || 0) + (w.ing_d3 || 0) + (w.ing_d4 || 0) + (w.ing_d5 || 0), 0)
        const desercionSemanal = ws.reduce((a, w) => a + (w.des_d1 || 0) + (w.des_d2 || 0) + (w.des_d3 || 0) + (w.des_d4 || 0) + (w.des_d5 || 0), 0)
        const des = r?.retiros_operativos_mes ?? desercionSemanal
        return {
          month: mo,
          nuevos, des,
          ninos: r?.ninos_final_mes ?? 0,
          grupos: r?.grupos_activos ?? 0,
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

// Serie mensual de niños (suma de todos los centros) para un rango [desde,
// hasta], ENCADENADA: un mes en curso sin cierre hereda el eslabón anterior
// del centro (+ nuevos − deserción) en vez de hundir la curva a 0.
export async function getNinosSerie(desdeY, desdeM, hastaY, hastaM) {
  await requireAdmin()
  const lo = desdeY * 100 + desdeM
  const hi = hastaY * 100 + hastaM
  const py = desdeM === 1 ? desdeY - 1 : desdeY
  const pm = desdeM === 1 ? 12 : desdeM - 1
  const centros = await sql`SELECT id FROM centros`
  let rows = await sql`
    SELECT centro_id, year, month, ninos_inicio_mes, ninos_final_mes, nuevos_activos_mes
    FROM resumen_mes WHERE (year * 100 + month) BETWEEN ${lo} AND ${hi}`
  const prev = await sql`SELECT centro_id, ninos_final_mes FROM resumen_mes WHERE year = ${py} AND month = ${pm}`
  rows = await aplicarMesesAbiertosVivos(rows, prev, lo, hi, centros.map((centro) => centro.id))
  // (g1-16) Filas crudas + agregado en JS: la superposición del cálculo vivo
  // (meses abiertos >= gate) entra a la serie con el helper compartido.
  let ksSerie = await sql`
    SELECT centro_id, year, month, semana,
           ing_d1, ing_d2, ing_d3, ing_d4, ing_d5,
           des_d1, des_d2, des_d3, des_d4, des_d5
    FROM kpi_semanas WHERE (year * 100 + month) BETWEEN ${lo} AND ${hi}`
  ;({ filas: ksSerie } = await superponerKpiAbiertos({
    filas: ksSerie,
    centroIds: centros.map((centro) => centro.id),
    desde: lo,
    hasta: hi,
  }))
  const desPorMes = new Map()
  for (const fila of ksSerie) {
    const clave = `${fila.centro_id}:${fila.year}-${fila.month}`
    desPorMes.set(clave, (desPorMes.get(clave) || 0) +
      (fila.des_d1 || 0) + (fila.des_d2 || 0) + (fila.des_d3 || 0) + (fila.des_d4 || 0) + (fila.des_d5 || 0))
  }
  const desMes = [...desPorMes.entries()].map(([clave, des]) => {
    const [centroId, periodo] = clave.split(':')
    const [year, month] = periodo.split('-').map(Number)
    return { centro_id: Number(centroId), year, month, des }
  })
  const cadena = new Map(prev.map((r) => [r.centro_id, r.ninos_final_mes || 0]))
  const out = []
  for (const { year, month } of monthList(desdeY, desdeM, hastaY, hastaM)) {
    const mrs = rows.filter((r) => r.year === year && r.month === month)
    if (!mrs.length) continue
    let ninos = 0, nuevos = 0
    for (const r of mrs) {
      const des = r.retiros_operativos_mes ?? (desMes.find((d) => d.centro_id === r.centro_id && d.year === year && d.month === month)?.des || 0)
      const balanceDeclarado = r.balance_vivo === true || r.estado_mes === 'cerrado'
      const ini = balanceDeclarado && r.ninos_inicio_mes != null
        ? Number(r.ninos_inicio_mes)
        : (r.ninos_inicio_mes || 0) > 0 ? r.ninos_inicio_mes : (cadena.get(r.centro_id) || 0)
      const fin = balanceDeclarado && r.ninos_final_mes != null
        ? Number(r.ninos_final_mes)
        : (r.ninos_final_mes || 0) > 0 ? r.ninos_final_mes : Math.max(0, ini + (r.nuevos_activos_mes || 0) - des)
      cadena.set(r.centro_id, fin)
      ninos += fin
      nuevos += r.nuevos_activos_mes || 0
    }
    out.push({ year, month, ninos, nuevos })
  }
  return out
}
