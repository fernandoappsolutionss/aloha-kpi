import test from 'node:test'
import assert from 'node:assert/strict'
import { accessPurpose, createAccessTokenService } from '../lib/access-tokens.mjs'

function fakeRepo(seed = {}) {
  const state = { users: new Map([[8, { id: 8, email: 'u@aloha.com' }]]), tokens: new Map(), calls: [], ...seed }
  const transactionQuery = { transaction: true }
  const record = (method, query) => state.calls.push({ method, query })
  return {
    state,
    transaction: async (work) => {
      record('transaction', transactionQuery)
      return work(transactionQuery)
    },
    findUserByEmail: async (query, email) => {
      record('findUserByEmail', query)
      return [...state.users.values()].find((user) => user.email === email)
    },
    lockUser: async (query, id) => {
      record('lockUser', query)
      return state.users.get(Number(id))
    },
    findToken: async (query, token) => {
      record('findToken', query)
      return state.tokens.get(token)
    },
    lockTokensForUser: async (query, userId) => {
      record('lockTokensForUser', query)
      return [...state.tokens.values()].filter((row) => row.user_id === Number(userId)).sort((a, b) => a.token.localeCompare(b.token))
    },
    invalidateActive: async (query, userId) => {
      record('invalidateActive', query)
      for (const row of state.tokens.values()) if (row.user_id === userId && !row.used_at) row.used_at = 'used'
    },
    insertToken: async (query, row) => {
      record('insertToken', query)
      state.tokens.set(row.token, { ...row, used_at: null })
    },
    updatePassword: async (query, userId, hash) => {
      record('updatePassword', query)
      state.users.get(userId).password_hash = hash
    },
  }
}

test('accessPurpose distingue cuenta pendiente de cuenta activa', () => {
  assert.equal(accessPurpose({ password_hash: null }), 'invite')
  assert.equal(accessPurpose({ password_hash: 'hash' }), 'reset')
})

test('replace invalida tokens anteriores e inserta uno nuevo', async () => {
  const repo = fakeRepo()
  repo.state.tokens.set('viejo', { token: 'viejo', user_id: 8, used_at: null })
  const service = createAccessTokenService({ repo, makeToken: () => 'nuevo', now: () => new Date('2026-09-02T12:00:00Z') })
  const issued = await repo.transaction((query) => service.replace(query, { userId: 8, purpose: 'invite', hours: 48 }))
  assert.equal(issued.token, 'nuevo')
  assert.equal(repo.state.tokens.get('viejo').used_at, 'used')
  assert.equal(repo.state.tokens.get('nuevo').purpose, 'invite')
})

test('replace suprime un reset público reciente sin invalidarlo ni enviar otro token', async () => {
  const repo = fakeRepo()
  repo.state.tokens.set('reciente', {
    token: 'reciente', user_id: 8, purpose: 'reset',
    created_at: '2026-09-02T11:55:00Z', expires_at: '2026-09-02T14:00:00Z', used_at: null,
  })
  const service = createAccessTokenService({ repo, makeToken: () => 'no-debe-crearse', now: () => new Date('2026-09-02T12:00:00Z') })
  const result = await repo.transaction((query) => service.replace(query, {
    userId: 8, purpose: 'reset', hours: 2, cooldownMinutes: 15,
  }))
  assert.deepEqual(result, { suppressed: true, user: repo.state.users.get(8) })
  assert.equal(repo.state.tokens.has('no-debe-crearse'), false)
  assert.equal(repo.state.tokens.get('reciente').used_at, null)
})

test('replace reemplaza una invitación reciente aunque reciba cooldown', async () => {
  const repo = fakeRepo()
  repo.state.tokens.set('invite-reciente', {
    token: 'invite-reciente', user_id: 8, purpose: 'invite',
    created_at: '2026-09-02T11:55:00Z', expires_at: '2026-09-02T14:00:00Z', used_at: null,
  })
  const service = createAccessTokenService({ repo, makeToken: () => 'invite-nuevo', now: () => new Date('2026-09-02T12:00:00Z') })
  const result = await repo.transaction((query) => service.replace(query, {
    userId: 8, purpose: 'invite', hours: 48, cooldownMinutes: 15,
  }))
  assert.equal(result.suppressed, false)
  assert.equal(result.token, 'invite-nuevo')
  assert.equal(repo.state.tokens.get('invite-reciente').used_at, 'used')
  assert.equal(repo.state.tokens.get('invite-nuevo').purpose, 'invite')
})

