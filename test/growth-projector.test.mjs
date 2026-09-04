import test from 'node:test'
import assert from 'node:assert/strict'

import { nextCenterLevel, projectGrowth } from '../lib/growth/projector.mjs'
import { buildGrowthMetrics } from '../lib/growth/metrics.mjs'

function metrics(overrides = {}) {
  return {
    medians: {
      newActives: 10,
      realAttrition: 4,
      withdrawals: 4,
      controlledAttrition: 2,
      reincorporations: 1,
      nonTrialSales: 2,
      ...overrides.medians,
    },
    distributions: {
      newActives: [8, 9, 10, 10, 11, 12],
      realAttrition: [3, 4, 4, 4, 5, 6],
      reincorporations: [0, 1, 1, 1, 2, 2],
      ...overrides.distributions,
    },
    rates: {
      inviteToEnrollment: 0.25,
      activePerSale: 0.8,
      ...overrides.rates,
    },
    confidence: { level: 'high', score: 0.95, ...overrides.confidence },
  }
}

test('finds the next official center level using the quarterly thresholds', () => {
  assert.deepEqual(nextCenterLevel(169), { level: 1, threshold: 170, gap: 1 })
  assert.deepEqual(nextCenterLevel(170), { level: 2, threshold: 200, gap: 30 })
  assert.equal(nextCenterLevel(410), null)
})

test('uses dated pipeline as a floor without double counting the historical baseline', () => {
  const result = projectGrowth({
    currentChildren: 100,
    currentPeriod: '2026-08',
    metrics: metrics(),
    pipelineByMonth: { '2026-09': 6, '2026-10': 14 },
    horizonMonths: 2,
  })

  assert.equal(result.scenarios.base.series[0].scheduledStarts, 6)
  assert.equal(result.scenarios.base.series[0].newActives, 10)
  assert.equal(result.scenarios.base.series[1].scheduledStarts, 14)
  assert.equal(result.scenarios.base.series[1].newActives, 14)
})

test('reconciles the immediate month with announced departures and scheduled starts', () => {
  const result = projectGrowth({
    currentChildren: 100,
    currentPeriod: '2026-08',
    metrics: metrics(),
    pipelineByMonth: { '2026-09': 12 },
    nextMonthOperational: { scheduledStarts: 12, announcedDepartures: 5 },
    horizonMonths: 2,
  })

  const september = result.scenarios.base.series[0]
  assert.equal(september.newActives, 12)
  assert.equal(september.reincorporations, 0)
  assert.equal(september.withdrawals, 5)
  assert.equal(september.endChildren, 107)
})

test('caps growth at capacity and never projects a negative population', () => {
  const capped = projectGrowth({
    currentChildren: 100,
    currentPeriod: '2026-08',
    metrics: metrics({ medians: { newActives: 20, withdrawals: 0, realAttrition: 0, reincorporations: 0 } }),
    capacityMax: 105,
    horizonMonths: 1,
  })
  assert.equal(capped.scenarios.base.series[0].endChildren, 105)
  assert.equal(capped.scenarios.base.series[0].capacityLimited, true)

  const floored = projectGrowth({
    currentChildren: 3,
    currentPeriod: '2026-08',
    metrics: metrics({ medians: { newActives: 0, withdrawals: 10, realAttrition: 10, reincorporations: 0 } }),
    horizonMonths: 1,
  })
  assert.equal(floored.scenarios.base.series[0].endChildren, 0)
})

test('separates the month a threshold is reached from quarterly recognition', () => {
  const result = projectGrowth({
    currentChildren: 169,
    currentPeriod: '2026-01',
    metrics: metrics({
      medians: { newActives: 1, withdrawals: 0, realAttrition: 0, reincorporations: 0 },
      distributions: { newActives: [1, 1, 1], realAttrition: [0, 0, 0] },
    }),
    horizonMonths: 4,
  })

  assert.equal(result.scenarios.base.targetMonth, '2026-02')
  assert.equal(result.scenarios.base.recognitionQuarter, '2026-03')
})

test('does not publish an ETA with low confidence or non-positive growth', () => {
  const lowConfidence = projectGrowth({
    currentChildren: 160,
    currentPeriod: '2026-08',
    metrics: metrics({ confidence: { level: 'low', score: 0.3 } }),
  })
  assert.equal(lowConfidence.scenarios.base.targetMonth, null)
  assert.equal(lowConfidence.scenarios.base.etaReason, 'low_confidence')

  const shrinking = projectGrowth({
    currentChildren: 160,
    currentPeriod: '2026-08',
    metrics: metrics({ medians: { newActives: 2, withdrawals: 5, realAttrition: 5, reincorporations: 0 } }),
  })
  assert.equal(shrinking.scenarios.base.targetMonth, null)
  assert.equal(shrinking.scenarios.base.etaReason, 'non_positive_growth')
})

test('calculates the monthly and weekly invitations required for a 12 month action plan', () => {
  const result = projectGrowth({
    currentChildren: 170,
    currentPeriod: '2026-08',
    metrics: metrics(),
    actionHorizonMonths: 12,
  })

  assert.equal(result.nextLevel.threshold, 200)
  assert.equal(result.requirements.netChildrenPerMonth, 3)
  assert.equal(result.requirements.monthlyInvitations, 22)
  assert.equal(result.requirements.weeklyInvitations, 6)
})

test('graduates leave the active stock and no interventions means action equals base', () => {
  const result = projectGrowth({ currentChildren: 168, currentPeriod: '2026-09', metrics: metrics({ medians: { newActives: 10, withdrawals: 10, realAttrition: 0, reincorporations: 0 } }) })
  assert.equal(result.scenarios.base.series[0].endChildren, 168)
  assert.deepEqual(result.scenarios.action, result.scenarios.base)
  assert.equal(result.scenarios.base.series.length, 12)
})

