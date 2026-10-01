import test, { before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import pg from 'pg'
import { corregirMotivoRetiroEn } from '../../lib/motivo-retiro-service.mjs'
import { bloquearMesesEditables } from '../../lib/mes-kpi.js'
import { consultarDesercionPorCoach } from '../../lib/desercion-coach.mjs'

// "Corregir motivo del retiro" contra Postgres REAL: atomicidad, candados y
// carreras con barrera observada (pg_blocking_pids, nunca liberar por tiempo).
// Solo corre contra una base local desechable:
//   MOTIVO_RETIRO_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5433/aloha_motivo_retiro_test \
//   MOTIVO_RETIRO_TEST_CONFIRM=disposable npm run test:motivo-retiro:db
const url = new URL(process.env.MOTIVO_RETIRO_TEST_DATABASE_URL || 'postgres://invalid')
if (process.env.MOTIVO_RETIRO_TEST_CONFIRM !== 'disposable' || !['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/aloha_motivo_retiro_test') {
  throw new Error('Las pruebas requieren MOTIVO_RETIRO_TEST_DATABASE_URL local /aloha_motivo_retiro_test y MOTIVO_RETIRO_TEST_CONFIRM=disposable.')
}
const schema = `motivo_retiro_test_${process.pid}`
const pool = new pg.Pool({ connectionString: url.href, options: `-c search_path=${schema}` })

// Tag como el de lib/db.js; `antesDe` pausa justo antes de una sentencia para
// sostener los locks que la corrección ya tomó.
const tag = (client, { antesDe } = {}) => async (strings, ...values) => {
  let text = strings[0]
  for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`
  if (antesDe && antesDe.patron.test(text)) await antesDe.esperar()
  return (await client.query(text, values)).rows
}
async function transaction(work, opciones = {}) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
    const result = await work(tag(client, opciones))
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
const args = (extra = {}) => ({
  centroId: '5', estudianteId: 230, motivo: 'GRADUADO', razon: 'La familia avisó que terminó el programa.',
  eventoIdEsperado: 1130, motivoEsperado: 'ECONOMICO',
  actor: { uid: 9, email: 'admin@centro.test', nombre: 'Admin David' }, ahora: '2026-10-01T15:00:00.000Z', ...extra,
})
const corregir = (extra = {}, opciones = {}) =>
  transaction((query) => corregirMotivoRetiroEn(query, args(extra), { bloquearMesesEditables }), opciones)

const filas = async (sql, params = []) => (await pool.query(sql, params)).rows
const retiro1130 = async () => (await filas('SELECT motivo, detalle FROM estudiante_eventos WHERE id = 1130'))[0]
const ficha230 = async () => (await filas('SELECT estado, motivo_retiro FROM estudiantes WHERE id = 230'))[0]
const totalEventos = async () => Number((await filas('SELECT count(*) AS n FROM estudiante_eventos'))[0].n)

// Espera a que alguna sesión quede bloqueada por `pidBloqueador` (o, con
// `pidBloqueado`, a que ESA sesión quede bloqueada por cualquiera).
async function esperarBloqueo(observer, { pidBloqueador, pidBloqueado }) {
  const inicio = Date.now()
  while (Date.now() - inicio < 15_000) {
    const { rows } = pidBloqueado
      ? await observer.query('SELECT cardinality(pg_blocking_pids($1)) AS n', [pidBloqueado])
      : await observer.query('SELECT count(*) AS n FROM pg_stat_activity WHERE datname = current_database() AND $1 = ANY(pg_blocking_pids(pid))', [pidBloqueador])
    if (Number(rows[0].n) > 0) return
    await delay(20)
  }
  throw new Error('La barrera no observó el bloqueo: la prueba no libera por tiempo.')
}
const pidDe = async (client) => Number((await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid)

before(async () => {
  await pool.query(`CREATE SCHEMA ${schema}`)
  await pool.query(`
    CREATE TABLE centros (id int primary key, nombre text);
    CREATE TABLE coaches (id int primary key, centro_id int, nombre text, activo boolean);
    CREATE TABLE grupos (id int primary key, centro_id int, numero text, estado text, coach_id int, fecha_inicio_clases date);
    CREATE TABLE estudiantes (id int primary key, centro_id int, grupo_id int, nombre text, estado text, status_plataforma text, nivel int,
      fecha_inscripcion date, fecha_retiro date, motivo_retiro text, retiro_programado_para date, updated_at timestamptz);
    CREATE TABLE estudiante_eventos (id serial primary key, estudiante_id int, centro_id int, tipo text, year int, month int, fecha date,
      de_grupo_id int, a_grupo_id int, motivo text, origen text, detalle jsonb);
    CREATE TABLE mes_kpi (centro_id int, year int, month int, estado text, cerrado_at timestamptz, PRIMARY KEY (centro_id, year, month));
    CREATE TABLE kpi_auto_ajustes (centro_id int, year int, month int, ajustes jsonb NOT NULL DEFAULT '{}'::jsonb, PRIMARY KEY (centro_id, year, month));
    CREATE TABLE resumen_mes (centro_id int, year int, month int, mot_economico int, mot_graduado int, PRIMARY KEY (centro_id, year, month));
  `)
})
beforeEach(async () => {
  await pool.query(`
    DROP TRIGGER IF EXISTS ficha_inmovil ON estudiantes;
    TRUNCATE centros, coaches, grupos, estudiantes, estudiante_eventos, mes_kpi, kpi_auto_ajustes, resumen_mes RESTART IDENTITY;
    INSERT INTO centros VALUES (5, 'David');
    INSERT INTO coaches VALUES (7, 5, 'Coach David', true);
    INSERT INTO grupos VALUES (12, 5, '12', 'activo', 7, '2026-03-02');
    INSERT INTO estudiantes (id, centro_id, grupo_id, nombre, estado, status_plataforma, nivel, fecha_inscripcion, fecha_retiro, motivo_retiro)
      VALUES (230, 5, 12, 'Ivannis', 'retirado', 'DESACTIVAR', 4, '2026-03-02', '2026-08-15', 'ECONOMICO');
    INSERT INTO estudiante_eventos (id, estudiante_id, centro_id, tipo, year, month, fecha, a_grupo_id) VALUES (1100, 230, 5, 'inscripcion', 2026, 3, '2026-03-02', 12);
    INSERT INTO estudiante_eventos (id, estudiante_id, centro_id, tipo, year, month, fecha, de_grupo_id, motivo, detalle)
      VALUES (1130, 230, 5, 'retiro', 2026, 8, '2026-08-15', 12, 'ECONOMICO', '{"override_asistencia":{"actor":"master"}}');
    SELECT setval(pg_get_serial_sequence('estudiante_eventos', 'id'), 5000);
    INSERT INTO mes_kpi VALUES (5, 2026, 8, 'abierto', NULL);
  `)
})
after(async () => { await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end() })

test('corrección real: evento y ficha juntos, sin eventos nuevos, con auditoría; la deserción por coach lo refleja', async () => {
  const antes = (await consultarDesercionPorCoach(tag(pool), { centroId: 5, anio: 2026, mesDesde: 8, mesHasta: 8 })).filas[0]
  assert.deepEqual([antes.bajas_reales, antes.graduados], [1, 0])
  const eventos = await totalEventos()

  const r = await corregir()
  assert.equal(r.ok, true)
  assert.equal(r.eventoId, 1130)
  assert.equal(r.requiereGuardar, false)

  const evento = await retiro1130()
  assert.equal(evento.motivo, 'GRADUADO')
  assert.deepEqual(evento.detalle.override_asistencia, { actor: 'master' }, 'conserva el detalle previo')
  assert.equal(evento.detalle.correcciones_motivo.length, 1)
  assert.equal(evento.detalle.correcciones_motivo[0].razon, 'La familia avisó que terminó el programa.')
  assert.equal(evento.detalle.correcciones_motivo[0].motivo_anterior, 'ECONOMICO')
  assert.deepEqual(await ficha230(), { estado: 'retirado', motivo_retiro: 'GRADUADO' })
  assert.equal(await totalEventos(), eventos, 'sin eventos nuevos ni borrados')

  const despues = (await consultarDesercionPorCoach(tag(pool), { centroId: 5, anio: 2026, mesDesde: 8, mesHasta: 8 })).filas[0]
  assert.deepEqual([despues.bajas_reales, despues.graduados], [0, 1])

  // Reintento (respuesta perdida): "ya estaba", sin segunda entrada de auditoría.
  const otra = await corregir()
  assert.equal(otra.sinCambios, true)
  assert.equal((await retiro1130()).detalle.correcciones_motivo.length, 1)
})

test('caso David antes del script: corrige el retiro vigente (1130), no toca 1128/1129 y avisa del duplicado', async () => {
  await pool.query(`
    INSERT INTO estudiante_eventos (id, estudiante_id, centro_id, tipo, year, month, fecha, de_grupo_id, motivo)
      VALUES (1128, 230, 5, 'retiro', 2026, 8, '2026-08-15', 12, 'ECONOMICO');
    INSERT INTO estudiante_eventos (id, estudiante_id, centro_id, tipo, year, month, fecha, a_grupo_id)
      VALUES (1129, 230, 5, 'reincorporacion', 2026, 8, '2026-08-15', 12);
  `)
  const r = await corregir()
  assert.equal(r.ok, true)
  assert.deepEqual(r.otrosRetirosMismoMes, [1128])
  const motivos = await filas('SELECT id, motivo FROM estudiante_eventos WHERE id IN (1128, 1129, 1130) ORDER BY id')
  assert.deepEqual(motivos, [{ id: 1128, motivo: 'ECONOMICO' }, { id: 1129, motivo: null }, { id: 1130, motivo: 'GRADUADO' }])
})

test('rollback real: si la ficha no se actualiza, el evento vuelve atrás (todo o nada)', async () => {
  await pool.query(`
    CREATE OR REPLACE FUNCTION ${schema}.ficha_inmovil() RETURNS trigger AS $$ BEGIN RETURN NULL; END $$ LANGUAGE plpgsql;
    CREATE TRIGGER ficha_inmovil BEFORE UPDATE ON estudiantes FOR EACH ROW EXECUTE FUNCTION ${schema}.ficha_inmovil();
  `)
  await assert.rejects(corregir(), /no encontró la ficha bloqueada/)
  const evento = await retiro1130()
  assert.equal(evento.motivo, 'ECONOMICO')
  assert.equal(evento.detalle.correcciones_motivo, undefined)
  assert.deepEqual(await ficha230(), { estado: 'retirado', motivo_retiro: 'ECONOMICO' })
})

test('mes cerrado, ajuste manual del motivo destino y KPI guardado sin conciliar frenan sin escribir', async () => {
  await pool.query("UPDATE mes_kpi SET estado = 'cerrado' WHERE centro_id = 5 AND year = 2026 AND month = 8")
  assert.match((await corregir()).error, /^Agosto 2026 está cerrado\./)

  await pool.query("UPDATE mes_kpi SET estado = 'abierto'; INSERT INTO kpi_auto_ajustes VALUES (5, 2026, 8, '{\"mot_graduado\": 1}')")
  assert.match((await corregir()).error, /1 retiro\(s\) «Graduado» declarados a mano/)

  await pool.query('TRUNCATE kpi_auto_ajustes; INSERT INTO resumen_mes VALUES (5, 2026, 8, 1, 0)')
  assert.match((await corregir()).error, /pulsa Guardar y después corrige el motivo/)

  assert.equal((await retiro1130()).motivo, 'ECONOMICO')
  assert.deepEqual(await ficha230(), { estado: 'retirado', motivo_retiro: 'ECONOMICO' })

  // Con el ajuste ya conciliado (Guardar), la corrección pasa y avisa que hay que volver a Guardar.
  await pool.query("INSERT INTO kpi_auto_ajustes VALUES (5, 2026, 8, '{\"mot_economico\": 0}')")
  const ok = await corregir()
  assert.equal(ok.ok, true)
  assert.equal(ok.requiereGuardar, true)
})

test('carrera (a): una reincorporación confirma mientras la corrección espera la ficha ⇒ 40001 y nada escrito', async () => {
  const holder = await pool.connect()
  const observer = await pool.connect()
  let liberado = false
  try {
    await holder.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
    const pidHolder = await pidDe(holder)
    // Orden de reincorporarEstudiante: mes de hoy → ficha → evento.
    await holder.query("INSERT INTO mes_kpi VALUES (5, 2026, 10, 'abierto', NULL) ON CONFLICT DO NOTHING")
    await holder.query('SELECT estado FROM mes_kpi WHERE centro_id = 5 AND year = 2026 AND month = 10 FOR UPDATE')
    await holder.query('SELECT * FROM estudiantes WHERE id = 230 FOR UPDATE')
    await holder.query("UPDATE estudiantes SET estado = 'activo', motivo_retiro = NULL, fecha_retiro = NULL WHERE id = 230")
    await holder.query("INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, a_grupo_id) VALUES (230, 5, 'reincorporacion', 2026, 10, '2026-10-01', 12)")

    const correccion = corregir().then((r) => ({ r }), (error) => ({ error }))
    await esperarBloqueo(observer, { pidBloqueador: pidHolder })
    await holder.query('COMMIT'); liberado = true

    const { r, error } = await correccion
    assert.equal(r, undefined, `la corrección no debía confirmar: ${JSON.stringify(r)}`)
    assert.equal(error?.code, '40001')
    assert.equal((await retiro1130()).motivo, 'ECONOMICO')
    assert.deepEqual(await ficha230(), { estado: 'activo', motivo_retiro: null })
  } finally {
    if (!liberado) await holder.query('ROLLBACK')
    holder.release(); observer.release()
  }
})

// Corrección que se detiene justo antes de escribir: ya leyó ajustes/resumen y
// tiene el mes, la ficha y el evento bloqueados. `enPausa` falla (no se
// cuelga) si la corrección termina sin llegar a la pausa.
function correccionEnPausa(extra = {}) {
  let llego, soltar
  const pausa = new Promise((resolve) => { llego = resolve })
  const liberar = new Promise((resolve) => { soltar = resolve })
  const correccion = corregir(extra, { antesDe: { patron: /^\s*UPDATE estudiante_eventos/, esperar: async () => { llego(); await liberar } } })
  const terminoAntes = correccion.then(
    (r) => Promise.reject(new Error(`la corrección terminó sin llegar a la pausa: ${JSON.stringify(r)}`)),
    (error) => Promise.reject(new Error(`la corrección falló antes de la pausa: ${error.message}`)),
  )
  terminoAntes.catch(() => {}) // solo importa si gana la carrera
  return { correccion, enPausa: Promise.race([pausa, terminoAntes]), soltar }
}

test('carrera (b): la corrección sostiene sus locks; una reincorporación concurrente espera la ficha y recibe 40001', async () => {
  const competidor = await pool.connect()
  const observer = await pool.connect()
  const { correccion, enPausa, soltar } = correccionEnPausa()
  try {
    await enPausa

    await competidor.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
    const pidCompetidor = await pidDe(competidor)
    await competidor.query("INSERT INTO mes_kpi VALUES (5, 2026, 10, 'abierto', NULL) ON CONFLICT DO NOTHING")
    await competidor.query('SELECT estado FROM mes_kpi WHERE centro_id = 5 AND year = 2026 AND month = 10 FOR UPDATE')
    const ficha = competidor.query('SELECT * FROM estudiantes WHERE id = 230 FOR UPDATE').then(() => null, (error) => error)
    await esperarBloqueo(observer, { pidBloqueado: pidCompetidor })
    soltar()

    assert.equal((await correccion).ok, true)
    const error = await ficha
    assert.equal(error?.code, '40001', `se esperaba 40001 y llegó ${error?.code}`)
    await competidor.query('ROLLBACK')
    assert.equal((await retiro1130()).motivo, 'GRADUADO')
    assert.deepEqual(await ficha230(), { estado: 'retirado', motivo_retiro: 'GRADUADO' })
  } finally {
    soltar()
    competidor.release(); observer.release()
  }
})

test("carrera (c'): un Guardar que espera detrás de una corrección que cambia de campo aborta con 40001 y no guarda el resumen viejo", async () => {
  const guardar = await pool.connect()
  const observer = await pool.connect()
  const { correccion, enPausa, soltar } = correccionEnPausa()
  try {
    await enPausa
    // Como guardarKpiMes: el INSERT de bloquearMesesEditables fija el snapshot
    // (antes del COMMIT de la corrección) y el FOR UPDATE del mes espera.
    await guardar.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
    const pidGuardar = await pidDe(guardar)
    await guardar.query("INSERT INTO mes_kpi VALUES (5, 2026, 8, 'abierto', NULL) ON CONFLICT DO NOTHING")
    const resultado = guardar.query('SELECT estado FROM mes_kpi WHERE centro_id = 5 AND year = 2026 AND month = 8 FOR UPDATE')
      .then(async () => {
        await guardar.query('SELECT * FROM estudiante_eventos WHERE centro_id = 5')
        await guardar.query('SELECT * FROM estudiantes WHERE centro_id = 5')
        await guardar.query('INSERT INTO resumen_mes VALUES (5, 2026, 8, 1, 0) ON CONFLICT (centro_id, year, month) DO UPDATE SET mot_economico = 1')
        await guardar.query('COMMIT')
        return null
      })
      .catch(async (error) => { await guardar.query('ROLLBACK').catch(() => {}); return error })
    await esperarBloqueo(observer, { pidBloqueado: pidGuardar })
    soltar()

    assert.equal((await correccion).ok, true)
    const error = await resultado
    assert.equal(error?.code, '40001', `el Guardar debía abortar con 40001 y terminó con ${error?.code ?? 'COMMIT'}`)
    assert.equal((await filas('SELECT count(*)::int AS n FROM resumen_mes'))[0].n, 0, 'no queda un resumen con el motivo viejo')
    assert.equal((await retiro1130()).motivo, 'GRADUADO')
  } finally {
    soltar()
    guardar.release(); observer.release()
  }
})

test('carrera (c): un Guardar del mismo mes escribe el resumen mientras la corrección espera ⇒ la corrección aborta (40001) y al reintentar pide Guardar', async () => {
  const holder = await pool.connect()
  const observer = await pool.connect()
  let liberado = false
  try {
    // Como guardarKpiMes: mes → lee la operación del centro → escribe resumen_mes.
    await holder.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
    const pidHolder = await pidDe(holder)
    await holder.query('SELECT estado FROM mes_kpi WHERE centro_id = 5 AND year = 2026 AND month = 8 FOR UPDATE')
    await holder.query('SELECT * FROM estudiante_eventos WHERE centro_id = 5')
    await holder.query('SELECT * FROM estudiantes WHERE centro_id = 5')
    await holder.query('INSERT INTO resumen_mes VALUES (5, 2026, 8, 1, 0) ON CONFLICT (centro_id, year, month) DO UPDATE SET mot_economico = 1')

    const correccion = corregir().then((r) => ({ r }), (error) => ({ error }))
    await esperarBloqueo(observer, { pidBloqueador: pidHolder })
    await holder.query('COMMIT'); liberado = true

    const { r, error } = await correccion
    assert.equal(r, undefined, `la corrección no debía confirmar con un snapshot que no ve el resumen: ${JSON.stringify(r)}`)
    assert.equal(error?.code, '40001')
    assert.equal((await retiro1130()).motivo, 'ECONOMICO')

    // Reintento: ya ve el resumen guardado sin ajuste conciliado y pide Guardar primero.
    assert.match((await corregir()).error, /pulsa Guardar y después corrige el motivo/)
  } finally {
    if (!liberado) await holder.query('ROLLBACK')
    holder.release(); observer.release()
  }
})
