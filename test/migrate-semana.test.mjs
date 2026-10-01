import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runMigration, MIGRACIONES } from '../scripts/migrate-semana.mjs'

test('migración semanal es de solo lectura por defecto', async () => {
  const calls = []
  const client = { query: async (sql) => { calls.push(sql); return { rows: [{ estadisticas_semana: null, cobranza_diaria: null }] } } }
  assert.deepEqual(await runMigration(client, { log: () => {} }), { applied: false })
  assert.equal(calls.length, 1)
  assert.match(calls[0], /to_regclass/)
  assert.doesNotMatch(calls[0], /CREATE TABLE/)
})

test('con apply ejecuta solo la migración F2, completa y en orden', async () => {
  const calls = []
  const client = { query: async (sql) => { calls.push(sql); return { rows: [{}] } } }
  assert.deepEqual(MIGRACIONES, ['2026-10-01-estadisticas-semana.sql'])
  assert.deepEqual(await runMigration(client, { apply: true, log: () => {} }), { applied: true })
  assert.equal(calls.length, 2)
  assert.match(calls[1], /BEGIN;[\s\S]*CREATE TABLE IF NOT EXISTS estadisticas_semana[\s\S]*CREATE TABLE IF NOT EXISTS cobranza_diaria[\s\S]*COMMIT;/)
})

test('cron registra cobranza diaria antes de saltar el KPI mensual cerrado', () => {
  const source = readFileSync(new URL('../app/api/cron/cobranza-zoho/route.js', import.meta.url), 'utf8')
  assert.ok(source.indexOf('INSERT INTO cobranza_diaria') > 0)
  assert.ok(source.indexOf('INSERT INTO cobranza_diaria') < source.indexOf("if (mes?.estado === 'cerrado')"))
})
