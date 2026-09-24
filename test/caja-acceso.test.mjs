import test from 'node:test'
import assert from 'node:assert/strict'
import { puedeVerCaja, assertCaja, CAJA_EMAILS } from '../lib/caja/acceso.mjs'

test('solo los 4 correos de la allowlist ven caja, sin importar el rol', () => {
  assert.equal(CAJA_EMAILS.length, 4)
  assert.equal(puedeVerCaja({ rol: 'coordinador', email: 'admin@alohapanama.com' }), true)
  assert.equal(puedeVerCaja({ rol: 'admin_general', email: ' FRoberts@alohapanama.com ' }), true)
  assert.equal(puedeVerCaja({ rol: 'coordinador', email: 'vcampos@alohapanama.com' }), true)
  assert.equal(puedeVerCaja({ rol: 'admin_master', email: 'fperez@teamsolutionss.com' }), true)
  assert.equal(puedeVerCaja({ rol: 'admin_general', email: 'otro@alohapanama.com' }), false)
  assert.equal(puedeVerCaja({ rol: 'coordinador' }), false)
  assert.equal(puedeVerCaja(null), false)
})

test('un admin_master con correo ajeno no entra aunque el correo esté en la lista de otro rol', () => {
  assert.equal(puedeVerCaja({ rol: 'admin_master', email: 'admin@alohapanama.com' }), false)
})

test('assertCaja lanza No autorizado', () => {
  assert.throws(() => assertCaja({ rol: 'coordinador', email: 'x@y.com' }), /No autorizado/)
  const u = { rol: 'coordinador', email: 'admin@alohapanama.com' }
  assert.equal(assertCaja(u), u)
})
