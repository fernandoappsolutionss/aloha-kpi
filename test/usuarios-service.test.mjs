import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as usuariosServiceModule from '../lib/usuarios-service.mjs'
import { usuariosRepository } from '../lib/usuarios-repository.js'
import { usuariosDeliveryForRuntime } from '../lib/usuarios-delivery.mjs'

const { createUsuariosService } = usuariosServiceModule

const coord = { id: 2, rol: 'coordinador', centros: [10, 12], password_hash: 'hash' }
const rows = [
  { id: 8, nombre: 'A', email: 'a@aloha.invalid', rol: 'administradora', centro_id: 10, centro_nombre: 'ANCLAS', centros: [], centros_nombres: [], activo: true },
  { id: 9, nombre: 'B', email: 'b@aloha.invalid', rol: 'asistente', centro_id: 12, centro_nombre: 'DAVID', centros: [], centros_nombres: [], activo: false },
]

function validInput() {
  return { nombre: 'Laura', email: 'laura@aloha.invalid', rol: 'asistente', centro_id: 10 }
}

function writeFixture({
  actor = coord,
  actorAfterError = null,
  duplicate = null,
  duplicateAfterError = null,
  insertError = null,
  insertErrors = null,
  transactionErrors = [],
  relationsError = null,
  tokenError = null,
  invalidateError = null,
  deleteError = null,
  deliveryError = null,
  deliveryResult = null,
  deliveryTransport = null,
} = {}) {
  const inserted = []
  const updated = []
  const deleted = []
  const tokens = []
  const invalidated = []
  const deliveries = []
  const coordinatorCenters = []
  const events = []
  const transactionOptions = []
  const targets = new Map([
    [1, { id: 1, rol: 'admin_general', centro_id: null, centros: [], password_hash: 'x' }],
    [8, { id: 8, nombre: 'A', email: 'a@aloha.invalid', rol: 'administradora', centro_id: 10, centros: [], password_hash: 'x' }],
    [9, { id: 9, nombre: 'B', email: 'b@aloha.invalid', rol: 'asistente', centro_id: 12, centros: [], password_hash: null }],
    [20, { id: 20, nombre: 'Jefe', email: 'j@aloha.invalid', rol: 'admin_general', centro_id: null, centros: [], password_hash: 'x' }],
  ])
  const centerState = new Map([...targets].map(([id, user]) => [id, [...(user.centros || [])]]))
  const tokenState = new Map([[8, ['old-8']], [9, ['old-9']]])
  let writeCount = 0
  let duplicateReads = 0
  let actorReads = 0
  let transactions = 0
  let insertAttempts = 0
  const copyUsers = () => new Map([...targets].map(([id, user]) => [
    id,
    { ...user, centros: [...(user.centros || [])] },
  ]))
  const copyLists = (source) => new Map([...source].map(([id, values]) => [id, [...values]]))
  const restoreMap = (destination, snapshot) => {
    destination.clear()
    for (const [key, value] of snapshot) destination.set(key, value)
  }
  const repo = {
    transaction: async (work, options) => {
      transactions++
      transactionOptions.push(options)
      const query = { transaction: transactions }
      events.push(`tx:${transactions}:begin`)
      const snapshot = {
        inserted: inserted.length,
        updated: updated.length,
        deleted: deleted.length,
        tokens: tokens.length,
        invalidated: invalidated.length,
        coordinatorCenters: coordinatorCenters.length,
        targets: copyUsers(),
        centers: copyLists(centerState),
        tokenState: copyLists(tokenState),
        writeCount,
      }
      try {
        if (transactionErrors[transactions - 1]) throw transactionErrors[transactions - 1]
        const result = await work(query)
        events.push(`tx:${transactions}:commit`)
        return result
      } catch (error) {
        inserted.length = snapshot.inserted
        updated.length = snapshot.updated
        deleted.length = snapshot.deleted
        tokens.length = snapshot.tokens
        invalidated.length = snapshot.invalidated
        coordinatorCenters.length = snapshot.coordinatorCenters
        restoreMap(targets, snapshot.targets)
        restoreMap(centerState, snapshot.centers)
        restoreMap(tokenState, snapshot.tokenState)
        writeCount = snapshot.writeCount
        events.push(`tx:${transactions}:rollback`)
        throw error
      }
    },
    loadActor: async (query, _uid, options) => {
      actorReads++
      events.push(`actor:${query.transaction}:${String(options?.lock)}`)
      return actorReads > 1 && actorAfterError ? actorAfterError : actor
    },
    findByEmail: async (query) => {
      duplicateReads++
      events.push(`duplicate:${query.transaction}`)
      return duplicateReads > 1 && duplicateAfterError ? duplicateAfterError : duplicate
    },
    lockUser: async (query, id) => {
      events.push(`target:${query.transaction}:${id}`)
      return Number(id) === Number(actor.id) ? actor : targets.get(Number(id))
    },
    insertUser: async (query, row) => {
      insertAttempts++
      events.push(`insert:${query.transaction}`)
      const error = insertErrors ? insertErrors[insertAttempts - 1] : insertError
      if (error) throw error
      inserted.push(row)
      writeCount++
      const saved = { id: 30, ...row, centros: [], password_hash: null }
      targets.set(saved.id, saved)
      return saved
    },
    updateUser: async (query, id, row) => {
      events.push(`update:${query.transaction}:${id}`)
      updated.push({ id, ...row })
      writeCount++
      const saved = { ...targets.get(Number(id)), ...row }
      targets.set(Number(id), saved)
      return saved
    },
    replaceCoordinatorCenters: async (query, userId, ids) => {
      events.push(`centers:${query.transaction}:${userId}`)
      coordinatorCenters.push({ userId, ids })
      writeCount++
      centerState.set(Number(userId), [...ids])
      if (relationsError) throw relationsError
    },
    deleteUser: async (query, id) => {
      events.push(`delete:${query.transaction}:${id}`)
      deleted.push(id)
      writeCount++
      targets.delete(Number(id))
      centerState.delete(Number(id))
      if (deleteError) throw deleteError
    },
  }
  const accessTokens = {
    replace: async (query, row) => {
      events.push(`token:${query.transaction}:${row.userId}`)
      tokens.push(row)
      writeCount++
      tokenState.set(Number(row.userId), ['t-1'])
      if (tokenError) throw tokenError
      return { token: 't-1', user: targets.get(row.userId) }
    },
    invalidate: async (query, { userId }) => {
      events.push(`invalidate:${query.transaction}:${userId}`)
      invalidated.push(userId)
      writeCount++
      tokenState.set(Number(userId), [])
      if (invalidateError) throw invalidateError
    },
  }
  const deliverAccess = async (row) => {
    events.push(`delivery:${row.user.id}`)
    deliveries.push(row)
    if (deliveryError) throw deliveryError
    if (deliveryTransport) return deliveryTransport(row)
    return deliveryResult || { emailSent: true, link: `https://app/set-password?token=${row.token}` }
  }
  return {
    repo,
    inserted,
    updated,
    deleted,
    tokens,
    invalidated,
    deliveries,
    coordinatorCenters,
    events,
    transactionOptions,
    transactionCount: () => transactions,
    actorReadCount: () => actorReads,
    writes: () => writeCount,
    user: (id) => targets.get(Number(id)),
    centers: (id) => [...(centerState.get(Number(id)) || [])],
    activeTokens: (id) => [...(tokenState.get(Number(id)) || [])],
    service: createUsuariosService({ repo, accessTokens, deliverAccess }),
  }
}

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

