import test from 'node:test'
import assert from 'node:assert/strict'
import { accessPurpose, createAccessTokenService } from '../lib/access-tokens.mjs'

function fakeRepo(seed = {}) {
  const state = { users: new Map([[8, { id: 8, email: 'u@aloha.com' }]]), tokens: new Map(), ...seed }
  return {
    state,
    transaction: async (work) => work('query'),
    findUserByEmail: async (_q, email) => [...state.users.values()].find((user) => user.email === email),
    lockUser: async (_q, id) => state.users.get(Number(id)),
    findToken: async (_q, token) => state.tokens.get(token),
    lockTokensForUser: async (_q, userId) => [...state.tokens.values()].filter((row) => row.user_id === Number(userId)).sort((a, b) => a.token.localeCompare(b.token)),
    invalidateActive: async (_q, userId) => {
      for (const row of state.tokens.values()) if (row.user_id === userId && !row.used_at) row.used_at = 'used'
    },
    insertToken: async (_q, row) => state.tokens.set(row.token, { ...row, used_at: null }),
    updatePassword: async (_q, userId, hash) => { state.users.get(userId).password_hash = hash },
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

test('consume actualiza contraseña e invalida todos los tokens en una transacción', async () => {
  const repo = fakeRepo()
  repo.state.tokens.set('a', { token: 'a', user_id: 8, expires_at: '2026-09-03T00:00:00Z', used_at: null })
  repo.state.tokens.set('b', { token: 'b', user_id: 8, expires_at: '2026-09-03T00:00:00Z', used_at: null })
  const service = createAccessTokenService({ repo, now: () => new Date('2026-09-02T12:00:00Z') })
  const user = await service.consume({ token: 'a', passwordHash: 'hash-nuevo' })
  assert.equal(user.id, 8)
  assert.equal(repo.state.users.get(8).password_hash, 'hash-nuevo')
  assert.equal(repo.state.tokens.get('a').used_at, 'used')
  assert.equal(repo.state.tokens.get('b').used_at, 'used')
})

test('consume rechaza token usado o vencido sin escribir', async () => {
  const repo = fakeRepo()
  repo.state.tokens.set('usado', { token: 'usado', user_id: 8, expires_at: '2026-09-03T00:00:00Z', used_at: 'x' })
  repo.state.tokens.set('vencido', { token: 'vencido', user_id: 8, expires_at: '2026-09-01T00:00:00Z', used_at: null })
  const service = createAccessTokenService({ repo, now: () => new Date('2026-09-02T12:00:00Z') })
  await assert.rejects(() => service.consume({ token: 'usado', passwordHash: 'x' }), /usado/)
  await assert.rejects(() => service.consume({ token: 'vencido', passwordHash: 'x' }), /venció/)
  assert.equal(repo.state.users.get(8).password_hash, undefined)
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
