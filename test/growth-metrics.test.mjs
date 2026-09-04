import test from 'node:test'
import assert from 'node:assert/strict'

import { buildGrowthMetrics, median, percentile } from '../lib/growth/metrics.mjs'
import * as growthMetrics from '../lib/growth/metrics.mjs'

function month(index, overrides = {}) {
  const year = 2026
  const month = index + 1
  return {
    year,
    month,
    closed: true,
    ninos_inicio_mes: 100 + index * 3,
    ninos_final_mes: 103 + index * 3,
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

test('uses six calendar months before currentPeriod and reports open months as gaps', () => {
  const rows = Array.from({ length: 8 }, (_, i) => month(i, { closed: i !== 4 }))
  const metrics = buildGrowthMetrics(rows, { currentPeriod: '2026-09' })
  assert.deepEqual(metrics.months.map((m) => m.month), [3, 4, 6, 7, 8])
  assert.deepEqual(metrics.window.missingPeriods, ['2026-05'])
  assert.equal(metrics.confidence.level, 'medium')
})

test('calendar window excludes present and future rows and derives fallback from latest month', () => {
  const rows = Array.from({ length: 8 }, (_, i) => month(i))
  assert.deepEqual(buildGrowthMetrics(rows, { currentPeriod: '2026-07' }).months.map((m) => m.month), [1, 2, 3, 4, 5, 6])
  assert.equal(buildGrowthMetrics(rows).monthsUsed, 6)
})

test('invalid funnel, stock imbalance and external quality issues force low confidence', () => {
  const rows = Array.from({ length: 6 }, (_, i) => month(i))
  for (const changed of [
    rows.map((r, i) => i === 2 ? { ...r, cp_asistieron: 30 } : r),
    rows.map((r, i) => i === 2 ? { ...r, ninos_final_mes: 999 } : r),
  ]) {
    const metrics = buildGrowthMetrics(changed)
    assert.equal(metrics.confidence.level, 'low')
    assert.ok(metrics.issues.length)
  }
  const metrics = buildGrowthMetrics(rows, { issues: [{ code: 'population_mismatch', message: 'Diferencia de población.' }] })
  assert.equal(metrics.confidence.level, 'low')
  assert.equal(metrics.precision.status, 'unvalidated')
  assert.equal(metrics.quality.kind, 'data_quality')
})

test('checks continuity only across adjacent calendar months', () => {
  const rows = [month(0), month(1, { ninos_inicio_mes: 200, ninos_final_mes: 203 }), month(3)]
  const metrics = buildGrowthMetrics(rows)
  assert.equal(metrics.issues.filter((i) => i.code === 'stock_discontinuity').length, 1)
})

test('retains source quality issues only from the selected calendar window', () => {
  const rows = Array.from({ length: 8 }, (_, i) => month(i))
  rows[0].issues = [{ code: 'old_conflict', message: 'Conflicto antiguo.' }]
  rows[7].issues = [{ code: 'cp_enrollment_conflict', message: 'Matrícula declarada y derivada difieren.', severity: 'warning' }]
  const result = buildGrowthMetrics(rows, { currentPeriod: '2026-09' })
  assert.ok(!result.issues.some((issue) => issue.code === 'old_conflict'))
  assert.ok(result.issues.some((issue) => issue.code === 'cp_enrollment_conflict'))
  assert.equal(result.confidence.level, 'low')
  assert.ok(result.confidence.score < 0.5)
})

test('an unresolved open month balance is not hidden by filtering closed rows', () => {
  const rows = Array.from({ length: 6 }, (_, i) => month(i))
  rows[4] = { ...rows[4], closed: false, ninos_final_mes: 150 }
  rows[5] = { ...rows[5], ninos_inicio_mes: 163, ninos_final_mes: 166 }
  const result = buildGrowthMetrics(rows, { currentPeriod: '2026-07' })
  assert.equal(result.confidence.level, 'low')
  assert.ok(result.issues.some((issue) => issue.code === 'open_month_discontinuity'))
})

test('resolved trial corrections and legacy classification gaps permit provisional acquisition hypotheses', () => {
  assert.equal(typeof growthMetrics.acquisitionModelStatus, 'function')
  const result = growthMetrics.acquisitionModelStatus({ rates: { activePerSale: 0.8, attendance: 0.5, enrollment: 0.5 }, issues: [
    { code: 'cp_classification_incomplete', severity: 'warning', message: 'Clasificación incompleta.' },
    { code: 'cp_enrollment_conflict', severity: 'warning', resolved: true, message: 'Se usa el conteo clasificado.' },
  ] })
  assert.equal(result.blocked, false)
  assert.equal(result.provisional, true)
  assert.ok(result.reasons.length)
  assert.equal(growthMetrics.acquisitionModelStatus({ rates: { activePerSale: 1, attendance: 2 }, issues: [] }).blocked, true)
})
