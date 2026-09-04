'use server'

import { requireCentroAccess } from '../../lib/auth'
import { alcancePanel, soloDeMisCentros } from '../../lib/alcance'
import { sql } from '../../lib/db'
import { GROWTH_ENGINE_VERSION } from '../../lib/growth/constants.mjs'
import { evaluateGrowthForecasts } from '../../lib/growth/backtest.mjs'
import {
  briefingEligibility,
  nextPendingRecommendation,
  growthWeekStart,
  recommendationStatusFor,
  snoozeUntilTomorrow,
} from '../../lib/growth/notifications.mjs'
import { calculateCentroGrowth } from '../../lib/growth/server'
import { refreshAfterRecommendationUpdate } from '../../lib/growth/engine.mjs'

export async function getCentroGrowth(centroId, options = {}) {
  await requireCentroAccess(centroId)
  return calculateCentroGrowth(centroId, { persist: options?.persist !== false })
}

const receiptShape = (row) => row ? {
  id: row.id,
  shownAt: row.shown_at,
  acknowledgedAt: row.acknowledged_at,
  snoozedUntil: row.snoozed_until,
} : null

const briefingShape = (growth) => {
  const nextMonth = growth.projection.scenarios.base.series[0] || null
  const topRecommendation = nextPendingRecommendation(growth.recommendations)

  return {
    center: growth.center,
    snapshotDate: growth.snapshotDate,
    confidence: growth.metrics.confidence,
    currentChildren: growth.projection.currentChildren,
    nextLevel: growth.projection.nextLevel,
    nextMonth,
    weeklyInvitations: growth.projection.requirements.commercial?.weeklyInvitations ?? null,
    topRecommendation,
  }
}

export async function getGrowthBriefing(centroId) {
  const session = await requireCentroAccess(centroId)
  const now = new Date()
  const weekStart = growthWeekStart(now)
  const growth = await calculateCentroGrowth(centroId)
  let wasCreated = false
  let [receipt] = await sql`
    SELECT id, shown_at, acknowledged_at, snoozed_until
    FROM growth_notification_receipts
    WHERE usuario_id = ${session.uid} AND week_start = ${weekStart}
    LIMIT 1
  `

  if (!receipt) {
    const [created] = await sql`
      INSERT INTO growth_notification_receipts (
        usuario_id, snapshot_id, week_start, shown_at
      ) VALUES (
        ${session.uid}, ${growth.snapshotId}, ${weekStart}, NULL
      )
      ON CONFLICT (usuario_id, week_start) DO NOTHING
      RETURNING id, shown_at, acknowledged_at, snoozed_until
    `
    if (created) {
      receipt = created
      wasCreated = true
    }
    else {
      [receipt] = await sql`
        SELECT id, shown_at, acknowledged_at, snoozed_until
        FROM growth_notification_receipts
        WHERE usuario_id = ${session.uid} AND week_start = ${weekStart}
        LIMIT 1
      `
    }
  }

  const normalizedReceipt = receiptShape(receipt)
  const eligibility = wasCreated
    ? { shouldShow: true, reason: 'first_visit' }
    : briefingEligibility({ receipt: normalizedReceipt, now })

  return {
    ...eligibility,
    weekStart,
    briefing: briefingShape(growth),
  }
}

export async function markGrowthBriefingShown(centroId) {
  const session = await requireCentroAccess(centroId)
  const weekStart = growthWeekStart()
  await sql`
    UPDATE growth_notification_receipts
    SET shown_at = now(),
        snoozed_until = CASE WHEN snoozed_until <= now() THEN NULL ELSE snoozed_until END,
        updated_at = now()
    WHERE usuario_id = ${session.uid} AND week_start = ${weekStart}
  `
  return { ok: true }
}

export async function acknowledgeGrowthBriefing(centroId) {
  const session = await requireCentroAccess(centroId)
  const weekStart = growthWeekStart()
  await sql`
    UPDATE growth_notification_receipts
    SET acknowledged_at = now(), snoozed_until = NULL, updated_at = now()
    WHERE usuario_id = ${session.uid} AND week_start = ${weekStart}
  `
  return { ok: true }
}

export async function snoozeGrowthBriefing(centroId) {
  const session = await requireCentroAccess(centroId)
  const weekStart = growthWeekStart()
  const snoozedUntil = snoozeUntilTomorrow()
  await sql`
    UPDATE growth_notification_receipts
    SET snoozed_until = ${snoozedUntil}, acknowledged_at = NULL, updated_at = now()
    WHERE usuario_id = ${session.uid} AND week_start = ${weekStart}
  `
  return { ok: true, snoozedUntil }
}

