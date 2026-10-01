import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { cargarEnv, conCliente } from './migrate-caja.mjs'

export const MIGRACIONES = ['2026-10-01-estadisticas-semana.sql']

export async function runMigration(client, { apply = false, log = console.log } = {}) {
  const { rows: [tablas] } = await client.query("SELECT to_regclass('public.estadisticas_semana') AS estadisticas_semana, to_regclass('public.cobranza_diaria') AS cobranza_diaria")
  log(JSON.stringify({ modo: apply ? 'aplicar' : 'solo-lectura', ...tablas }))
  if (!apply) return { applied: false }
  for (const archivo of MIGRACIONES) {
    const sql = readFileSync(new URL(`../db/migrations/${archivo}`, import.meta.url), 'utf8')
    try {
      await client.query(sql)
      log(`${archivo} aplicada.`)
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    }
  }
  return { applied: true }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (process.argv.slice(2).some((arg) => arg !== '--apply')) throw new Error('Uso: node scripts/migrate-semana.mjs [--apply]')
  cargarEnv()
  await conCliente((client) => runMigration(client, { apply: process.argv.includes('--apply') }))
}
