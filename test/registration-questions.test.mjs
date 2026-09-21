import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeQuestion } from '../lib/registration-questions.mjs'

test('recupera el texto de preguntas viejas guardadas con `label` (bug corregido 2026-09-21)', () => {
  const q = normalizeQuestion({ label: 'Prueba', type: 'text', required: false })
  assert.equal(q.question, 'Prueba')
  assert.equal(q.type, 'text')
  assert.equal(q.required, false)
  assert.ok(q.id)
})

test('preserva id, question, type, required y options ya correctos', () => {
  const q = normalizeQuestion({ id: 'abc-123', question: '¿Nivel?', type: 'select', required: true, options: ['Sí', 'No'] })
  assert.deepEqual(q, { id: 'abc-123', question: '¿Nivel?', type: 'select', required: true, options: ['Sí', 'No'] })
})

test('pregunta nueva en blanco: texto, no requerida, sin opciones, con id', () => {
  const q = normalizeQuestion({})
  assert.equal(q.question, '')
  assert.equal(q.type, 'text')
  assert.equal(q.required, false)
  assert.deepEqual(q.options, [])
  assert.ok(q.id)
})