export async function updateGrowthRecommendation(centroId, recommendationId, command) {
  await requireCentroAccess(centroId)
  const id = Number(recommendationId)
  if (!Number.isInteger(id) || id <= 0) throw new Error('Recomendacion no valida')
  const status = recommendationStatusFor(command)

  const [updated] = await sql`
    UPDATE growth_recommendations
    SET status = ${status},
        completed_at = CASE WHEN ${status} = 'completed' THEN now() ELSE NULL END,
        due_date = CASE
          WHEN ${status} = 'postponed' THEN (now() AT TIME ZONE 'America/Panama')::date + 7
          ELSE due_date
        END,
        updated_at = now()
    WHERE id = ${id}
      AND centro_id = ${centroId}
      AND status IN ('pending', 'postponed')
    RETURNING id, status, due_date, completed_at
  `
  if (!updated) throw new Error('La recomendacion ya no esta activa')
  return refreshAfterRecommendationUpdate(updated, () => calculateCentroGrowth(centroId))
}

const adminGrowthRow = (growth, backtest) => {
  const projection = growth.projection
  const topAction = nextPendingRecommendation(growth.recommendations)
  const nextMonth = projection.scenarios.base.series[0] || null
  const nextThreshold = projection.nextLevel?.threshold ?? null

  return {
    id: growth.center.id,
    name: growth.center.nombre,
    currentChildren: projection.currentChildren,
    population: growth.population,
    currentLevel: projection.currentLevel,
    nextLevel: projection.nextLevel,
    confidence: growth.metrics.confidence,
    baseMonthlyNet: projection.scenarios.base.monthlyNet,
    actionMonthlyNet: projection.scenarios.action.monthlyNet,
    baseQuarter: projection.scenarios.base.recognitionQuarter,
    actionQuarter: projection.scenarios.action.recognitionQuarter,
    nextMonth,
    capacityMax: projection.capacityMax,
    capacityHeadroom: projection.capacityMax == null
      ? null
      : projection.capacityMax - projection.currentChildren,
    capacityBlocksLevel: nextThreshold != null
      && projection.capacityMax != null
      && projection.capacityMax < nextThreshold,
    acquisitionShare: growth.metrics.controls.acquisitionShare,
    attritionShare: growth.metrics.controls.attritionShare,
    attendanceRate: growth.metrics.rates.attendance,
    enrollmentRate: growth.metrics.rates.enrollment,
    topAction,
    backtest,
  }
}

export async function getGrowthAdminOverview() {
  const { centros: centers, centroIds } = await alcancePanel()
  const calculated = []

  for (let index = 0; index < centers.length; index += 3) {
    const batch = centers.slice(index, index + 3)
    const settled = await Promise.allSettled(batch.map((center) => calculateCentroGrowth(center.id)))
    settled.forEach((result, offset) => {
      calculated.push(result.status === 'fulfilled'
        ? { center: batch[offset], growth: result.value }
        : { center: batch[offset], error: true })
    })
  }

  const [snapshots, closedActuals] = await Promise.all([
    sql`
      SELECT centro_id, snapshot_date, payload
      FROM growth_snapshots
      WHERE snapshot_date >= CURRENT_DATE - INTERVAL '24 months'
        AND engine_version = ${GROWTH_ENGINE_VERSION}
      ORDER BY snapshot_date
    `,
    sql`
      SELECT rm.centro_id,
             CONCAT(rm.year, '-', LPAD(rm.month::text, 2, '0')) AS period,
             rm.ninos_final_mes AS actual
      FROM resumen_mes rm
      JOIN mes_kpi mk
        ON mk.centro_id = rm.centro_id
       AND mk.year = rm.year
       AND mk.month = rm.month
      WHERE mk.estado = 'cerrado'
    `,
  ])

  // El backtest del modelo se calcula sobre los centros del alcance: al
  // coordinador no le sirve (ni le corresponde) el promedio de los demás.
  const misSnapshots = soloDeMisCentros(snapshots, centroIds)
  const misActuals = soloDeMisCentros(closedActuals, centroIds)
  const model = evaluateGrowthForecasts({ snapshots: misSnapshots, actuals: misActuals, engineVersion: GROWTH_ENGINE_VERSION })
  const rows = calculated.map(({ center, growth, error }) => {
    if (error || !growth) return { id: center.id, name: center.nombre, error: true }
    const centerBacktest = evaluateGrowthForecasts({
      engineVersion: GROWTH_ENGINE_VERSION,
      snapshots: misSnapshots.filter((item) => String(item.centro_id) === String(center.id)),
      actuals: misActuals.filter((item) => String(item.centro_id) === String(center.id)),
    })
    return adminGrowthRow(growth, centerBacktest)
  })
  const readyRows = rows.filter((row) => !row.error)

  return {
    generatedAt: new Date().toISOString(),
    model,
    summary: {
      centers: rows.length,
      calculated: readyRows.length,
      lowConfidence: readyRows.filter((row) => row.confidence.level === 'low').length,
      positiveBase: readyRows.filter((row) => row.baseMonthlyNet > 0).length,
      capacityBlocked: readyRows.filter((row) => row.capacityBlocksLevel).length,
      projectedMonthlyNet: readyRows.reduce((sum, row) => sum + row.baseMonthlyNet, 0),
    },
    rows,
  }
}
