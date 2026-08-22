import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8')

const MIGRACION = '../db/migrations/2026-08-22-conciliacion-zoho.sql'

test('la migración crea las cuatro tablas del conciliador', () => {
  const sql = read(MIGRACION)
  for (const tabla of ['conciliacion_cuentas', 'conciliacion_reglas', 'conciliacion_lotes', 'conciliacion_movimientos']) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${tabla}`))
  }
})

// Dos filas apuntando a la misma cuenta de Zoho partirían en dos el historial
// de huellas y el mismo movimiento podría publicarse por ambas.
test('una cuenta de Zoho solo puede mapearse una vez', () => {
  assert.match(
    read(MIGRACION),
    /CREATE UNIQUE INDEX IF NOT EXISTS idx_concil_cuentas_zoho\s+ON conciliacion_cuentas \(zoho_org_id, zoho_account_id\)/,
  )
})

// El candado contra el doble asiento tiene que cerrarse ANTES de llamar a
// Zoho: si el índice solo cubriera 'publicado', dos procesos podrían reclamar
// la misma línea, ambos crear el movimiento en Zoho y chocar después, con el
// asiento duplicado ya escrito.
test('el índice antidoble cubre también el estado publicando', () => {
  const sql = read(MIGRACION)
  assert.match(sql, /idx_concil_mov_publicado_unico[\s\S]*?ON conciliacion_movimientos \(cuenta_id, huella\)/)
  assert.match(sql, /WHERE estado IN \('publicado', 'publicando'\)/)
})

test('el reclamo del movimiento traduce la violación del índice en "no reclamado"', () => {
  const repo = read('../lib/conciliacion-repository.js')
  assert.match(repo, /estado = 'publicando'/)
  assert.match(repo, /AND m\.estado = 'nuevo'/)
  assert.match(repo, /e\?\.code === '23505'/)
})

test('los CHECK van en línea y no en bloques plpgsql', () => {
  const sql = read(MIGRACION)
  assert.match(sql, /CHECK \(modo IN \('contiene', 'empieza', 'termina', 'palabras'\)\)/)
  assert.match(sql, /CHECK \(direccion IN \('entrada', 'salida', 'ambas'\)\)/)
  assert.doesNotMatch(sql, /DO \$\$/)
})

// schema.sql se pega entero en Neon para una base nueva: si se quedara atrás
// de la migración, una instalación limpia nacería sin el conciliador.
test('schema.sql trae la misma definición que la migración', () => {
  const schema = read('../db/schema.sql')
  const migracion = read(MIGRACION)
  const desde = (texto) => texto.slice(texto.indexOf('CREATE TABLE IF NOT EXISTS conciliacion_cuentas'))
  assert.equal(desde(schema), desde(migracion))
})

test('el runner de la migración es dry-run por defecto y toma advisory lock', () => {
  const source = read('../scripts/migrate-conciliacion-zoho-2026-08-22.mjs')
  assert.match(source, /const apply = process\.argv\.slice\(2\)\.includes\('--apply'\)/)
  assert.match(source, /if \(!apply\) return/)
  assert.match(source, /pg_advisory_xact_lock/)
  assert.match(source, /SET LOCAL lock_timeout/)
  assert.match(source, /ROLLBACK/)
})

// El cliente de Zoho jamás debe viajar al navegador ni entrar por una ruta
// pública: solo lo importan las server actions.
test('el cliente de Zoho solo se usa desde server actions', () => {
  const acciones = read('../app/actions/conciliacion.js')
  assert.match(acciones, /^'use server'/)
  assert.match(acciones, /from '\.\.\/\.\.\/lib\/zoho'/)
  const panel = read('../components/conciliacion/ConciliadorPanel.js')
  assert.doesNotMatch(panel, /lib\/zoho/)
})

// Cada acción devuelve { error } legible: si lanzara, Next ocultaría el
// mensaje en producción y el panel quedaría mudo.
test('ninguna acción del conciliador escapa sin fallo() legible', () => {
  const acciones = read('../app/actions/conciliacion.js')
  const exportadas = acciones.match(/export async function \w+/g) || []
  assert.ok(exportadas.length >= 15)
  const capturas = acciones.match(/return fallo\('/g) || []
  assert.ok(capturas.length >= exportadas.length - 1, `acciones ${exportadas.length}, capturas ${capturas.length}`)
})
