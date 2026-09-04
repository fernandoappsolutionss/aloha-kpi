import test from 'node:test'
import assert from 'node:assert/strict'
import { usuariosDeliveryForRuntime } from '../lib/usuarios-delivery.mjs'

test('sin modo E2E conserva el transporte real', () => {
  const live = async () => ({ emailSent: true })
  assert.equal(usuariosDeliveryForRuntime({ env: {}, live }), live)
})

test('stub falla cerrado fuera de desarrollo desechable', () => {
  const live = async () => ({ emailSent: true })
  for (const env of [
    { E2E_DELIVERY_MODE: 'stub', NODE_ENV: 'production', E2E_DATABASE_CONFIRM: 'disposable' },
    { E2E_DELIVERY_MODE: 'stub', NODE_ENV: 'development' },
    { E2E_DELIVERY_MODE: 'stub', NODE_ENV: 'test', E2E_DATABASE_CONFIRM: 'disposable' },
    { E2E_DELIVERY_MODE: 'stub', E2E_DATABASE_CONFIRM: 'disposable' },
  ]) {
    assert.throws(() => usuariosDeliveryForRuntime({ env, live }), /solo se permite/)
  }
})

test('stub desechable no llama correo real y solo devuelve enlace de invitación', async () => {
  let liveCalls = 0
  const deliver = usuariosDeliveryForRuntime({
    env: { E2E_DELIVERY_MODE: 'stub', NODE_ENV: 'development', E2E_DATABASE_CONFIRM: 'disposable' },
    live: async () => { liveCalls++; return {} },
  })
  const invite = await deliver({ purpose: 'invite', token: 'secreto' })
  const reset = await deliver({ purpose: 'reset', token: 'secreto' })
  assert.equal(invite.emailSent, true)
  assert.match(invite.link, /set-password/)
  assert.equal(Object.hasOwn(reset, 'link'), false)
  assert.equal(liveCalls, 0)
})
