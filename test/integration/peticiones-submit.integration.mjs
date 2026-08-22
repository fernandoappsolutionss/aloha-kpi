// Prueba de concurrencia real contra PostgreSQL: dos envíos simultáneos del
// mismo borrador solo deben producir un envío y un único evento de historial
// inicial. No usa mocks de bloqueo (Promise chain / mutex JS) — el
// aislamiento SERIALIZABLE + el FOR UPDATE de lockPeticion son los que
// garantizan el resultado, igual que en producción (lib/peticiones-service.mjs
// + lib/peticiones-repository.js). Requiere PETICIONES_TEST_DATABASE_URL; sin
// esa variable el archivo revienta al importarse (mismo patrón que
// peticiones-db.integration.mjs) y npm test (que no incluye test/integration/)
// nunca la ejecuta.
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { runMigration } from '../../scripts/migrate-peticiones-cotizaciones-2026-08-21.mjs'
import { createPeticionesService } from '../../lib/peticiones-service.mjs'
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

// Mismo agregado seguro de cotizaciones que lib/peticiones-repository.js
// (nunca expone blob_pathname/expected_pathname/upload_nonce/archivo_sha256).
const QUOTES_SUBQUERY = `
  COALESCE((
    SELECT json_agg(json_build_object(
      'id', c.id,
      'proveedor_razon_social', c.proveedor_razon_social,
      'proveedor_pais', c.proveedor_pais,
      'proveedor_id_fiscal', c.proveedor_id_fiscal,
      'empresa_constituida', c.empresa_constituida,
      'emite_factura_fiscal', c.emite_factura_fiscal,
      'archivo_nombre', c.archivo_nombre,
      'archivo_bytes', c.archivo_bytes,
      'upload_status', c.upload_status,
      'upload_attempts', c.upload_attempts,
      'validation_error', c.validation_error,
      'validada_at', c.validada_at,
      'created_at', c.created_at
    ) ORDER BY c.id)
    FROM peticion_cotizaciones c
    WHERE c.peticion_id = p.id
  ), '[]'::json) AS cotizaciones
`