test('consume actualiza contraseña e invalida todos los tokens en una transacción', async () => {
  const repo = fakeRepo()
  repo.state.tokens.set('a', { token: 'a', user_id: 8, purpose: 'invite', expires_at: '2026-09-03T00:00:00Z', used_at: null })
  repo.state.tokens.set('b', { token: 'b', user_id: 8, purpose: 'reset', expires_at: '2026-09-03T00:00:00Z', used_at: null })
  const service = createAccessTokenService({ repo, now: () => new Date('2026-09-02T12:00:00Z') })
  const user = await service.consume({ token: 'a', passwordHash: 'hash-nuevo' })
  assert.equal(user.id, 8)
  assert.equal(repo.state.users.get(8).password_hash, 'hash-nuevo')
  assert.equal(repo.state.tokens.get('a').used_at, 'used')
  assert.equal(repo.state.tokens.get('b').used_at, 'used')
  const transactionQuery = repo.state.calls.find((call) => call.method === 'transaction').query
  const transactionalCalls = repo.state.calls.filter((call) => call.method !== 'transaction')
  assert.ok(transactionalCalls.every((call) => call.query === transactionQuery))
  assert.deepEqual(
    transactionalCalls.filter((call) => call.method === 'lockUser' || call.method === 'lockTokensForUser').map((call) => call.method),
    ['lockUser', 'lockTokensForUser']
  )
})

test('consume rechaza token usado o vencido sin escribir', async () => {
  const repo = fakeRepo()
  repo.state.tokens.set('usado', { token: 'usado', user_id: 8, purpose: 'reset', expires_at: '2026-09-03T00:00:00Z', used_at: 'x' })
  repo.state.tokens.set('vencido', { token: 'vencido', user_id: 8, purpose: 'reset', expires_at: '2026-09-01T00:00:00Z', used_at: null })
  const service = createAccessTokenService({ repo, now: () => new Date('2026-09-02T12:00:00Z') })
  await assert.rejects(() => service.consume({ token: 'usado', passwordHash: 'x' }), /usado/)
  await assert.rejects(() => service.consume({ token: 'vencido', passwordHash: 'x' }), /venció/)
  assert.equal(repo.state.users.get(8).password_hash, undefined)
})

test('consume rechaza un propósito de token desconocido sin escribir', async () => {
  const repo = fakeRepo()
  repo.state.tokens.set('desconocido', {
    token: 'desconocido', user_id: 8, purpose: 'otro', expires_at: '2026-09-03T00:00:00Z', used_at: null,
  })
  const service = createAccessTokenService({ repo, now: () => new Date('2026-09-02T12:00:00Z') })
  await assert.rejects(() => service.consume({ token: 'desconocido', passwordHash: 'x' }), /inválido/)
  assert.equal(repo.state.users.get(8).password_hash, undefined)
  assert.equal(repo.state.tokens.get('desconocido').used_at, null)
})

test('changePassword invalida todo enlace pendiente', async () => {
  const repo = fakeRepo()
  repo.state.tokens.set('reset', { token: 'reset', user_id: 8, used_at: null })
  await createAccessTokenService({ repo }).changePassword({ userId: 8, passwordHash: 'perfil-hash' })
  assert.equal(repo.state.users.get(8).password_hash, 'perfil-hash')
  assert.equal(repo.state.tokens.get('reset').used_at, 'used')
})

test('invalidate revoca accesos dentro de una transacción externa', async () => {
  const repo = fakeRepo()
  repo.state.tokens.set('pendiente', { token: 'pendiente', user_id: 8, used_at: null })
  const service = createAccessTokenService({ repo })
  await repo.transaction((query) => service.invalidate(query, { userId: 8 }))
  assert.equal(repo.state.tokens.get('pendiente').used_at, 'used')
})
