// Usa exclusivamente un contenedor local desechable; nunca DATABASE_URL.
// ALOHA_CAPACITY_TEST_CONTAINER=aloha-capacidad-test-... node --test test/integration/salon-capacidad.integration.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { parseSalonCapacity } from '../../lib/salon-capacidad.mjs'

const container = process.env.ALOHA_CAPACITY_TEST_CONTAINER
if (!/^aloha-capacidad-test-[\w-]+$/.test(container || '')) throw new Error('Indica un contenedor desechable aloha-capacidad-test-*')
const query = sql => execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'capacidad', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' }).trim()
const ddl = readFileSync(new URL('../../db/migrations/2026-09-07-salon-capacidad.sql', import.meta.url), 'utf8')
const source = readFileSync(new URL('../../app/actions/grupos.js', import.meta.url), 'utf8')
const action = source.slice(source.indexOf('export async function saveSalon('), source.indexOf('export async function toggleSalon(')).replace('export ', '')
let calls = 0
let authorized = true
const literal = value => value == null ? 'NULL' : typeof value === 'boolean' ? String(value) : `'${String(value).replaceAll("'", "''")}'`
const sql = async (strings, ...values) => {
  calls++
  const statement = strings.reduce((text, part, i) => text + part + (i < values.length ? `$${i + 1}` : ''), '')
  return JSON.parse(query(`PREPARE mutation AS WITH result AS (${statement}) SELECT coalesce(json_agg(result), '[]'::json) FROM result; EXECUTE mutation(${values.map(literal).join(',')});`))
}
const saveSalon = new Function('sql', 'requireCentroAccess', 'parseSalonCapacity', `${action}; return saveSalon`)(sql, async id => {
  if (!authorized || Number(id) !== 1) throw new Error('No autorizado')
}, parseSalonCapacity)

test('migración y acción real conservan datos, guardan capacidad y aíslan el centro', async () => {
  query(`CREATE TABLE salones (id SERIAL PRIMARY KEY, centro_id INTEGER NOT NULL, nombre TEXT NOT NULL, es_hibrido BOOLEAN DEFAULT FALSE, activo BOOLEAN DEFAULT TRUE);
    INSERT INTO salones (centro_id, nombre) VALUES (1, 'Existente'), (2, 'Otro centro');`)
  query(ddl)
  assert.equal(query('SELECT count(*) FROM salones WHERE capacidad_ninos IS NULL'), '2')
  assert.equal((await saveSalon(1, { id: 1, nombre: 'Existente', capacidad_ninos: 12 })).ok, true)
  assert.equal(query('SELECT capacidad_ninos FROM salones WHERE id = 1'), '12')
  query(ddl) // repetible y sin volver a vaciar el dato
  assert.equal(query('SELECT capacidad_ninos FROM salones WHERE id = 1'), '12')
  await saveSalon(1, { id: 1, nombre: 'Renombrado' }) // cliente anterior al despliegue
  assert.equal(query('SELECT capacidad_ninos FROM salones WHERE id = 1'), '12')
  const created = await saveSalon(1, { nombre: 'Nuevo', capacidad_ninos: 8 })
  assert.ok(created.salonId)
  assert.equal(query(`SELECT capacidad_ninos FROM salones WHERE id = ${created.salonId}`), '8')
  const before = calls
  for (const capacidad_ninos of [0, -1, 2.5, '1e2']) assert.ok((await saveSalon(1, { id: 1, nombre: 'Renombrado', capacidad_ninos })).error)
  assert.equal(calls, before, 'la validación rechaza antes de escribir')
  assert.ok((await saveSalon(1, { id: 2, nombre: 'Ajeno', capacidad_ninos: 99 })).error)
  assert.equal(query('SELECT nombre FROM salones WHERE id = 2'), 'Otro centro')
  assert.equal(query('SELECT capacidad_ninos IS NULL FROM salones WHERE id = 2'), 't')
  authorized = false
  const deniedCalls = calls
  await assert.rejects(saveSalon(1, { id: 1, nombre: 'Renombrado', capacidad_ninos: 10 }), /No autorizado/)
  assert.equal(calls, deniedCalls)
  authorized = true
  await saveSalon(1, { id: 1, nombre: 'Renombrado', capacidad_ninos: null })
  assert.equal(query('SELECT capacidad_ninos IS NULL FROM salones WHERE id = 1'), 't')
  assert.throws(() => query('UPDATE salones SET capacidad_ninos = 0 WHERE id = 1'), /check constraint/)
})
