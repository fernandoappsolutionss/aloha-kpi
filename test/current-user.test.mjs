import test from 'node:test'
import assert from 'node:assert/strict'
import {
  loadCurrentUser, assertCentroAccess, assertAdmin, assertPuedeCerrarMes, assertPuedeEliminar,
  esAdminDe, centrosDe, vePanelGerencia,
} from '../lib/current-user.mjs'

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

test('coordinador operativo: manda en sus centros y en ninguno más', () => {
  const coord = { id: 9, rol: 'coordinador', centro_id: null, centros: [10, 12] }
  assert.equal(assertCentroAccess(coord, 12), coord)
  assert.throws(() => assertCentroAccess(coord, 11), /No autorizado/)
  assert.equal(esAdminDe(coord, 10), true)
  assert.equal(esAdminDe(coord, 11), false)
  assert.deepEqual(centrosDe(coord), [10, 12])
  // Ve el panel de gerencia, pero no la configuración global (centros/usuarios).
  assert.equal(vePanelGerencia(coord), true)
  assert.throws(() => assertAdmin(coord), /No autorizado/)
})

test('coordinador sin centros asignados no entra a ninguno', () => {
  const coord = { id: 9, rol: 'coordinador', centro_id: null, centros: [] }
  assert.deepEqual(centrosDe(coord), [])
  assert.throws(() => assertCentroAccess(coord, 10), /No autorizado/)
})

test('gerencia no tiene límite de centros', () => {
  const gerencia = { id: 1, rol: 'admin_general', centro_id: null, centros: [] }
  assert.equal(centrosDe(gerencia), null)
  assert.equal(assertCentroAccess(gerencia, 99), gerencia)
  assert.equal(esAdminDe(gerencia, 99), true)
})

test('asistente opera su centro pero no cierra el mes ni elimina', () => {
  const asistente = { id: 7, rol: 'asistente', centro_id: 10 }
  assert.equal(assertCentroAccess(asistente, 10), asistente)
  assert.throws(() => assertCentroAccess(asistente, 11), /No autorizado/)
  assert.throws(() => assertPuedeCerrarMes(asistente), /no puede cerrar/)
  assert.throws(() => assertPuedeEliminar(asistente), /no puede eliminar/)
  assert.equal(vePanelGerencia(asistente), false)
  assert.equal(esAdminDe(asistente, 10), false)
})

test('la administradora del centro sí cierra el mes y elimina', () => {
  const admin = { id: 8, rol: 'administradora', centro_id: 10 }
  assert.equal(assertPuedeCerrarMes(admin), admin)
  assert.equal(assertPuedeEliminar(admin), admin)
})

test('loadCurrentUser trae los centros asignados del coordinador', async () => {
  const user = await loadCurrentUser({ uid: 9 }, queryWith([
    { id: 9, nombre: 'Zona', email: 'z@aloha.com', rol: 'coordinador', centro_id: null, centros: [10, 12], password_hash: 'hash' },
  ]))
  assert.deepEqual(user.centros, [10, 12])
  assert.equal(user.password_hash, undefined)
})
