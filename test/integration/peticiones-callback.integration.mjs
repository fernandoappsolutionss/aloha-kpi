// Prueba de concurrencia real contra PostgreSQL: un callback de Blob en
// vuelo (`peticionUploadService.complete`) debe invalidarse si la petición
// pasa a un estado terminal (Cumplido/Anulada) MIENTRAS el callback espera
// el lock de fila de `lockPeticion`. No usa mocks de bloqueo (Promise chain
// / mutex JS) — el FOR UPDATE real de Postgres es el que ordena las dos
// transacciones, igual que en producción (lib/peticion-upload-service.mjs +
// lib/peticiones-repository.js). Requiere PETICIONES_TEST_DATABASE_URL; sin
// esa variable el archivo revienta al importarse (mismo patrón que
// peticiones-submit.integration.mjs) y npm test (que no incluye
// test/integration/) nunca la ejecuta.
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { runMigration } from '../../scripts/migrate-peticiones-cotizaciones-2026-08-21.mjs'
import { createPeticionUploadService } from '../../lib/peticion-upload-service.mjs'
import { normalizeSupplierName, normalizeFiscalId } from '../../lib/peticiones-domain.mjs'

neonConfig.webSocketConstructor = ws
const DATABASE_URL = process.env.PETICIONES_TEST_DATABASE_URL
if (!DATABASE_URL) throw new Error('Define PETICIONES_TEST_DATABASE_URL con una base desechable.')

// Copia exacta del query tag de lib/db.js: acepta tanto plantilla etiquetada
// (sql`...`) como forma de cadena ('TEXT $1', [params]), y siempre resuelve a
// un arreglo de filas (result.rows).
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

// Adaptador del mismo contrato PeticionRepository que necesita
// createPeticionUploadService({...}).complete: cada `transaction()` toma su
// PROPIA conexión del pool (no comparte la del setup ni la de la conexión A
// que retiene el lock), así el callback compite de verdad por el FOR UPDATE
// de lockPeticion en lugar de serializarse por JS.
function buildAdapter(pool, schema) {
  async function withSchema(fn) {
    const db = await pool.connect()
    try {
      await db.query(`SET search_path TO "${schema}"`)
      return await fn(queryTag(db))
    } finally {
      db.release()
    }
  }

  return {
    async transaction(work, options = {}) {
      const levels = { ReadCommitted: 'READ COMMITTED', RepeatableRead: 'REPEATABLE READ', Serializable: 'SERIALIZABLE' }
      const level = levels[options.isolationLevel] || levels.Serializable
      const db = await pool.connect()
      try {
        await db.query(`SET search_path TO "${schema}"`)
        await db.query(`BEGIN ISOLATION LEVEL ${level}`)
        const result = await work(queryTag(db))
        await db.query('COMMIT')
        return result
      } catch (error) {
        try { await db.query('ROLLBACK') } catch { /* ya rota */ }
        throw error
      } finally {
        db.release()
      }
    },

    async lockPeticion(query, id) {
      const [row] = await query('SELECT * FROM peticiones WHERE id = $1 FOR UPDATE', [id])
      return row
    },

    // Mismo SELECT que lib/peticiones-repository.js: trae la cotización, los
    // campos de la petición dueña, y el estado ACTUAL del usuario que inició
    // la carga. Sin `query` explícito, abre su propia conexión de solo
    // lectura (como el `sql` compartido de producción); con `query` (dentro
    // de una transacción) y `{ lockUser: true }`, bloquea la fila de
    // usuarios con FOR SHARE antes de que la transacción final decida
        // markValid/markInvalid.
    async getCallbackContext(payload, query, { lockUser = false } = {}) {
      const text = `
        SELECT c.*, p.centro_id AS centro_id, p.created_by AS created_by, p.submitted_at AS submitted_at, p.estado AS estado,
               (u.id IS NOT NULL) AS user_exists, u.password_hash AS user_password_hash, u.rol AS user_rol, u.centro_id AS user_centro_id
        FROM peticion_cotizaciones c
        JOIN peticiones p ON p.id = c.peticion_id
        LEFT JOIN usuarios u ON u.id = $2
        WHERE c.id = $1
        ${lockUser ? 'FOR SHARE OF u' : ''}
      `
      if (query) {
        const [row] = await query(text, [payload.cotizacionId, payload.uid])
        return row
      }
      return withSchema(async (runner) => {
        const [row] = await runner(text, [payload.cotizacionId, payload.uid])
        return row
      })
    },

    async markValidating(query, { cotizacionId, nonce, pathname }) {
      const [row] = await query(
        `UPDATE peticion_cotizaciones
         SET upload_status = 'validating', updated_at = now()
         WHERE id = $1 AND upload_nonce = $2 AND expected_pathname = $3 AND upload_status = 'pending'
         RETURNING *`,
        [cotizacionId, nonce, pathname]
      )
      return row || false
    },

    async markValid(query, { cotizacionId, nonce, pathname, mime, bytes, sha256, validadaAt }) {
      const [row] = await query(
        `UPDATE peticion_cotizaciones
         SET upload_status = 'valid', blob_pathname = $3, archivo_mime = $4, archivo_bytes = $5,
             archivo_sha256 = $6, validada_at = $7, updated_at = now()
         WHERE id = $1 AND upload_nonce = $2 AND expected_pathname = $3 AND upload_status IN ('validating', 'valid')
         RETURNING *`,
        [cotizacionId, nonce, pathname, mime, bytes, sha256, validadaAt]
      )
      return row
    },

    async markInvalid(query, { cotizacionId, nonce, pathname, error }) {
      const [row] = await query(
        `UPDATE peticion_cotizaciones
         SET upload_status = 'invalid', validation_error = $4, updated_at = now()
         WHERE id = $1 AND upload_nonce = $2 AND expected_pathname = $3 AND upload_status IN ('pending', 'validating', 'invalid')
         RETURNING *`,
        [cotizacionId, nonce, pathname, error]
      )
      return row || null
    },

    async enqueueCleanup(query, item) {
      await query(
        `INSERT INTO peticion_blob_cleanup (blob_pathname, motivo)
         VALUES ($1, $2)
         ON CONFLICT (blob_pathname) DO UPDATE
         SET motivo = EXCLUDED.motivo,
             generation = peticion_blob_cleanup.generation + 1,
             intentos = 0,
             ultimo_error = NULL,
             locked_at = NULL,
             lock_token = NULL,
             lock_generation = NULL,
             completed_at = NULL,
             proximo_intento_at = now()`,
        [item.blob_pathname, item.motivo]
      )
    },
  }
}