test('capacity cannot erase existing children and flows always balance', () => {
  const result = projectGrowth({ currentChildren: 168, currentPeriod: '2026-09', capacityMax: 150, metrics: metrics({ medians: { newActives: 0, withdrawals: 0, reincorporations: 0 } }) })
  assert.equal(result.scenarios.base.series[0].endChildren, 168)
  for (const row of result.scenarios.base.series) assert.ok(Math.abs(row.endChildren - (row.startChildren + row.newActives + row.reincorporations - row.withdrawals)) < 0.11)
})

test('adverse scenario takes linked observed flows and scales departures with population', () => {
  const m = metrics()
  m.months = [
    { year: 2026, month: 1, startChildren: 100, newActives: 2, withdrawals: 3, reincorporations: 0 },
    { year: 2026, month: 2, startChildren: 100, newActives: 20, withdrawals: 21, reincorporations: 0 },
    { year: 2026, month: 3, startChildren: 100, newActives: 30, withdrawals: 30, reincorporations: 0 },
  ]
  const result = projectGrowth({ currentChildren: 100, currentPeriod: '2026-09', metrics: m })
  const rows = result.scenarios.conservative.series
  assert.equal(rows[0].endChildren, 99)
  assert.ok(rows[3].withdrawals < rows[0].withdrawals)
  assert.equal(result.scenarios.conservative.monthlyNet, -1)
})

test('combines funnel objectives once and does not add overlapping activation conversions', () => {
  const m = metrics({ medians: { newActives: 10, withdrawals: 0, reincorporations: 0, invitations: 40 }, rates: { attendance: 0.5, enrollment: 0.5, activePerSale: 1 } })
  const result = projectGrowth({ currentChildren: 100, currentPeriod: '2026-09', metrics: m, interventions: [
    { kind: 'invitations', baseline: 40, target: 80 },
    { kind: 'attendance', baseline: 50, target: 75 },
    { kind: 'enrollment', baseline: 50, target: 50 },
    { kind: 'activations', baseline: 0, target: 3 },
  ] })
  assert.equal(result.scenarios.action.series[0].newActives, 30)
  assert.ok(result.appliedInterventions.every((i) => i.evidence === 'hypothesis'))
})

test('dismissed and postponed interventions have no modeled impact; completed remains hypothesis', () => {
  const base = { currentChildren: 100, currentPeriod: '2026-09', metrics: metrics() }
  const ignored = projectGrowth({ ...base, interventions: [{ kind: 'class_loss', baseline: 2, target: 0, status: 'dismissed' }, { kind: 'technique', baseline: 2, target: 0, status: 'postponed' }] })
  assert.deepEqual(ignored.scenarios.action, ignored.scenarios.base)
  const done = projectGrowth({ ...base, interventions: [{ kind: 'class_loss', baseline: 2, target: 1, status: 'completed' }] })
  assert.equal(done.appliedInterventions[0].evidence, 'hypothesis')
  assert.ok(done.scenarios.action.series[0].withdrawals < done.scenarios.base.series[0].withdrawals)
})

test('separates commercial sales target from minimum for level without inventing zero conversions', () => {
  const result = projectGrowth({ currentChildren: 168, currentPeriod: '2026-09', metrics: metrics(), monthlySalesTarget: 20 })
  assert.equal(result.requirements.commercial.monthlySalesTarget, 20)
  assert.ok(result.requirements.commercial.monthlyInvitations > result.requirements.minimumForLevel.monthlyInvitations)
  const unknown = projectGrowth({ currentChildren: 168, currentPeriod: '2026-09', metrics: metrics({ rates: { activePerSale: 0 } }), monthlySalesTarget: 20 })
  assert.equal(unknown.requirements.minimumForLevel.monthlyInvitations, null)
  assert.deepEqual(unknown.scenarios.action, unknown.scenarios.base)
})

test('retention cannot count graduates as avoidable and invalid funnels cannot produce acquisition gains', () => {
  const m = metrics({ medians: { newActives: 10, withdrawals: 10, realAttrition: 2, reincorporations: 0, invitations: 40 }, rates: { attendance: 0.5, enrollment: 0.5, activePerSale: 1 } })
  m.issues = [{ code: 'cp_enrollment_conflict' }]
  const r = projectGrowth({ currentChildren: 100, currentPeriod: '2026-09', metrics: m, interventions: [
    { kind: 'class_loss', baseline: 20, target: 0 }, { kind: 'invitations', baseline: 40, target: 100 },
  ] })
  assert.equal(r.scenarios.action.series[0].newActives, 10)
  assert.equal(r.scenarios.action.series[0].withdrawals, 8)
})

test('resolved classification warnings retain the conditional acquisition curve', () => {
  const m = metrics({ medians: { newActives: 10, withdrawals: 0, reincorporations: 0, invitations: 40 }, rates: { attendance: 0.5, enrollment: 0.5, activePerSale: 1 } })
  m.issues = [{ code: 'cp_enrollment_conflict', severity: 'warning', resolved: true }, { code: 'cp_classification_incomplete', severity: 'warning' }]
  const r = projectGrowth({ currentChildren: 100, currentPeriod: '2026-09', metrics: m, interventions: [{ kind: 'invitations', baseline: 40, target: 80 }] })
  assert.equal(r.scenarios.action.series[0].newActives, 20)
  assert.equal(r.acquisitionModel.provisional, true)
})
