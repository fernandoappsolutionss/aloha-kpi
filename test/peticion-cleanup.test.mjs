import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createPeticionCleanupService, retryAt } from '../lib/peticion-cleanup.mjs'

test('backoff es determinista y acotado', () => {
  const now = new Date('2026-08-21T12:00:00Z')
  assert.equal(retryAt(now, 1).toISOString(), '2026-08-21T12:05:00.000Z')
  assert.equal(retryAt(now, 5).toISOString(), '2026-08-22T12:00:00.000Z')
  assert.equal(retryAt(now, 99).toISOString(), '2026-08-22T12:00:00.000Z')
})

test('falta de Blob no reclama filas ni consume intentos', async () => {
  let claimed = false
  const repo = { expireDrafts: async () => 0, reconcileStaleAttempts: async () => 0, claimCleanup: async () => { claimed = true; return [] } }
  const service = createPeticionCleanupService({ repo, blob: { assertConfigured: () => { throw new Error('Falta BLOB_READ_WRITE_TOKEN') } } })
  await assert.rejects(() => service.run({ budgetMs: 1000 }), /BLOB_READ_WRITE_TOKEN/)
  assert.equal(claimed, false)
})

test('éxito completa y falla conserva la fila con próximo intento', async () => {
  const complete = []
  const failed = []
  const deleted = []
  const order = []
  const rows = [
    { id: 1, blob_pathname: 'peticiones/a.pdf', intentos: 0 },
    { id: 2, blob_pathname: 'peticiones/b.pdf', intentos: 1 },
    { id: 3, blob_pathname: 'peticiones/activo.pdf', intentos: 0 },
  ]
  const repo = {
    expireDrafts: async () => 1,
    claimCleanup: async () => { order.push('claim'); return rows },
    isBlobPathActive: async (path) => path.endsWith('activo.pdf'),
    completeCleanup: async (row, result) => { complete.push([row.id, result?.note || null]) },
    failCleanup: async (row) => { failed.push(row.id) },
    releaseCleanup: async () => { throw new Error('no debe liberar filas terminadas') },
    reconcileStaleAttempts: async () => { order.push('stale-db'); return 2 },
    getReconcileCursor: async () => null,
    reconcileBlobPage: async () => 0,
    countPendingCleanup: async () => 1,
  }
  const blob = {
    assertConfigured: () => {},
    delete: async (path) => { deleted.push(path); if (path.endsWith('b.pdf')) throw new Error('rate limited') },
    listPage: async () => { order.push('list-page'); return { blobs: [], hasMore: false, cursor: undefined } },
  }
  const result = await createPeticionCleanupService({ repo, blob, now: () => new Date('2026-08-21T12:00:00Z'), uuid: () => 'lock-1' }).run({ budgetMs: 1000 })
  assert.deepEqual(complete, [[1, null], [3, 'active_reference']])
  assert.deepEqual(failed, [2])
  assert.deepEqual(deleted, ['peticiones/a.pdf', 'peticiones/b.pdf'])
  assert.ok(order.indexOf('claim') < order.indexOf('list-page'))
  assert.deepEqual(result, { expiredDrafts: 1, reconciled: 2, processed: 1, skippedActive: 1, failed: 1, pending: 1 })
})

test('al cortar presupuesto libera todas las filas reclamadas sin listar el store', async () => {
  const released = []
  const rows = [{ id: 1, blob_pathname: 'peticiones/a.pdf' }, { id: 2, blob_pathname: 'peticiones/b.pdf' }]
  const repo = {
    expireDrafts: async () => 0,
    claimCleanup: async () => rows,
    releaseCleanup: async (items, options) => { released.push([items.map((row) => row.id), options.lockToken]) },
    countPendingCleanup: async () => 2,
  }
  const blob = { assertConfigured: () => {}, listPage: async () => { throw new Error('no debe listar') } }
  const result = await createPeticionCleanupService({ repo, blob, uuid: () => 'lock-budget' }).run({ budgetMs: 0 })
  assert.deepEqual(released, [[[1, 2], 'lock-budget']])
  assert.equal(result.pending, 2)
})

test('ruta cron aplica rechazo fail-closed antes de ejecutar el servicio', () => {
  const source = readFileSync(new URL('../app/api/cron/peticiones-cleanup/route.js', import.meta.url), 'utf8')
  assert.match(source, /rechazoCron\(request, process\.env\.CRON_SECRET\)/)
  assert.ok(source.indexOf('rechazoCron') < source.indexOf('peticionCleanupService.run'))
})

test('reconciliar invalida la autoridad del callback antes de encolar', () => {
  const source = readFileSync(new URL('../lib/peticiones-repository.js', import.meta.url), 'utf8')
  assert.match(source, /UPDATE peticion_cotizaciones[\s\S]+SET upload_status = 'cleanup_pending'[\s\S]+upload_status IN \('pending', 'validating'\)/)
})

test('reencolar una ruta agotada reinicia intentos y libera locks viejos', () => {
  const source = readFileSync(new URL('../lib/peticiones-repository.js', import.meta.url), 'utf8')
  assert.match(source, /ON CONFLICT \(blob_pathname\) DO UPDATE[\s\S]+generation = peticion_blob_cleanup\.generation \+ 1[\s\S]+intentos = 0[\s\S]+lock_generation = NULL/)
})
