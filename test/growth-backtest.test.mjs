import test from 'node:test'
import assert from 'node:assert/strict'

import { evaluateGrowthForecasts } from '../lib/growth/backtest.mjs'

const snapshot = ({ date, center = 1, current, period, forecast }) => ({
  centro_id: center,
  snapshot_date: date,
  payload: {
    projection: {
      currentChildren: current,
      scenarios: { base: { series: [{ period, endChildren: forecast }] } },
    },
  },
})

test('calcula MAE, sesgo y mejora frente a repetir la poblacion actual', () => {
  const result = evaluateGrowthForecasts({
    snapshots: [
      snapshot({ date: '2026-01-10', current: 100, period: '2026-02', forecast: 108 }),
      snapshot({ date: '2026-02-10', current: 110, period: '2026-03', forecast: 116 }),
    ],
    actuals: [
      { centro_id: 1, period: '2026-02', actual: 110 },
      { centro_id: 1, period: '2026-03', actual: 118 },
    ],
    minSample: 2,
  })

  assert.equal(result.sampleSize, 2)
  assert.equal(result.engineMae, 2)
  assert.equal(result.baselineMae, 9)
  assert.equal(result.engineBias, -2)
  assert.equal(result.improvementPct, 77.8)
  assert.equal(result.guardrail, 'candidate')
})

test('usa el snapshot mas reciente para un mismo centro y mes objetivo', () => {
  const result = evaluateGrowthForecasts({
    snapshots: [
      snapshot({ date: '2026-01-05', current: 100, period: '2026-02', forecast: 120 }),
      snapshot({ date: '2026-01-25', current: 105, period: '2026-02', forecast: 111 }),
    ],
    actuals: [{ centro_id: 1, period: '2026-02', actual: 110 }],
    minSample: 1,
  })

  assert.equal(result.sampleSize, 1)
  assert.equal(result.engineMae, 1)
  assert.equal(result.baselineMae, 5)
})

test('no promueve calibracion con poca muestra ni cuando pierde contra el baseline', () => {
  const insufficient = evaluateGrowthForecasts({
    snapshots: [snapshot({ date: '2026-01-10', current: 100, period: '2026-02', forecast: 101 })],
    actuals: [{ centro_id: 1, period: '2026-02', actual: 101 }],
    minSample: 3,
  })
  assert.equal(insufficient.guardrail, 'insufficient_data')

  const worse = evaluateGrowthForecasts({
    snapshots: [
      snapshot({ date: '2026-01-10', current: 100, period: '2026-02', forecast: 130 }),
      snapshot({ date: '2026-02-10', current: 110, period: '2026-03', forecast: 140 }),
    ],
    actuals: [
      { centro_id: 1, period: '2026-02', actual: 105 },
      { centro_id: 1, period: '2026-03', actual: 115 },
    ],
    minSample: 2,
  })
  assert.equal(worse.guardrail, 'hold')
  assert.ok(worse.engineMae > worse.baselineMae)
})

test('ignora payloads incompletos y cierres aun no disponibles', () => {
  const result = evaluateGrowthForecasts({
    snapshots: [
      { centro_id: 1, snapshot_date: '2026-01-10', payload: {} },
      snapshot({ date: '2026-02-10', current: 110, period: '2026-03', forecast: 116 }),
    ],
    actuals: [{ centro_id: 1, period: '2026-02', actual: 108 }],
  })
  assert.equal(result.sampleSize, 0)
  assert.equal(result.engineMae, null)
  assert.equal(result.guardrail, 'insufficient_data')
})

test('un cierre nulo no se convierte en cero niños', () => {
  const result = evaluateGrowthForecasts({
    snapshots: [snapshot({ date: '2026-02-10', current: 110, period: '2026-03', forecast: 116 })],
    actuals: [{ centro_id: 1, period: '2026-03', actual: null }],
    minSample: 1,
  })
  assert.equal(result.sampleSize, 0)
})
