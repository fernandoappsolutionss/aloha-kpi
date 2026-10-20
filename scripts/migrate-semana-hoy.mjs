import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { cargarEnv, conCliente } from './migrate-caja.mjs'

export async function runMigration(client, { apply = false } = {}) {
  if (!apply) return (await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='semana_objetivos' AND column_name IN ('fecha_hoy','hora_hoy')")).rows
  try {
    await client.query(readFileSync(new URL('../db/migrations/2026-10-20-semana-hoy.sql', import.meta.url), 'utf8'))
    return { applied: true }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  }
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Uso: node scripts/migrate-semana-hoy.mjs [--apply]')
  cargarEnv()
  console.log(await conCliente(client => runMigration(client, { apply: process.argv.includes('--apply') })))
}