function accessFixture({
  target,
  delivery = { emailSent: true, link: 'https://app/set-password?token=t-1' },
  deliveryError = null,
}) {
  const tokens = []
  const deliveries = []
  const repo = {
    transaction: async (work) => work(repo),
    loadActor: async () => ({ id: 2, rol: 'coordinador', centros: [10, 12], password_hash: 'actor' }),
    lockUser: async (_query, id) => Number(id) === Number(target.id) ? target : null,
  }
  const accessTokens = {
    replace: async (_query, row) => {
      tokens.push(row)
      return { token: 't-1', user: target }
    },
  }
  const deliverAccess = async (row) => {
    deliveries.push(row)
    if (deliveryError) throw deliveryError
    return delivery
  }
  return { repo, tokens, deliveries, service: createUsuariosService({ repo, accessTokens, deliverAccess }) }
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

test('pageData no ofrece editar supervisor pero conserva acceso y eliminación gestionables', async () => {
  const actor = { id: 1, rol: 'admin_general', centros: [], password_hash: 'actor' }
  const supervisors = [false, true].map((activo, index) => ({
    id: 40 + index, nombre: 'Supervisor', email: `supervisor-${index}@test.invalid`,
    rol: 'supervisor', centro_id: null, centros: [], activo,
  }))
  const result = await createUsuariosService({ repo: readRepo(actor, supervisors) }).pageData({ uid: 1 })
  assert.deepEqual(result.assignableRoles, ['admin_general', 'coordinador', 'administradora', 'asistente'])
  assert.deepEqual(result.users.map(user => user.actions), [
    { edit: false, resendInvitation: true, sendPasswordReset: false, delete: true },
    { edit: false, resendInvitation: false, sendPasswordReset: true, delete: true },
  ])
})

test('rol sin gestión queda denegado antes de listar', async () => {
  const repo = readRepo({ id: 7, rol: 'administradora', centro_id: 10, password_hash: 'x' })
  await assert.rejects(() => createUsuariosService({ repo }).pageData({ uid: 7 }), /No autorizado/)
  assert.equal(repo.calls.some((c) => c[0] === 'users'), false)
})

test('cuenta pendiente devuelve invitación de 48 horas y enlace copiable', async () => {
  const fx = accessFixture({
    target: { id: 9, nombre: 'B', email: 'b@aloha.invalid', rol: 'asistente', centro_id: 12, password_hash: null },
  })
  const result = await fx.service.resendAccess({ uid: 2 }, 9)
  assert.deepEqual(result, {
    ok: true, kind: 'invitation', emailSent: true, link: 'https://app/set-password?token=t-1',
  })
  assert.deepEqual(fx.tokens, [{ userId: 9, purpose: 'invite', hours: 48 }])
})

test('cuenta activa recibe reset de dos horas sin secreto en la respuesta', async () => {
  const fx = accessFixture({
    target: { id: 8, nombre: 'A', email: 'a@aloha.invalid', rol: 'administradora', centro_id: 10, password_hash: 'hash' },
  })
  const result = await fx.service.resendAccess({ uid: 2 }, 8)
  assert.deepEqual(result, { ok: true, kind: 'reset', emailSent: true })
  assert.deepEqual(fx.tokens, [{ userId: 8, purpose: 'reset', hours: 2 }])
  assert.doesNotMatch(JSON.stringify(result), /set-password|t-1|a@aloha\.invalid/)
})

test('fallo resuelto del correo de reset activo no degrada a enlace copiable', async () => {
  const fx = accessFixture({
    target: { id: 8, nombre: 'A', email: 'a@aloha.invalid', rol: 'administradora', centro_id: 10, password_hash: 'hash' },
    delivery: {
      emailSent: false,
      emailReason: '/set-password?token=secreto-del-proveedor',
      link: 'https://app/set-password?token=t-1',
    },
  })
  const result = await fx.service.resendAccess({ uid: 2 }, 8)
  assert.deepEqual(result, { ok: true, kind: 'reset', emailSent: false, deliveryError: 'delivery_failed' })
  assert.doesNotMatch(JSON.stringify(result), /set-password|secreto-del-proveedor|t-1/)
})

test('throw del transporte de reset se normaliza sin exponer secreto', async () => {
  const fx = accessFixture({
    target: { id: 8, nombre: 'A', email: 'a@aloha.invalid', rol: 'administradora', centro_id: 10, password_hash: 'hash' },
    deliveryError: Object.assign(new Error('SMTP t-1'), { code: 'ETIMEDOUT' }),
  })
  const result = await fx.service.resendAccess({ uid: 2 }, 8)
  assert.equal(fx.tokens.length, 1)
  assert.deepEqual(result, { ok: true, kind: 'reset', emailSent: false, deliveryError: 'delivery_failed' })
  assert.doesNotMatch(JSON.stringify(result), /SMTP|t-1|set-password/)
})

test('objetivo ajeno o privilegiado no emite token ni correo', async () => {
  for (const target of [
    { id: 18, rol: 'administradora', centro_id: 11, password_hash: 'x' },
    { id: 20, rol: 'admin_general', centro_id: null, password_hash: 'x' },
  ]) {
    const fx = accessFixture({ target })
    await assert.rejects(() => fx.service.resendAccess({ uid: 2 }, target.id), /No tienes permiso/)
    assert.deepEqual(fx.tokens, [])
    assert.deepEqual(fx.deliveries, [])
  }
})

test('reset público aplica cooldown y conserva una respuesta uniforme', async () => {
  assert.equal(typeof usuariosServiceModule.createPublicPasswordReset, 'function')
  const calls = []
  const repository = {
    transaction: async (work) => work(repository),
    findUserByEmail: async (_query, email) => {
      calls.push(['find', email])
      return email === 'activa@aloha.invalid'
        ? { id: 8, nombre: 'A', email, password_hash: 'hash' }
        : null
    },
  }
  const accessTokens = {
    replace: async (_query, row) => {
      calls.push(['replace', row])
      return { suppressed: true, user: { id: 8, nombre: 'A', email: 'activa@aloha.invalid' } }
    },
  }
  const deliverAccess = async (prepared) => calls.push(['delivery', prepared])
  const requestReset = usuariosServiceModule.createPublicPasswordReset({
    repository, accessTokens, deliverAccess, schedule: () => {}, logError: () => {},
  })

  const existing = await requestReset(' ACTIVA@ALOHA.INVALID ')
  const missing = await requestReset('nadie@aloha.invalid')
  const empty = await requestReset(' ')

  assert.deepEqual(existing, { ok: true })
  assert.deepEqual(missing, { ok: true })
  assert.deepEqual(empty, { ok: true })
  assert.deepEqual(calls.find(([kind]) => kind === 'replace'), ['replace', {
    userId: 8, purpose: 'reset', hours: 2, cooldownMinutes: 15,
  }])
  assert.equal(calls.some(([kind]) => kind === 'delivery'), false)
})

test('reset público agenda el correo sin esperarlo y absorbe el fallo del callback', async () => {
  const callbacks = []
  const logs = []
  let deliveryStarted = false
  const repository = {
    transaction: async (work) => work(repository),
    findUserByEmail: async () => ({
      id: 8, nombre: 'A', email: 'activa@aloha.invalid', password_hash: 'hash',
    }),
  }
  const accessTokens = {
    replace: async () => ({
      suppressed: false,
      token: 'token-secreto',
      user: { id: 8, nombre: 'A', email: 'activa@aloha.invalid' },
    }),
  }
  const requestReset = usuariosServiceModule.createPublicPasswordReset({
    repository,
    accessTokens,
    schedule: (callback) => callbacks.push(callback),
    deliverAccess: async () => {
      deliveryStarted = true
      throw Object.assign(new Error('SMTP token-secreto activa@aloha.invalid'), { code: 'ETIMEDOUT' })
    },
    logError: (...args) => logs.push(args),
  })

  const result = await requestReset('activa@aloha.invalid')

  assert.deepEqual(result, { ok: true })
  assert.equal(deliveryStarted, false)
  assert.equal(callbacks.length, 1)
  await assert.doesNotReject(callbacks[0])
  assert.equal(deliveryStarted, true)
  assert.deepEqual(logs, [['[password:request-reset]', { code: 'ETIMEDOUT' }]])
  assert.doesNotMatch(JSON.stringify(logs), /token-secreto|activa@aloha\.invalid|SMTP/)
})

test('Actions de contraseña no actualizan usuarios ni tokens directamente', () => {
  for (const file of ['../app/actions/password.js', '../app/actions/auth.js']) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /UPDATE\s+(?:usuarios|password_tokens)/i)
  }
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

test('coordinador crea rol operativo en centro propio y recibe invitación', async () => {
  const fx = writeFixture()
  const result = await fx.service.create({ uid: 2 }, {
    nombre: ' Laura ', email: 'LAURA@ALOHA.INVALID', rol: 'asistente', centro_id: 10,
  })
  assert.equal(result.kind, 'invitation')
  assert.equal(result.link, 'https://app/set-password?token=t-1')
  assert.deepEqual(fx.inserted, [{ nombre: 'Laura', email: 'laura@aloha.invalid', rol: 'asistente', centro_id: 10 }])
  assert.deepEqual(fx.transactionOptions, [{ isolationLevel: 'Serializable' }])
  assert.ok(fx.events.indexOf('tx:1:commit') < fx.events.indexOf('delivery:30'))
  assert.deepEqual(fx.events.slice(1, 5), ['actor:1:true', 'duplicate:1', 'insert:1', 'token:1:30'])
})

test('crear conserva el propósito invite hasta el transporte real disposable', async () => {
  const deliveryTransport = usuariosDeliveryForRuntime({ env: {
    NODE_ENV: 'development', E2E_DELIVERY_MODE: 'stub', E2E_DATABASE_CONFIRM: 'disposable',
  } })
  const fx = writeFixture({ deliveryTransport })
  const result = await fx.service.create({ uid: 2 }, validInput())
  assert.deepEqual(result, { ok: true, kind: 'invitation', emailSent: true, link: 'https://e2e.invalid/set-password?token=t-1' })
})

test('crear entrega invite al transporte live y compone correo sin red real', async () => {
  const originalFetch = globalThis.fetch
  const originalUrl = process.env.APP_URL
  const originalKey = process.env.RESEND_API_KEY
  const messages = []
  try {
    process.env.APP_URL = 'https://aloha.test.invalid'
    process.env.RESEND_API_KEY = 'test-only-not-a-key'
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails')
      messages.push(JSON.parse(options.body))
      return { ok: true }
    }
    const { deliverAccess } = await import('../lib/invitations.js')
    const fx = writeFixture({ deliveryTransport: usuariosDeliveryForRuntime({ env: {}, live: deliverAccess }) })
    const result = await fx.service.create({ uid: 2 }, validInput())
    assert.equal(fx.deliveries[0].purpose, 'invite')
    assert.equal(result.link, 'https://aloha.test.invalid/set-password?token=t-1')
    assert.equal(messages.length, 1)
    assert.deepEqual(messages[0].to, ['laura@aloha.invalid'])
    assert.equal(messages[0].subject, 'Crea tu contraseña · ALOHA KPI')
    assert.match(messages[0].html, /Crear mi contraseña/)
  } finally {
    globalThis.fetch = originalFetch
    if (originalUrl === undefined) delete process.env.APP_URL
    else process.env.APP_URL = originalUrl
    if (originalKey === undefined) delete process.env.RESEND_API_KEY
    else process.env.RESEND_API_KEY = originalKey
  }
})

