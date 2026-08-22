import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { runMigration } from '../../scripts/migrate-peticiones-cotizaciones-2026-08-21.mjs'

neonConfig.webSocketConstructor = ws
const DATABASE_URL = process.env.PETICIONES_TEST_DATABASE_URL
if (!DATABASE_URL) throw new Error('Define PETICIONES_TEST_DATABASE_URL con una base desechable.')

test('migración y restricciones en PostgreSQL real', async (t) => {
  const schema = `peticiones_test_${randomUUID().replaceAll('-', '')}`
  const pool = new Pool({ connectionString: DATABASE_URL })
  const db = await pool.connect()
  t.after(async () => {
    await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
    db.release()
    await pool.end()
  })
  await db.query(`CREATE SCHEMA "${schema}"`)
  await db.query(`SET search_path TO "${schema}"`)
  await db.query(`CREATE TABLE centros (id SERIAL PRIMARY KEY, nombre TEXT NOT NULL)`)
  await db.query(`CREATE TABLE usuarios (id SERIAL PRIMARY KEY, nombre TEXT NOT NULL, email TEXT NOT NULL, rol TEXT NOT NULL, centro_id INTEGER, password_hash TEXT)`)
  await db.query(`CREATE TABLE peticiones (id SERIAL PRIMARY KEY, centro_id INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE, anio INTEGER NOT NULL, trimestre INTEGER NOT NULL, texto TEXT NOT NULL, estado TEXT NOT NULL DEFAULT 'Próximo trimestre', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`)
  await db.query(`INSERT INTO centros (id, nombre) VALUES (10, 'CENTRO 10')`)
  await db.query(`INSERT INTO usuarios (id, nombre, email, rol, centro_id, password_hash) VALUES (8, 'Ana', 'ana@aloha.com', 'administradora', 10, 'hash')`)
  await db.query(`INSERT INTO peticiones (id, centro_id, anio, trimestre, texto) VALUES (41, 10, 2026, 3, 'Anterior')`)
  const expand = readFileSync(new URL('../../db/migrations/2026-08-21-peticiones-cotizaciones-expand.sql', import.meta.url), 'utf8')
  const contract = readFileSync(new URL('../../db/migrations/2026-08-21-peticiones-cotizaciones-contract.sql', import.meta.url), 'utf8')
  await assert.rejects(
    () => runMigration({ client: db, phase: 'expand', ddl: expand, apply: true, schema, injectFailure: true }),
    /Fallo de prueba después del DDL/
  )
  const rolledBack = await db.query(`
    SELECT to_regclass($1) AS quote_table,
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = $2 AND table_name = 'peticiones' AND column_name = 'tipo') AS tipo_exists
  `, [`${schema}.peticion_cotizaciones`, schema])
  assert.deepEqual(rolledBack.rows[0], { quote_table: null, tipo_exists: false })
  const dryRun = await runMigration({ client: db, phase: 'expand', ddl: expand, apply: false, schema })
  assert.equal(dryRun.applied, false)
  await runMigration({ client: db, phase: 'expand', ddl: expand, apply: true, schema })
  await runMigration({ client: db, phase: 'expand', ddl: expand, apply: true, schema })
  const legacy = await db.query(`SELECT tipo, submitted_at IS NOT NULL AS submitted FROM peticiones WHERE id = 41`)
  assert.deepEqual(legacy.rows[0], { tipo: 'legado', submitted: true })

  await db.query(`
    INSERT INTO peticiones
      (id, centro_id, anio, trimestre, texto, estado, tipo, categoria, created_by, created_by_snapshot, submitted_at)
    VALUES
      (42, 10, 2026, 3, 'Reparar', 'Próximo trimestre', 'peticion', 'reparacion', 8, '{"id":8,"nombre":"Ana"}'::jsonb, now())
  `)
  await assert.rejects(() => db.query(`
    INSERT INTO peticion_cotizaciones
      (peticion_id, proveedor_razon_social, proveedor_clave, proveedor_pais, proveedor_id_fiscal,
       proveedor_id_fiscal_clave, empresa_constituida, emite_factura_fiscal, upload_status)
    VALUES (42, 'Proveedor Ficticio', 'proveedor ficticio', 'ZZ', '155-ZZ', '155ZZ', true, true, 'pending')
  `), (error) => error.code === '23503')
  await db.query(`
    INSERT INTO peticion_cotizaciones
      (peticion_id, proveedor_razon_social, proveedor_clave, proveedor_pais, proveedor_id_fiscal,
       proveedor_id_fiscal_clave, empresa_constituida, emite_factura_fiscal, blob_pathname,
       archivo_nombre, archivo_mime, archivo_bytes, archivo_sha256, upload_nonce, expected_pathname,
       upload_status, upload_attempts, uploaded_by, uploaded_by_snapshot, validada_at)
    VALUES
      (42, 'Proveedor Uno', 'proveedor uno', 'PA', '155-1', '1551', true, true,
       'peticiones/42/a.pdf', 'a.pdf', 'application/pdf', 10, repeat('a', 64), 'n-a',
       'peticiones/42/a.pdf', 'valid', 1, 8, '{"id":8,"nombre":"Ana"}'::jsonb, now())
  `)
  await assert.rejects(() => db.query(`
    INSERT INTO peticion_cotizaciones
      (peticion_id, proveedor_razon_social, proveedor_clave, proveedor_pais, proveedor_id_fiscal,
       proveedor_id_fiscal_clave, empresa_constituida, emite_factura_fiscal, upload_status)
    VALUES (42, 'Proveedor Duplicado', 'proveedor duplicado', 'PA', '1551', '1551', true, true, 'pending')
  `), (error) => error.code === '23505' && error.constraint === 'uq_peticion_proveedor_fiscal')
  await assert.rejects(() => db.query(`
    INSERT INTO peticion_cotizaciones
      (peticion_id, proveedor_razon_social, proveedor_clave, proveedor_pais, proveedor_id_fiscal,
       proveedor_id_fiscal_clave, empresa_constituida, emite_factura_fiscal, blob_pathname,
       archivo_nombre, archivo_mime, archivo_bytes, archivo_sha256, upload_nonce, expected_pathname,
       upload_status, upload_attempts, uploaded_by, uploaded_by_snapshot, validada_at)
    VALUES
      (42, 'Proveedor Dos', 'proveedor dos', 'PA', '155-2', '1552', true, true,
       'peticiones/42/b.pdf', 'b.pdf', 'application/pdf', 10, repeat('a', 64), 'n-b',
       'peticiones/42/b.pdf', 'valid', 1, 8, '{"id":8,"nombre":"Ana"}'::jsonb, now())
  `), (error) => error.code === '23505' && error.constraint === 'uq_peticion_pdf_sha')

  await db.query(`INSERT INTO peticion_blob_cleanup (blob_pathname, motivo) VALUES ('peticiones/cola-a.pdf', 'test'), ('peticiones/cola-b.pdf', 'test')`)
  const claimSql = `
    WITH claimed AS (
      SELECT id FROM peticion_blob_cleanup
      WHERE completed_at IS NULL AND intentos < $1 AND proximo_intento_at <= now()
        AND (locked_at IS NULL OR locked_at < $2)
      ORDER BY id FOR UPDATE SKIP LOCKED LIMIT $3
    )
    UPDATE peticion_blob_cleanup q SET locked_at = now(), lock_token = $4, lock_generation = q.generation
    FROM claimed WHERE q.id = claimed.id RETURNING q.*
  `
  const worker2 = await pool.connect()
  let firstClaim
  try {
    await worker2.query(`SET search_path TO "${schema}"`)
    await db.query('BEGIN')
    await worker2.query('BEGIN')
    firstClaim = await db.query(claimSql, [5, new Date('2026-08-21T11:55:00Z'), 1, 'lock-a'])
    const secondClaim = await worker2.query(claimSql, [5, new Date('2026-08-21T11:55:00Z'), 1, 'lock-b'])
    assert.equal(firstClaim.rowCount, 1)
    assert.equal(secondClaim.rowCount, 1)
    assert.notEqual(firstClaim.rows[0].id, secondClaim.rows[0].id)
    await db.query('COMMIT')
    await worker2.query('COMMIT')
  } finally {
    await db.query('ROLLBACK').catch(() => {})
    await worker2.query('ROLLBACK').catch(() => {})
    worker2.release()
  }
  const staleWorker = await db.query(
    `UPDATE peticion_blob_cleanup SET completed_at = now() WHERE id = $1 AND lock_token = $2 RETURNING id`,
    [firstClaim.rows[0].id, 'lock-obsoleto']
  )
  assert.equal(staleWorker.rowCount, 0)
  await db.query(`UPDATE peticion_blob_cleanup SET intentos = 5, ultimo_error = 'agotado' WHERE id = $1`, [firstClaim.rows[0].id])
  await db.query(`
    INSERT INTO peticion_blob_cleanup (blob_pathname, motivo)
    VALUES ($1, 'nueva_obligacion')
    ON CONFLICT (blob_pathname) DO UPDATE SET
      motivo = EXCLUDED.motivo, generation = peticion_blob_cleanup.generation + 1,
      intentos = 0, ultimo_error = NULL, locked_at = NULL, lock_token = NULL,
      lock_generation = NULL, completed_at = NULL, proximo_intento_at = now()
  `, [firstClaim.rows[0].blob_pathname])
  const reopened = await db.query(`SELECT generation, intentos, locked_at, lock_token, lock_generation FROM peticion_blob_cleanup WHERE id = $1`, [firstClaim.rows[0].id])
  assert.deepEqual(reopened.rows[0], { generation: 2, intentos: 0, locked_at: null, lock_token: null, lock_generation: null })
  const fencedWorker = await db.query(
    `UPDATE peticion_blob_cleanup SET completed_at = now() WHERE id = $1 AND lock_token = $2 AND lock_generation = generation RETURNING id`,
    [firstClaim.rows[0].id, 'lock-a']
  )
  assert.equal(fencedWorker.rowCount, 0)

  await db.query(`DELETE FROM usuarios WHERE id = 8`)
  const actors = await db.query(`
    SELECT p.created_by, p.created_by_snapshot->>'nombre' AS creator,
           c.uploaded_by, c.uploaded_by_snapshot->>'nombre' AS uploader
    FROM peticiones p JOIN peticion_cotizaciones c ON c.peticion_id = p.id
    WHERE p.id = 42
  `)
  assert.deepEqual(actors.rows[0], { created_by: null, creator: 'Ana', uploaded_by: null, uploader: 'Ana' })
  await assert.rejects(() => db.query(`DELETE FROM centros WHERE id = 10`), (error) => error.code === '23503')

  await runMigration({ client: db, phase: 'contract', ddl: contract, apply: true, schema })
  const contracted = await db.query(`
    SELECT is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = 'peticiones' AND column_name = 'tipo'
  `, [schema])
  assert.deepEqual(contracted.rows[0], { is_nullable: 'NO', column_default: null })
  const constraints = await db.query(`
    SELECT bool_and(convalidated) AS all_valid
    FROM pg_constraint
    WHERE conrelid = $1::regclass AND conname = ANY($2::text[])
  `, [`${schema}.peticiones`, ['peticiones_tipo_check', 'peticiones_estado_check', 'peticiones_tipo_categoria_check', 'peticiones_anulada_at_check']])
  assert.equal(constraints.rows[0].all_valid, true)
})
