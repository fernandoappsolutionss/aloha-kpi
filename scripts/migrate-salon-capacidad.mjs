// node --env-file=/ruta/.env.local scripts/migrate-salon-capacidad.mjs [--apply]
// Solo agrega una columna nullable. No carga capacidades ni modifica históricos.
import { readFileSync } from 'node:fs'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws
if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL')
const apply = process.argv.includes('--apply')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const client = await pool.connect()
const footprint = async () => (await client.query(`SELECT count(*)::int AS rooms,
  md5(coalesce(string_agg((to_jsonb(s) - 'capacidad_ninos')::text, E'\n' ORDER BY id), '')) AS legacy_hash FROM salones s`)).rows[0]
try {
  await client.query(apply ? 'BEGIN' : 'BEGIN READ ONLY')
  await client.query("SET LOCAL lock_timeout = '5s'")
  await client.query("SET LOCAL statement_timeout = '30s'")
  if (apply) await client.query('LOCK TABLE salones IN ACCESS EXCLUSIVE MODE')
  const before = await footprint()
  const column = (await client.query(`SELECT data_type, is_nullable FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'salones' AND column_name = 'capacidad_ninos'`)).rows[0] || null
  if (column && (column.data_type !== 'integer' || column.is_nullable !== 'YES')) throw new Error('Columna existente incompatible; revisar antes de migrar')
  if (apply) {
    await client.query(readFileSync(new URL('../db/migrations/2026-09-07-salon-capacidad.sql', import.meta.url), 'utf8'))
    const checks = (await client.query(`SELECT convalidated, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint WHERE conrelid = 'public.salones'::regclass AND contype = 'c'`)).rows
    if (!checks.some(c => c.convalidated && c.definition.includes('(capacidad_ninos > 0)'))) throw new Error('Falta la restricción de capacidad positiva; revisar esquema')
    const after = await footprint()
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('La migración alteró datos existentes')
    const result = (await client.query('SELECT count(*)::int AS recorded FROM salones WHERE capacidad_ninos IS NOT NULL')).rows[0]
    await client.query('COMMIT')
    console.log(JSON.stringify({ applied: true, column: 'capacidad_ninos', type: 'integer', nullable: true, legacyDataUnchanged: true, rooms: before.rooms, ...result }))
  } else {
    await client.query('COMMIT')
    console.log(JSON.stringify({ applied: false, rooms: before.rooms, column, planned: 'ADD COLUMN capacidad_ninos INTEGER NULL CHECK (> 0)' }))
  }
} catch (error) {
  await client.query('ROLLBACK').catch(() => {})
  throw error
} finally {
  client.release()
  await pool.end()
}
