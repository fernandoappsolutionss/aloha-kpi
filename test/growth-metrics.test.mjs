import test from 'node:test'
import assert from 'node:assert/strict'

import { buildGrowthMetrics, median, percentile } from '../lib/growth/metrics.mjs'

function month(index, overrides = {}) {
  const year = 2026
  const month = index + 1
  return {
    year,
    month,
    closed: true,
    ninos_inicio_mes: 100 + index,
    ninos_final_mes: 102 + index,
    grupos_activos: 12,
    nuevos_activos_mes: 8,
    ventas: 10,
    retiros: 6,
    reincorporados: 1,
    cp_invitados: 20,
    cp_asistieron: 10,
    cp_matriculados: 4,
    orig_referido: 2,
    orig_marketing: 4,
    orig_centro: 1,
    orig_activaciones: 1,
    orig_medios: 0,
    mot_tecnica: 1,
    mot_perdida_clase: 2,
    mot_economico: 1,
    mot_horario: 1,
    mot_graduado: 1,
    mot_otro: 0,
    ...overrides,
  }
}

test('median and percentile are deterministic for even and odd samples', () => {
  assert.equal(median([9, 1, 5]), 5)
  assert.equal(median([1, 3, 5, 7]), 4)
  assert.equal(percentile([1, 2, 3, 4, 5], 0.25), 2)
  assert.equal(percentile([], 0.75), 0)
})

test('builds weighted funnel rates and separates trial from non-trial sales', () => {
  const rows = [
    month(0, { ventas: 10, cp_invitados: 10, cp_asistieron: 5, cp_matriculados: 2 }),
    month(1, { ventas: 20, cp_invitados: 30, cp_asistieron: 15, cp_matriculados: 9 }),
  ]

  const metrics = buildGrowthMetrics(rows)

  assert.equal(metrics.rates.attendance, 0.5)
  assert.equal(metrics.rates.enrollment, 11 / 20)
  assert.equal(metrics.rates.inviteToEnrollment, 11 / 40)
  assert.equal(metrics.medians.sales, 15)
  assert.equal(metrics.medians.trialEnrollments, 5.5)
  assert.equal(metrics.medians.nonTrialSales, 9.5)
})

test('keeps total departures separate from real and controllable attrition', () => {
  const metrics = buildGrowthMetrics([
    month(0, {
      retiros: 10,
      mot_graduado: 2,
      mot_perdida_clase: 3,
      mot_tecnica: 2,
      mot_horario: 1,
      mot_economico: 2,
      mot_otro: 0,
    }),
  ])

  assert.equal(metrics.medians.withdrawals, 10)
  assert.equal(metrics.medians.realAttrition, 8)
  assert.equal(metrics.medians.controlledAttrition, 6)
  assert.equal(metrics.controls.attritionShare, 0.75)
})

test('reports controllable acquisition in count and share', () => {
  const metrics = buildGrowthMetrics([
    month(0, {
      orig_referido: 2,
      orig_centro: 3,
      orig_activaciones: 1,
      orig_marketing: 4,
    }),
  ])

  assert.equal(metrics.controls.acquisitionCount, 6)
  assert.equal(metrics.controls.acquisitionShare, 0.6)
})

test('keeps monthly medians for each controllable origin and attrition cause', () => {
  const metrics = buildGrowthMetrics([
    month(0, { orig_referido: 2, orig_centro: 4, orig_activaciones: 1, mot_perdida_clase: 3 }),
    month(1, { orig_referido: 4, orig_centro: 2, orig_activaciones: 3, mot_perdida_clase: 1 }),
  ])

  assert.deepEqual(metrics.originMedians, { referred: 3, center: 3, activations: 2 })
  assert.deepEqual(metrics.causeMedians, { classLoss: 2, technique: 1, schedule: 1 })
})

test('uses only closed months for historical baselines and treats zero as data', () => {
  const metrics = buildGrowthMetrics([
    month(0, { ventas: 0, nuevos_activos_mes: 0, retiros: 0 }),
    month(1, { ventas: 100, closed: false }),
  ])

  assert.equal(metrics.monthsUsed, 1)
  assert.equal(metrics.medians.sales, 0)
  assert.equal(metrics.medians.newActives, 0)
})

test('assigns high confidence with six complete months and dated pipeline', () => {
  const metrics = buildGrowthMetrics(
    Array.from({ length: 6 }, (_, i) => month(i)),
    { pipelineTotal: 10, pipelineDated: 10 },
  )

  assert.equal(metrics.confidence.level, 'high')
  assert.equal(metrics.confidence.months, 6)
  assert.equal(metrics.confidence.pipelineCoverage, 1)
  assert.ok(metrics.confidence.score >= 0.9)
})

test('assigns low confidence when history and pipeline dates are insufficient', () => {
  const metrics = buildGrowthMetrics(
    [month(0), month(1, { ninos_final_mes: null })],
    { pipelineTotal: 8, pipelineDated: 0 },
  )

  assert.equal(metrics.confidence.level, 'low')
  assert.ok(metrics.confidence.reasons.length > 0)
})

test('flags impossible funnel ordering without mutating the source rows', () => {
  const row = month(0, { cp_invitados: 5, cp_asistieron: 8, cp_matriculados: 9 })
  const original = structuredClone(row)
  const metrics = buildGrowthMetrics([row])

  assert.ok(metrics.issues.some((issue) => issue.code === 'invalid_funnel'))
  assert.deepEqual(row, original)
})
