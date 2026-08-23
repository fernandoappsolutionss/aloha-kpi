import test from 'node:test'
import assert from 'node:assert/strict'
import { completado, porcentaje, siguienteModulo, corregirQuiz, rutaDePaso } from '../lib/entrenamiento/progreso.js'

const MODS = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

test('completado exige tour visto Y quiz aprobado', () => {
  assert.equal(completado(null), false)
  assert.equal(completado({}), false)
  assert.equal(completado({ tourVistoAt: '2026-08-23T10:00:00Z' }), false)
  assert.equal(completado({ quizAprobadoAt: '2026-08-23T10:00:00Z' }), false)
  assert.equal(completado({ tourVistoAt: '2026-08-23T10:00:00Z', quizAprobadoAt: '2026-08-23T10:05:00Z' }), true)
})

test('porcentaje cuenta módulos completados sobre el total', () => {
  const done = { tourVistoAt: 'x', quizAprobadoAt: 'y' }
  assert.deepEqual(porcentaje({}, MODS), { completados: 0, total: 3, pct: 0 })
  assert.deepEqual(porcentaje({ a: done }, MODS), { completados: 1, total: 3, pct: 33 })
  assert.deepEqual(porcentaje({ a: done, b: done, c: done }, MODS), { completados: 3, total: 3, pct: 100 })
  // un módulo con tour visto pero sin quiz NO cuenta
  assert.deepEqual(porcentaje({ a: { tourVistoAt: 'x' } }, MODS), { completados: 0, total: 3, pct: 0 })
})

test('siguienteModulo devuelve el primer no completado en orden, o null', () => {
  const done = { tourVistoAt: 'x', quizAprobadoAt: 'y' }
  assert.equal(siguienteModulo({}, MODS), 'a')
  assert.equal(siguienteModulo({ a: done }, MODS), 'b')
  assert.equal(siguienteModulo({ a: done, c: done }, MODS), 'b')
  assert.equal(siguienteModulo({ a: done, b: done, c: done }, MODS), null)
})

test('rutaDePaso: la página del paso n es la última ruta de los pasos anteriores, o inicio.ruta', () => {
  const m = { inicio: { ruta: '/a' }, pasos: [{}, {}, { ruta: '/b' }, {}] }
  assert.equal(rutaDePaso(m, 1), '/a')
  assert.equal(rutaDePaso(m, 3), '/a') // el hazlo con ruta vive en la página ORIGEN
  assert.equal(rutaDePaso(m, 4), '/b')
  assert.equal(rutaDePaso(m, 99), '/b') // fuera de rango: la última conocida
})

test('corregirQuiz: 3/3 aprueba, menos no, fuera de rango no cuenta', () => {
  assert.deepEqual(corregirQuiz([0, 2, 1], [0, 2, 1]), { puntaje: 3, correctas: [true, true, true], aprobado: true })
  assert.deepEqual(corregirQuiz([0, 1, 1], [0, 2, 1]), { puntaje: 2, correctas: [true, false, true], aprobado: false })
  assert.deepEqual(corregirQuiz([9, -1, 'x'], [0, 2, 1]), { puntaje: 0, correctas: [false, false, false], aprobado: false })
  assert.deepEqual(corregirQuiz([0], [0, 2, 1]), { puntaje: 1, correctas: [true, false, false], aprobado: false })
  assert.deepEqual(corregirQuiz(null, [0, 2, 1]), { puntaje: 0, correctas: [false, false, false], aprobado: false })
})
