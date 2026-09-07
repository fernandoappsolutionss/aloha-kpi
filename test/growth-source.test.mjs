import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildGrowthHistory,
  buildOperationalGrowth,
  currentPopulationFromHistory,
  selectCurrentPopulation,
} from '../lib/growth/source.mjs'

test('joins monthly summaries with declared sales, withdrawals and close state', () => {
  const history = buildGrowthHistory({
    summaries: [
      { year: 2026, month: 2, ninos_final_mes: 110 },
      { year: 2026, month: 1, ninos_final_mes: 105 },
    ],
    states: [
      { year: 2026, month: 1, estado: 'cerrado' },
      { year: 2026, month: 2, estado: 'abierto' },
    ],
    weekly: [
      { year: 2026, month: 1, nuevos_ingresos_venta: 9, total_desercion: 4 },
      { year: 2026, month: 2, nuevos_ingresos_venta: 12, total_desercion: 3 },
    ],
    reincorporations: [{ year: 2026, month: 1, total: 2 }],
  })

  assert.deepEqual(history.map((row) => [row.month, row.closed, row.ventas, row.retiros, row.reincorporados]), [
    [1, true, 9, 4, 2],
    [2, false, 12, 3, 0],
  ])
})

test('separates current children, announced departures and future class starts', () => {
  const result = buildOperationalGrowth({
    today: '2026-08-07',
    groups: [
      { id: 1, estado: 'activo', fecha_inicio_clases: '2026-08-01' },
      { id: 2, estado: 'activo', fecha_inicio_clases: '2026-09-10' },
    ],
    students: [
      { id: 1, grupo_id: 1, estado: 'activo', fecha_inscripcion: '2026-07-20' },
      { id: 2, grupo_id: 1, estado: 'baja_potencial', fecha_inscripcion: '2026-07-21' },
      { id: 3, grupo_id: 2, estado: 'activo', fecha_inscripcion: '2026-08-02' },
      { id: 4, grupo_id: null, estado: 'activo', fecha_inscripcion: null },
      { id: 5, grupo_id: 1, estado: 'retirado', fecha_inscripcion: '2026-07-20' },
      { id: 6, grupo_id: null, estado: 'activo', fecha_inscripcion: null, created_at: '2026-08-05T12:00:00Z' },
    ],
    events: [
      { id: 1, estudiante_id: 1, tipo: 'inscripcion', fecha: '2026-07-20', a_grupo_id: 1 },
      { id: 2, estudiante_id: 2, tipo: 'inscripcion', fecha: '2026-07-21', a_grupo_id: 1 },
      { id: 3, estudiante_id: 3, tipo: 'inscripcion', fecha: '2026-08-02', a_grupo_id: 2 },
      { id: 4, estudiante_id: 5, tipo: 'retiro', fecha: '2026-08-05', de_grupo_id: 1 },
    ],
    salons: [{ id: 1, activo: true }, { id: 2, activo: true }, { id: 3, activo: false }],
  })

  assert.equal(result.currentPeriod, '2026-08')
  assert.equal(result.currentChildren, 3)
  assert.equal(result.announcedDepartures, 1)
  assert.deepEqual(result.pipelineByMonth, { '2026-09': 1 })
  assert.equal(result.pipelineTotal, 1)
  assert.equal(result.pipelineDated, 1)
  assert.equal(result.undatedStarts, 1)
  assert.equal(result.pipelineTotalWithUndated, 2)
  assert.equal(result.currentMonthStarts, 3)
  assert.equal(result.currentMonthWithdrawals, 1)
  assert.equal(result.capacityMax, null)
  assert.equal(result.nextMonthOperational.scheduledStarts, 1)
  assert.equal(result.nextMonthOperational.announcedDepartures, 0)
})

test('uses the declared monthly population even when the operational roster looks complete', () => {
  assert.deepEqual(selectCurrentPopulation({
    operationalChildren: 4,
    trackedPopulation: 5,
    latestSummaryChildren: 100,
  }), {
    currentChildren: 100,
    source: 'monthly_summary_fallback',
    coverage: 0.05,
  })

  assert.deepEqual(selectCurrentPopulation({
    operationalChildren: 92,
    trackedPopulation: 96,
    latestSummaryChildren: 100,
  }), {
    currentChildren: 100,
    source: 'monthly_kpi',
    coverage: 0.96,
  })

  assert.deepEqual(selectCurrentPopulation({
    operationalChildren: 5,
    trackedPopulation: 5,
    latestSummaryChildren: 0,
  }), {
    currentChildren: 0,
    source: 'monthly_summary_fallback',
    coverage: 0,
  })
})

