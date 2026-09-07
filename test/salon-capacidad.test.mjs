import test from 'node:test'
import assert from 'node:assert/strict'
import { buildOperationalGrowth } from '../lib/growth/source.mjs'
import { higieneDeDatos } from '../lib/higiene-datos.mjs'
import { parseSalonCapacity } from '../lib/salon-capacidad.mjs'

test('capacidad acepta enteros positivos y distingue blanco de cero', () => {
  for (const raw of [null, undefined, '', '  ']) assert.deepEqual(parseSalonCapacity(raw), { value: null })
  for (const raw of [12, '12', ' 12 ']) assert.deepEqual(parseSalonCapacity(raw), { value: 12 })
  for (const raw of [0, '0', -1, 2.5, '2.5', '1e2', true, {}, [], Infinity, 2147483648]) {
    assert.ok(parseSalonCapacity(raw).error, `debe rechazar ${String(raw)}`)
  }
})

const salons = [
  { id: 1, nombre: 'Salón 1', activo: true, capacidad_ninos: 10 },
  { id: 2, nombre: 'Salón 2', activo: true, capacidad_ninos: 12 },
  { id: 3, nombre: 'Salón 3', activo: false, capacidad_ninos: 20 },
]
const operational = (rooms) => buildOperationalGrowth({ today: '2026-09-07', salons: rooms })
const capacityAlert = (rooms) => {
  const op = operational(rooms)
  return higieneDeDatos({ centroId: 2, growth: { operational: op, metrics: { confidence: { level: 'medium' }, issues: op.issues } } }).puntos.find(p => p.clave === 'capacidad')
}

test('suma capacidades declaradas de salones activos como puestos simultáneos', () => {
  const op = operational(salons)
  assert.equal(op.roomCapacity?.simultaneousChildren, 22)
  assert.equal(op.roomCapacity?.activeRooms, 2)
  // 22 puestos no limitan a 22 matriculados atendidos en horarios distintos.
  assert.equal(op.capacityMax, null)
})

test('no presenta una suma parcial como capacidad completa del centro', () => {
  const op = operational([...salons, { id: 4, nombre: 'Salón 4', activo: true, capacidad_ninos: null }])
  assert.equal(op.roomCapacity?.simultaneousChildren, null)
  assert.equal(op.roomCapacity?.recordedChildren, 22)
  assert.deepEqual(op.roomCapacity?.missingRooms, [{ id: 4, nombre: 'Salón 4' }])
})

test('sin salones activos la capacidad es desconocida, no cero confirmado', () => {
  assert.equal(operational([]).roomCapacity?.simultaneousChildren, null)
  assert.equal(operational([salons[2]]).roomCapacity?.complete, false)
})

test('el aviso lleva al centro a completar el salón, no lo llama limitación del sistema', () => {
  const alert = capacityAlert([{ id: 1, nombre: 'Salón 1', activo: true }])
  assert.equal(alert.dueno, 'centro')
  assert.match(alert.titulo, /Capacidad de salones por completar/)
  assert.ok(alert.items.includes('Salón 1'))
  assert.equal(alert.donde.href, '/centro/2/grupos#salones')
})

test('con todos los salones declarados distingue puestos físicos de matrícula por horarios', () => {
  const alert = capacityAlert(salons)
  assert.match(alert.titulo, /22 niños a la vez/)
  assert.match(alert.accion, /horarios/)
  assert.doesNotMatch(alert.accion, /no ofrece cómo validarla/)
})
