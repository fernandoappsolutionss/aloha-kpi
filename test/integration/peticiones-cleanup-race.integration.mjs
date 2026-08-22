// Prueba de concurrencia real contra PostgreSQL: la reconciliación de cargas
// vencidas (lib/peticiones-repository.js:reconcileStaleAttempts) debe cerrar
// la puerta a un callback de Blob tardío exactamente igual que el paso a
// estado terminal (test/integration/peticiones-callback.integration.mjs) —
// aquí el "terminal" lo produce el propio cron de limpieza, no un cambio de
// estado de la petición. No usa mocks de bloqueo: el FOR UPDATE SKIP LOCKED
// real de Postgres es el que ordena las dos transacciones. Requiere
// PETICIONES_TEST_DATABASE_URL; sin esa variable el archivo revienta al
// importarse (mismo patrón que los demás test/integration/*) y npm test (que
// no incluye test/integration/) nunca la ejecuta.
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { runMigration } from '../../scripts/migrate-peticiones-cotizaciones-2026-08-21.mjs'
import { normalizeSupplierName, normalizeFiscalId } from '../../lib/peticiones-domain.mjs'

neonConfig.webSocketConstructor = ws
const DATABASE_URL = process.env.PETICIONES_TEST_DATABASE_URL
if (!DATABASE_URL) throw new Error('Define PETICIONES_TEST_DATABASE_URL con una base desechable.')

// Texto EXACTO del claim de reconcileStaleAttempts (lib/peticiones-repository.js):
// reclama con SKIP LOCKED las cargas 'pending'/'validating' vencidas y las
// flipea a 'cleanup_pending' en el mismo statement.
const STALE_CLAIM_SQL = `
  WITH stale AS (
    SELECT id
    FROM peticion_cotizaciones
    WHERE upload_status IN ('pending', 'validating') AND updated_at < $1
    ORDER BY id
    FOR UPDATE SKIP LOCKED
    LIMIT $2
  )
  UPDATE peticion_cotizaciones c
  SET upload_status = 'cleanup_pending', validation_error = 'La carga venció antes de validarse.', updated_at = now()
  FROM stale
  WHERE c.id = stale.id AND c.upload_status IN ('pending', 'validating')
  RETURNING c.id, c.blob_pathname, c.expected_pathname
`

// Texto EXACTO de enqueueCleanup (lib/peticiones-repository.js).
const ENQUEUE_CLEANUP_SQL = `
  INSERT INTO peticion_blob_cleanup (blob_pathname, motivo)
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
      proximo_intento_at = now()
`

// Texto EXACTO de markValid (lib/peticiones-repository.js): el mismo UPDATE
// condicional que dispara el callback de `handleUpload` cuando el PDF quedó
// válido. Excluye explícitamente cualquier estado que no sea
// 'validating'/'valid' — 'cleanup_pending' queda fuera a propósito.
const MARK_VALID_SQL = `
  UPDATE peticion_cotizaciones
  SET upload_status = 'valid', blob_pathname = $3, archivo_mime = $4, archivo_bytes = $5,
      archivo_sha256 = $6, validada_at = $7, updated_at = now()
  WHERE id = $1 AND upload_nonce = $2 AND expected_pathname = $3 AND upload_status IN ('validating', 'valid')
  RETURNING *
`