// Sondea pg_stat_activity hasta ver un backend bloqueado ejecutando el
// SELECT ... FOR UPDATE de lockPeticion (no un sleep a ciegas: se detiene en
// cuanto detecta el bloqueo, con un tope de intentos para no colgarse si
// algo salió mal).
async function waitForLockWaiter(monitor) {
  for (let attempt = 0; attempt < 150; attempt++) {
    const { rows } = await monitor.query(
      `SELECT pid FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND query ILIKE '%FROM peticiones%FOR UPDATE%'`
    )
    if (rows.length) return true
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  return false
}

async function runTerminalStateScenario(t, terminalEstado) {
  const schema = `peticiones_callback_test_${randomUUID().replaceAll('-', '')}`
  const pool = new Pool({ connectionString: DATABASE_URL })
  const setup = await pool.connect()
  t.after(async () => {
    await setup.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
    setup.release()
    await pool.end()
  })

  await setup.query(`CREATE SCHEMA "${schema}"`)
  await setup.query(`SET search_path TO "${schema}"`)
  await setup.query(`CREATE TABLE centros (id SERIAL PRIMARY KEY, nombre TEXT NOT NULL)`)
  await setup.query(`CREATE TABLE usuarios (id SERIAL PRIMARY KEY, nombre TEXT NOT NULL, email TEXT NOT NULL, rol TEXT NOT NULL, centro_id INTEGER, password_hash TEXT)`)
  await setup.query(`CREATE TABLE peticiones (id SERIAL PRIMARY KEY, centro_id INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE, anio INTEGER NOT NULL, trimestre INTEGER NOT NULL, texto TEXT NOT NULL, estado TEXT NOT NULL DEFAULT 'Próximo trimestre', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`)
  await setup.query(`INSERT INTO centros (id, nombre) VALUES (10, 'CENTRO 10')`)
  await setup.query(`INSERT INTO usuarios (id, nombre, email, rol, centro_id, password_hash) VALUES (8, 'Ana', 'ana@aloha.com', 'administradora', 10, 'hash')`)

  const expand = readFileSync(new URL('../../db/migrations/2026-08-21-peticiones-cotizaciones-expand.sql', import.meta.url), 'utf8')
  await runMigration({ client: setup, phase: 'expand', ddl: expand, apply: true, schema })

  const actorSnapshot = { id: 8, nombre: 'Ana', email: 'ana@aloha.com', rol: 'administradora' }
  // Petición ENVIADA en un estado que hoy admite cotizaciones ('En proceso'):
  // el callback debe ver que deja de admitirlas justo cuando A la mueve a un
  // estado terminal mientras el callback está en vuelo.
  await setup.query(
    `INSERT INTO peticiones
       (id, centro_id, anio, trimestre, texto, estado, tipo, categoria, created_by, created_by_snapshot, submitted_at)
     VALUES
       (4, 10, 2026, 3, 'Reparar', 'En proceso', 'peticion', 'reparacion', 8, $1::jsonb, now())`,
    [JSON.stringify(actorSnapshot)]
  )

  const razonSocial = 'Proveedor Uno'
  const fiscalId = '155-1'
  const pathname = 'peticiones/4/vigente.pdf'
  // Cotización ya en 'validating': simula que el callback anterior (el que
  // marcó pending -> validating) ya corrió, y ahora este callback está por
  // decidir markValid/markInvalid.
  await setup.query(
    `INSERT INTO peticion_cotizaciones
       (id, peticion_id, proveedor_razon_social, proveedor_clave, proveedor_pais, proveedor_id_fiscal,
        proveedor_id_fiscal_clave, empresa_constituida, emite_factura_fiscal, archivo_nombre,
        upload_nonce, expected_pathname, upload_status, upload_attempts, uploaded_by, uploaded_by_snapshot)
     VALUES
       (9, 4, $1, $2, 'PA', $3, $4, true, true, 'cotizacion.pdf', 'vigente', $5, 'validating', 1, 8, $6::jsonb)`,
    [razonSocial, normalizeSupplierName(razonSocial), fiscalId, normalizeFiscalId(fiscalId), pathname, JSON.stringify(actorSnapshot)]
  )

  const adapter = buildAdapter(pool, schema)
  const uploaded = { pathname, contentType: 'application/pdf' }
  const tokenPayload = JSON.stringify({ v: 1, uid: 8, peticionId: 4, cotizacionId: 9, nonce: 'vigente', pathname })
  const service = createPeticionUploadService({
    repo: adapter,
    blob: { inspect: async () => ({ bytes: 10, sha256: 'a'.repeat(64) }) },
  })

  // Conexión A: toma el lock de fila de la petición y la mueve a un estado
  // terminal SIN confirmar todavía.
  const connA = await pool.connect()
  await connA.query(`SET search_path TO "${schema}"`)
  await connA.query('BEGIN')
  await connA.query('SELECT * FROM peticiones WHERE id = $1 FOR UPDATE', [4])
  await connA.query(
    `UPDATE peticiones
     SET estado = $2, anulada_at = CASE WHEN $2 = 'Anulada' THEN now() ELSE NULL END, updated_at = now()
     WHERE id = $1`,
    [4, terminalEstado]
  )

  // Conexión B: el callback de Blob, iniciado mientras A todavía retiene el
  // lock. Debe bloquearse en el lockPeticion de su transacción final.
  const pendingComplete = service.complete({ blob: uploaded, tokenPayload })

  const monitor = await pool.connect()
  let waiting = false
  try {
    waiting = await waitForLockWaiter(monitor)
  } finally {
    monitor.release()
  }
  assert.ok(waiting, 'El callback nunca quedó bloqueado esperando el lock de la petición.')

  await connA.query('COMMIT')
  connA.release()

  const result = await pendingComplete
  assert.equal(result.invalid, true)

  const [quote] = (await setup.query('SELECT upload_status FROM peticion_cotizaciones WHERE id = 9')).rows
  assert.notEqual(quote.upload_status, 'valid')

  const cleanup = (await setup.query('SELECT motivo FROM peticion_blob_cleanup WHERE blob_pathname = $1', [pathname])).rows
  assert.ok(cleanup.some((row) => row.motivo === 'terminal_state'), 'esperaba una fila de limpieza con motivo terminal_state')
}

test('un callback en vuelo se invalida si la petición pasa a Cumplido mientras espera el lock', async (t) => {
  await runTerminalStateScenario(t, 'Cumplido')
})

test('un callback en vuelo se invalida si la petición pasa a Anulada mientras espera el lock', async (t) => {
  await runTerminalStateScenario(t, 'Anulada')
})
