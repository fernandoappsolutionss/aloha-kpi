import { sql } from '../db.js'
import { hoyISO } from '../operaciones.js'
import { superponerKpiAbiertos } from '../kpi-semanal-service.js'
import { VENTAS_AUTO_DESDE } from '../kpi-semanal-auto.mjs'
import { GROWTH_ENGINE_VERSION } from './constants.mjs'
import { dueDateForRecommendation, growthWeekStart } from './notifications.mjs'
import { sanitizeGrowthPayload } from './serialize.mjs'
import { buildGrowthPayload, projectPayloadWithRecommendations } from './engine.mjs'
import { evaluateGrowthForecasts } from './backtest.mjs'

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
      SELECT id, grupo_id, estado, fecha_inscripcion, created_at, retiro_programado_para, origen, crm_registration_id
      FROM estudiantes WHERE centro_id = ${centroId}
    `,
    sql`
      SELECT id, numero, estado, fecha_inicio_clases, itinerario_clases, fusionado_en, fecha_cierre
      FROM grupos WHERE centro_id = ${centroId}
    `,
    sql`
      SELECT id, estudiante_id, tipo, fecha, year, month, a_grupo_id, motivo, origen
      FROM estudiante_eventos
      WHERE centro_id = ${centroId} AND tipo IN ('inscripcion', 'retiro', 'cambio_grupo', 'reincorporacion')
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

    const dueDate = dueDateForRecommendation({ createdOn: snapshotDate, dueDays: item.dueDays, existingDueDate: item.due_date })
    const expiresAt = addDays(snapshotDate, Math.max(item.dueDays, 30))
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
        due_date = growth_recommendations.due_date,
        expires_at = growth_recommendations.expires_at,
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

  const generatedFor = growthWeekStart(`${input.today}T12:00:00Z`)
  const [recommendationStates, snapshots] = await Promise.all([
    sql`
      SELECT id, kind, title, responsible, generated_for, status, due_date, completed_at
      FROM growth_recommendations
      WHERE centro_id = ${centroId}
        AND (generated_for >= (${generatedFor}::date - 56)
          OR (status = 'postponed' AND due_date > ${input.today}))
      ORDER BY generated_for DESC
    `,
    sql`
      SELECT centro_id, snapshot_date, payload FROM growth_snapshots
      WHERE centro_id = ${centroId} AND engine_version = ${GROWTH_ENGINE_VERSION}
      ORDER BY snapshot_date DESC LIMIT 366
    `,
  ])
  const payload = buildGrowthPayload({ ...input, generatedAt: new Date() }, { recommendationStates })
  const closedPeriods = new Set(input.states.filter(row => row.estado === 'cerrado')
    .map(row => `${row.year}-${String(row.month).padStart(2, '0')}`))
  const actuals = input.summaries.map(row => ({
    centro_id: centroId, period: `${row.year}-${String(row.month).padStart(2, '0')}`,
    actual: row.ninos_final_mes,
  })).filter(row => closedPeriods.has(row.period))
  const evaluated = evaluateGrowthForecasts({ snapshots, actuals, engineVersion: GROWTH_ENGINE_VERSION })
  payload.metrics.precision = {
    status: evaluated.sampleSize >= 6 ? 'evaluated' : 'unvalidated',
    sampleSize: evaluated.sampleSize,
    engineMae: evaluated.engineMae,
    baselineMae: evaluated.baselineMae,
    guardrail: evaluated.guardrail,
    byScenario: evaluated.byScenario,
  }

  payload.projection.precision = payload.metrics.precision
  payload.recommendationHistory = recommendationStates.filter(row => ['completed', 'dismissed', 'postponed'].includes(row.status)).slice(0, 20)
  if (!persist) return sanitizeGrowthPayload(payload)
  const saved = await persistGrowth(centroId, input.today, payload, payload.recommendations)
  const result = sanitizeGrowthPayload({
    ...payload, ...saved,
    projection: projectPayloadWithRecommendations(payload, saved.recommendations),
  })
  // Persist the same scenario/decision state returned to the screen, including
  // a decision that raced with the initial read of recommendation states.
  await sql`UPDATE growth_snapshots SET payload = ${JSON.stringify(result)}::jsonb WHERE id = ${saved.snapshotId}`
  return result
}
