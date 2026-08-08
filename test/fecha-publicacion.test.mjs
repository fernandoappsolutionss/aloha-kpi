import test from 'node:test'
import assert from 'node:assert/strict'

import { fechaPublicacion } from '../lib/fecha-publicacion.mjs'

// El borde que motiva el helper (g1-3): un grupo publicado a las 19:30 de
// Panamá queda guardado como 00:30 UTC del día SIGUIENTE. slice(0, 10) diría
// 2026-08-09; el día civil de Panamá es 2026-08-08.
test('19:30 Panamá guardado como 00:30 UTC publica el día civil de Panamá', () => {
  assert.equal(fechaPublicacion('2026-08-09T00:30:00.000Z'), '2026-08-08')
  assert.equal(fechaPublicacion(new Date('2026-08-09T00:30:00.000Z')), '2026-08-08')
})

test('un instante con offset explícito de Panamá conserva su día civil', () => {
  assert.equal(fechaPublicacion('2026-08-08T19:30:00-05:00'), '2026-08-08')
})

test('el formato timestamptz de Postgres también se convierte en civil', () => {
  assert.equal(fechaPublicacion('2026-08-09 00:30:00+00'), '2026-08-08')
})

test('un instante de mediodía UTC cae en el mismo día civil', () => {
  assert.equal(fechaPublicacion('2026-07-01T12:00:00.000Z'), '2026-07-01')
  assert.equal(fechaPublicacion(new Date('2026-07-01T12:00:00.000Z')), '2026-07-01')
})

test('una fecha civil ya resuelta pasa tal cual, sin correrse un día', () => {
  // new Date('2026-08-08') la leería como medianoche UTC → 2026-08-07 en
  // Panamá; el helper la respeta porque ya ES un día civil.
  assert.equal(fechaPublicacion('2026-08-08'), '2026-08-08')
})

test('el cruce de año también respeta el día civil de Panamá', () => {
  // 31-dic 20:00 Panamá = 1-ene 01:00 UTC: la publicación es del año viejo.
  assert.equal(fechaPublicacion('2027-01-01T01:00:00.000Z'), '2026-12-31')
})

test('sin dato o con dato inválido devuelve null (respaldo siguiente decide)', () => {
  assert.equal(fechaPublicacion(null), null)
  assert.equal(fechaPublicacion(undefined), null)
  assert.equal(fechaPublicacion(''), null)
  assert.equal(fechaPublicacion('no-es-fecha'), null)
  assert.equal(fechaPublicacion(new Date('corrupta')), null)
})