test('calculates the current population from the previous close and live movements', () => {
  const history = buildGrowthHistory({
    summaries: [
      { year: 2026, month: 7, ninos_inicio_mes: 135, ninos_final_mes: 122, nuevos_activos_mes: 0 },
      { year: 2026, month: 8, ninos_inicio_mes: 122, ninos_final_mes: 115, nuevos_activos_mes: 1 },
    ],
    states: [
      { year: 2026, month: 7, estado: 'cerrado' },
      { year: 2026, month: 8, estado: 'abierto' },
    ],
    weekly: [
      { year: 2026, month: 8, nuevos_ingresos_venta: 0, total_desercion: 0 },
    ],
  })

  assert.equal(currentPopulationFromHistory(history, {
    currentPeriod: '2026-08',
    currentMonthStarts: 1,
    currentMonthWithdrawals: 8,
  }), 115)
})

test('calculates an open month even before its first KPI row exists', () => {
  const history = buildGrowthHistory({
    summaries: [
      { year: 2026, month: 7, ninos_inicio_mes: 135, ninos_final_mes: 122, nuevos_activos_mes: 0 },
    ],
    states: [{ year: 2026, month: 7, estado: 'cerrado' }],
  })

  assert.equal(currentPopulationFromHistory(history, {
    currentPeriod: '2026-08',
    currentMonthStarts: 1,
    currentMonthWithdrawals: 8,
  }), 115)
})

test('does not extrapolate population across a missing month', () => {
  const history = buildGrowthHistory({
    summaries: [{ year: 2026, month: 6, ninos_final_mes: 135 }],
    states: [{ year: 2026, month: 6, estado: 'cerrado' }],
  })

  assert.equal(currentPopulationFromHistory(history, {
    currentPeriod: '2026-08',
    currentMonthStarts: 1,
    currentMonthWithdrawals: 8,
  }), null)
})

test('counts a declared withdrawal when its date is null', () => {
  const result = buildOperationalGrowth({
    today: '2026-08-07',
    students: [{ id: 1, grupo_id: null, estado: 'retirado', fecha_inscripcion: '2026-01-10' }],
    events: [{ id: 1, estudiante_id: 1, tipo: 'retiro', fecha: null, year: 2026, month: 8 }],
  })

  assert.equal(result.currentMonthWithdrawals, 1)
})

test('does not subtract a sale cancelled before its class start', () => {
  const result = buildOperationalGrowth({
    today: '2026-08-07',
    groups: [{ id: 10, estado: 'activo', fecha_inicio_clases: '2026-09-15' }],
    students: [{ id: 1, grupo_id: 10, estado: 'retirado', fecha_inscripcion: '2026-06-03' }],
    events: [
      { id: 1, estudiante_id: 1, tipo: 'inscripcion', fecha: '2026-06-03', a_grupo_id: 10 },
      { id: 2, estudiante_id: 1, tipo: 'retiro', fecha: '2026-08-01', year: 2026, month: 8 },
    ],
  })

  assert.equal(result.currentMonthStarts, 0)
  assert.equal(result.currentMonthWithdrawals, 0)
})

test('separates starts already reached from the remaining month without hiding its pipeline', () => {
  const result = buildOperationalGrowth({
    today: '2026-09-03',
    groups: [{ id: 1, estado: 'activo', fecha_inicio_clases: '2026-01-01' }],
    students: [
      { id: 1, grupo_id: 1, estado: 'activo', fecha_inscripcion: '2026-09-03' },
      { id: 2, grupo_id: 1, estado: 'activo', fecha_inscripcion: '2026-09-30' },
      { id: 3, grupo_id: 1, estado: 'activo', fecha_inscripcion: '2026-10-01' },
    ],
  })
  assert.equal(result.todayChildren, 1)
  assert.equal(result.expectedMonthEndChildren, 2)
  assert.equal(result.currentMonthStartsToDate, 1)
  assert.equal(result.currentMonthStarts, 2)
  assert.equal(result.remainingMonthStarts, 1)
  assert.deepEqual(result.pipeline.map((row) => row.fechaInicio), ['2026-09-30', '2026-10-01'])
  assert.deepEqual(result.pipelineByMonth, { '2026-09': 1, '2026-10': 1 })
  assert.equal(result.trackedPopulation, 3)
  assert.equal(result.nextMonthOperational.scheduledStarts, 1)
})

