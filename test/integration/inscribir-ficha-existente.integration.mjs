import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
import vm from 'node:vm'
import pg from 'pg'
import * as operaciones from '../../lib/operaciones.js'
import { ventanaNuevos } from '../../lib/llenado.mjs'
import { colocacionInvalida } from '../../lib/colocacion.mjs'
import { anclaDeAlta } from '../../lib/retiros.mjs'
import * as fichaExistente from '../../lib/ficha-existente.mjs'
import { vincularFichaExistenteCon } from '../../lib/ficha-existente-service.mjs'

// lib/mes-kpi.js importa './db' sin extensión (estilo Next): Node lo resuelve
// con el loader del repo, registrado antes de importarlo.
register('../helpers/extensionless-js-loader.mjs', import.meta.url)
const { bloquearMesesEditables } = await import('../../lib/mes-kpi.js')

// Concurrencia REAL de inscribirEstudiante contra Postgres (SERIALIZABLE de
// verdad): el mismo niño inscrito a la vez desde varias pestañas deja UNA ficha
// y las demás reciben sus coincidencias. Corre la Server Action del repo con
// sql/withTransaction sobre `pg` (BEGIN ISOLATION LEVEL SERIALIZABLE … COMMIT,
// igual que lib/db.js). Aplica db/schema.sql y BORRA los datos: solo contra una
// base desechable.
//
//   INSCRIBIR_TEST_DATABASE_URL=postgres://… INSCRIBIR_TEST_CONFIRM=disposable npm run test:inscribir:db
//
// (Confirmación propia y no E2E_DATABASE_CONFIRM: esa variable enciende el
// modo E2E de Neon en lib/db.js, y esta prueba no pasa por Neon.)

const url = process.env.INSCRIBIR_TEST_DATABASE_URL
if (!url || process.env.INSCRIBIR_TEST_CONFIRM !== 'disposable') {
  throw new Error('INSCRIBIR_TEST_DATABASE_URL e INSCRIBIR_TEST_CONFIRM=disposable son obligatorias; esta prueba borra y siembra una DB desechable.')
}

const pool = new pg.Pool({ connectionString: url, max: 20 })
const tag = (ejecutar) => async (strings, ...values) => {
  let text = strings[0]
  for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`
  return (await ejecutar(text, values)).rows
}
const sql = tag((text, values) => pool.query(text, values))
async function withTransaction(callback) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
    const resultado = await callback(tag((text, values) => client.query(text, values)))
    await client.query('COMMIT')
    return resultado
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    throw error
  } finally {
    client.release()
  }
}

const fuente = readFileSync(new URL('../../app/actions/estudiantes.js', import.meta.url), 'utf8')
  .replace(/^'use server'$/m, '')
  .replace(/^import[\s\S]*?from .*$/gm, '')
  .replace(/export /g, '')
const { inscribirEstudiante } = vm.runInNewContext(`${fuente}\n;({ inscribirEstudiante })`, {
  requireCurrentWriteCentro: async () => ({ uid: 1, email: 'prueba@centro' }),
  sql,
  withTransaction,
  ...operaciones,
  hoyISO: () => '2026-09-30',
  ventanaNuevos, colocacionInvalida, anclaDeAlta, bloquearMesesEditables,
  // Misma lectura que el encolarSyncCrm real (sin clases de prueba vinculadas no encola nada).
  encolarSyncCrm: async (ids, motivo, query) => query`SELECT crm_event_id, grupo_id FROM centro_eventos WHERE grupo_id = ANY(${ids}::int[])`,
  ...fichaExistente,
  vincularFichaExistenteCon,
})

// Nombres solo con letras: la normalización borra los dígitos.
const letras = (n) => {
  let texto = ''
  for (let k = n + 1; k > 0; k = Math.floor((k - 1) / 26)) texto = String.fromCharCode(97 + ((k - 1) % 26)) + texto
  return texto
}
const alta = (nombre, telefono, representante) => inscribirEstudiante(1, {
  nombre, itinerario: 'TINY', nivel: 1, grupo_id: 10, origen: 'clase_prueba', origen_venta: 'marketing',
  telefono, representante, fecha: '2026-09-25',
})

before(async () => {
  await pool.query(readFileSync(new URL('../../db/schema.sql', import.meta.url), 'utf8'))
  await pool.query('TRUNCATE centros RESTART IDENTITY CASCADE')
  await pool.query(`INSERT INTO centros (id, nombre, pais) VALUES (1, 'Centro prueba', 'PA')`)
  await pool.query(`INSERT INTO grupos (id, centro_id, numero, itinerario, estado, inscripcion_abierta, fecha_inicio_clases)
    VALUES (10, 1, '66', 'TINY', 'activo', true, '2026-09-15')`)
  await pool.query(`INSERT INTO mes_kpi (centro_id, year, month, estado) VALUES (1, 2026, 9, 'abierto')`)
  // Un centro con historia: 400 fichas para que el planner no trate la tabla como trivial.
  await pool.query(`INSERT INTO estudiantes (centro_id, grupo_id, nombre, itinerario, nivel, estado, telefono, fecha_inscripcion)
    SELECT 1, 10, 'Veterano ' || g, 'TINY', 1, 'activo', '6' || lpad(g::text, 7, '0'), '2026-06-01'
    FROM generate_series(1, 400) g`)
  await pool.query('ANALYZE estudiantes')
})

after(async () => { await pool.end() })

test('el mismo niño inscrito a la vez desde 4 pestañas deja UNA ficha; las otras ven sus coincidencias', async () => {
  for (let ronda = 0; ronda < 10; ronda++) {
    const nombre = `Valeria ${letras(1000 + ronda * 7)}`
    const respuestas = await Promise.all([1, 2, 3, 4].map(() => alta(nombre, `6333-${4400 + ronda}`, `Madre ${letras(5000 + ronda)}`)))
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM estudiantes WHERE centro_id = 1 AND nombre = ${nombre}`
    assert.equal(n, 1, `ronda ${ronda}: ${n} fichas`)
    assert.equal(respuestas.filter((r) => r.ok).length, 1)
    assert.equal(respuestas.filter((r) => r.requiereConfirmacion && r.coincidencias?.length === 1).length, 3)
  }
})

test('niños distintos inscritos a la vez no se frenan entre sí', async () => {
  const respuestas = await Promise.all(Array.from({ length: 6 }, (_, k) =>
    alta(`Nuevo ${letras(2000 + k * 13)}`, `6${5000000 + k}`, `Madre ${letras(9000 + k * 13)}`)))
  assert.deepEqual(respuestas.map((r) => r.ok === true), [true, true, true, true, true, true])
})
