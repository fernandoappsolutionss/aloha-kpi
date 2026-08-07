import test from 'node:test'
import assert from 'node:assert/strict'

import { nextCenterLevel, projectGrowth } from '../lib/growth/projector.mjs'

function metrics(overrides = {}) {
  return {
    medians: {
      newActives: 10,
      realAttrition: 4,
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
    metrics: metrics({ medians: { newActives: 20, realAttrition: 0, reincorporations: 0 } }),
    capacityMax: 105,
    horizonMonths: 1,
  })
  assert.equal(capped.scenarios.base.series[0].endChildren, 105)
  assert.equal(capped.scenarios.base.series[0].capacityLimited, true)

  const floored = projectGrowth({
    currentChildren: 3,
    currentPeriod: '2026-08',
    metrics: metrics({ medians: { newActives: 0, realAttrition: 10, reincorporations: 0 } }),
    horizonMonths: 1,
  })
  assert.equal(floored.scenarios.base.series[0].endChildren, 0)
})

test('separates the month a threshold is reached from quarterly recognition', () => {
  const result = projectGrowth({
    currentChildren: 169,
    currentPeriod: '2026-01',
    metrics: metrics({
      medians: { newActives: 1, realAttrition: 0, reincorporations: 0 },
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
    metrics: metrics({ medians: { newActives: 2, realAttrition: 5, reincorporations: 0 } }),
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
  assert.equal(result.requirements.monthlyInvitations, 20)
  assert.equal(result.requirements.weeklyInvitations, 5)
})
