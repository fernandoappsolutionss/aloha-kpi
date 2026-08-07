'use server'

import { requireCentroAccess } from '../../lib/auth'
import { sql } from '../../lib/db'
import {
  briefingEligibility,
  growthWeekStart,
  recommendationStatusFor,
  snoozeUntilTomorrow,
} from '../../lib/growth/notifications.mjs'
import { calculateCentroGrowth } from '../../lib/growth/server'

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
  const topRecommendation = growth.recommendations.find((item) => item.status === 'pending')
    || growth.recommendations.find((item) => item.status === 'postponed')
    || null

  return {
    center: growth.center,
    snapshotDate: growth.snapshotDate,
    confidence: growth.metrics.confidence,
    currentChildren: growth.projection.currentChildren,
    nextLevel: growth.projection.nextLevel,
    nextMonth,
    weeklyInvitations: growth.projection.requirements.weeklyInvitations,
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
  return updated
}