test('fallo del transporte no revierte la cuenta ni filtra el error', async () => {
  const fx = writeFixture({ deliveryError: Object.assign(new Error('SMTP: laura@aloha.invalid'), { code: 'ETIMEDOUT' }) })
  const result = await fx.service.create({ uid: 2 }, validInput())
  assert.equal(fx.inserted.length, 1)
  assert.equal(fx.tokens.length, 1)
  assert.deepEqual(result, {
    ok: true, kind: 'invitation', emailSent: false, link: null, deliveryError: 'delivery_failed',
  })
  assert.doesNotMatch(JSON.stringify(result), /laura@aloha\.invalid|SMTP|t-1/)
})

test('respuesta fallida resuelta del transporte también elimina razón y enlace', async () => {
  const fx = writeFixture({
    deliveryResult: {
      emailSent: false,
      emailReason: 'SMTP rechazó laura@aloha.invalid',
      link: 'https://app/set-password?token=t-1',
    },
  })
  const result = await fx.service.create({ uid: 2 }, validInput())
  assert.deepEqual(result, {
    ok: true, kind: 'invitation', emailSent: false, link: null, deliveryError: 'delivery_failed',
  })
  assert.doesNotMatch(JSON.stringify(result), /laura@aloha\.invalid|SMTP|t-1/)
})

