// Ejecuta las actions reales con SQL PostgreSQL y tablas TEMP de esta conexión.
// ALOHA_MATRIZ_TEST_DATABASE_URL debe apuntar a PostgreSQL local de pruebas.
import test, { before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import pg from 'pg'
import { MODULOS } from '../../lib/entrenamiento/modulos.js'
import { RESPUESTAS } from '../../lib/entrenamiento/respuestas.js'
import { porcentaje, corregirQuiz } from '../../lib/entrenamiento/progreso.js'
import { assertMaster, assertOficio, esGerencia } from '../../lib/current-user.mjs'

const url = process.env.ALOHA_MATRIZ_TEST_DATABASE_URL
if (!url || !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)) {
  throw new Error('Configura ALOHA_MATRIZ_TEST_DATABASE_URL con una base local de pruebas.')
}
const db = new pg.Client({ connectionString: url })
const master = { id: 99, uid: 99, rol: 'admin_master', email: 'fperez@teamsolutionss.com' }
let actor = master
async function sql(parts, ...values) {
  const text = parts.reduce((out, part, i) => out + (i ? `$${i}` : '') + part, '')
  return (await db.query(text, values)).rows
}
const source = readFileSync(new URL('../../app/actions/entrenamiento.js', import.meta.url), 'utf8')
  .replace(/^import .* from .*\n/gm, '')
  .replace(/export async function /g, 'async function ')
const actions = new Function(
  'sql', 'requireSession', 'requireCurrentUser', 'requireCurrentMaster', 'requireCurrentTraining',
  'isAdminRole', 'fallo', 'MODULOS', 'RESPUESTAS', 'corregirQuiz', 'porcentaje',
  `${source}\nreturn { matrizProgreso, cargarProgreso, marcarTourVisto, responderQuiz };`,
)(
  sql, async () => actor, async () => actor, async () => assertMaster(actor), async () => assertOficio(actor),
  esGerencia, (_name, error) => ({ error: error.message }), MODULOS, RESPUESTAS, corregirQuiz, porcentaje,
)

before(async () => {
  await db.connect()
  await db.query(`
    CREATE TEMP TABLE centros (id int PRIMARY KEY, nombre text);
    CREATE TEMP TABLE usuarios (id int PRIMARY KEY, nombre text, email text, rol text, centro_id int);
    CREATE TEMP TABLE entrenamiento_progreso (
      usuario_id int, modulo text, tour_visto_at timestamptz, quiz_aprobado_at timestamptz,
      intentos int DEFAULT 0, ultimo_puntaje int, updated_at timestamptz, UNIQUE(usuario_id, modulo)
    );
    INSERT INTO centros VALUES (1, 'Centro A'), (2, 'Centro B');
    INSERT INTO usuarios VALUES
      (1, 'Ana', 'ana@example.invalid', 'administradora', 1),
      (2, 'Beto', 'beto@example.invalid', 'asistente', 1),
      (3, 'Celia', 'celia@example.invalid', 'asistente', 2),
      (4, 'Diego', 'diego@example.invalid', 'coach', 1),
      (5, 'Eva', 'eva@example.invalid', 'coordinador', 1),
      (6, 'Fabi', 'fabi@example.invalid', 'admin_general', NULL);
  `)
})
beforeEach(async () => {
  actor = master
  await db.query('TRUNCATE pg_temp.entrenamiento_progreso')
})
after(async () => { await db.end() })

test('incluye administradora y asistentes sin avance; excluye los otros puestos', async () => {
  const result = await actions.matrizProgreso()
  assert.equal(result.error, undefined)
  assert.deepEqual(result.usuarios.map(u => [u.id, u.rol, u.pct]), [
    [1, 'administradora', 0], [2, 'asistente', 0], [3, 'asistente', 0],
  ])
})

test('el filtro de centro incluye a su asistente y no mezcla otras sedes', async () => {
  const result = await actions.matrizProgreso(1)
  assert.deepEqual(result.usuarios.map(u => u.id), [1, 2])
  const otraSede = await actions.matrizProgreso(2)
  assert.deepEqual(otraSede.usuarios.map(u => u.id), [3])
})

test('un asistente completa plataforma y gerencia ve su avance individual', async () => {
  actor = { id: 2, uid: 2, rol: 'asistente', centro_id: 1 }
  const modulo = MODULOS[0].id
  assert.deepEqual(await actions.marcarTourVisto(modulo), { ok: true })
  assert.equal((await actions.responderQuiz(modulo, RESPUESTAS[modulo])).aprobado, true)
  const propio = await actions.cargarProgreso()
  assert.ok(propio[modulo].quizAprobadoAt)
  actor = master
  const { usuarios } = await actions.matrizProgreso(1)
  assert.equal(usuarios.find(u => u.id === 1).completados, 0)
  assert.equal(usuarios.find(u => u.id === 2).completados, 1)
  assert.equal(usuarios.find(u => u.id === 2).pct, 8)
})

test('un centro sin estos puestos conserva una matriz vacía', async () => {
  assert.deepEqual((await actions.matrizProgreso(999)).usuarios, [])
})

test('aparecer en la matriz no concede acceso al reporte de gerencia', async () => {
  for (const rol of ['asistente', 'administradora', 'coach', 'coordinador', 'admin_general']) {
    actor = { id: 2, uid: 2, rol, centro_id: 1 }
    assert.ok((await actions.matrizProgreso()).error, rol)
  }
})
