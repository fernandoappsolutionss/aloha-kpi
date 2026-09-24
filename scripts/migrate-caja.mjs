import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { resolveNeonE2EConfig } from '../lib/neon-e2e-config.mjs'

export async function runMigration(client, { apply = false, log = console.log } = {}) {
  const { rows: [r] } = await client.query(`SELECT to_regclass('public.caja_movimientos') IS NOT NULL AS instalada`)
  log(JSON.stringify({ modo: apply ? 'aplicar' : 'solo-lectura', ...r }))
  if (!apply) return { applied: false }
  try {
    // El archivo trae BEGIN/COMMIT. No dividir por punto y coma.
    await client.query(readFileSync(new URL('../db/migrations/2026-09-24-caja.sql', import.meta.url), 'utf8'))
    log('Tablas caja_* listas.')
    return { applied: true }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  }
}

export function cargarEnv() {
  try {
    const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const line of env.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* entorno explícito */ }
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.')
}

export async function conCliente(fn) {
  neonConfig.webSocketConstructor = ws
  const transport = resolveNeonE2EConfig(process.env)
  if (transport) for (const key of ['wsProxy', 'useSecureWebSocket', 'forceDisablePgSSL', 'pipelineTLS', 'pipelineConnect']) neonConfig[key] = transport[key]
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()
  try { return await fn(client) } finally { client.release(); await pool.end() }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  cargarEnv()
  if (process.argv.slice(2).some((x) => x !== '--apply')) throw new Error('Uso: node scripts/migrate-caja.mjs [--apply]')
  await conCliente((c) => runMigration(c, { apply: process.argv.includes('--apply') }))
}
