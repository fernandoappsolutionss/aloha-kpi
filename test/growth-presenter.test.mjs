import test from 'node:test'
import assert from 'node:assert/strict'

import {
  confidenceMeta,
  formatGrowthPeriod,
  growthStageProgress,
  scenarioChartRows,
} from '../lib/growth/presenter.mjs'

test('formats projection periods in Spanish', () => {
  assert.equal(formatGrowthPeriod('2026-09'), 'Septiembre 2026')
  assert.equal(formatGrowthPeriod(null), 'Sin fecha')
})

test('calculates progress only inside the current level stage', () => {
  assert.equal(growthStageProgress({ currentChildren: 85, currentLevel: 0, nextLevel: { threshold: 170 } }), 50)
  assert.equal(growthStageProgress({ currentChildren: 185, currentLevel: 1, nextLevel: { threshold: 200 } }), 50)
  assert.equal(growthStageProgress({ currentChildren: 410, currentLevel: 5, nextLevel: null }), 100)
})

test('combines the three scenarios into rows aligned by period', () => {
  const projection = {
    nextLevel: { threshold: 170 },
    scenarios: {
      conservative: { series: [{ period: '2026-09', endChildren: 140 }] },
      base: { series: [{ period: '2026-09', endChildren: 145 }] },
      action: { series: [{ period: '2026-09', endChildren: 150 }] },
    },
  }
  assert.deepEqual(scenarioChartRows(projection), [{
    period: '2026-09',
    label: 'Sep 2026',
    conservative: 140,
    base: 145,
    action: 150,
    target: 170,
  }])
})

test('maps confidence to stable user-facing labels', () => {
  assert.deepEqual(confidenceMeta('high'), { label: 'Datos completos', tone: 'ok' })
  assert.deepEqual(confidenceMeta('medium'), { label: 'Datos por revisar', tone: 'warn' })
  assert.deepEqual(confidenceMeta('low'), { label: 'Datos insuficientes', tone: 'bad' })
})


test('muestra el histórico cerrado y el cierre previsto sin llamar observado a un mes abierto', () => {
  const rows = scenarioChartRows({ currentChildren: 108, scenarios: { base: { series: [{ period: '2026-10', endChildren: 108 }] } } }, {
    currentPeriod: '2026-09', startPeriod: '2026-07',
    history: [{ year: 2026, month: 7, endChildren: 99, closed: true }, { year: 2026, month: 8, endChildren: 100, closed: true }],
  })
  assert.equal(rows.find(row => row.period === '2026-08').observed, 100)
  assert.equal(rows.find(row => row.period === '2026-09').observed, null)
  assert.equal(rows.find(row => row.period === '2026-09').base, 108)
})
