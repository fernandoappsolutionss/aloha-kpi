import test from 'node:test'
import assert from 'node:assert/strict'
import { validatePlan, assertExpected, runRepair } from '../scripts/apply-audit-repair.mjs'

const operation = () => ({ table: 'resumen_mes', key: { centro_id: 99, year: 2026, month: 5 },
  expected: { mot_tecnica: 18 }, set: { mot_tecnica: 0 }, reason: 'Dato de otro bloque en el documento original' })
test('a repair refuses unscoped writes, unexpected tables and absent evidence', () => {
  for (const op of [
    { ...operation(), key: { year: 2026, month: 5 } },
    { ...operation(), table: 'usuarios' },
    { ...operation(), set: { estado: 'admin_general' } },
    { ...operation(), expected: {} },
    { ...operation(), reason: '' },
  ]) assert.throws(() => validatePlan({ operations: [op] }))
  assert.doesNotThrow(() => validatePlan({ operations: [operation()] }))
})
test('nullable source cells stay absent and concurrent corrections abort the plan', () => {
  const op = { ...operation(), set: { mot_tecnica: null } }
  assert.doesNotThrow(() => validatePlan({ operations: [op] }))
  assert.doesNotThrow(() => assertExpected({ mot_tecnica: 18 }, op.expected))
  assert.throws(() => assertExpected({ mot_tecnica: 17 }, op.expected))
  assert.throws(() => assertExpected({ mot_tecnica: null }, { mot_tecnica: 0 }))
})
test('snapshot guards compare objects independently of key order', () => {
  assert.doesNotThrow(() => assertExpected({ datos: { a: 1, b: 2 } }, { datos: { b: 2, a: 1 } }))
  assert.throws(() => assertExpected({ datos: { a: 2 } }, { datos: { a: 1 } }))
})
test('a conflict anywhere prevents every mutation and rolls back', async () => {
  const calls = []
  const client = { query: async (sql) => {
    calls.push(sql)
    return { rows: sql.startsWith('SELECT') ? [{ mot_tecnica: 19 }] : [] }
  } }
  await assert.rejects(runRepair(client, { operations: [operation()] }, { apply: true, backup: () => assert.fail('backup must wait for all guards') }))
  assert.ok(calls.includes('ROLLBACK'))
  assert.equal(calls.some(sql => /^(UPDATE|DELETE)/.test(sql)), false)
})
test('dry-run is read-only and never writes a backup or data', async () => {
  const calls = []
  const client = { query: async (sql) => {
    calls.push(sql)
    return { rows: sql.startsWith('SELECT') ? [{ mot_tecnica: 18 }] : [] }
  } }
  const result = await runRepair(client, { operations: [operation()] }, { apply: false, backup: () => assert.fail('no backup on dry-run') })
  assert.equal(result.mode, 'dry-run')
  assert.match(calls[0], /READ ONLY/)
  assert.equal(calls.some(sql => /^(UPDATE|DELETE)/.test(sql)), false)
})
test('backup failure prevents writes and rollback follows any failed update', async () => {
  for (const backupFails of [true, false]) {
    const calls = []
    const client = { query: async (sql) => {
      calls.push(sql)
      if (sql.startsWith('SELECT')) return { rows: [{ mot_tecnica: 18 }] }
      if (sql.startsWith('UPDATE')) throw new Error('database rejected update')
      return { rows: [] }
    } }
    await assert.rejects(runRepair(client, { operations: [operation()] }, {
      apply: true, backup: () => { if (backupFails) throw new Error('disk full'); return '/private/backup.json' },
    }))
    assert.equal(calls.at(-1), 'ROLLBACK')
    if (backupFails) assert.equal(calls.some(sql => sql.startsWith('UPDATE')), false)
  }
})
