import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { cargarEnv, conCliente } from './migrate-caja.mjs'
export async function runMigration(client, { apply = false, log = console.log } = {}) {
  const { rows: [r] } = await client.query("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='grupos' AND column_name='inicio_pendiente') AS instalada")
  log(JSON.stringify({ modo: apply ? 'aplicar' : 'solo-lectura', ...r }))
  if (!apply) return { applied: false }
  try {
    await client.query(readFileSync(new URL('../db/migrations/2026-10-16-grupos-inicio-pendiente.sql', import.meta.url), 'utf8'))
    return { applied: true }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  }
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Uso: node scripts/migrate-inicio-pendiente.mjs [--apply]')
  cargarEnv()
  await conCliente(client => runMigration(client, { apply: process.argv.includes('--apply') }))
}
