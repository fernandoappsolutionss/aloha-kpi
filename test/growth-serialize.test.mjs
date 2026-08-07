import test from 'node:test'
import assert from 'node:assert/strict'

import { sanitizeGrowthPayload } from '../lib/growth/serialize.mjs'

test('converts dates and bigints into values accepted by server actions', () => {
  const result = sanitizeGrowthPayload({
    generatedAt: new Date('2026-08-07T12:00:00.000Z'),
    snapshotId: 42n,
  })

  assert.deepEqual(result, {
    generatedAt: '2026-08-07T12:00:00.000Z',
    snapshotId: 42,
  })
})

test('replaces non-finite and undefined values without mutating the source', () => {
  const source = { score: Number.POSITIVE_INFINITY, optional: undefined, rows: [1, Number.NaN] }
  const result = sanitizeGrowthPayload(source)

  assert.deepEqual(result, { score: null, optional: null, rows: [1, null] })
  assert.equal(source.score, Number.POSITIVE_INFINITY)
})
