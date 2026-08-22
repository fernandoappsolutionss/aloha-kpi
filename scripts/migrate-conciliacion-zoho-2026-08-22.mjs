// Migración del conciliador bancario Zoho.
//
//   node scripts/migrate-conciliacion-zoho-2026-08-22.mjs            (dry-run)
//   node scripts/migrate-conciliacion-zoho-2026-08-22.mjs --apply
//
// Solo crea tablas e índices nuevos (CREATE ... IF NOT EXISTS): no toca ni una
// fila de lo que ya existe, así que es segura de repetir. El dry-run dice qué
// falta antes de escribir nada.
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

const TABLAS = [
  'conciliacion_cuentas',
  'conciliacion_reglas',
  'conciliacion_lotes',
  'conciliacion_movimientos',
]

export async function inspeccionar(client) {
  const { rows } = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = current_schema() AND table_name = ANY($1)`,
    [TABLAS],
  )
  const existentes = rows.map((r) => r.table_name)
  return {
    existentes,
    faltantes: TABLAS.filter((t) => !existentes.includes(t)),
  }
}

export async function migrar({ client, ddl, apply = false, log = () => {} }) {
  const antes = await inspeccionar(client)
  log(JSON.stringify({ modo: apply ? 'apply' : 'dry-run', ...antes }, null, 2))
  if (!apply) return { applied: false, antes }

  try {
    await client.query('BEGIN')
    await client.query("SET LOCAL lock_timeout = '10s'")
    // El advisory lock evita que dos despliegues simultáneos corran el DDL a
    // la vez (CREATE INDEX IF NOT EXISTS no es inmune a la carrera).
    await client.query('SELECT pg_advisory_xact_lock($1)', [2026082201])
    await client.query(ddl)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  }

  const despues = await inspeccionar(client)
  log(JSON.stringify({ modo: 'aplicado', ...despues }, null, 2))
  if (despues.faltantes.length) throw new Error(`Faltan tablas tras la migración: ${despues.faltantes.join(', ')}`)
  return { applied: true, antes, despues }
}

async function main() {
  try {
    const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const line of env.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* opcional */ }

  const apply = process.argv.slice(2).includes('--apply')
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.')
  const ddl = readFileSync(new URL('../db/migrations/2026-08-22-conciliacion-zoho.sql', import.meta.url), 'utf8')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()
  try {
    await migrar({ client, ddl, apply, log: (t) => console.log(t) })
  } finally {
    client.release()
    await pool.end()
  }
}

// El guard tolera que no haya argv[1] (importar el módulo desde una prueba).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