test('uses dated withdrawals once and never schedules an undated potential departure next month', () => {
  const result = buildOperationalGrowth({
    today: '2026-09-03',
    students: [
      { id: 1, estado: 'baja_potencial', fecha_inscripcion: '2026-01-01', retiro_programado_para: '2026-09-20' },
      { id: 2, estado: 'baja_potencial', fecha_inscripcion: '2026-01-01', retiro_programado_para: '2026-10-01' },
      { id: 3, estado: 'baja_potencial', fecha_inscripcion: '2026-01-01', retiro_programado_para: null },
      { id: 4, estado: 'retirado', fecha_inscripcion: '2026-01-01', retiro_programado_para: '2026-09-20' },
    ],
    events: [{ id: 1, estudiante_id: 4, tipo: 'retiro', year: 2026, month: 9, fecha: '2026-09-20' }],
  })
  assert.equal(result.currentMonthWithdrawals, 1)
  assert.equal(result.currentMonthWithdrawalsToDate, 0)
  assert.equal(result.scheduledWithdrawalsRemainingMonth, 1)
  assert.equal(result.remainingMonthWithdrawals, 2)
  assert.equal(result.nextMonthOperational.announcedDepartures, 1)
  assert.equal(result.undatedAnnouncedDepartures, 1)
})

test('a scheduled cancellation before the first class neither withdraws population nor enters a later pipeline', () => {
  const result = buildOperationalGrowth({
    today: '2026-09-03',
    groups: [{ id: 1, estado: 'activo', fecha_inicio_clases: '2026-11-15' }],
    students: [{ id: 1, grupo_id: 1, estado: 'baja_potencial', fecha_inscripcion: '2026-09-02', retiro_programado_para: '2026-10-01' }],
    events: [{ id: 1, estudiante_id: 1, tipo: 'inscripcion', fecha: '2026-09-02', year: 2026, month: 9, a_grupo_id: 1 }],
  })
  assert.equal(result.nextMonthOperational.announcedDepartures, 0)
  assert.equal(result.nextMonthOperational.scheduledStarts, 0)
  assert.equal(result.pipelineTotal, 0)
  assert.deepEqual(result.pipelineByMonth, {})
})

test('a cancellation before a start in the remaining month does not inflate the expected close', () => {
  const result = buildOperationalGrowth({
    today: '2026-09-03',
    groups: [{ id: 1, estado: 'activo', fecha_inicio_clases: '2026-09-20' }],
    students: [{ id: 1, grupo_id: 1, estado: 'baja_potencial', fecha_inscripcion: '2026-09-02', retiro_programado_para: '2026-09-10' }],
    events: [{ id: 1, estudiante_id: 1, tipo: 'inscripcion', fecha: '2026-09-02', year: 2026, month: 9, a_grupo_id: 1 }],
  })
  assert.equal(result.remainingMonthStarts, 0)
  assert.equal(result.currentMonthStarts, 0)
  assert.equal(result.expectedMonthWithdrawals, 0)
  assert.equal(result.expectedMonthEndChildren, 0)
  assert.equal(result.pipelineTotal, 0)
})

test('a scheduled withdrawal of a new sale without a class assignment cannot subtract active population', () => {
  const result = buildOperationalGrowth({
    today: '2026-09-03',
    students: [{ id: 1, grupo_id: null, estado: 'baja_potencial', fecha_inscripcion: '2026-09-02', created_at: '2026-09-02', retiro_programado_para: '2026-10-01' }],
    events: [{ id: 1, estudiante_id: 1, tipo: 'inscripcion', fecha: '2026-09-02', year: 2026, month: 9, a_grupo_id: null }],
  })
  assert.equal(result.todayChildren, 0)
  assert.equal(result.nextMonthOperational.announcedDepartures, 0)
})

