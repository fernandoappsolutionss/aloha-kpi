import { sql } from '../db.js'
import { hoyISO } from '../operaciones.js'
import { superponerKpiAbiertos } from '../kpi-semanal-service.js'
import { VENTAS_AUTO_DESDE } from '../kpi-semanal-auto.mjs'
import { GROWTH_ENGINE_VERSION } from './constants.mjs'
import { buildGrowthMetrics } from './metrics.mjs'
import { growthWeekStart } from './notifications.mjs'
import { projectGrowth } from './projector.mjs'
import { buildGrowthRecommendations } from './recommendations.mjs'
import { sanitizeGrowthPayload } from './serialize.mjs'
import {
  buildGrowthHistory,
  buildOperationalGrowth,
  currentPopulationFromHistory,
  selectCurrentPopulation,
} from './source.mjs'

const addDays = (date, days) => {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + Number(days || 0))
  return value.toISOString().slice(0, 10)
}

async function loadGrowthInputs(centroId) {
  const today = hoyISO()
  const [year, month] = today.split('-').map(Number)
  const quarter = Math.ceil(month / 3)

  const [centerRows, summaries, states, weeklyRows, reincorporations, students, groups, events, salons, metaRows] = await Promise.all([
    sql`SELECT id, nombre FROM centros WHERE id = ${centroId}`,
    sql`SELECT * FROM resumen_mes WHERE centro_id = ${centroId} ORDER BY year, month`,
    sql`SELECT year, month, estado FROM mes_kpi WHERE centro_id = ${centroId}`,
    sql`
      SELECT centro_id, year, month, semana,
        ing_d1, ing_d2, ing_d3, ing_d4, ing_d5,
        des_d1, des_d2, des_d3, des_d4, des_d5
      FROM kpi_semanas
      WHERE centro_id = ${centroId}
      ORDER BY year, month, semana
    `,
    sql`
      SELECT year, month, COUNT(*)::int AS total
      FROM estudiante_eventos
      WHERE centro_id = ${centroId} AND tipo = 'reincorporacion'
      GROUP BY year, month
    `,
    sql`
      SELECT id, grupo_id, nombre, estado, fecha_inscripcion, created_at
      FROM estudiantes WHERE centro_id = ${centroId}
    `,
    sql`
      SELECT id, numero, estado, fecha_inicio_clases
      FROM grupos WHERE centro_id = ${centroId}
    `,
    sql`
      SELECT id, estudiante_id, tipo, fecha, year, month, a_grupo_id
      FROM estudiante_eventos
      WHERE centro_id = ${centroId} AND tipo IN ('inscripcion', 'retiro')
      ORDER BY fecha, id
    `,
    sql`SELECT id, activo FROM salones WHERE centro_id = ${centroId}`,
    sql`SELECT * FROM metas WHERE anio = ${year} AND trimestre = ${quarter}`,
  ])

  // (g1-16) Superposición en vivo con el helper compartido: en meses abiertos
  // >= gate las ventas/retiros semanales salen del módulo, y el agregado
  // mensual que consume el motor de growth se arma en JS sobre esas filas.
  const [anioHoy, mesHoy] = today.split('-').map(Number)
  const { filas: weeklySuperpuesto } = await superponerKpiAbiertos({
    filas: weeklyRows,
    centroIds: [centroId],
    desde: VENTAS_AUTO_DESDE,
    hasta: anioHoy * 100 + mesHoy,
  })
  const weeklyPorMes = new Map()
  for (const fila of weeklySuperpuesto) {
    const clave = `${fila.year}-${fila.month}`
    const acumulado = weeklyPorMes.get(clave) || { year: fila.year, month: fila.month, nuevos_ingresos_venta: 0, total_desercion: 0 }
    acumulado.nuevos_ingresos_venta += (fila.ing_d1 || 0) + (fila.ing_d2 || 0) + (fila.ing_d3 || 0) + (fila.ing_d4 || 0) + (fila.ing_d5 || 0)
    acumulado.total_desercion += (fila.des_d1 || 0) + (fila.des_d2 || 0) + (fila.des_d3 || 0) + (fila.des_d4 || 0) + (fila.des_d5 || 0)
    weeklyPorMes.set(clave, acumulado)
  }
  const weekly = [...weeklyPorMes.values()].sort((a, b) =>
    (a.year * 100 + a.month) - (b.year * 100 + b.month)
  )

  return {
    today,
    center: centerRows[0] || null,
    summaries,
    states,
    weekly,
    reincorporations,
    students,
    groups,
    events,
    salons,
    metas: metaRows[0] || null,
  }
}

