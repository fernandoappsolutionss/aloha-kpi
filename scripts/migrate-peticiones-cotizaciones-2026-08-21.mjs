import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { Pool } from '@neondatabase/serverless'
import ws from 'ws'
import { neonConfig } from '@neondatabase/serverless'

neonConfig.webSocketConstructor = ws

async function inspectDatabase(db, phase) {
  const total = await db.query(`SELECT COUNT(*)::int AS total FROM peticiones`)
  const stateCounts = await db.query(`SELECT estado, COUNT(*)::int AS filas FROM peticiones GROUP BY estado ORDER BY estado`)
  const contractBlockers = phase === 'contract'
    ? await db.query(`
        SELECT
          COUNT(*) FILTER (WHERE tipo IS NULL OR tipo NOT IN ('legado', 'comentario', 'peticion'))::int AS tipo_invalido,
          COUNT(*) FILTER (WHERE
            (tipo = 'peticion' AND (categoria IS NULL OR categoria NOT IN ('reparacion', 'activaciones_mercadeo', 'contratacion', 'capacitacion', 'otros')))
            OR (tipo IN ('legado', 'comentario') AND categoria IS NOT NULL)
          )::int AS categoria_invalida,
          COUNT(*) FILTER (WHERE (estado = 'Anulada') <> (anulada_at IS NOT NULL))::int AS anulacion_invalida
        FROM peticiones
      `)
    : { rows: [] }
  return {
    total: total.rows[0].total,
    estados: stateCounts.rows,
    cierre: contractBlockers.rows[0] || null,
  }
}

export function assertPreflight(report) {
  const allowed = new Set(['Próximo trimestre', 'Negado', 'Aprobado', 'En proceso', 'Cumplido', 'Anulada'])
  const unexpectedStates = report.estados.filter((row) => !allowed.has(row.estado))
  if (unexpectedStates.length) throw new Error('Existen estados de petición que la migración no puede mapear.')
  if (report.cierre && Object.values(report.cierre).some((value) => Number(value) > 0)) {
    throw new Error('La fase contract tiene filas incompletas.')
  }
  return { ...report, inesperados: unexpectedStates }
}

const assertSchema = (schema) => {
  if (schema != null && !/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('Schema de prueba inválido.')
  return schema
}

export async function runMigration({ client, phase, ddl, apply = false, schema = null, injectFailure = false, log = () => {} }) {
  if (!['expand', 'contract'].includes(phase)) throw new Error('La fase debe ser expand o contract.')
  assertSchema(schema)
  if (schema) await client.query(`SET search_path TO "${schema}"`)
  const initialPreflight = assertPreflight(await inspectDatabase(client, phase))
  log(JSON.stringify({ modo: apply ? 'apply-preflight' : 'dry-run', phase, ...initialPreflight }, null, 2))
  if (!apply) return { applied: false, report: initialPreflight }
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
    await client.query("SET LOCAL lock_timeout = '10s'")
    if (schema) await client.query(`SET LOCAL search_path TO "${schema}"`)
    await client.query('SELECT pg_advisory_xact_lock($1)', [2026082101])
    await client.query('LOCK TABLE peticiones IN ACCESS EXCLUSIVE MODE')
    const lockedPreflight = assertPreflight(await inspectDatabase(client, phase))
    log(JSON.stringify({ modo: 'apply-locked', phase, ...lockedPreflight }, null, 2))
    await client.query(ddl)
    if (injectFailure) throw new Error('Fallo de prueba después del DDL.')
    await client.query('COMMIT')
    return { applied: true, report: lockedPreflight }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  }
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const phaseArg = args.find((arg) => arg.startsWith('--phase=')) || '--phase=expand'
  const phase = phaseArg.split('=')[1]
  if (!['expand', 'contract'].includes(phase)) throw new Error('La fase debe ser expand o contract.')
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.')
  const ddl = readFileSync(new URL(`../db/migrations/2026-08-21-peticiones-cotizaciones-${phase}.sql`, import.meta.url), 'utf8')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()
  try {
    const result = await runMigration({ client, phase, ddl, apply, log: console.log })
    console.log(result.applied ? `Migración ${phase} aplicada.` : 'Dry-run terminado: no se ejecutó DDL.')
  } finally {
    client.release()
    await pool.end()
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main()
