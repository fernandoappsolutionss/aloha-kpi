import test, { before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { anularMatriculaEn } from '../../lib/anulacion-matricula-service.mjs'
import { bloquearMesesEditables } from '../../lib/mes-kpi.js'
import { encolarSyncCrm } from '../../lib/llenado-service.js'
import { calcularKpiAutoMes } from '../../lib/kpi-semanal-service.js'
import { consultarDesercionPorCoach } from '../../lib/desercion-coach.mjs'
import { consultarDesercionComparada } from '../../lib/desercion-comparada.mjs'

const url = new URL(process.env.ANULACION_TEST_DATABASE_URL || 'postgres://invalid')
if (process.env.ANULACION_TEST_CONFIRM !== 'disposable' || !['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/aloha_anulacion_test') {
  throw new Error('Las pruebas requieren ANULACION_TEST_DATABASE_URL local /aloha_anulacion_test y ANULACION_TEST_CONFIRM=disposable.')
}
const schema = `anulacion_test_${process.pid}`
const pool = new pg.Pool({ connectionString: url.href, options: `-c search_path=${schema}` })
const tag = (client) => async (strings, ...values) => {
  let text = strings[0]
  for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`
  return (await client.query(text, values)).rows
}
const args = { centroId: 3, estudianteId: 1, fecha: '2026-09-12', hoy: '2026-09-12', motivo: 'Devolución antes del arranque', actor: { uid: 9 } }
const deps = { bloquearMesesEditables, encolarSyncCrm }
async function transaction(work) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
    const result = await work(tag(client))
    await client.query('COMMIT')
    return result
  } catch (error) { await client.query('ROLLBACK'); throw error }
  finally { client.release() }
}
const run = (overrides = {}, services = deps) => transaction((query) => anularMatriculaEn(query, { ...args, ...overrides }, services))

before(async () => {
  await pool.query(`CREATE SCHEMA ${schema}`)
  await pool.query(`
    CREATE TABLE centros (id int primary key, nombre text);
    CREATE TABLE coaches (id int primary key, centro_id int, nombre text, activo boolean);
    CREATE TABLE grupos (id int primary key, centro_id int, numero text, estado text, coach_id int, fecha_inicio_clases date, itinerario_clases jsonb);
    CREATE TABLE estudiantes (id int primary key, centro_id int, grupo_id int, nombre text, estado text, status_plataforma text, nivel int, origen text, origen_venta text, crm_registration_id text, fecha_inscripcion date, fecha_inicio_nivel date, fecha_retiro date, motivo_retiro text, retiro_programado_para date, ultima_asistencia date, updated_at timestamptz, CHECK (estado = 'baja_potencial' OR retiro_programado_para IS NULL));
    CREATE TABLE estudiante_eventos (id serial primary key, estudiante_id int, centro_id int, tipo text, year int, month int, fecha date, de_grupo_id int, a_grupo_id int, motivo text, origen text, detalle jsonb);
    CREATE TABLE asistencias (estudiante_id int, fecha date, estado text);
    CREATE TABLE mes_kpi (centro_id int, year int, month int, estado text, cerrado_at timestamptz, PRIMARY KEY (centro_id, year, month));
    CREATE TABLE centro_eventos (crm_event_id text, grupo_id int);
    CREATE TABLE crm_sync_outbox (id serial primary key, crm_event_id text, grupo_id int, op text, motivo text, clave_idem text UNIQUE);
  `)
})
beforeEach(async () => {
  await pool.query(`TRUNCATE centros,coaches,grupos,estudiantes,estudiante_eventos,asistencias,mes_kpi,centro_eventos,crm_sync_outbox RESTART IDENTITY;
    INSERT INTO centros VALUES (3,'Centro prueba');
    INSERT INTO coaches VALUES (7,3,'Coach prueba',true);
    INSERT INTO grupos VALUES (12,3,'12','activo',7,'2026-09-20',NULL);
    INSERT INTO estudiantes (id,centro_id,grupo_id,nombre,estado,nivel,origen,fecha_inscripcion,fecha_inicio_nivel) VALUES (1,3,12,'Matrícula prueba','activo',1,'directo','2026-08-20','2026-09-20');
    INSERT INTO estudiante_eventos (estudiante_id,centro_id,tipo,year,month,fecha,a_grupo_id,origen) VALUES (1,3,'inscripcion',2026,8,'2026-08-20',12,'directo');
    INSERT INTO centro_eventos VALUES ('crm-12',12);`)
})
after(async () => { await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end() })

test('Anulación real atómica conserva historial, libera cupo, registra auditoría y outbox; venta KPI pasa a cero', async () => {
  assert.equal((await calcularKpiAutoMes(3, 2026, 8, tag(pool))).ingTotal, 1)
  assert.equal((await run()).ok, true)
  const student = (await pool.query('SELECT * FROM estudiantes')).rows[0]
  assert.equal(student.estado, 'matricula_anulada')
  assert.equal(student.grupo_id, 12)
  assert.equal(student.status_plataforma, 'DESACTIVAR')
  assert.equal((await pool.query("SELECT count(*) FROM estudiantes WHERE estado IN ('activo','baja_potencial')")).rows[0].count, '0')
  const events = (await pool.query('SELECT * FROM estudiante_eventos ORDER BY id')).rows
  assert.deepEqual(events.map((e) => e.tipo), ['inscripcion', 'anulacion_matricula'])
  assert.equal(events[1].detalle.actor.uid, 9)
  assert.equal((await pool.query('SELECT * FROM crm_sync_outbox')).rows.length, 1)
  assert.equal((await calcularKpiAutoMes(3, 2026, 8, tag(pool))).ingTotal, 0)
  assert.match((await run()).error, /ya está anulada/)
  assert.equal((await pool.query('SELECT * FROM crm_sync_outbox')).rows.length, 1)
})

test('Retiro erróneo se reclasifica sin borrar evento y desaparece de reportes SQL de coach/red', async () => {
  await pool.query("UPDATE estudiantes SET estado='retirado',fecha_retiro='2026-08-25',motivo_retiro='ECONOMICO'; INSERT INTO estudiante_eventos (estudiante_id,centro_id,tipo,year,month,fecha,de_grupo_id,motivo) VALUES (1,3,'retiro',2026,8,'2026-08-25',12,'ECONOMICO')")
  assert.equal((await consultarDesercionPorCoach(tag(pool), { centroId: 3, anio: 2026, mesDesde: 7, mesHasta: 9 })).filas[0].bajas_reales, 1)
  assert.equal((await run()).ok, true)
  assert.equal((await consultarDesercionPorCoach(tag(pool), { centroId: 3, anio: 2026, mesDesde: 7, mesHasta: 9 })).filas[0].bajas_reales, 0)
  const comparada = await consultarDesercionComparada(tag(pool), { centroId: 3, anio: 2026, trimestre: 3 })
  assert.equal(comparada.bajasCentro, 0)
  assert.equal((await pool.query("SELECT * FROM estudiante_eventos WHERE tipo='retiro'")).rows.length, 1)
})

test('Mes original cerrado y presencia histórica rechazan sin modificar ficha/eventos/outbox', async () => {
  await pool.query("INSERT INTO mes_kpi VALUES (3,2026,8,'cerrado',now())")
  assert.match((await run()).error, /cerrado/)
  assert.equal((await pool.query('SELECT estado FROM estudiantes')).rows[0].estado, 'activo')
  await pool.query("UPDATE mes_kpi SET estado='abierto'; INSERT INTO asistencias VALUES (1,'2026-08-21','presente')")
  assert.match((await run()).error, /asistencia presente/)
  assert.equal((await pool.query('SELECT * FROM estudiante_eventos')).rows.length, 1)
  assert.equal((await pool.query('SELECT * FROM crm_sync_outbox')).rows.length, 0)
})

test('Fallo real de outbox revierte toda la transacción, incluidos estado y auditoría', async () => {
  await assert.rejects(run({}, { ...deps, encolarSyncCrm: async (ids, motivo, query) => {
    await encolarSyncCrm(ids, motivo, query)
    await query`SELECT 1 / 0`
  } }), /division by zero/)
  assert.equal((await pool.query('SELECT estado FROM estudiantes')).rows[0].estado, 'activo')
  assert.equal((await pool.query('SELECT * FROM estudiante_eventos')).rows.length, 1)
  assert.equal((await pool.query('SELECT * FROM crm_sync_outbox')).rows.length, 0)
})

test('Dos anulaciones simultáneas dejan un solo evento y un solo outbox', async () => {
  const results = await Promise.allSettled([run(), run()])
  assert.equal(results.filter((r) => r.status === 'fulfilled' && r.value.ok).length, 1)
  const other = results.find((r) => r.status !== 'fulfilled' || !r.value.ok)
  assert.ok(other.status === 'rejected' ? other.reason.code === '40001' : /anulada/.test(other.value.error))
  assert.equal((await pool.query("SELECT * FROM estudiante_eventos WHERE tipo='anulacion_matricula'")).rows.length, 1)
  assert.equal((await pool.query('SELECT * FROM crm_sync_outbox')).rows.length, 1)
})
