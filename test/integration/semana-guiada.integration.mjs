import test, { before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import pg from 'pg'
import { leerJuegoEn, guardarJuegoEn, aprobarJuegoEn } from '../../lib/juegos-semana-servicio.js'
import { leerInformeSemana } from '../../lib/informe-semana-servicio.js'
import { assertCentroAccess, assertWriteCentro, assertCoordinacion, puedeCerrarMes } from '../../lib/current-user.mjs'

const url = process.env.ALOHA_SEMANA_TEST_DATABASE_URL
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname) || !new URL(url).pathname.endsWith('_test')) throw new Error('Base local exclusiva _test requerida.')
const pool = new pg.Pool({ connectionString: url })
const query = async (parts, ...values) => (await pool.query(parts.reduce((s, p, i) => s + (i ? `$${i}` : '') + p, ''), values)).rows
const now = new Date('2026-10-20T20:00:00Z')
const FIN = '2026-10-22'
const opts = { query, now, actorId: 1 }
const propuesta = { titulo: 'Bienvenida', codigo: 'cp_asistidas', meta: 10, participantes: 'Equipo', reglas: 'Asistencias del CRM', premio: 'Reconocimiento', version: 0 }

before(async () => {
  await pool.query('CREATE TABLE centros (id INTEGER PRIMARY KEY, nombre TEXT, pais TEXT); CREATE TABLE usuarios (id INTEGER PRIMARY KEY)')
  for (const name of ['2026-10-01-estadisticas-semana','2026-10-01-plan-semana','2026-10-01-cuotas-semana','2026-10-02-ruta-plan-integrado','2026-10-16-semana-continuidad','2026-10-20-semana-juegos','2026-10-20-semana-juegos']) await pool.query(readFileSync(new URL(`../../db/migrations/${name}.sql`, import.meta.url), 'utf8'))
})
beforeEach(async () => {
  await pool.query('TRUNCATE centros, usuarios RESTART IDENTITY CASCADE')
  await pool.query("INSERT INTO centros VALUES (2,'Centro QA','PA'),(3,'Otro centro QA','PA'); INSERT INTO usuarios VALUES (1),(2)")
})
after(async () => { await pool.end() })

test('propuesta persiste, aprobación registra actor, edición exige nueva aprobación y no cruza centros', async () => {
  const j = await guardarJuegoEn(2, FIN, propuesta, opts)
  assert.equal(j.version, 1)
  assert.equal(j.estado, 'propuesto')
  assert.deepEqual(await leerJuegoEn(2, FIN, opts), j)
  assert.equal(await leerJuegoEn(3, FIN, opts), null)
  const aprobado = await aprobarJuegoEn(2, FIN, j.version, { ...opts, actorId: 2 })
  assert.equal(aprobado.estado, 'aprobado')
  assert.equal((await query`SELECT aprobada_por FROM semana_juegos WHERE centro_id=2`)[0].aprobada_por, 2)
  const editado = await guardarJuegoEn(2, FIN, { ...j, version: aprobado.version, premio: 'Reconocimiento en reunión' }, opts)
  assert.equal(editado.estado, 'propuesto')
  assert.equal(editado.aprobada_at, null)
  assert.equal((await query`SELECT aprobada_por FROM semana_juegos WHERE centro_id=2`)[0].aprobada_por, null)
  await assert.rejects(aprobarJuegoEn(2, FIN, aprobado.version, opts), /cambió/)
  await assert.rejects(guardarJuegoEn(2, FIN, j, opts), /otra sesión/)
})

test('dos sesiones concurrentes no sobrescriben propuestas ni aprueban una versión no revisada', async () => {
  const primeras = await Promise.allSettled([guardarJuegoEn(2, FIN, propuesta, opts), guardarJuegoEn(2, FIN, propuesta, opts)])
  assert.equal(primeras.filter(r => r.status === 'fulfilled').length, 1)
  let j = await leerJuegoEn(2, FIN, opts)
  const simultaneas = await Promise.allSettled([aprobarJuegoEn(2, FIN, j.version, opts), guardarJuegoEn(2, FIN, { ...j, premio: 'Premio nuevo' }, opts)])
  assert.equal(simultaneas.filter(r => r.status === 'fulfilled').length, 1)
  j = await leerJuegoEn(2, FIN, opts)
  assert.equal(j.version, 2)
  if (j.estado === 'aprobado') assert.equal(j.premio, propuesta.premio)
  else assert.equal(j.aprobada_at, null)
  for (const fin of ['2026-10-15', '2026-10-29']) await assert.rejects(guardarJuegoEn(2, fin, propuesta, opts), /semana en curso/)
  assert.equal((await query`SELECT count(*) FROM semana_juegos`)[0].count, '1')
})

