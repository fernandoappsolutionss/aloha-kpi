import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ACTION_ACCESS_MATRIX, API_ACCESS_MATRIX, ACCESS_KINDS } from '../lib/access-matrix.mjs'

test('acciones semanales tienen guardas y clasificación de acceso', () => {
  const source = readFileSync(new URL('../app/actions/semana.js', import.meta.url), 'utf8')
  assert.match(source, /export async function getSemanaCentro[\s\S]*requireCentroAccess\(/)
  assert.match(source, /export async function actualizarSemanaCentro[\s\S]*requireCurrentWriteCentro\(/)
  assert.match(source, /export async function recalcularSemanaCentro[\s\S]*requireCurrentMaster\(/)
  assert.match(source, /async function cargarTablero\(\)[\s\S]*alcancePanel\(/)
  assert.match(source, /export async function getTableroSemanal\(\)\s*\{\s*return await cargarTablero\(\)/)
  assert.match(source, /export async function getReunionSemanal\(\)\s*\{\s*const tablero = await cargarTablero\(\)/)
  assert.equal(ACTION_ACCESS_MATRIX['app/actions/semana.js#getSemanaCentro'], ACCESS_KINDS.readCentro)
  assert.equal(ACTION_ACCESS_MATRIX['app/actions/semana.js#actualizarSemanaCentro'], ACCESS_KINDS.writeCentro)
  assert.equal(ACTION_ACCESS_MATRIX['app/actions/semana.js#recalcularSemanaCentro'], ACCESS_KINDS.master)
  assert.equal(ACTION_ACCESS_MATRIX['app/actions/semana.js#getTableroSemanal'], ACCESS_KINDS.readGlobal)
  assert.equal(ACTION_ACCESS_MATRIX['app/actions/semana.js#asignarCondicion'], ACCESS_KINDS.closeMonth)
  for (const nombre of ['agregarObjetivo', 'editarObjetivo', 'marcarObjetivo', 'eliminarObjetivo']) {
    assert.equal(ACTION_ACCESS_MATRIX[`app/actions/semana.js#${nombre}`], ACCESS_KINDS.writeCentro)
  }
  assert.equal(API_ACCESS_MATRIX['app/api/cron/estadisticas-semana/route.js#GET'], ACCESS_KINDS.cron)
})

test('Vercel ejecuta la foto semanal a las 06:00 Panamá', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  assert.ok(config.crons.some((cron) => cron.path === '/api/cron/estadisticas-semana' && cron.schedule === '0 11 * * *'))
})

test('tablero prepara cuotas y planes con el período local de cada centro', () => {
  const source = readFileSync(new URL('../app/actions/semana.js', import.meta.url), 'utf8')
  assert.match(source, /periodosCentro\(centros, now\)/)
  assert.match(source, /armarSeries\(periodo\.semanas, propias\)/)
  assert.match(source, /semanaAbierta: periodo\.semanaAbierta/)
  assert.match(source, /zonaHoraria: zonaHorariaCentro\(centro\)/)
  assert.match(source, /ultimaCerrada: periodo\.ultimaCerrada/)
  assert.match(source, /semanaFin: periodo\.ultimaCerrada/)
  assert.match(source, /semana_fin = ANY\(\$\{cierres\}::date\[\]\)/)
})
