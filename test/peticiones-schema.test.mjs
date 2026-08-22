import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ISO_COUNTRY_CODES } from '../lib/iso-countries.mjs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('la expansión conserva legacy, restringe borrados y crea auditoría/cola', () => {
  const sql = read('../db/migrations/2026-08-21-peticiones-cotizaciones-expand.sql')
  assert.match(sql, /UPDATE peticiones[\s\S]+tipo = 'legado'/)
  assert.match(sql, /peticiones_centro_id_fkey[\s\S]+ON DELETE RESTRICT/)
  assert.match(sql, /conkey = ARRAY[\s\S]+attname = 'centro_id'/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS peticion_cotizaciones/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS iso_paises/)
  assert.match(sql, /proveedor_pais CHAR\(2\) NOT NULL REFERENCES iso_paises\(codigo\)/)
  assert.match(sql, /UNIQUE \(peticion_id, proveedor_pais, proveedor_id_fiscal_clave\)/)
  assert.match(sql, /CONSTRAINT uq_peticion_proveedor_fiscal UNIQUE/)
  assert.match(sql, /CONSTRAINT uq_peticion_pdf_sha UNIQUE/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS peticion_estado_historial/)
  assert.match(sql, /peticion_historial_inicial_check[\s\S]+estado_anterior IS NOT NULL OR estado_nuevo = 'Próximo trimestre'/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS peticion_blob_cleanup/)
  const seed = sql.match(/regexp_split_to_table\('([A-Z ]+)'/)
  assert.deepEqual(seed?.[1].split(' '), ISO_COUNTRY_CODES)
})

test('la contracción elimina el default temporal y valida restricciones', () => {
  const sql = read('../db/migrations/2026-08-21-peticiones-cotizaciones-contract.sql')
  assert.match(sql, /ALTER COLUMN tipo DROP DEFAULT/)
  assert.match(sql, /ALTER COLUMN tipo SET NOT NULL/)
  assert.match(sql, /VALIDATE CONSTRAINT peticiones_tipo_categoria_check/)
})

test('el runner es dry-run por defecto y usa transacción con advisory lock', () => {
  const source = read('../scripts/migrate-peticiones-cotizaciones-2026-08-21.mjs')
  assert.match(source, /const apply = args\.includes\('--apply'\)/)
  assert.match(source, /if \(!apply\)/)
  assert.match(source, /BEGIN/)
  assert.match(source, /pg_advisory_xact_lock/)
  assert.match(source, /SET LOCAL lock_timeout/)
  assert.match(source, /LOCK TABLE peticiones IN ACCESS EXCLUSIVE MODE/)
  assert.match(source, /ROLLBACK/)
  assert.ok(source.indexOf('LOCK TABLE peticiones IN ACCESS EXCLUSIVE MODE') < source.indexOf('const lockedPreflight'))
  assert.ok(source.indexOf('const lockedPreflight') < source.indexOf('client.query(ddl)'))
})

test('la cola tiene claim recuperable para cron concurrente', () => {
  const sql = read('../db/migrations/2026-08-21-peticiones-cotizaciones-expand.sql')
  assert.match(sql, /locked_at TIMESTAMPTZ/)
  assert.match(sql, /lock_token TEXT/)
  assert.match(sql, /generation INTEGER NOT NULL DEFAULT 1/)
  assert.match(sql, /lock_generation INTEGER/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS peticion_cleanup_checkpoint/)
})

test('la migración de aprobación agrega la columna y la FK nombrada', () => {
  const sql = read('../db/migrations/2026-08-22-peticion-aprobacion.sql')
  assert.match(sql, /ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS cotizacion_aprobada_id INTEGER/)
  assert.match(sql, /peticiones_cotizacion_aprobada_fkey/)
  assert.match(sql, /FOREIGN KEY \(cotizacion_aprobada_id\) REFERENCES peticion_cotizaciones\(id\) ON DELETE SET NULL/)
})

test('schema.sql declara cotizacion_aprobada_id en peticiones', () => {
  const schema = read('../db/schema.sql')
  assert.match(schema, /cotizacion_aprobada_id\s+INTEGER/)
  assert.match(schema, /peticiones_cotizacion_aprobada_fkey/)
})

test('el runner de aprobación es dry-run por defecto y usa advisory lock', () => {
  const source = read('../scripts/migrate-peticion-aprobacion-2026-08-22.mjs')
  assert.match(source, /const apply = args\.includes\('--apply'\)/)
  assert.match(source, /if \(!apply\)/)
  assert.match(source, /pg_advisory_xact_lock/)
  assert.match(source, /SET LOCAL lock_timeout/)
  assert.match(source, /ROLLBACK/)
})