test('crear rechaza centro ajeno, rol privilegiado y payload inválido sin escribir', async () => {
  for (const input of [
    { nombre: 'A', email: 'a@a.invalid', rol: 'asistente', centro_id: 11 },
    ...['coordinador', 'supervisor', 'admin_general'].map((rol) => ({
      nombre: 'A', email: 'a@a.invalid', rol, centros: [10], centro_id: 10,
    })),
    { nombre: ' ', email: 'a@a.invalid', rol: 'asistente', centro_id: 10 },
    { nombre: 'A', email: 'correo-inválido', rol: 'asistente', centro_id: 10 },
    { nombre: 'A', email: 'a@a.invalid', rol: 'asistente', centro_id: null },
  ]) {
    const fx = writeFixture()
    await assert.rejects(() => fx.service.create({ uid: 2 }, input))
    assert.equal(fx.writes(), 0)
  }
})

test('update exige objetivo y destino dentro del alcance', async () => {
  const fx = writeFixture()
  await fx.service.update({ uid: 2 }, 8, { nombre: 'Nueva', rol: 'administradora', centro_id: 12 })
  assert.deepEqual(fx.updated, [{ id: 8, nombre: 'Nueva', rol: 'administradora', centro_id: 12 }])
  assert.deepEqual(fx.invalidated, [8])
  assert.deepEqual(fx.events.slice(1, 5), ['actor:1:true', 'target:1:8', 'update:1:8', 'centers:1:8'])
  assert.ok(fx.events.indexOf('centers:1:8') < fx.events.indexOf('invalidate:1:8'))
  const writesAfterSuccess = fx.writes()
  await assert.rejects(
    () => fx.service.update({ uid: 2 }, 8, { nombre: 'Nueva', rol: 'asistente', centro_id: 11 }),
    /No tienes permiso/,
  )
  assert.equal(fx.writes(), writesAfterSuccess)
  await assert.rejects(
    () => fx.service.update({ uid: 2 }, 20, { nombre: 'Jefe', rol: 'admin_general', centro_id: null }),
    /No tienes permiso/,
  )
  assert.equal(fx.writes(), writesAfterSuccess)
})

