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

test('si falta la semana recién cerrada, resumen y cambio quedan sin dato', () => {
  const r = armarSeries(semanas, [fila(1, semanas[0], 'ninos_activos', 100)])
  assert.deepEqual(r.resumen.ninos_activos, { abierta: null, cerrada: null, anterior: 100, delta: null })
})

test('la serie lleva la condición asignada de cada semana', () => {
  const r = armarSeries(semanas, [{ ...fila(1, semanas[0], 'ninos_activos', 100), condicion: 'normal' }])
  assert.equal(r.series.ninos_activos[0].condicion, 'normal')
  assert.equal(r.series.ninos_activos[1].condicion, null)
})

test('consolidado dibuja solo semanas completas y conserva subtotal y cobertura', () => {
  const centros = [{ id: 1, nombre: 'Uno' }, { id: 2, nombre: 'Dos' }]
  const filas = [
    fila(1, semanas[0], 'ninos_activos', 100), fila(2, semanas[0], 'ninos_activos', 50),
    fila(1, semanas[1], 'ninos_activos', 102),
  ]
  const tablero = armarTablero(centros, semanas, filas)
  assert.deepEqual(tablero.consolidada.map((p) => [p.valor, p.subtotal, p.disponibles, p.total, p.incompleta]),
    [[150, 150, 2, 2, false], [null, 102, 1, 2, true], [null, null, 0, 2, true]])
  assert.equal(tablero.centros[0].delta, 2)
  assert.equal(tablero.centros[1].abierta.ninos_activos, null)
})

test('cero declarado es dato válido; sin centros el total permanece null', () => {
  const centros = [{ id: 1, nombre: 'Uno' }, { id: 2, nombre: 'Dos' }]
  const tablero = armarTablero(centros, semanas, [fila(1, semanas[0], 'ninos_activos', 0), fila(2, semanas[0], 'ninos_activos', 0)])
  assert.deepEqual(tablero.consolidada[0], { semanaFin: semanas[0], valor: 0, subtotal: 0, disponibles: 2, total: 2, incompleta: false })
  assert.equal(armarTablero([], semanas, []).consolidada[0].valor, null)
})

test('metadatos distinguen cálculo ausente de indicador calculado sin valor', () => {
  const centros = [{ id: 1, nombre: 'Uno' }, { id: 2, nombre: 'Dos' }]
  const tablero = armarTablero(centros, semanas, [
    { ...fila(1, semanas[2], 'ninos_activos', null, 'abierta'), detalle: { error: 'Falta el cierre del mes anterior.' }, calculado_at: '2026-10-02T11:00:00.000Z' },
  ])
  assert.equal(tablero.centros[0].calculoAbierto.ninos_activos, true)
  assert.equal(tablero.centros[0].calculoAbierto.retiros, false)
  assert.equal(tablero.centros[0].serie.at(-1).detalle.error, 'Falta el cierre del mes anterior.')
  assert.equal(tablero.centros[0].serie.at(-1).calculadoAt, '2026-10-02T11:00:00.000Z')
  assert.equal(tablero.centros[1].calculoAbierto.ninos_activos, false)
})
