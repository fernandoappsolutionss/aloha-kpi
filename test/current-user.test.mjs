import test from 'node:test'
import assert from 'node:assert/strict'
import { loadCurrentUser, assertCentroAccess, assertAdmin } from '../lib/current-user.mjs'

const queryWith = (rows) => async () => rows

test('relee el usuario por el uid del JWT', async () => {
  const user = await loadCurrentUser({ uid: 8, rol: 'admin_general' }, queryWith([
    { id: 8, nombre: 'Ana', email: 'ana@aloha.com', rol: 'administradora', centro_id: 10, password_hash: 'hash' },
  ]))
  assert.equal(user.rol, 'administradora')
  assert.equal(user.centro_id, 10)
})

test('un usuario eliminado pierde acceso aunque conserve cookie', async () => {
  await assert.rejects(() => loadCurrentUser({ uid: 8 }, queryWith([])), /No autenticado/)
})

test('un usuario sin acceso activado pierde acceso aunque conserve cookie', async () => {
  await assert.rejects(() => loadCurrentUser({ uid: 8 }, queryWith([
    { id: 8, nombre: 'Ana', email: 'ana@aloha.com', rol: 'administradora', centro_id: 10, password_hash: null },
  ])), /No autenticado/)
})

test('administradora solo entra a su centro y no cambia estados', () => {
  const user = { id: 8, rol: 'administradora', centro_id: 10 }
  assert.equal(assertCentroAccess(user, 10), user)
  assert.throws(() => assertCentroAccess(user, 11), /No autorizado/)
  assert.throws(() => assertAdmin(user), /No autorizado/)
})
