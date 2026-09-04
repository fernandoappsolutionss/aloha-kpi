import { neon, neonConfig, Pool } from '@neondatabase/serverless'
import ws from 'ws'
import { resolveNeonE2EConfig } from './neon-e2e-config.mjs'

neonConfig.webSocketConstructor = ws
const e2eTransport = resolveNeonE2EConfig(process.env)
if (e2eTransport) {
  neonConfig.fetchEndpoint = e2eTransport.fetchEndpoint
  neonConfig.wsProxy = e2eTransport.wsProxy
  neonConfig.useSecureWebSocket = e2eTransport.useSecureWebSocket
  neonConfig.forceDisablePgSSL = e2eTransport.forceDisablePgSSL
  neonConfig.pipelineTLS = e2eTransport.pipelineTLS
  neonConfig.pipelineConnect = e2eTransport.pipelineConnect
}

const fetchOptions = e2eTransport?.fetchOptions || { cache: 'no-store' }

// Inicialización perezosa: el cliente de Neon solo se crea la primera vez que
// se ejecuta una consulta (en runtime). Así `next build` no falla cuando aún
// no hay DATABASE_URL configurada.
let _client = null
function client() {
  if (_client) return _client
  if (!process.env.DATABASE_URL) {
    throw new Error('Falta DATABASE_URL. Configúrala en .env.local o en Vercel.')
  }
  _client = neon(process.env.DATABASE_URL, { fetchOptions })
  return _client
}

// `sql` se usa como tagged template (parametrizado, seguro contra inyección):
//   const rows = await sql`SELECT * FROM centros WHERE id = ${id}`
export function sql(strings, ...values) {
  return client()(strings, ...values)
}

function queryTag(db) {
  return async function query(strings, ...values) {
    if (typeof strings === 'string') {
      const result = await db.query(strings, values[0] || [])
      return result.rows
    }
    let text = strings[0]
    for (let index = 0; index < values.length; index++) {
      text += `$${index + 1}${strings[index + 1]}`
    }
    const result = await db.query(text, values)
    return result.rows
  }
}

// Transacción interactiva para operaciones que necesitan leer, decidir y
// escribir manteniendo el mismo bloqueo de fila hasta COMMIT.
export async function withTransaction(callback, { isolationLevel = 'Serializable' } = {}) {
  const levels = {
    ReadCommitted: 'READ COMMITTED',
    RepeatableRead: 'REPEATABLE READ',
    Serializable: 'SERIALIZABLE',
  }
  const level = levels[isolationLevel] || levels.Serializable
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = await pool.connect()
  try {
    await db.query(`BEGIN ISOLATION LEVEL ${level}`)
    const result = await callback(queryTag(db))
    await db.query('COMMIT')
    return result
  } catch (error) {
    try { await db.query('ROLLBACK') } catch {}
    throw error
  } finally {
    db.release()
    await pool.end()
  }
}

// Ejecuta una sentencia sin parámetros (DDL de migración, p. ej.).
// IMPORTANTE: `statement` debe ser una constante del código, NUNCA entrada del
// usuario — no hay parametrización posible en una sentencia suelta.
export async function exec(statement) {
  const strings = [statement]
  strings.raw = [statement]
  return await sql(strings)
}

// Helper genérico de UPSERT.
// IMPORTANTE: `table`, las claves de `row` y `conflictCols` deben provenir de
// constantes controladas por el código (NUNCA de entrada del usuario), porque
// se interpolan como identificadores. Los VALORES sí van parametrizados ($1, $2…).
export function upsertWith(query, table, row, conflictCols) {
  const cols = Object.keys(row)
  const vals = Object.values(row)
  const updates = cols
    .filter((c) => !conflictCols.includes(c))
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(', ')

  const strings = [`INSERT INTO ${table} (${cols.join(', ')}) VALUES (`]
  for (let i = 1; i < vals.length; i++) strings.push(', ')
  strings.push(`) ON CONFLICT (${conflictCols.join(', ')}) DO UPDATE SET ${updates}`)
  strings.raw = strings.slice()

  return query(strings, ...vals)
}

export async function upsert(table, row, conflictCols) {
  return await upsertWith(sql, table, row, conflictCols)
}
