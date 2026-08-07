import test from 'node:test'
import assert from 'node:assert/strict'

import { buildGrowthRecommendations } from '../lib/growth/recommendations.mjs'

function input(overrides = {}) {
  return {
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
    ...overrides,
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
