import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { semanasParaBackfill } from '../scripts/backfill-estadisticas-semana.mjs'

test('backfill inicia en el primer jueves completo y no incluye la semana abierta', () => {
  assert.deepEqual(semanasParaBackfill('2026-08-20', '2026-08-13'), ['2026-08-13', '2026-08-20'])
  assert.deepEqual(semanasParaBackfill('2026-08-20', '2026-08-27'), [])
  assert.throws(() => semanasParaBackfill('2026-08-20', '2026-08-06'), /2026-08-13/)
})

test('cron semanal usa secreto y duración suficiente; conciliación no escribe', () => {
  const cron = readFileSync(new URL('../app/api/cron/estadisticas-semana/route.js', import.meta.url), 'utf8')
  assert.match(cron, /rechazoCron\(request, process\.env\.CRON_SECRET\)/)
  assert.match(cron, /maxDuration = 300/)
  const conciliacion = readFileSync(new URL('../scripts/conciliar-poblacion-semanal.mjs', import.meta.url), 'utf8')
  assert.doesNotMatch(conciliacion, /INSERT INTO|UPDATE |DELETE FROM/i)
})
