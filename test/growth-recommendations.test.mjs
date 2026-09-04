import test from 'node:test'
import assert from 'node:assert/strict'

import { buildGrowthRecommendations } from '../lib/growth/recommendations.mjs'
import { projectGrowth } from '../lib/growth/projector.mjs'

function input(overrides = {}) {
  return {
    ...overrides,
    metrics: {
      medians: { invitations: 20, newActives: 8, realAttrition: 4 },
      rates: { attendance: 0.65, enrollment: 0.55, inviteToEnrollment: 0.36, activePerSale: 0.8 },
      controls: { acquisitionCount: 12, acquisitionShare: 0.5, attritionCount: 8, attritionShare: 0.6 },
      originMedians: { referred: 2, center: 3, activations: 1 },
      causeMedians: { classLoss: 4, technique: 2, schedule: 1 },
      confidence: { level: 'high', score: 0.95, reasons: [] },
      issues: [],
      ...overrides.metrics,
    },
    projection: {
      nextLevel: { level: 2, threshold: 200, gap: 30 },
      capacityMax: 240,
      requirements: { monthlyInvitations: 20, weeklyInvitations: 5, netChildrenPerMonth: 3 },
      scenarios: { action: { series: [] } },
      ...overrides.projection,
    },
  }
}

test('returns at most three auditable actions ordered by priority', () => {
  const recommendations = buildGrowthRecommendations(input())

  assert.ok(recommendations.length > 0)
  assert.ok(recommendations.length <= 3)
  assert.ok(recommendations.every((item) => item.reason && item.metric && item.target != null))
  assert.ok(recommendations.every((item, index) => index === 0 || item.priority <= recommendations[index - 1].priority))
})

test('puts data quality first when confidence is low', () => {
  const recommendations = buildGrowthRecommendations(input({
    metrics: {
      confidence: { level: 'low', score: 0.25, reasons: ['Faltan fechas de inicio en el pipeline.'] },
      issues: [{ code: 'invalid_funnel' }],
    },
  }))

  assert.equal(recommendations[0].kind, 'data_quality')
  assert.match(recommendations[0].reason, /fechas|datos|embudo/i)
})

test('turns the largest controllable attrition cause into a concrete action', () => {
  const recommendations = buildGrowthRecommendations(input())
  const classLoss = recommendations.find((item) => item.kind === 'class_loss')

  assert.ok(classLoss)
  assert.equal(classLoss.baseline, 4)
  assert.ok(classLoss.target < classLoss.baseline)
})

test('recommends the invitation volume required by the projection', () => {
  const recommendations = buildGrowthRecommendations(input({
    projection: {
      nextLevel: { level: 2, threshold: 200, gap: 30 },
      capacityMax: 240,
      requirements: { monthlyInvitations: 40, weeklyInvitations: 10, netChildrenPerMonth: 3 },
      scenarios: { action: { series: [] } },
    },
  }))
  const invitations = recommendations.find((item) => item.kind === 'invitations')

  assert.ok(invitations)
  assert.equal(invitations.baseline, 20)
  assert.equal(invitations.target, 40)
})

test('warns when current capacity cannot hold the next level', () => {
  const recommendations = buildGrowthRecommendations(input({
    projection: {
      nextLevel: { level: 2, threshold: 200, gap: 30 },
      capacityMax: 180,
      requirements: { monthlyInvitations: 20, weeklyInvitations: 5, netChildrenPerMonth: 3 },
      scenarios: { action: { series: [{ capacityLimited: true }] } },
    },
  }))

  assert.equal(recommendations[0].kind, 'capacity')
  assert.equal(recommendations[0].target, 200)
})

test('does not demand more capacity when the next level already fits', () => {
  const recommendations = buildGrowthRecommendations(input({
    projection: {
      capacityMax: 240,
      scenarios: { action: { series: [{ capacityLimited: true }] } },
    },
  }))
  assert.equal(recommendations.some((item) => item.kind === 'capacity'), false)
})

test('capacity reports available places rather than monthly growth', () => {
  const capacity = buildGrowthRecommendations(input({ projection: { capacityMax: 180 } }))
    .find((item) => item.kind === 'capacity')
  assert.equal(capacity.impactUnit, 'plazas')
  assert.equal(capacity.impactType, 'capacity')
  assert.equal(capacity.estimatedImpact, 20)
  assert.equal(capacity.observedImpact, null)
})

test('data quality describes the actual issue and preserves its period', () => {
  const recommendations = buildGrowthRecommendations(input({
    metrics: { issues: [{ code: 'missing_month', period: '2026-05', message: 'Falta el cierre de mayo de 2026.' }] },
  }))
  assert.equal(recommendations[0].kind, 'data_quality')
  assert.match(recommendations[0].reason, /Falta el cierre de mayo de 2026/)
  assert.doesNotMatch(recommendations[0].reason, /inconsistentes en el embudo/)
})

test('activation estimates depend on demonstrated sales to active conversion', () => {
  const activation = buildGrowthRecommendations(input({
    metrics: { originMedians: { activations: 0 }, rates: { attendance: 0.65, enrollment: 0.55, inviteToEnrollment: 0.36, activePerSale: 0.25 } },
  })).find((item) => item.kind === 'activations')
  assert.equal(activation.estimatedImpact, 0.5)
  assert.match(activation.assumption, /solapa|sumar/i)
})

