import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { Pool } from '@neondatabase/serverless'
import ws from 'ws'
import { neonConfig } from '@neondatabase/serverless'

neonConfig.webSocketConstructor = ws

// El dry-run debe poder correr ANTES de que exista la columna (primera vez
// que se corre el script sin --apply), así que la presencia de la columna se
// verifica por catálogo en vez de asumirla.
async function preflight(client) {
  const total = await client.query('SELECT COUNT(*)::int AS total FROM peticiones')
  const columna = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'peticiones' AND column_name = 'cotizacion_aprobada_id'
    ) AS existe
  `)
  if (!columna.rows[0].existe) {
    return { total: total.rows[0].total, columna: 'ausente', conCotizacionAprobada: null }
  }
  const conCotizacion = await client.query(
    'SELECT COUNT(*)::int AS total FROM peticiones WHERE cotizacion_aprobada_id IS NOT NULL'
  )
  return { total: total.rows[0].total, columna: 'presente', conCotizacionAprobada: conCotizacion.rows[0].total }
}

export async function runMigration({ client, ddl, apply = false, log = () => {} }) {
  const report = await preflight(client)
  log(JSON.stringify({ modo: apply ? 'apply-preflight' : 'dry-run', ...report }, null, 2))
  if (!apply) return { applied: false, report }
  try {
    await client.query('BEGIN')
    await client.query("SET LOCAL lock_timeout = '10s'")
    await client.query('SELECT pg_advisory_xact_lock($1)', [2026082201])
    await client.query(ddl)
    await client.query('COMMIT')
    return { applied: true, report }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  }
}

async function main() {
  // Carga .env.local si existe (sin dependencias externas).
  try {
    const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const line of env.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* opcional */ }

  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.')
  const ddl = readFileSync(new URL('../db/migrations/2026-08-22-peticion-aprobacion.sql', import.meta.url), 'utf8')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()
  try {
    const result = await runMigration({ client, ddl, apply, log: console.log })
    console.log(result.applied ? 'Migración aplicada.' : 'Dry-run terminado: no se ejecutó DDL.')
  } finally {
    client.release()
    await pool.end()
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main()