test('acciones reales aplican los permisos de centro y separan proponer de aprobar', async () => {
  let actor = { id: 1, rol: 'administradora', centro_id: 2 }
  const src = readFileSync(new URL('../../app/actions/juegos-semana.js', import.meta.url), 'utf8').replace(/^import .*$/gm, '').replaceAll('export async function', 'async function')
  const acciones = new Function('requireCentroAccess','requireCurrentWriteCentro','requireCurrentCoordinacion','puedeCerrarMes','leerJuegoEn','guardarJuegoEn','aprobarJuegoEn', `${src};return {getJuegoSemana,guardarJuegoSemana,aprobarJuegoSemana}`)(
    async id => assertCentroAccess(actor, id), async id => assertWriteCentro(actor, id), async id => assertCoordinacion(actor, id), puedeCerrarMes,
    (id, fin) => leerJuegoEn(id, fin, opts), (id, fin, d, o) => guardarJuegoEn(id, fin, d, { ...opts, ...o }), (id, fin, v, o) => aprobarJuegoEn(id, fin, v, { ...opts, ...o }))
  await acciones.guardarJuegoSemana(2, FIN, propuesta)
  await assert.rejects(acciones.aprobarJuegoSemana(2, FIN, 1), /No autorizado/)
  await assert.rejects(acciones.getJuegoSemana(3, FIN), /No autorizado/)
  for (const rol of ['asistente', 'coach', 'supervisor', 'admin_general']) {
    actor = { id: 1, rol, centro_id: 2 }
    await assert.rejects(acciones.guardarJuegoSemana(2, FIN, propuesta))
    await assert.rejects(acciones.aprobarJuegoSemana(2, FIN, 1))
    if (rol === 'coach') await assert.rejects(acciones.getJuegoSemana(2, FIN))
  }
  actor = { id: 2, rol: 'coordinador', centros: [3] }
  await assert.rejects(acciones.aprobarJuegoSemana(2, FIN, 1))
  actor.centros = [2]
  assert.equal((await acciones.aprobarJuegoSemana(2, FIN, 1)).estado, 'aprobado')
})

test('informe histórico lee el plan anterior y las evidencias sin crear ni alterar filas', async () => {
  await pool.query("INSERT INTO semana_planes(centro_id,semana_fin,condicion,fundamento) VALUES (2,'2026-10-08','normal','Cierres comparables'),(2,'2026-10-15','peligro','Siguiente semana'),(3,'2026-10-08','emergencia','Otro centro')")
  await pool.query("INSERT INTO semana_objetivos(plan_id,seccion,paso,texto,responsable,fecha,evidencia_esperada,evidencia_resultado,hecho) SELECT id,'formula',0,'Confirmar citas','Administradora','2026-10-14','Registro CRM','Tres citas',true FROM semana_planes WHERE centro_id=2 AND semana_fin='2026-10-08'")
  await pool.query("INSERT INTO estadisticas_semana(centro_id,semana_fin,codigo,valor,estado) VALUES (2,'2026-10-15','nuevos_inscritos',0,'cerrada'),(2,'2026-10-15','retiros',0,'abierta'); INSERT INTO semana_cuotas(centro_id,semana_fin,codigo,cuota,estado) VALUES (2,'2026-10-15','nuevos_inscritos',0,'aprobada'),(2,'2026-10-15','retiros',2,'propuesta')")
  const antes = await query`SELECT row_to_json(p) AS fila FROM semana_planes p ORDER BY id`
  const informe = await leerInformeSemana(2, '2026-10-15', opts)
  assert.equal(informe.plan.condicion, 'normal')
  assert.equal(informe.objetivos.length, 1)
  assert.equal(informe.objetivos[0].evidencia_resultado, 'Tres citas')
  assert.equal(informe.estadisticas.find(m => m.codigo === 'nuevos_inscritos').cumple, true)
  assert.equal(informe.estadisticas.find(m => m.codigo === 'retiros').valor, null)
  assert.equal(informe.estadisticas.find(m => m.codigo === 'retiros').cumple, null)
  assert.equal((await leerInformeSemana(2, '2026-10-01', opts)).objetivos.length, 0)
  assert.deepEqual(await query`SELECT row_to_json(p) AS fila FROM semana_planes p ORDER BY id`, antes)
  await assert.rejects(leerInformeSemana(2, FIN, opts), /semana anterior/)
  await assert.rejects(leerInformeSemana(2, '2026-10-29', opts), /semana anterior/)
})