test('zero sales to active conversion cannot promise acquisition growth', () => {
  const recommendations = buildGrowthRecommendations(input({
    metrics: { originMedians: { activations: 0 }, rates: { attendance: 0.4, enrollment: 0.2, inviteToEnrollment: 0.08, activePerSale: 0 } },
    projection: { requirements: { monthlyInvitations: 100, weeklyInvitations: 24 } },
  }))
  assert.equal(recommendations[0].kind, 'data_quality')
  for (const item of recommendations.filter((item) => ['activations', 'attendance', 'enrollment', 'invitations'].includes(item.kind))) {
    assert.equal(item.estimatedImpact, null)
    assert.equal(item.impactStatus, 'blocked')
  }
})

test('cards separate hypothetical impact from observation and expose the base window', () => {
  const recommendations = buildGrowthRecommendations(input({
    metrics: { monthsUsed: 6, window: { months: 6, startPeriod: '2026-03', endPeriod: '2026-08', periods: ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'] } },
  }))
  for (const item of recommendations) {
    assert.ok(item.assumption)
    assert.ok(item.formula)
    assert.ok(item.priorityExplanation)
    assert.equal(item.observedImpact, null)
    assert.equal(item.baseWindow.months, 6)
    assert.equal(item.baseWindow.startPeriod, '2026-03')
    assert.equal(item.baseWindow.endPeriod, '2026-08')
    assert.equal(item.responsible, 'Administradora')
    assert.ok(item.dueDays > 0)
  }
})

test('conversion targets retain display percentages and precise model ratios', () => {
  const enrollment = buildGrowthRecommendations(input({
    metrics: { rates: { attendance: 0.64, enrollment: 0.428, inviteToEnrollment: 0.274, activePerSale: 1 } },
    benchmarks: { enrollment: 0.9 },
  })).find((item) => item.kind === 'enrollment')
  assert.equal(enrollment.baseline, 42.8)
  assert.equal(enrollment.target, 90)
  assert.equal(enrollment.baselineRatio, 0.428)
  assert.equal(enrollment.targetRatio, 0.9)
})

test('changing generated enrollment target from 50% to 90% changes the actual action scenario', () => {
  const { metrics } = input({
    metrics: {
      medians: { invitations: 30, sales: 10, newActives: 9, withdrawals: 12, realAttrition: 10, graduates: 2, controlledAttrition: 7, nonTrialSales: 0 },
      rates: { attendance: 0.64, enrollment: 0.428, inviteToEnrollment: 0.27392, activePerSale: 1 },
      causeMedians: {}, originMedians: { activations: 2 },
      distributions: { newActives: [9, 9, 9], withdrawals: [12, 12, 12], realAttrition: [10, 10, 10], graduates: [2, 2, 2] },
    },
  })
  const parameters = { currentChildren: 168, currentPeriod: '2026-09', metrics }
  const projection = projectGrowth(parameters)
  const lower = buildGrowthRecommendations({ metrics, projection, benchmarks: { enrollment: 0.5 } })
  const higher = buildGrowthRecommendations({ metrics, projection, benchmarks: { enrollment: 0.9 } })
  assert.ok(lower.some((item) => item.kind === 'enrollment'))
  assert.ok(higher.some((item) => item.kind === 'enrollment'))
  const lowerPlan = projectGrowth({ ...parameters, interventions: lower })
  const higherPlan = projectGrowth({ ...parameters, interventions: higher })
  assert.ok(higherPlan.scenarios.action.monthlyNet > lowerPlan.scenarios.action.monthlyNet)
  assert.deepEqual(higherPlan.scenarios.base, lowerPlan.scenarios.base)
})

test('an invalid funnel shows acquisition impact as blocked instead of promising growth', () => {
  const recommendations = buildGrowthRecommendations(input({ metrics: {
    rates: { attendance: 0.64, enrollment: 0.4, inviteToEnrollment: 0.256, activePerSale: 1 },
    causeMedians: {}, originMedians: { activations: 0 },
    issues: [{ code: 'invalid_funnel', severity: 'error', message: 'Hay más matriculados que asistentes.' }],
  } }))
  const enrollment = recommendations.find((item) => item.kind === 'enrollment')
  assert.equal(enrollment.impactStatus, 'blocked')
  assert.equal(enrollment.estimatedImpact, null)
  assert.match(enrollment.assumption, /valid|inconsist|matriculados|asistentes/i)
})

test('a reconciled CP conflict does not block a supported acquisition hypothesis', () => {
  const enrollment = buildGrowthRecommendations(input({ metrics: {
    rates: { attendance: 0.64, enrollment: 0.4, inviteToEnrollment: 0.256, activePerSale: 1 },
    causeMedians: {}, originMedians: { activations: 2 },
    issues: [{ code: 'cp_enrollment_conflict', severity: 'warning', resolved: true, message: 'Se usan 8 matrículas operativas conciliadas.' }],
  } })).find((item) => item.kind === 'enrollment')
  assert.notEqual(enrollment.impactStatus, 'blocked')
  assert.ok(enrollment.estimatedImpact > 0)
})

test('a plausible fallback CP marks acquisition as provisional with the reason', () => {
  const enrollment = buildGrowthRecommendations(input({ metrics: {
    rates: { attendance: 0.64, enrollment: 0.4, inviteToEnrollment: 0.256, activePerSale: 1 },
    causeMedians: {}, originMedians: { activations: 2 },
    issues: [{ code: 'cp_classification_incomplete', severity: 'warning', message: 'Falta clasificar el origen de algunas matrículas.' }],
  } })).find((item) => item.kind === 'enrollment')
  assert.equal(enrollment.impactStatus, 'provisional')
  assert.match(enrollment.assumption, /provisional|clasificar/i)
  assert.ok(enrollment.estimatedImpact > 0)
})
