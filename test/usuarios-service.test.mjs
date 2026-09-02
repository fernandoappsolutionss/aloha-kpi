import test from 'node:test'
import assert from 'node:assert/strict'
import { createUsuariosService } from '../lib/usuarios-service.mjs'
import { usuariosRepository } from '../lib/usuarios-repository.js'

const coord = { id: 2, rol: 'coordinador', centros: [10, 12], password_hash: 'hash' }
const rows = [
  { id: 8, nombre: 'A', email: 'a@aloha.com', rol: 'administradora', centro_id: 10, centro_nombre: 'ANCLAS', centros: [], centros_nombres: [], activo: true },
  { id: 9, nombre: 'B', email: 'b@aloha.com', rol: 'asistente', centro_id: 12, centro_nombre: 'DAVID', centros: [], centros_nombres: [], activo: false },
]

function readRepo(actor = coord, users = rows) {
  const calls = []
  const repo = {
    calls,
    transaction: async (work) => work(repo),
    loadActor: async (_q, uid, options) => { calls.push(['actor', uid, options]); return actor },
    listUsers: async (_q, scope) => { calls.push(['users', scope]); return users },
    listCenters: async (_q, scope) => {
      calls.push(['centers', scope])
      return Array.isArray(scope) && scope.length === 0 ? [] : [{ id: 10, nombre: 'ANCLAS' }, { id: 12, nombre: 'DAVID' }]
    },
  }
  return repo
}

test('pageData usa el actor de DB y el alcance vigente', async () => {
  const repo = readRepo()
  const result = await createUsuariosService({ repo }).pageData({ uid: 2, rol: 'admin_general', centros: null })
  assert.equal(result.actor.role, 'coordinador')
  assert.deepEqual(result.centers.map((c) => c.id), [10, 12])
  assert.deepEqual(repo.calls.find((c) => c[0] === 'users')[1], [10, 12])
  assert.deepEqual(result.users.map((u) => u.role), ['administradora', 'asistente'])
  assert.deepEqual(result.users[0].centerIds, [10])
  assert.deepEqual(result.users[0].centerNames, ['ANCLAS'])
  assert.equal(result.users[0].active, true)
  assert.deepEqual(result.users[0].actions, {
    edit: true, resendInvitation: false, sendPasswordReset: true, delete: false,
  })
  assert.doesNotMatch(JSON.stringify(result), /password_hash|hash/)
})

test('coordinador sin centros no cae en alcance global', async () => {
  const repo = readRepo({ ...coord, centros: [] }, [])
  const result = await createUsuariosService({ repo }).pageData({ uid: 2 })
  assert.deepEqual(result.centers, [])
  assert.deepEqual(result.users, [])
  assert.equal(result.capabilities.createUser, false)
  assert.deepEqual(repo.calls.find((c) => c[0] === 'users')[1], [])
})

test('rol sin gestión queda denegado antes de listar', async () => {
  const repo = readRepo({ id: 7, rol: 'administradora', centro_id: 10, password_hash: 'x' })
  await assert.rejects(() => createUsuariosService({ repo }).pageData({ uid: 7 }), /No autorizado/)
  assert.equal(repo.calls.some((c) => c[0] === 'users'), false)
})

function queryRecorder(responses = []) {
  const calls = []
  const query = async (text, values) => {
    calls.push({ text, values })
    return responses.shift() || []
  }
  return { calls, query }
}

test('repositorio evita consultas globales para un alcance vacío', async () => {
  const { calls, query } = queryRecorder()
  assert.deepEqual(await usuariosRepository.listUsers(query, []), [])
  assert.deepEqual(await usuariosRepository.listCenters(query, []), [])
  assert.equal(calls.length, 0)
})

test('repositorio restringe en SQL a operativas de los centros asignados', async () => {
  const { calls, query } = queryRecorder([[{ id: 8, rol: 'administradora', centros: [] }]])
  const result = await usuariosRepository.listUsers(query, [10, 12])
  assert.deepEqual(result, [{ id: 8, rol: 'administradora', centros: [] }])
  assert.match(calls[0].text, /u\.rol = ANY\(\$1::text\[\]\) AND u\.centro_id = ANY\(\$2::int\[\]\)/)
  assert.deepEqual(calls[0].values, [['administradora', 'asistente'], [10, 12]])
})

test('repositorio bloquea actor antes de leer sus centros ordenados', async () => {
  const { calls, query } = queryRecorder([
    [{ id: 2, rol: 'coordinador', centro_id: null, password_hash: 'hash' }],
    [{ centro_id: 10 }, { centro_id: 12 }],
  ])
  const actor = await usuariosRepository.loadActor(query, 2, { lock: true })
  assert.deepEqual(actor.centros, [10, 12])
  assert.match(calls[0].text, /FROM usuarios WHERE id = \$1 FOR UPDATE/)
  assert.match(calls[1].text, /FROM usuario_centros\s+WHERE usuario_id = \$1 ORDER BY centro_id FOR SHARE/)
  assert.doesNotMatch(calls[0].text, /ARRAY_AGG/)
})
