import test from 'node:test'
import assert from 'node:assert/strict'

import { cronAutorizado, rechazoCron } from '../lib/cron-auth.mjs'

// Request real (global de Node ≥18): el mismo objeto que recibe el handler
// GET de app/api/cron/llenado/route.js — aquí se prueba el gate en espejo.
const req = (auth) =>
  new Request(
    'http://localhost/api/cron/llenado',
    auth == null ? undefined : { headers: { authorization: auth } }
  )

test('secreto ausente: 401 SIEMPRE, aunque no llegue header (fail-closed)', async () => {
  const r = rechazoCron(req(null), undefined)
  assert.equal(r.status, 401)
  assert.deepEqual(await r.json(), { error: 'No autorizado' })
})

test("la trampa del template: 'Bearer undefined' sin secreto configurado NO entra", () => {
  // Sin el guard `!secreto`, `Bearer ${undefined}` === 'Bearer undefined' y
  // este request entraría gratis (defecto 14). El gate lo cierra.
  assert.equal(cronAutorizado(req('Bearer undefined'), undefined), false)
  assert.equal(rechazoCron(req('Bearer undefined'), undefined).status, 401)
})

test('secreto vacío cuenta como ausente: 401', () => {
  assert.equal(rechazoCron(req('Bearer '), '').status, 401)
  assert.equal(rechazoCron(req(''), '').status, 401)
})

test('secreto configurado pero header incorrecto o ausente: 401', () => {
  assert.equal(rechazoCron(req('Bearer otro'), 's3creto').status, 401)
  assert.equal(rechazoCron(req('s3creto'), 's3creto').status, 401) // sin el prefijo Bearer
  assert.equal(rechazoCron(req(null), 's3creto').status, 401)
})

test('header correcto con secreto configurado: pasa (null = el handler sigue)', () => {
  assert.equal(cronAutorizado(req('Bearer s3creto'), 's3creto'), true)
  assert.equal(rechazoCron(req('Bearer s3creto'), 's3creto'), null)
})