test('assigns movements to their effective date and reports dates missing from a monthly declaration', () => {
  const result = buildOperationalGrowth({
    today: '2026-09-03',
    students: [
      { id: 1, estado: 'retirado', fecha_inscripcion: '2026-01-01' },
      { id: 2, estado: 'retirado', fecha_inscripcion: '2026-01-01' },
    ],
    events: [
      { id: 1, estudiante_id: 1, tipo: 'retiro', fecha: '2026-09-02', year: 2026, month: 8 },
      { id: 2, estudiante_id: 2, tipo: 'retiro', fecha: null, year: 2026, month: 9 },
      { id: 3, estudiante_id: 1, tipo: 'reincorporacion', fecha: '2026-09-15', year: 2026, month: 9 },
      { id: 4, estudiante_id: 2, tipo: 'reincorporacion', fecha: '2026-09-01', year: 2026, month: 9 },
    ],
  })
  assert.equal(result.currentMonthWithdrawals, 2)
  assert.equal(result.currentMonthWithdrawalsToDate, 1)
  assert.equal(result.currentMonthWithdrawalsUndated, 1)
  assert.equal(result.currentMonthReincorporations, 2)
  assert.equal(result.currentMonthReincorporationsToDate, 1)
  assert.equal(result.remainingMonthReincorporations, 1)
  assert.ok(result.issues.some((issue) => issue.code === 'movement_period_mismatch'))
  assert.ok(result.issues.some((issue) => issue.code === 'undated_movements'))
})

test('distinct same-day lifecycle events survive while a repeated event id is counted once', () => {
  const events = [
    { id: 11, estudiante_id: 1, tipo: 'reincorporacion', fecha: '2026-09-03', year: 2026, month: 9 },
    { id: 12, estudiante_id: 1, tipo: 'retiro', fecha: '2026-09-03', year: 2026, month: 9 },
    { id: 13, estudiante_id: 1, tipo: 'reincorporacion', fecha: '2026-09-03', year: 2026, month: 9 },
  ]
  const result = buildOperationalGrowth({
    today: '2026-09-03',
    students: [{ id: 1, estado: 'activo', fecha_inscripcion: '2026-01-01' }],
    events: [...events, events[2]],
  })
  assert.equal(result.currentMonthReincorporations, 2)
  assert.equal(result.currentMonthReincorporationsToDate, 2)
  assert.equal(result.currentMonthWithdrawals, 1)
  assert.equal(result.currentMonthReincorporationsToDate - result.currentMonthWithdrawalsToDate, 1)
})

test('reports active records in blocked groups without silently changing the official balance', () => {
  const result = buildOperationalGrowth({
    today: '2026-09-03',
    groups: [{ id: 1, estado: 'fusionado' }, { id: 2, estado: 'cerrado' }],
    students: [
      { id: 1, grupo_id: 1, estado: 'activo', fecha_inscripcion: '2026-01-01' },
      { id: 2, grupo_id: 2, estado: 'activo', fecha_inscripcion: '2026-01-01' },
    ],
  })
  assert.equal(result.todayChildren, 0)
  assert.equal(result.reconciliation.activeInBlockedGroups, 2)
  assert.deepEqual(result.reconciliation.blockedGroupStudentIds, [1, 2])
  assert.ok(result.issues.some((issue) => issue.code === 'active_students_in_blocked_groups'))
  assert.equal(selectCurrentPopulation({ operationalChildren: 0, trackedPopulation: 0, latestSummaryChildren: 2 }).currentChildren, 2)
})

test('room counts never become a hard population cap and group places remain an explicit estimate', () => {
  const result = buildOperationalGrowth({
    today: '2026-09-03',
    groupCapacity: 15,
    salons: [{ id: 1, activo: true }, { id: 2, activo: true }, { id: 3, activo: true }],
    groups: [{ id: 1, estado: 'activo' }, { id: 2, estado: 'activo' }, { id: 3, estado: 'fusionado' }],
  })
  assert.equal(result.capacityMax, null)
  assert.equal(result.capacityEstimate.total, 30)
  assert.equal(result.capacityEstimate.perGroup, 15)
  assert.equal(result.capacityEstimate.verified, false)
  assert.ok(result.issues.some((issue) => issue.code === 'capacity_unverified'))
})

