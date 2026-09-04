import test from 'node:test'
import assert from 'node:assert/strict'
import { GROWTH_ENGINE_VERSION, CENTER_LEVELS } from '../lib/growth/constants.mjs'

test('version two separates corrected forecasts while preserving official thresholds', () => {
  assert.equal(GROWTH_ENGINE_VERSION, '2.0.0')
  assert.deepEqual(CENTER_LEVELS.map((level) => level.threshold), [170, 200, 230, 325, 410])
})