test('update mantiene el correo inmutable y elimina relaciones N:N residuales', async () => {
  const fx = writeFixture()
  await fx.service.update(
    { uid: 2 },
    8,
    { nombre: ' Nueva ', email: 'intruso@aloha.invalid', rol: 'asistente', centro_id: 10, centros: [12] },
  )
  assert.deepEqual(fx.updated, [{ id: 8, nombre: 'Nueva', rol: 'asistente', centro_id: 10 }])
  assert.deepEqual(fx.coordinatorCenters, [{ userId: 8, ids: [] }])
  assert.deepEqual(fx.invalidated, [8])
})

test('coordinador no elimina; gerencia respeta admin_general y autoborrado', async () => {
  const coordFx = writeFixture()
  await assert.rejects(() => coordFx.service.delete({ uid: 2 }, 8), /No tienes permiso/)
  assert.equal(coordFx.writes(), 0)
  const adminFx = writeFixture({ actor: { id: 1, rol: 'admin_general', centros: [], password_hash: 'x' } })
  await assert.rejects(() => adminFx.service.delete({ uid: 1 }, 1), /propia cuenta/)
  await assert.rejects(() => adminFx.service.delete({ uid: 1 }, 20), /Administrador General/)
  assert.equal(adminFx.writes(), 0)
  await adminFx.service.delete({ uid: 1 }, 9)
  assert.deepEqual(adminFx.deleted, [9])
  assert.deepEqual(adminFx.invalidated, [9])
  assert.ok(adminFx.events.indexOf('invalidate:3:9') < adminFx.events.indexOf('delete:3:9'))
})

