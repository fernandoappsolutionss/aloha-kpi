import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as currentUser from '../lib/current-user.mjs'
import {
  loadCurrentUser, assertCentroAccess, assertAdmin, assertPuedeCerrarMes, assertPuedeEliminar,
  esAdminDe, centrosDe, vePanelGerencia,
  puedeVerUsuarios, puedeGestionarUsuarios, rolesAsignablesUsuarios, centrosDestinoUsuarios,
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

const master = { id: 1, email: 'fperez@teamsolutionss.com', rol: 'admin_master', centros: [] }
const general = { id: 4, email: 'general@aloha.invalid', rol: 'admin_general', centros: [] }
const supervisor = { id: 5, email: 'supervisor@aloha.invalid', rol: 'supervisor', centros: [] }

test('Master es unico por correo y General queda como lectura global sin escritura', () => {
  assert.equal(typeof currentUser.isMaster, 'function')
  assert.equal(currentUser.isMaster(master), true)
  assert.equal(currentUser.isMaster({ ...master, email: 'otro@aloha.invalid' }), false)
  assert.equal(currentUser.isMaster({ ...master, rol: 'admin_general' }), false)

  for (const actor of [general, supervisor]) {
    assert.equal(currentUser.esSoloLectura(actor), true)
    assert.equal(currentUser.canAccessCentro(actor, 99), true)
    assert.equal(currentUser.puedeLeerCentro(actor, 99), true)
    assert.equal(currentUser.puedeEscribirCentro(actor, 99), false)
    assert.throws(() => currentUser.assertWriteCentro(actor, 99), /solo lectura|No autorizado/)
  }

  assert.equal(currentUser.esSoloLectura(master), false)
  assert.equal(currentUser.puedeEscribirCentro(master, 99), true)
  assert.equal(currentUser.puedeVerOficio(master), true)
  assert.equal(currentUser.puedeVerOficio(general), false)
  assert.equal(currentUser.puedeVerOficio(coordinador), true)
})

test('Gestion de usuarios es de Master o coordinador local, nunca de General', () => {
  assert.equal(puedeVerUsuarios(master), true)
  assert.equal(puedeVerUsuarios(general), true)
  assert.equal(puedeVerUsuarios(supervisor), true)
  assert.equal(puedeGestionarUsuarios(master), true)
  assert.equal(puedeGestionarUsuarios(general), false)
  assert.equal(puedeGestionarUsuarios(supervisor), false)
  assert.equal(puedeGestionarUsuarios(coordinador), true)
  assert.deepEqual(rolesAsignablesUsuarios(master), ['admin_general', 'coordinador', 'administradora', 'asistente', 'coach'])
  assert.deepEqual(rolesAsignablesUsuarios(general), [])
  assert.deepEqual(rolesAsignablesUsuarios(supervisor), [])
  assert.equal(rolesAsignablesUsuarios(master).includes('admin_master'), false)
})

test('acciones de usuario protegen al Master y no ofrecen bloqueo a no Master', () => {
  const target = { id: 20, rol: 'administradora', centro_id: 10, password_hash: 'x' }
  assert.deepEqual(accionesGestionUsuario(master, target), {
    editar: true,
    reenviarInvitacion: false,
    enviarRestablecimiento: true,
    eliminar: true,
    bloquear: true,
    desbloquear: false,
  })
  assert.equal(accionesGestionUsuario(master, master).editar, false)
  assert.equal(accionesGestionUsuario(master, master).eliminar, false)
  assert.equal(accionesGestionUsuario(master, master).bloquear, false)
  assert.equal(accionesGestionUsuario(coordinador, target).bloquear, false)
})

test('loadCurrentUser revoca una cookie antigua si la fila vigente esta bloqueada', async () => {
  await assert.rejects(() => loadCurrentUser({ uid: 8 }, queryWith([
    {
      id: 8,
      nombre: 'Ana',
      email: 'ana@aloha.invalid',
      rol: 'administradora',
      centro_id: 10,
      centros: [],
      password_hash: 'hash',
      bloqueado: true,
      blocked_until: '2026-09-10T05:00:00.000Z',
    },
  ])), /No autenticado/)

  const vigente = await loadCurrentUser({ uid: 8 }, queryWith([
    {
      id: 8,
      nombre: 'Ana',
      email: 'ana@aloha.invalid',
      rol: 'administradora',
      centro_id: 10,
      centros: [],
      password_hash: 'hash',
      bloqueado: false,
      blocked_until: '2026-09-07T05:00:00.000Z',
    },
  ]))
  assert.equal(vigente.blocked_until, '2026-09-07T05:00:00.000Z')
})

test('Master y coordinador gestionan usuarios; General solo consulta', () => {
  assert.equal(puedeVerUsuarios(gerencia), true)
  assert.equal(puedeGestionarUsuarios(gerencia), false)
  assert.equal(puedeGestionarUsuarios(master), true)
  assert.equal(puedeGestionarUsuarios(coordinador), true)
  assert.equal(puedeGestionarUsuarios({ rol: 'administradora', centro_id: 10 }), false)
  assert.throws(() => assertGestionUsuarios({ rol: 'asistente', centro_id: 10 }), /No autorizado/)
})

test('roles y centros asignables dependen del actor vigente', () => {
  assert.deepEqual(rolesAsignablesUsuarios(master), ['admin_general', 'coordinador', 'administradora', 'asistente', 'coach'])
  assert.deepEqual(rolesAsignablesUsuarios(gerencia), [])
  assert.deepEqual(rolesAsignablesUsuarios(coordinador), ['administradora', 'asistente', 'coach'])
  assert.deepEqual(centrosDestinoUsuarios(master), null)
  assert.deepEqual(centrosDestinoUsuarios(gerencia), [])
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

test('acciones distinguen invitación, reset y borrado de Master', () => {
  assert.deepEqual(accionesGestionUsuario(coordinador, asistente12), {
    editar: true, reenviarInvitacion: true, enviarRestablecimiento: false, eliminar: false, bloquear: false, desbloquear: false,
  })
  assert.deepEqual(accionesGestionUsuario(coordinador, admin10), {
    editar: true, reenviarInvitacion: false, enviarRestablecimiento: true, eliminar: false, bloquear: false, desbloquear: false,
  })
  assert.equal(accionesGestionUsuario(coordinador, { ...admin10, password_hash: undefined, activo: true }).enviarRestablecimiento, true)
  assert.equal(accionesGestionUsuario(master, { ...admin10, id: 1 }).eliminar, false)
  assert.equal(accionesGestionUsuario(master, { id: 20, rol: 'admin_general', password_hash: 'x' }).eliminar, false)
  assert.equal(accionesGestionUsuario(master, { id: 21, rol: 'supervisor', password_hash: 'x' }).eliminar, true)
  assert.deepEqual(accionesGestionUsuario(gerencia, { ...admin10, id: 30 }), {
    editar: false, reenviarInvitacion: false, enviarRestablecimiento: false, eliminar: false, bloquear: false, desbloquear: false,
  })
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

test('General no tiene limite de lectura de centros, pero no manda', () => {
  const gerencia = { id: 1, rol: 'admin_general', centro_id: null, centros: [] }
  assert.equal(centrosDe(gerencia), null)
  assert.equal(assertCentroAccess(gerencia, 99), gerencia)
  assert.equal(esAdminDe(gerencia, 99), false)
  assert.throws(() => assertPuedeCerrarMes(gerencia), /no puede cerrar/)
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

// EL COACH NO OPERA EL CENTRO. Tiene cuenta para estudiar su puesto: entra a su
// centro, pero las dos acciones destructivas que la sesión alcanza le quedan
// negadas. Sin esto, darle un rol nuevo con centro_id lo habría convertido de
// una en alguien que cierra el mes.
test('el coach entra a su centro pero no cierra el mes ni elimina', () => {
  const coach = { id: 12, rol: 'coach', centro_id: 10 }
  assert.equal(assertCentroAccess(coach, 10), coach)
  assert.throws(() => assertCentroAccess(coach, 11), /No autorizado/)
  assert.throws(() => assertPuedeCerrarMes(coach), /no puede cerrar/)
  assert.throws(() => assertPuedeEliminar(coach), /no puede eliminar/)
  assert.equal(vePanelGerencia(coach), false)
  assert.equal(esAdminDe(coach, 10), false)
  assert.equal(puedeGestionarUsuarios(coach), false)
  assert.deepEqual(rolesAsignablesUsuarios(coach), [])
})

// Y el middleware lo encierra en su entrenamiento antes de que se pinte una
// pantalla: dentro de /centro/<id> el Coach solo alcanza ese árbol.
test('el middleware deja al coach solo en el árbol de entrenamiento de su centro', () => {
  const src = readFileSync(new URL('../middleware.js', import.meta.url), 'utf8')
  assert.match(src, /ROL_COACH/, 'el rol sale de lib/current-user.mjs, no de una cadena suelta')
  assert.match(src, /rutaDelCoach\(pathname, centroId\)/, 'la guarda tiene que correr dentro de /centro/')
  assert.match(src, /entrenamiento\}\/`\)/, 'la guarda abre el árbol entero de entrenamiento, no una sola página')
})

test('loadCurrentUser trae los centros asignados del coordinador', async () => {
  const user = await loadCurrentUser({ uid: 9 }, queryWith([
    { id: 9, nombre: 'Zona', email: 'z@aloha.com', rol: 'coordinador', centro_id: null, centros: [10, 12], password_hash: 'hash' },
  ]))
  assert.deepEqual(user.centros, [10, 12])
  assert.equal(user.password_hash, undefined)
})
