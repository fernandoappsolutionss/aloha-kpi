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
  assert.equal(result.capacityMax, 200)
  assert.deepEqual(result.nextMonthOperational, { scheduledStarts: 1, announcedDepartures: 1, reincorporations: 0 })
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
