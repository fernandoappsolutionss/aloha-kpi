import { test } from 'node:test'
import assert from 'node:assert/strict'
import { armarSeries, armarTablero } from '../lib/estadisticas-semana/presentacion.mjs'

const semanas = ['2026-09-24', '2026-10-01', '2026-10-08']
const fila = (centro_id, semana_fin, codigo, valor, estado = 'cerrada') => ({ centro_id, semana_fin, codigo, valor, estado, detalle: {} })

test('series conservan huecos como null y resumen abierto/cerrado', () => {
  const r = armarSeries(semanas, [fila(1, semanas[0], 'ninos_activos', 100), fila(1, semanas[1], 'ninos_activos', 102), fila(1, semanas[2], 'ninos_activos', 103, 'abierta')])
  assert.equal(r.series.ninos_activos[2].valor, 103)
  assert.equal(r.series.retiros[1].valor, null)
  assert.deepEqual(r.resumen.ninos_activos, { abierta: 103, cerrada: 102, anterior: 100, delta: 2 })
})

test('la serie lleva la condición asignada de cada semana', () => {
  const r = armarSeries(semanas, [{ ...fila(1, semanas[0], 'ninos_activos', 100), condicion: 'normal' }])
  assert.equal(r.series.ninos_activos[0].condicion, 'normal')
  assert.equal(r.series.ninos_activos[1].condicion, null)
})

test('consolidado no inventa cero cuando falta algún centro', () => {
  const centros = [{ id: 1, nombre: 'Uno' }, { id: 2, nombre: 'Dos' }]
  const filas = [
    fila(1, semanas[0], 'ninos_activos', 100), fila(2, semanas[0], 'ninos_activos', 50),
    fila(1, semanas[1], 'ninos_activos', 102),
  ]
  const tablero = armarTablero(centros, semanas, filas)
  assert.deepEqual(tablero.consolidada.map((p) => [p.valor, p.incompleta]), [[150, false], [102, true], [null, true]])
  assert.equal(tablero.centros[0].delta, 2)
  assert.equal(tablero.centros[1].abierta.ninos_activos, null)
})
