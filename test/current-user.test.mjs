import test from 'node:test'
import assert from 'node:assert/strict'
import {
  loadCurrentUser, assertCentroAccess, assertAdmin, assertPuedeCerrarMes, assertPuedeEliminar,
  esAdminDe, centrosDe, vePanelGerencia,
  puedeGestionarUsuarios, rolesAsignablesUsuarios, centrosDestinoUsuarios,
  puedeGestionarUsuario, puedeAsignarUsuario, accionesGestionUsuario,
  assertGestionUsuarios,
} from '../lib/current-user.mjs'

const gerencia = { id: 1, rol: 'admin_general', centros: [] }
const coordinador = { id: 2, rol: 'coordinador', centros: [10, 12] }
const sinCentros = { id: 3, rol: 'coordinador', centros: [] }
const admin10 = { id: 8, rol: 'administradora', centro_id: 10, password_hash: 'hash' }
const asistente12 = { id: 9, rol: 'asistente', centro_id: 12, password_hash: null }
const admin11 = { id: 10, rol: 'administradora', centro_id: 11, password_hash: 'hash' }
const otroCoord = { id: 11, rol: 'coordinador', centro_id: null, centros: [10] }

const queryWith = (rows) => async () => rows

test('solo gerencia y coordinador abren Gestión de usuarios', () => {
  assert.equal(puedeGestionarUsuarios(gerencia), true)
  assert.equal(puedeGestionarUsuarios(coordinador), true)
  assert.equal(puedeGestionarUsuarios({ rol: 'administradora', centro_id: 10 }), false)
  assert.throws(() => assertGestionUsuarios({ rol: 'asistente', centro_id: 10 }), /No autorizado/)
})

test('roles y centros asignables dependen del actor vigente', () => {
  assert.deepEqual(rolesAsignablesUsuarios(gerencia), ['admin_general', 'coordinador', 'administradora', 'asistente'])
  assert.deepEqual(rolesAsignablesUsuarios(coordinador), ['administradora', 'asistente'])
  assert.deepEqual(centrosDestinoUsuarios(gerencia), null)
  assert.deepEqual(centrosDestinoUsuarios(coordinador), [10, 12])
  assert.deepEqual(centrosDestinoUsuarios(sinCentros), [])
})

test('coordinador gestiona solo cuentas operativas de sus centros', () => {
  assert.equal(puedeGestionarUsuario(coordinador, admin10), true)
  assert.equal(puedeGestionarUsuario(coordinador, asistente12), true)
  assert.equal(puedeGestionarUsuario(coordinador, admin11), false)
  assert.equal(puedeGestionarUsuario(coordinador, otroCoord), false)
  assert.equal(puedeGestionarUsuario(sinCentros, admin10), false)
})

test('coordinador solo asigna roles operativos a centros propios', () => {
  assert.equal(puedeAsignarUsuario(coordinador, { rol: 'administradora', centroId: 10 }), true)
  assert.equal(puedeAsignarUsuario(coordinador, { rol: 'asistente', centroId: 12 }), true)
  assert.equal(puedeAsignarUsuario(coordinador, { rol: 'asistente', centroId: 11 }), false)
  assert.equal(puedeAsignarUsuario(coordinador, { rol: 'coordinador', centros: [10] }), false)
  assert.equal(puedeAsignarUsuario(coordinador, { rol: 'administradora', centroId: null }), false)
})

test('acciones distinguen invitación, reset y borrado de gerencia', () => {
  assert.deepEqual(accionesGestionUsuario(coordinador, asistente12), {
    editar: true, reenviarInvitacion: true, enviarRestablecimiento: false, eliminar: false,
  })
  assert.deepEqual(accionesGestionUsuario(coordinador, admin10), {
    editar: true, reenviarInvitacion: false, enviarRestablecimiento: true, eliminar: false,
  })
  assert.equal(accionesGestionUsuario(coordinador, { ...admin10, password_hash: undefined, activo: true }).enviarRestablecimiento, true)
  assert.equal(accionesGestionUsuario(gerencia, { ...admin10, id: 1 }).eliminar, false)
  assert.equal(accionesGestionUsuario(gerencia, { id: 20, rol: 'admin_general', password_hash: 'x' }).eliminar, false)
  assert.equal(accionesGestionUsuario(gerencia, { id: 21, rol: 'supervisor', password_hash: 'x' }).eliminar, true)
})

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
