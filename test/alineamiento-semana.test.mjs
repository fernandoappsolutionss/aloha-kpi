import test from 'node:test'
import assert from 'node:assert/strict'
import { cambiarAlineamiento, totalesAlineamiento } from '../lib/alineamiento-semana.mjs'
import { cambiarAlineamientoEn } from '../lib/alineamiento-semana-servicio.js'
import { validarObjetivo, objetivoPreparado } from '../lib/plan-semana.mjs'

const agregar = { accion: 'agregar', codigo: 'nuevos_inscritos', partida: 'produccion', nombre: 'Familias del sábado', cantidad: 3 }
test('alineamiento separa planificación, logro con evidencia y métricas', () => {
  let items = cambiarAlineamiento([], agregar, 'uno')
  items = cambiarAlineamiento(items, { ...agregar, codigo: 'cp_asistidas', cantidad: 10 }, 'dos')
  assert.deepEqual(totalesAlineamiento(items, 'nuevos_inscritos'), { alineado: 3, hecho: 0 })
  assert.throws(() => cambiarAlineamiento(items, { accion: 'realizar', id: 'uno' }), /compruebas/)
  items = cambiarAlineamiento(items, { accion: 'realizar', id: 'uno', evidencia: 'CRM registros 1 a 3' })
  assert.deepEqual(totalesAlineamiento(items, 'nuevos_inscritos'), { alineado: 3, hecho: 3 })
  items = cambiarAlineamiento(items, { accion: 'reabrir', id: 'uno' })
  assert.equal(items[0].evidencia, null)
  assert.deepEqual(totalesAlineamiento(items, 'nuevos_inscritos'), { alineado: 3, hecho: 0 })
  assert.equal(cambiarAlineamiento(items, { accion: 'eliminar', id: 'uno' }).length, 1)
})
test('alineamiento rechaza cantidades, secciones, IDs y comandos inválidos', () => {
  for (const cantidad of [null, '', -1, 0, 1.5, NaN, Infinity, true, 10001]) assert.throws(() => cambiarAlineamiento([], { ...agregar, cantidad }, 'id'))
  for (const patch of [{ nombre: ' ' }, { nombre: 'x'.repeat(201) }, { codigo: '__proto__' }, { codigo: 'retiros' }, { partida: 'otra' }]) assert.throws(() => cambiarAlineamiento([], { ...agregar, ...patch }, 'id'))
  assert.throws(() => cambiarAlineamiento([], { accion: 'realizar', id: 'ajeno', evidencia: 'x' }), /no está/)
  assert.throws(() => cambiarAlineamiento([], { accion: 'sobrescribir' }), /inválida/)
})
test('el servicio no escribe un alineamiento fuera de la semana o de otro centro', async () => {
  let writes = 0
  const query = async strings => { const sql = strings.join('?'); if (sql.trimStart().startsWith('UPDATE')) writes++; return sql.includes('FROM centros') ? [{ pais: 'PA' }] : [] }
  const options = { query, now: new Date('2026-10-20T17:00:00Z') }
  await assert.rejects(cambiarAlineamientoEn(2, '2026-10-08', agregar, options), /semana actual/)
  await assert.rejects(cambiarAlineamientoEn(3, '2026-10-15', agregar, options), /Abre el plan/)
  assert.equal(writes, 0)
})
test('captura rápida guarda un objetivo incompleto sin fingir que está preparado', () => {
  const draft = validarObjetivo({ texto: 'Contactar las cinco familias' }, { borrador: true })
  assert.equal(draft.evidencia_esperada, null)
  assert.equal(objetivoPreparado(draft), false)
  assert.throws(() => validarObjetivo(draft), /responsable/)
  assert.throws(() => validarObjetivo({ texto: 'x', fecha: '2026-02-30' }, { borrador: true }), /Fecha/)
  assert.throws(() => validarObjetivo({ texto: ' ' }, { borrador: true }), /Objetivo/)
})
