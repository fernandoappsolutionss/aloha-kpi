import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { cargarEnv, conCliente } from './migrate-caja.mjs'

export async function runMigration(client, { apply = false } = {}) {
  if (!apply) return (await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('semana_planes','semana_objetivos') AND column_name IN ('arrastre_version','origen_formula')")).rows
  await client.query(readFileSync(new URL('../db/migrations/2026-10-16-semana-continuidad.sql', import.meta.url), 'utf8'))
  return { applied: true }
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Uso: node scripts/migrate-semana-continuidad.mjs [--apply]')
  cargarEnv()
  console.log(await conCliente(client => runMigration(client, { apply: process.argv.includes('--apply') })))
}
