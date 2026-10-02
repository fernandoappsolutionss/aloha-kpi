import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lecturaCondicion, hayDiscrepancia } from '../lib/condiciones/lectura.mjs'

const c = (serie) => lecturaCondicion(serie).condicion

test('lectura por inclinación de la última semana', () => {
  assert.equal(c([100, 101, 102]), 'inexistencia')      // menos de 4 semanas con dato
  assert.equal(c([100, 101, 102, 103]), 'normal')       // +0,98 %
  assert.equal(c([100, 101, 102, 105]), 'afluencia')    // +2,9 %
  assert.equal(c([100, 101, 102, 102]), 'emergencia')   // sin cambio
  assert.equal(c([100, 101, 102, 99]), 'peligro')       // −2,9 %
  assert.equal(c([10, 11, 12, 0]), 'inexistencia')      // valor 0
})

test('rachas que llevan a peligro', () => {
  assert.equal(c([104, 103, 102, 101]), 'peligro')      // 3 semanas seguidas bajando
  assert.equal(c([100, 100, 100, 100]), 'peligro')      // emergencia prolongada
})

test('sin dato no hay lectura', () => {
  assert.equal(c([100, 101, 102, null]), null)
  assert.equal(c([99, 100, 101, null, 103]), null)      // falta la semana anterior
})

test('discrepancia solo cuando la asignada está por encima de la lectura', () => {
  assert.equal(hayDiscrepancia('normal', 'emergencia'), true)
  assert.equal(hayDiscrepancia('emergencia', 'normal'), false)
  assert.equal(hayDiscrepancia('poder', 'normal'), true)
  assert.equal(hayDiscrepancia('normal', 'normal'), false)
  assert.equal(hayDiscrepancia(null, 'normal'), false)
  assert.equal(hayDiscrepancia('normal', null), false)
})
