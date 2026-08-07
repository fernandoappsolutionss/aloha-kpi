import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildGrowthHistory,
  buildOperationalGrowth,
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
  assert.equal(result.capacityMax, 200)
  assert.deepEqual(result.nextMonthOperational, { scheduledStarts: 1, announcedDepartures: 1, reincorporations: 0 })
})

test('falls back to the last monthly close when operational enrollment is clearly partial', () => {
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
    currentChildren: 92,
    source: 'operational',
    coverage: 0.96,
  })
})