test('duplicado ajeno y 23505 no enumeran la cuenta', async () => {
  const hiddenAccount = { id: 20, rol: 'admin_general', centro_id: null }
  const hidden = writeFixture({ duplicate: hiddenAccount })
  await assert.rejects(
    () => hidden.service.create({ uid: 2 }, validInput()),
    /^Error: No tienes permiso para gestionar este usuario\.$/,
  )
  assert.equal(hidden.writes(), 0)
  const race = writeFixture({
    insertError: Object.assign(new Error('unique'), { code: '23505' }),
    duplicateAfterError: hiddenAccount,
  })
  await assert.rejects(
    () => race.service.create({ uid: 2 }, validInput()),
    /^Error: No tienes permiso para gestionar este usuario\.$/,
  )
  assert.equal(race.transactionCount(), 2)
  assert.equal(race.actorReadCount(), 2)
})

test('40001 abre transacción nueva, relee actor y nunca sale como código crudo', async () => {
  const visible = { id: 8, rol: 'administradora', centro_id: 10 }
  const fx = writeFixture({
    insertError: Object.assign(new Error('serialization'), { code: '40001' }),
    duplicateAfterError: visible,
    actorAfterError: { ...coord, centros: [] },
  })
  await assert.rejects(
    () => fx.service.create({ uid: 2 }, validInput()),
    /^Error: No tienes permiso para gestionar este usuario\.$/,
  )
  assert.ok(fx.transactionCount() >= 2)
  assert.ok(fx.actorReadCount() >= 2)
})

test('40001 sin fila ganadora reintenta una vez con actor fresco', async () => {
  const fx = writeFixture({
    insertErrors: [Object.assign(new Error('serialization'), { code: '40001' }), null],
  })
  const result = await fx.service.create({ uid: 2 }, validInput())
  assert.equal(result.kind, 'invitation')
  assert.equal(fx.inserted.length, 1)
  assert.equal(fx.tokens.length, 1)
  assert.equal(fx.transactionCount(), 3)
  assert.equal(fx.actorReadCount(), 3)
})

