// Ejecuta las actions reales con SQL PostgreSQL y tablas TEMP de esta conexión.
// ALOHA_MATRIZ_TEST_DATABASE_URL debe apuntar a PostgreSQL local de pruebas.
import test, { before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import pg from 'pg'
import { MODULOS, modulosDeRol } from '../../lib/entrenamiento/modulos.js'
import { RESPUESTAS } from '../../lib/entrenamiento/respuestas.js'
import { porcentaje, corregirQuiz } from '../../lib/entrenamiento/progreso.js'
import { assertMaster, assertOficio, esGerencia, isMaster, puedeVerEntrenamientoEquipo, centrosEntrenamiento } from '../../lib/current-user.mjs'

import * as catalogo from '../../lib/entrenamiento/oficio/catalogo.js'
import * as oficioProgreso from '../../lib/entrenamiento/oficio/progreso.js'
import { asignacionesOficio } from '../../lib/caja/direccion.mjs'

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
  'centrosEntrenamiento', 'isAdminRole', 'fallo', 'modulosDeRol', 'MODULOS', 'RESPUESTAS', 'corregirQuiz', 'porcentaje',
  `${source}\nreturn { matrizProgreso, cargarProgreso, marcarTourVisto, responderQuiz, reiniciarProgreso };`,
)(
  sql, async () => actor, async () => actor, async () => assertMaster(actor), async () => assertOficio(actor),
  centrosEntrenamiento, esGerencia, (_name, error) => ({ error: error.message }), modulosDeRol, MODULOS, RESPUESTAS, corregirQuiz, porcentaje,
)

const oficioSource = readFileSync(new URL('../../app/actions/entrenamiento-oficio.js', import.meta.url), 'utf8')
  .replace(/import[\s\S]*?from ['"][^'"]+['"]\n/g, '')
  .replace(/export async function /g, 'async function ')
const deps = {
  sql, ...catalogo, ...oficioProgreso, isMaster, puedeVerEntrenamientoEquipo, centrosEntrenamiento, asignacionesOficio,
  requireCurrentOficio: async () => assertOficio(actor), requireCurrentMaster: async () => assertMaster(actor),
  fallo: (_name, error) => ({ error: error.message }),
}
const oficio = new Function(...Object.keys(deps), `${oficioSource}\nreturn { matrizOficio, cargarOficio, resumenOficio, reiniciarPuestoOficio, historialReiniciosOficio };`)(...Object.values(deps))

before(async () => {
  await db.connect()
  await db.query(`
    CREATE TEMP TABLE centros (id int PRIMARY KEY, nombre text);
    CREATE TEMP TABLE usuarios (id int PRIMARY KEY, nombre text, email text, rol text, centro_id int);
    CREATE TEMP TABLE usuario_centros (usuario_id int, centro_id int);
    CREATE TEMP TABLE entrenamiento_progreso (
      usuario_id int, modulo text, tour_visto_at timestamptz, quiz_aprobado_at timestamptz,
      drill_firmado_at timestamptz, drill_firmado_por int, intentos int DEFAULT 0, ultimo_puntaje int, updated_at timestamptz, UNIQUE(usuario_id, modulo)
    );
    INSERT INTO centros VALUES (1, 'Centro A'), (2, 'Centro B');
    INSERT INTO usuarios VALUES
      (1, 'Ana', 'ana@example.invalid', 'administradora', 1),
      (2, 'Beto', 'beto@example.invalid', 'asistente', 1),
      (3, 'Celia', 'celia@example.invalid', 'asistente', 2),
      (4, 'Diego', 'diego@example.invalid', 'coach', 1),
      (5, 'Eva', 'eva@example.invalid', 'coordinador', 1),
      (6, 'Fabi', 'fabi@example.invalid', 'admin_general', NULL);
    INSERT INTO usuario_centros VALUES (5,1), (5,2);
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
  for (const rol of ['asistente', 'administradora', 'coach', 'admin_general', 'supervisor']) {
    actor = { id: 2, uid: 2, rol, centro_id: 1 }
    assert.ok((await actions.matrizProgreso()).error, rol)
  }
})


test('coordinador ve solo el equipo asignado en ambas matrices y puede filtrar', async () => {
  actor = { id: 5, uid: 5, rol: 'coordinador', centros: [1] }
  assert.deepEqual((await actions.matrizProgreso()).usuarios.map(u => u.id), [1, 2])
  const equipo = await oficio.matrizOficio()
  assert.equal(equipo.error, undefined)
  assert.deepEqual(equipo.usuarios.map(u => u.id).sort(), [1, 2, 4])
  assert.deepEqual(equipo.planes.map(p => p.rol), ['administradora', 'asistente', 'coach'])
  assert.ok(equipo.usuarios.every(u => u.centroFirma === 1 && u.centros.length === 0))
  for (const matriz of [actions.matrizProgreso, oficio.matrizOficio]) {
    assert.ok((await matriz(2)).error, 'una URL o action manipulada no abre otra sede')
    assert.ok((await matriz('1')).error, 'filtro inválido no se convierte en toda la red')
    actor.centros = [1, 2]
    assert.ok((await matriz()).usuarios.some(u => u.id === 3))
    assert.deepEqual((await matriz(2)).usuarios.map(u => u.id), [3])
    actor.centros = []
    assert.deepEqual((await matriz()).usuarios, [])
    actor.centros = [1]
  }
})

test('Master conserva la red y la pertenencia multicentro del coordinador', async () => {
  const equipo = await oficio.matrizOficio(2)
  assert.equal(equipo.error, undefined)
  assert.deepEqual(equipo.usuarios.map(u => u.id).sort(), [3, 5])
  const coordinador = equipo.usuarios.find(u => u.id === 5)
  assert.deepEqual(coordinador.centros, [1, 2])
  assert.ok((await oficio.matrizOficio()).planes.some(p => p.rol === 'coordinador'))
})

test('coordinador mantiene su plan y progreso personal al consultar distintos centros', async () => {
  actor = { id: 5, uid: 5, rol: 'coordinador', centro_id: null, centros: [1, 2] }
  await db.query("INSERT INTO entrenamiento_progreso(usuario_id,modulo,tour_visto_at,quiz_aprobado_at) VALUES (5,'of-met-1',now(),now())")
  const antes = await oficio.cargarOficio()
  assert.equal(antes.error, undefined)
  assert.equal(antes.modo, 'entrenamiento')
  assert.equal(antes.veMatriz, true)
  assert.ok(antes.plan.some(m => m.id.startsWith('of-cop-')))
  assert.ok(antes.progreso['of-met-1'].quizAprobadoAt)
  await oficio.matrizOficio(1)
  await oficio.matrizOficio(2)
  assert.deepEqual(await oficio.cargarOficio(), antes)
  assert.equal((await oficio.resumenOficio()).veMatriz, true)
  assert.ok((await actions.reiniciarProgreso(1)).error)
  assert.ok((await oficio.reiniciarPuestoOficio(1, {})).error)
  assert.ok((await oficio.historialReiniciosOficio(1)).error)
})

test('cambio de rol o alcance se aplica en la siguiente consulta', async () => {
  actor = { id: 5, uid: 5, rol: 'coordinador', centros: [1] }
  assert.ok((await oficio.matrizOficio()).usuarios.length > 0)
  actor.centros = [2]
  assert.deepEqual((await oficio.matrizOficio()).usuarios.map(u => u.id), [3])
  actor.rol = 'asistente'
  assert.ok((await oficio.matrizOficio()).error)
  assert.ok((await actions.matrizProgreso()).error)
})
