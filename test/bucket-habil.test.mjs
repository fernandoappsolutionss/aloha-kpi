import test from 'node:test'
import assert from 'node:assert/strict'

import { bucketDiaHabil } from '../lib/bucket-habil.mjs'

// ── Los tres tests OBLIGATORIOS del spec (g1-18) ──────────────────────────────

test('1 y 2 de agosto 2026 (fin de semana inicial) avanzan al lunes 3: S1/D1', () => {
  // Agosto 2026 empieza sábado: esas ventas avanzan al primer lunes.
  assert.deepEqual(bucketDiaHabil('2026-08-01', 2026, 8), {
    fecha: '2026-08-03', ordinal: 1, semana: 1, dia: 1,
  })
  assert.deepEqual(bucketDiaHabil('2026-08-02', 2026, 8), {
    fecha: '2026-08-03', ordinal: 1, semana: 1, dia: 1,
  })
})

test('domingo 9 de agosto 2026 retrocede al viernes 7: S1/D5', () => {
  assert.deepEqual(bucketDiaHabil('2026-08-09', 2026, 8), {
    fecha: '2026-08-07', ordinal: 5, semana: 1, dia: 5,
  })
})

test('el día hábil 23 cae en S5/D3', () => {
  // Marzo 2027 empieza lunes y tiene 31 días → 23 hábiles; el 23º es el 31.
  assert.deepEqual(bucketDiaHabil('2027-03-31', 2027, 3), {
    fecha: '2027-03-31', ordinal: 23, semana: 5, dia: 3,
  })
})

// ── Bordes adicionales de la misma regla ─────────────────────────────────────

test('un día hábil normal conserva su fecha y su ordinal', () => {
  // Miércoles 12-ago-2026 es el hábil 8 → S2/D3.
  assert.deepEqual(bucketDiaHabil('2026-08-12', 2026, 8), {
    fecha: '2026-08-12', ordinal: 8, semana: 2, dia: 3,
  })
  // Viernes 7-ago-2026 se queda donde está (no es fin de semana).
  assert.deepEqual(bucketDiaHabil('2026-08-07', 2026, 8), {
    fecha: '2026-08-07', ordinal: 5, semana: 1, dia: 5,
  })
})

test('sábado posterior al primer hábil también retrocede al viernes', () => {
  assert.deepEqual(bucketDiaHabil('2026-08-08', 2026, 8), {
    fecha: '2026-08-07', ordinal: 5, semana: 1, dia: 5,
  })
})

test('mes que empieza domingo avanza solo ese día al lunes 2', () => {
  // Noviembre 2026 empieza domingo.
  assert.deepEqual(bucketDiaHabil('2026-11-01', 2026, 11), {
    fecha: '2026-11-02', ordinal: 1, semana: 1, dia: 1,
  })
})

test('el último hábil de un mes de 21 hábiles cae en S5/D1', () => {
  // Lunes 31-ago-2026 es el hábil 21: la semana 5 existe aunque quede corta.
  assert.deepEqual(bucketDiaHabil('2026-08-31', 2026, 8), {
    fecha: '2026-08-31', ordinal: 21, semana: 5, dia: 1,
  })
})

// ── Validación estricta: inválido ⇒ null, jamás clamp ────────────────────────

test('una fecha de otro mes o año NO se clampa: null y fallback manual', () => {
  assert.equal(bucketDiaHabil('2026-07-31', 2026, 8), null)
  assert.equal(bucketDiaHabil('2025-08-05', 2026, 8), null)
})

test('una fecha civil inexistente es inválida', () => {
  assert.equal(bucketDiaHabil('2026-02-30', 2026, 2), null)
  assert.equal(bucketDiaHabil('2026-13-05', 2026, 13), null)
})

test('formatos malformados o tipos ajenos son inválidos', () => {
  assert.equal(bucketDiaHabil('2026-8-5', 2026, 8), null)
  assert.equal(bucketDiaHabil('2026-08-05T00:00:00Z', 2026, 8), null)
  assert.equal(bucketDiaHabil('', 2026, 8), null)
  assert.equal(bucketDiaHabil(null, 2026, 8), null)
  assert.equal(bucketDiaHabil(new Date('2026-08-05'), 2026, 8), null)
})