test('dos 40001 incluido el diagnóstico cierran con error seguro y presupuesto acotado', async () => {
  const serializations = [
    Object.assign(new Error('serialization create 40001'), { code: '40001' }),
    Object.assign(new Error('serialization diagnosis 40001'), { code: '40001' }),
  ]
  const fx = writeFixture({ transactionErrors: serializations })
  await assert.rejects(
    () => fx.service.create({ uid: 2 }, validInput()),
    (error) => {
      assert.equal(error.message, 'No se pudo crear el usuario. Intenta nuevamente.')
      assert.equal(error.code, undefined)
      assert.doesNotMatch(error.message, /40001|serialization/i)
      return true
    },
  )
  assert.equal(fx.transactionCount(), 2)
  assert.deepEqual(fx.deliveries, [])
})

test('dos 40001 de escritura permiten solo una repetición completa', async () => {
  const fx = writeFixture({
    insertErrors: [
      Object.assign(new Error('serialization one'), { code: '40001' }),
      Object.assign(new Error('serialization two'), { code: '40001' }),
    ],
  })
  await assert.rejects(
    () => fx.service.create({ uid: 2 }, validInput()),
    (error) => {
      assert.equal(error.message, 'No se pudo crear el usuario. Intenta nuevamente.')
      assert.equal(error.code, undefined)
      assert.doesNotMatch(error.message, /40001|serialization/i)
      return true
    },
  )
  assert.equal(fx.events.filter((event) => event.startsWith('insert:')).length, 2)
  assert.equal(fx.transactionCount(), 4)
  assert.deepEqual(fx.deliveries, [])
})

test('fallo de relaciones revierte la edición previa y conserva alcance y tokens', async () => {
  const fx = writeFixture({ relationsError: new Error('relations failed') })
  const before = { ...fx.user(8) }
  await assert.rejects(
    () => fx.service.update({ uid: 2 }, 8, { nombre: 'Nueva', rol: 'administradora', centro_id: 12 }),
    /relations failed/,
  )
  assert.deepEqual(fx.user(8), before)
  assert.deepEqual(fx.centers(8), [])
  assert.deepEqual(fx.activeTokens(8), ['old-8'])
  assert.deepEqual(fx.updated, [])
  assert.deepEqual(fx.coordinatorCenters, [])
  assert.equal(fx.writes(), 0)
  assert.deepEqual(fx.deliveries, [])
})

test('fallo al emitir token revierte el usuario nuevo y nunca entrega', async () => {
  const fx = writeFixture({ tokenError: new Error('token failed') })
  await assert.rejects(() => fx.service.create({ uid: 2 }, validInput()), /token failed/)
  assert.equal(fx.user(30), undefined)
  assert.deepEqual(fx.centers(30), [])
  assert.deepEqual(fx.activeTokens(30), [])
  assert.deepEqual(fx.inserted, [])
  assert.deepEqual(fx.tokens, [])
  assert.equal(fx.writes(), 0)
  assert.deepEqual(fx.deliveries, [])
})

test('fallo al invalidar revierte usuario, relaciones y token anterior', async () => {
  const fx = writeFixture({ invalidateError: new Error('invalidate failed') })
  const before = { ...fx.user(8) }
  await assert.rejects(
    () => fx.service.update({ uid: 2 }, 8, { nombre: 'Nueva', rol: 'administradora', centro_id: 12 }),
    /invalidate failed/,
  )
  assert.deepEqual(fx.user(8), before)
  assert.deepEqual(fx.centers(8), [])
  assert.deepEqual(fx.activeTokens(8), ['old-8'])
  assert.deepEqual(fx.updated, [])
  assert.deepEqual(fx.coordinatorCenters, [])
  assert.deepEqual(fx.invalidated, [])
  assert.equal(fx.writes(), 0)
  assert.deepEqual(fx.deliveries, [])
})

