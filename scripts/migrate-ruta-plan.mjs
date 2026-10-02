import { readFileSync } from 'node:fs'
import { cargarEnv, conCliente } from './migrate-caja.mjs'
if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Uso: node scripts/migrate-ruta-plan.mjs [--apply]')
cargarEnv()
await conCliente(async client => {
  const { rows } = await client.query("SELECT to_regclass('public.ruta_compromisos_mes') AS instalada")
  console.log({ modo: process.argv.includes('--apply') ? 'aplicar' : 'solo-lectura', ...rows[0] })
  if (process.argv.includes('--apply')) {
    await client.query(readFileSync(new URL('../db/migrations/2026-10-02-ruta-plan-integrado.sql', import.meta.url), 'utf8'))
    console.log('Ruta mensual y evidencia de planes listas.')
  }
})