test('reconciles a closed trial funnel only with fully covered canonical sales and retains the declared value', () => {
  const summaries = [{ year: 2026, month: 8, cp_matriculados: 10 }]
  const students = Array.from({ length: 10 }, (_, index) => ({ id: index + 1 }))
  const events = students.map((student, index) => ({
    id: index + 1, estudiante_id: student.id, tipo: 'inscripcion', fecha: '2026-08-02', year: 2026, month: 8,
    origen: index < 8 ? 'clase_prueba' : 'directo',
  }))
  // A duplicate inscription in another month must not inflate coverage.
  events.push({ ...events[0], id: 99, fecha: '2026-09-01', month: 9 })
  const [row] = buildGrowthHistory({ summaries, students, events,
    states: [{ year: 2026, month: 8, estado: 'cerrado' }],
    weekly: [{ year: 2026, month: 8, ventas: 10 }],
  })
  assert.equal(row.cp_matriculados, 8)
  assert.equal(row.cp_matriculados_declared, 10)
  assert.equal(summaries[0].cp_matriculados, 10)
  assert.equal(row.trialFunnel.coverage, 1)
  assert.equal(row.trialFunnel.reliable, true)
  assert.equal(row.trialFunnel.source, 'classified_sales')
  assert.ok(row.issues.some((issue) => issue.code === 'cp_enrollment_conflict'))
})

test('partial sales imports never replace the declared historical trial funnel', () => {
  const [row] = buildGrowthHistory({
    summaries: [{ year: 2026, month: 8, cp_matriculados: 10 }],
    states: [{ year: 2026, month: 8, estado: 'cerrado' }],
    weekly: [{ year: 2026, month: 8, ventas: 10 }],
    events: [{ id: 1, estudiante_id: 1, tipo: 'inscripcion', fecha: '2026-08-02', year: 2026, month: 8, origen: 'clase_prueba' }],
  })
  assert.equal(row.cp_matriculados, 10)
  assert.equal(row.trialFunnel.coverage, 0.1)
  assert.equal(row.trialFunnel.reliable, false)
  assert.equal(row.trialFunnel.source, 'declared_summary')
  assert.equal(row.issues.some((issue) => issue.code === 'cp_classification_incomplete'), false)
})

test('individual enrollment coverage is required from September 2026, without requesting historical backfills', () => {
  const periods = [[2025, 9], [2026, 7], [2026, 8], [2026, 9], [2026, 10], [2027, 1]]
  const summaries = periods.map(([year, month]) => ({
    year, month, cp_matriculados: 4, orig_marketing: 3, orig_referido: 1,
  }))
  const rows = buildGrowthHistory({
    summaries,
    states: periods.map(([year, month]) => ({ year, month, estado: 'cerrado' })),
    weekly: periods.map(([year, month]) => ({ year, month, ventas: 4 })),
  })
  assert.deepEqual(rows.flatMap((row) => row.issues
    .filter((issue) => issue.code === 'cp_classification_incomplete')
    .map((issue) => issue.period)), ['2026-09', '2026-10', '2027-01'])
  for (const row of rows) {
    assert.equal(row.ventas, 4)
    assert.equal(row.cp_matriculados, 4)
    assert.equal(row.orig_marketing, 3)
    assert.equal(row.orig_referido, 1)
    assert.equal(row.trialFunnel.reliable, false, 'legacy exemption must not claim individual coverage exists')
    assert.equal(row.trialFunnel.source, 'declared_summary')
  }
})

test('September enrollment warning clears when each sale has a linked and classified enrollment', () => {
  const students = [{ id: 1 }, { id: 2 }]
  const input = {
    summaries: [{ year: 2026, month: 9, cp_matriculados: 1 }],
    states: [{ year: 2026, month: 9, estado: 'cerrado' }],
    weekly: [{ year: 2026, month: 9, ventas: 2 }],
    students,
    events: students.map((student, index) => ({
      id: index + 1, estudiante_id: student.id, tipo: 'inscripcion',
      fecha: '2026-09-01', year: 2026, month: 9,
      origen: index === 0 ? 'clase_prueba' : null,
    })),
  }
  const [pending] = buildGrowthHistory(input)
  assert.ok(pending.issues.some((issue) => issue.code === 'cp_classification_incomplete'))
  const [complete] = buildGrowthHistory({ ...input,
    events: input.events.map((event) => ({ ...event, origen: event.origen || 'directo' })),
  })
  assert.equal(complete.issues.some((issue) => issue.code === 'cp_classification_incomplete'), false)
  assert.equal(complete.trialFunnel.reliable, true)
  assert.equal(complete.cp_matriculados, 1)

  const [empty] = buildGrowthHistory({
    summaries: [{ year: 2026, month: 9, cp_matriculados: 0 }],
    weekly: [{ year: 2026, month: 9, ventas: 0 }],
  })
  assert.equal(empty.issues.length, 0, 'a zero-sale month has no enrollments to link')
})
