import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { cargarEnv, conCliente } from './migrate-caja.mjs'

export async function runMigration(client, { apply = false, log = console.log } = {}) {
  const { rows: [r] } = await client.query("SELECT to_regclass('public.entrenamiento_oficio_reinicios') IS NOT NULL AS instalada")
  log(JSON.stringify({ modo: apply ? 'aplicar' : 'solo-lectura', ...r }))
  if (!apply) return { applied: false }
  try {
    await client.query(readFileSync(new URL('../db/migrations/2026-10-16-oficio-reinicios.sql', import.meta.url), 'utf8'))
    log('Historial de reinicios de oficio listo. Progreso actual conservado.')
    return { applied: true }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (process.argv.slice(2).some((arg) => arg !== '--apply')) throw new Error('Uso: node scripts/migrate-oficio-reinicios.mjs [--apply]')
  cargarEnv()
  await conCliente((client) => runMigration(client, { apply: process.argv.includes('--apply') }))
}
