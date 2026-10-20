// Usa exclusivamente el PostgreSQL desechable de administradora-runtime.mjs.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import pg from 'pg'
import { agregarObjetivoEn, cargarPlan } from '../../lib/plan-semana-servicio.js'
import { cambiarAlineamientoEn } from '../../lib/alineamiento-semana-servicio.js'
import { leerInformeSemana } from '../../lib/informe-semana-servicio.js'
import { assertWriteCentro } from '../../lib/current-user.mjs'
import { runMigration } from '../../scripts/migrate-semana-alineamiento.mjs'
import { sumarDias } from '../../lib/semana-cierre.mjs'

const runtime = JSON.parse(await readFile('.scratch/administradora-e2e/runtime.json', 'utf8'))
const url = new URL(runtime.database)
assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.pathname, '/administradora_test')
const pool = new pg.Pool({ connectionString: runtime.database })
const tag = db => async (parts, ...values) => (await db.query(parts.reduce((s, p, i) => s + (i ? `$${i}` : '') + p, ''), values)).rows
const query = tag(pool)
const transaction = async work => {
  const client = await pool.connect()
  try { await client.query('BEGIN'); const result = await work(tag(client)); await client.query('COMMIT'); return result }
  catch (e) { await client.query('ROLLBACK'); throw e }
  finally { client.release() }
}
const opts = { query, transaction, sesion: { id: 101, nombre: 'Administradora QA', rol: 'administradora' } }
const id = 900, fin = runtime.referencia
const quick = { rapido: true, seccion: 'formula', paso: 0, texto: 'Objetivo directo QA', condicion: 'normal', formulaAnterior: '' }
try {
  await runMigration(pool, { apply: true }); await runMigration(pool, { apply: true })
  assert.equal((await runMigration(pool)).length, 1)
  await pool.query("INSERT INTO centros(id,nombre,pais) VALUES ($1,'Centro exclusivo concurrencia QA','PA')", [id])
  await pool.query("INSERT INTO estadisticas_semana(centro_id,semana_fin,codigo,valor,estado) VALUES ($1,$2,'ninos_activos',100,'cerrada')", [id, fin])
  const goal = await agregarObjetivoEn(id, fin, quick, opts)
  assert.equal(goal.responsable, 'Administradora QA'); assert.equal(goal.evidencia_esperada, null)
  const snapshot = async () => (await query`SELECT condicion, (SELECT count(*) FROM semana_objetivos WHERE plan_id=p.id) objetivos FROM semana_planes p WHERE centro_id=${id}`)[0]
  const before = await snapshot()
  await assert.rejects(agregarObjetivoEn(id, fin, { ...quick, condicion: 'emergencia', formulaAnterior: 'normal', paso: 99 }, opts), /Paso inválido/)
  assert.deepEqual(await snapshot(), before, 'El objetivo inválido revierte también el cambio de condición')
  await assert.rejects(agregarObjetivoEn(id, fin, quick, opts), /otra sesión/)
  await assert.rejects(agregarObjetivoEn(id, fin, { ...quick, condicion: 'peligro', formulaAnterior: 'normal' }, { ...opts, sesion: { id: 101, rol: 'asistente' } }), /No autorizado/)
  assert.throws(() => assertWriteCentro({ rol: 'administradora', centro_id: 2 }, id), /No autorizado/)
  const changes = await Promise.allSettled(['peligro', 'emergencia'].map(condicion => agregarObjetivoEn(id, fin, { ...quick, condicion, formulaAnterior: 'normal' }, opts)))
  assert.equal(changes.filter(r => r.status === 'fulfilled').length, 1)
  const old = (await query`SELECT * FROM semana_objetivos WHERE id=${goal.id}`)[0]
  assert.equal(old.seccion, 'urgente'); assert.equal(old.origen_formula.condicion, 'normal')
  console.log('PASS Captura rápida, rollback atómico, conflicto de sesión, permisos y continuidad de fórmula')
  const entry = { accion: 'agregar', codigo: 'nuevos_inscritos', partida: 'produccion', nombre: 'Grupo QA', cantidad: 3 }
  await Promise.all([cambiarAlineamientoEn(id, fin, entry, opts), cambiarAlineamientoEn(id, fin, { ...entry, nombre: 'Otro grupo QA' }, opts)])
  let plan = await cargarPlan(id, fin, opts)
  assert.equal(plan.plan.alineamiento.length, 2)
  const item = plan.plan.alineamiento[0]
  await assert.rejects(cambiarAlineamientoEn(3, fin, { accion: 'eliminar', id: item.id }, opts), /Abre el plan/)
  await cambiarAlineamientoEn(id, fin, { accion: 'realizar', id: item.id, evidencia: 'Registros QA' }, opts)
  const report = await leerInformeSemana(id, runtime.fin, { query, now: new Date(`${sumarDias(runtime.fin, 8)}T17:00:00Z`) })
  assert.equal(report.plan.alineamiento.length, 2)
  assert.equal(report.plan.alineamiento[0].evidencia, 'Registros QA')
  await cambiarAlineamientoEn(id, fin, { accion: 'reabrir', id: item.id }, opts)
  await cambiarAlineamientoEn(id, fin, { accion: 'eliminar', id: item.id }, opts)
  plan = await cargarPlan(id, fin, opts)
  assert.equal(plan.plan.alineamiento.length, 1)
  console.log('PASS Alineamiento concurrente sin pérdidas, alcance de centro, reapertura, eliminación e informe histórico')
} finally {
  await pool.query('DELETE FROM centros WHERE id=$1', [id]); await pool.end()
  console.log('Datos ficticios propios eliminados. No se usó navegador.')
}