async function persistGrowth(centroId, snapshotDate, payload, recommendations) {
  const generatedFor = growthWeekStart(`${snapshotDate}T12:00:00.000Z`)
  const [snapshot] = await sql`
    INSERT INTO growth_snapshots (
      centro_id, snapshot_date, engine_version, confidence, payload, updated_at
    ) VALUES (
      ${centroId}, ${snapshotDate}, ${GROWTH_ENGINE_VERSION}, ${payload.metrics.confidence.level},
      ${JSON.stringify(payload)}::jsonb, now()
    )
    ON CONFLICT (centro_id, snapshot_date, engine_version) DO UPDATE SET
      confidence = EXCLUDED.confidence,
      payload = EXCLUDED.payload,
      updated_at = now()
    RETURNING id
  `

  await sql`
    UPDATE growth_recommendations
    SET status = 'expired', updated_at = now()
    WHERE centro_id = ${centroId}
      AND status IN ('pending', 'postponed')
      AND expires_at < ${snapshotDate}
  `
  await sql`
    UPDATE growth_recommendations
    SET status = 'pending', updated_at = now()
    WHERE centro_id = ${centroId}
      AND status = 'postponed'
      AND due_date <= ${snapshotDate}
  `
  await sql`
    UPDATE growth_recommendations
    SET status = 'superseded', updated_at = now()
    WHERE centro_id = ${centroId}
      AND generated_for < ${generatedFor}
      AND status = 'pending'
  `

  const persisted = []
  for (const item of recommendations) {
    const [postponed] = await sql`
      SELECT id, status, due_date, completed_at
      FROM growth_recommendations
      WHERE centro_id = ${centroId}
        AND kind = ${item.kind}
        AND status = 'postponed'
        AND due_date > ${snapshotDate}
      ORDER BY generated_for DESC
      LIMIT 1
    `
    if (postponed) {
      persisted.push({ ...item, ...postponed })
      continue
    }

    const dueDate = addDays(generatedFor, item.dueDays)
    const expiresAt = addDays(generatedFor, Math.max(item.dueDays, 30))
    const [row] = await sql`
      INSERT INTO growth_recommendations (
        centro_id, snapshot_id, kind, generated_for, title, reason, action,
        metric, baseline, target, unit, estimated_impact, effort, priority,
        responsible, due_date, expires_at
      ) VALUES (
        ${centroId}, ${snapshot.id}, ${item.kind}, ${generatedFor}, ${item.title},
        ${item.reason}, ${item.action}, ${item.metric}, ${item.baseline}, ${item.target},
        ${item.unit}, ${item.estimatedImpact}, ${item.effort}, ${item.priority},
        ${item.responsible}, ${dueDate}, ${expiresAt}
      )
      ON CONFLICT (centro_id, kind, generated_for) DO UPDATE SET
        snapshot_id = EXCLUDED.snapshot_id,
        title = EXCLUDED.title,
        reason = EXCLUDED.reason,
        action = EXCLUDED.action,
        metric = EXCLUDED.metric,
        baseline = EXCLUDED.baseline,
        target = EXCLUDED.target,
        unit = EXCLUDED.unit,
        estimated_impact = EXCLUDED.estimated_impact,
        effort = EXCLUDED.effort,
        priority = EXCLUDED.priority,
        responsible = EXCLUDED.responsible,
        due_date = EXCLUDED.due_date,
        expires_at = EXCLUDED.expires_at,
        status = CASE
          WHEN growth_recommendations.status IN ('completed', 'dismissed', 'postponed')
            THEN growth_recommendations.status
          ELSE 'pending'
        END,
        updated_at = now()
      RETURNING id, status, due_date, completed_at
    `
    persisted.push({ ...item, ...row })
  }

  return { snapshotId: snapshot.id, recommendations: persisted }
}

export async function calculateCentroGrowth(centroId, { persist = true } = {}) {
  const input = await loadGrowthInputs(centroId)
  if (!input.center) throw new Error('Centro no encontrado')

  const history = buildGrowthHistory(input)
  const operational = buildOperationalGrowth({
    today: input.today,
    students: input.students,
    groups: input.groups,
    events: input.events,
    salons: input.salons,
  })
  const metrics = buildGrowthMetrics(history, {
    pipelineTotal: operational.pipelineTotalWithUndated,
    pipelineDated: operational.pipelineDated,
  })
  const declaredCurrentChildren = currentPopulationFromHistory(history, {
    currentPeriod: operational.currentPeriod,
    currentMonthStarts: operational.currentMonthStarts,
    currentMonthWithdrawals: operational.currentMonthWithdrawals,
    currentMonthReincorporations: Number(input.reincorporations.find((row) =>
      `${row.year}-${String(row.month).padStart(2, '0')}` === operational.currentPeriod
    )?.total || 0),
  })
  const population = selectCurrentPopulation({
    operationalChildren: operational.currentChildren,
    trackedPopulation: operational.trackedPopulation,
    latestSummaryChildren: declaredCurrentChildren,
  })
  if (population.source === 'monthly_summary_fallback') {
    metrics.issues.push({
      code: 'partial_operational_population',
      message: 'La poblacion operativa esta incompleta frente al ultimo resumen mensual.',
    })
    metrics.confidence.reasons.push('La carga operativa del centro esta incompleta.')
    if (metrics.confidence.level === 'high') metrics.confidence.level = 'medium'
    metrics.confidence.score = Math.min(metrics.confidence.score, 0.69)
  }
  const projection = projectGrowth({
    currentChildren: population.currentChildren,
    currentPeriod: operational.currentPeriod,
    metrics,
    pipelineByMonth: operational.pipelineByMonth,
    nextMonthOperational: operational.nextMonthOperational,
    capacityMax: operational.capacityMax,
  })
  const benchmarks = {
    attendance: 0.6,
    enrollment: Number(input.metas?.cp_conversion ?? 50) / 100,
  }
  const recommendations = buildGrowthRecommendations({ metrics, projection, benchmarks })
  const payload = sanitizeGrowthPayload({
    generatedAt: new Date(),
    snapshotDate: input.today,
    engineVersion: GROWTH_ENGINE_VERSION,
    center: input.center,
    dataSource: population.source,
    populationCoverage: population.coverage,
    metrics,
    operational,
    projection,
    benchmarks,
    recommendations,
  })

  if (!persist) return payload
  const saved = await persistGrowth(centroId, input.today, payload, recommendations)
  return sanitizeGrowthPayload({ ...payload, ...saved })
}