test('fallo al borrar revierte la invalidación y conserva la cuenta', async () => {
  const actor = { id: 1, rol: 'admin_general', centros: [], password_hash: 'x' }
  const fx = writeFixture({ actor, deleteError: new Error('delete failed') })
  const before = { ...fx.user(9) }
  await assert.rejects(() => fx.service.delete({ uid: 1 }, 9), /delete failed/)
  assert.deepEqual(fx.user(9), before)
  assert.deepEqual(fx.centers(9), [])
  assert.deepEqual(fx.activeTokens(9), ['old-9'])
  assert.deepEqual(fx.invalidated, [])
  assert.deepEqual(fx.deleted, [])
  assert.equal(fx.writes(), 0)
  assert.deepEqual(fx.deliveries, [])
})

test('cada rol se persiste con una sola forma canónica de centros', async () => {
  const adminFx = writeFixture({ actor: { id: 1, rol: 'admin_general', centros: [] } })
  await adminFx.service.create({ uid: 1 }, {
    nombre: 'Coord', email: 'coord@test.invalid', rol: 'coordinador', centro_id: 10, centros: [12],
  })
  assert.equal(adminFx.inserted[0].centro_id, null)
  assert.deepEqual(adminFx.coordinatorCenters, [{ userId: 30, ids: [12] }])

  const opFx = writeFixture()
  await opFx.service.create({ uid: 2 }, {
    nombre: 'Operativa', email: 'op@test.invalid', rol: 'asistente', centro_id: 10, centros: [12],
  })
  assert.equal(opFx.inserted[0].centro_id, 10)
  assert.deepEqual(opFx.coordinatorCenters, [])

  const unassignedFx = writeFixture({ actor: { id: 1, rol: 'admin_general', centros: [] } })
  await unassignedFx.service.create({ uid: 1 }, {
    nombre: 'Sin centro', email: 'sin-centro@test.invalid', rol: 'administradora', centro_id: null, centros: [12],
  })
  assert.equal(unassignedFx.inserted[0].centro_id, null)
  assert.deepEqual(unassignedFx.coordinatorCenters, [])
})

test('duplicado ya visible puede identificarse sin revelar datos adicionales', async () => {
  const visible = writeFixture({ duplicate: { id: 8, rol: 'administradora', centro_id: 10 } })
  await assert.rejects(
    () => visible.service.create({ uid: 2 }, validInput()),
    /^Error: El correo ya está registrado en un usuario visible\.$/,
  )
})

test('repositorio escribe usuarios y centros con valores parametrizados y orden canónico', async () => {
  const { calls, query } = queryRecorder([
    [{ id: 30, nombre: 'Laura', email: 'laura@aloha.invalid', rol: 'asistente', centro_id: 10 }],
    [{ id: 30, nombre: 'Laura', email: 'laura@aloha.invalid', rol: 'administradora', centro_id: 12 }],
    [],
    [],
  ])
  await usuariosRepository.insertUser(query, validInput())
  await usuariosRepository.updateUser(query, 30, { nombre: 'Laura', rol: 'administradora', centro_id: 12 })
  await usuariosRepository.replaceCoordinatorCenters(query, 30, [12, 10, 12])
  assert.match(calls[0].text, /VALUES \(\$1, \$2, \$3, \$4\)/)
  assert.deepEqual(calls[0].values, ['Laura', 'laura@aloha.invalid', 'asistente', 10])
  assert.doesNotMatch(calls[1].text, /SET[^\n]*email/)
  assert.deepEqual(calls[1].values, ['Laura', 'administradora', 12, 30])
  assert.match(calls[2].text, /DELETE FROM usuario_centros WHERE usuario_id = \$1/)
  assert.deepEqual(calls[2].values, [30])
  assert.match(calls[3].text, /unnest\(\$2::int\[\]\)/)
  assert.deepEqual(calls[3].values, [30, [10, 12]])
})

test('repositorio relee duplicado y bloquea objetivo sin interpolar entradas', async () => {
  const { calls, query } = queryRecorder([[{ id: 8 }], [{ id: 9 }], [{ centro_id: 10 }, { centro_id: 12 }], []])
  assert.deepEqual(await usuariosRepository.findByEmail(query, 'A@ALOHA.INVALID'), { id: 8 })
  assert.deepEqual(await usuariosRepository.lockUser(query, 9), { id: 9, centros: [10, 12] })
  await usuariosRepository.deleteUser(query, 9)
  assert.deepEqual(calls.map((call) => call.values), [['A@ALOHA.INVALID'], [9], [9], [9]])
  assert.match(calls[1].text, /FOR UPDATE/)
  assert.match(calls[2].text, /ORDER BY centro_id FOR SHARE/)
})