// Sondea pg_stat_activity hasta ver el UPDATE de markValid bloqueado
// esperando el lock de fila que retiene la reconciliación (conexión A). No es
// un sleep a ciegas: se detiene apenas detecta el bloqueo, con un tope de
// intentos para no colgarse si algo salió mal.
async function waitForLockWaiter(monitor) {
  for (let attempt = 0; attempt < 150; attempt++) {
    const { rows } = await monitor.query(
      `SELECT pid FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND query ILIKE '%SET upload_status = ''valid''%'`
    )
    if (rows.length) return true
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  return false
}

test('reconciliar una carga vencida invalida un markValid tardío en vuelo y no duplica la cola en el segundo barrido', async (t) => {
  const schema = `peticiones_cleanup_race_test_${randomUUID().replaceAll('-', '')}`
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
       (4, 10, 2026, 3, 'Reparar', 'En proceso', 'peticion', 'reparacion', 8, $1::jsonb, now())`,
    [JSON.stringify(actorSnapshot)]
  )

  const razonSocial = 'Proveedor Uno'
  const fiscalId = '155-1'
  const nonce = 'vigente-nonce'
  const pathname = 'peticiones/4/vigente.pdf'
  // Cotización 'validating' con metadata completa del PDF (nonce +
  // expected_pathname): simula un callback que arrancó pero nunca terminó de
  // confirmar. Se inserta con updated_at por defecto y luego se atrasa a más
  // de 60 minutos con un UPDATE explícito — así no pasa por markValidating.
  await setup.query(
    `INSERT INTO peticion_cotizaciones
       (id, peticion_id, proveedor_razon_social, proveedor_clave, proveedor_pais, proveedor_id_fiscal,
        proveedor_id_fiscal_clave, empresa_constituida, emite_factura_fiscal, archivo_nombre,
        upload_nonce, expected_pathname, upload_status, upload_attempts, uploaded_by, uploaded_by_snapshot)
     VALUES
       (9, 4, $1, $2, 'PA', $3, $4, true, true, 'cotizacion.pdf', $5, $6, 'validating', 1, 8, $7::jsonb)`,
    [razonSocial, normalizeSupplierName(razonSocial), fiscalId, normalizeFiscalId(fiscalId), nonce, pathname, JSON.stringify(actorSnapshot)]
  )
  const staleUpdatedAt = new Date(Date.now() - 90 * 60000)
  await setup.query(`UPDATE peticion_cotizaciones SET updated_at = $1 WHERE id = 9`, [staleUpdatedAt])

  const staleThreshold = new Date(Date.now() - 60 * 60000)

  // Conexión A: reproduce la transacción real de reconcileStaleAttempts —
  // reclama la fila vencida, la flipea a 'cleanup_pending' y encola su
  // pathname — pero SIN confirmar todavía, para que B compita de verdad por
  // el lock de fila.
  const connA = await pool.connect()
  await connA.query(`SET search_path TO "${schema}"`)
  await connA.query('BEGIN')
  const claimed = await connA.query(STALE_CLAIM_SQL, [staleThreshold, 100])
  assert.equal(claimed.rows.length, 1)
  assert.equal(claimed.rows[0].id, 9)
  assert.equal(claimed.rows[0].expected_pathname, pathname)
  for (const row of claimed.rows) {
    const pathnames = [...new Set([row.blob_pathname, row.expected_pathname].filter(Boolean))]
    for (const p of pathnames) {
      await connA.query(ENQUEUE_CLEANUP_SQL, [p, 'upload_stale'])
    }
  }

  // Conexión B: el callback de Blob, iniciado mientras A todavía retiene el
  // lock de la fila. Debe bloquearse en el UPDATE de markValid.
  const connB = await pool.connect()
  await connB.query(`SET search_path TO "${schema}"`)
  const pendingB = connB.query(MARK_VALID_SQL, [9, nonce, pathname, 'application/pdf', 10, 'a'.repeat(64), new Date()])

  const monitor = await pool.connect()
  let waiting = false
  try {
    waiting = await waitForLockWaiter(monitor)
  } finally {
    monitor.release()
  }
  assert.ok(waiting, 'El markValid tardío nunca quedó bloqueado esperando el lock de la cotización.')

  await connA.query('COMMIT')
  connA.release()

  const resultB = await pendingB
  connB.release()
  assert.equal(resultB.rowCount, 0, 'El markValid tardío no debía afectar ninguna fila.')

  const [quote] = (await setup.query('SELECT upload_status FROM peticion_cotizaciones WHERE id = 9')).rows
  assert.equal(quote.upload_status, 'cleanup_pending')

  const queueRows = (await setup.query('SELECT generation FROM peticion_blob_cleanup WHERE blob_pathname = $1', [pathname])).rows
  assert.equal(queueRows.length, 1)
  assert.equal(queueRows[0].generation, 1)

  // Segunda pasada: la fila ya no está en 'pending'/'validating', así que el
  // claim no debe recogerla ni volver a encolar (generation intacta).
  const secondPass = await setup.query(STALE_CLAIM_SQL, [staleThreshold, 100])
  assert.equal(secondPass.rows.length, 0)

  const queueRowsAfter = (await setup.query('SELECT generation FROM peticion_blob_cleanup WHERE blob_pathname = $1', [pathname])).rows
  assert.equal(queueRowsAfter.length, 1)
  assert.equal(queueRowsAfter[0].generation, 1)
})