// Adaptador del mismo contrato PeticionRepository que lib/peticiones-repository.js,
// pero cada `transaction()` toma su PROPIA conexión del pool (no comparte la
// del setup) — así dos envíos concurrentes de verdad compiten por el
// FOR UPDATE de lockPeticion en lugar de serializarse por JS.
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

    async listSubmitted({ centroId, anio, trimestre }) {
      return withSchema((query) => query(
        `SELECT p.*, ${QUOTES_SUBQUERY}
         FROM peticiones p
         WHERE p.centro_id = $1 AND p.anio = $2 AND p.trimestre = $3 AND p.submitted_at IS NOT NULL
         ORDER BY p.id`,
        [Number(centroId), Number(anio), Number(trimestre)]
      ))
    },

    async listDrafts({ centroId, anio, trimestre }, actor) {
      return withSchema((query) => (
        actor?.rol === 'administradora'
          ? query(
              `SELECT p.*, ${QUOTES_SUBQUERY}
               FROM peticiones p
               WHERE p.centro_id = $1 AND p.anio = $2 AND p.trimestre = $3 AND p.submitted_at IS NULL AND p.created_by = $4
               ORDER BY p.id`,
              [Number(centroId), Number(anio), Number(trimestre), actor.id]
            )
          : query(
              `SELECT p.*, ${QUOTES_SUBQUERY}
               FROM peticiones p
               WHERE p.centro_id = $1 AND p.anio = $2 AND p.trimestre = $3 AND p.submitted_at IS NULL
               ORDER BY p.id`,
              [Number(centroId), Number(anio), Number(trimestre)]
            )
      ))
    },

    async insertComentario(query, data) {
      const [row] = await query(
        `INSERT INTO peticiones
           (centro_id, anio, trimestre, texto, tipo, categoria, estado, created_by, created_by_snapshot, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
         RETURNING *`,
        [data.centro_id, data.anio, data.trimestre, data.texto, data.tipo, data.categoria,
          data.estado, data.created_by, JSON.stringify(data.created_by_snapshot), data.submitted_at]
      )
      return row
    },

    async insertDraft(query, data) {
      const [row] = await query(
        `INSERT INTO peticiones
           (centro_id, anio, trimestre, texto, tipo, categoria, estado, created_by, created_by_snapshot, submitted_at, draft_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)
         RETURNING *`,
        [data.centro_id, data.anio, data.trimestre, data.texto, data.tipo, data.categoria,
          data.estado, data.created_by, JSON.stringify(data.created_by_snapshot), data.submitted_at, data.draft_expires_at]
      )
      return row
    },

    async lockPeticion(query, id) {
      const [row] = await query('SELECT * FROM peticiones WHERE id = $1 FOR UPDATE', [id])
      return row
    },

    async listQuotes(query, peticionId, { forUpdate = false } = {}) {
      const text = forUpdate
        ? 'SELECT * FROM peticion_cotizaciones WHERE peticion_id = $1 ORDER BY id FOR UPDATE'
        : 'SELECT * FROM peticion_cotizaciones WHERE peticion_id = $1 ORDER BY id'
      return await query(text, [peticionId])
    },

    async updateComentario(query, data) {
      const [row] = await query(
        'UPDATE peticiones SET texto = $2, updated_at = now() WHERE id = $1 RETURNING *',
        [data.id, data.texto]
      )
      return row
    },

    async updateDraft(query, data) {
      const [row] = await query(
        `UPDATE peticiones
         SET texto = $2, categoria = $3, draft_expires_at = $4, updated_at = now()
         WHERE id = $1 AND submitted_at IS NULL
         RETURNING *`,
        [data.id, data.texto, data.categoria, data.draft_expires_at]
      )
      return row
    },

    async markSubmitted(query, data) {
      const [row] = await query(
        `UPDATE peticiones
         SET submitted_at = $2, draft_expires_at = NULL, updated_at = now()
         WHERE id = $1 AND submitted_at IS NULL
         RETURNING *`,
        [data.id, data.submitted_at]
      )
      return row
    },

    async changeStatus(query, data) {
      const [row] = await query(
        `UPDATE peticiones
         SET estado = $2, anulada_at = $3, updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [data.id, data.estado, data.anulada_at]
      )
      return row
    },

    async insertHistory(query, event) {
      await query(
        `INSERT INTO peticion_estado_historial
           (peticion_id, estado_anterior, estado_nuevo, changed_by, changed_by_snapshot, created_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)
         ON CONFLICT (peticion_id) WHERE estado_anterior IS NULL DO NOTHING`,
        [event.peticion_id, event.estado_anterior, event.estado_nuevo, event.changed_by,
          JSON.stringify(event.changed_by_snapshot), event.created_at]
      )
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

    async deleteIncompleteDraftQuotes(query, id) {
      await query("DELETE FROM peticion_cotizaciones WHERE peticion_id = $1 AND upload_status <> 'valid'", [id])
    },

    async deleteDraftQuotes(query, id) {
      await query('DELETE FROM peticion_cotizaciones WHERE peticion_id = $1', [id])
    },

    async deleteDraft(query, id) {
      await query('DELETE FROM peticiones WHERE id = $1 AND submitted_at IS NULL', [id])
    },
  }
}

test('dos submits concurrentes contra PostgreSQL real producen un envío y un evento inicial', async (t) => {
  const schema = `peticiones_submit_test_${randomUUID().replaceAll('-', '')}`
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
  await setup.query(
    `INSERT INTO peticiones
       (id, centro_id, anio, trimestre, texto, estado, tipo, categoria, created_by, created_by_snapshot, submitted_at)
     VALUES
       (4, 10, 2026, 3, 'Reparar', 'Próximo trimestre', 'peticion', 'reparacion', 8, $1::jsonb, NULL)`,
    [JSON.stringify(actorSnapshot)]
  )

  for (const id of ['1', '2', '3']) {
    const razonSocial = `Proveedor ${id}`
    const fiscalId = `155-${id}`
    const pathname = `peticiones/4/${id}.pdf`
    await setup.query(
      `INSERT INTO peticion_cotizaciones
         (peticion_id, proveedor_razon_social, proveedor_clave, proveedor_pais, proveedor_id_fiscal,
          proveedor_id_fiscal_clave, empresa_constituida, emite_factura_fiscal, blob_pathname,
          archivo_nombre, archivo_mime, archivo_bytes, archivo_sha256, upload_nonce, expected_pathname,
          upload_status, upload_attempts, uploaded_by, uploaded_by_snapshot, validada_at)
       VALUES
         (4, $1, $2, 'PA', $3, $4, true, true, $5, $6, 'application/pdf', 10, $7, 'nonce', $5, 'valid', 1, 8, $8::jsonb, now())`,
      [
        razonSocial,
        normalizeSupplierName(razonSocial),
        fiscalId,
        normalizeFiscalId(fiscalId),
        pathname,
        `${id}.pdf`,
        id.repeat(64),
        JSON.stringify(actorSnapshot),
      ]
    )
  }

  const adapter = buildAdapter(pool, schema)
  const actor = { id: 8, nombre: 'Ana', email: 'ana@aloha.com', rol: 'administradora', centro_id: 10 }
  const service = createPeticionesService({ repo: adapter, verifyQuote: async () => {} })

  const results = await Promise.all([
    service.submitPeticion(actor, { centroId: 10, id: 4 }),
    service.submitPeticion(actor, { centroId: 10, id: 4 }),
  ])

  assert.deepEqual(results.map((result) => result.alreadySubmitted).sort(), [false, true])
  for (const result of results) assert.ok(result.peticion.submitted_at, 'submitted_at debe quedar no nulo')

  const history = await setup.query(
    'SELECT * FROM peticion_estado_historial WHERE peticion_id = $1 AND estado_anterior IS NULL',
    [4]
  )
  assert.equal(history.rows.length, 1)
})
