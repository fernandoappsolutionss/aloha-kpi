import { test } from 'node:test'
import assert from 'node:assert/strict'
import { modeloGrafica, COLOR_MEJORA, COLOR_EMPEORA } from '../lib/grafica-semanal.mjs'

const puntos = (valores) => valores.map((valor, i) => ({ semanaFin: `2026-09-${String(3 + i * 7).padStart(2, '0')}`, valor, cuota: null }))

test('tramos azules al mejorar o mantenerse; rojos al empeorar', () => {
  const m = modeloGrafica({ puntos: puntos([10, 12, 11, 11]) })
  assert.deepEqual(m.tramos.map((t) => t.color), [COLOR_MEJORA, COLOR_EMPEORA, COLOR_MEJORA])
  assert.ok(m.puntos[1].y < m.puntos[0].y)
})

test('en inversas bajar mejora y sube en el eje', () => {
  const m = modeloGrafica({ puntos: puntos([5, 3, 4]), inversa: true })
  assert.deepEqual(m.tramos.map((t) => t.color), [COLOR_MEJORA, COLOR_EMPEORA])
  assert.ok(m.puntos[1].y < m.puntos[0].y)
})

test('sin dato corta la línea, cuota amplía la escala', () => {
  const m = modeloGrafica({ puntos: puntos([10, null, 12]) })
  assert.equal(m.tramos.length, 0)
  assert.equal(m.puntos[1].y, null)
  assert.ok(modeloGrafica({ puntos: [{ valor: 10 }, { valor: 11, cuota: 20 }] }).max >= 20)
  assert.equal(modeloGrafica({ puntos: puntos([0, 1]) }).min, 0)
  assert.deepEqual([modeloGrafica({ puntos: puntos([7, 7, 7]) }).min, modeloGrafica({ puntos: puntos([7, 7, 7]) }).max], [6, 8])
  assert.equal(modeloGrafica({ puntos: puntos([null, null]) }).vacia, true)
})
