import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveSessionSecret } from '../lib/session-secret.mjs'

test('producción sin SESSION_SECRET falla cerrado', () => {
  assert.throws(
    () => resolveSessionSecret({ NODE_ENV: 'production' }),
    /Falta SESSION_SECRET/
  )
})

test('desarrollo conserva un secreto local explícitamente inseguro', () => {
  const value = new TextDecoder().decode(resolveSessionSecret({ NODE_ENV: 'development' }))
  assert.equal(value, 'dev-insecure-secret-change-me-please')
})

test('un secreto configurado se usa en cualquier entorno', () => {
  const value = new TextDecoder().decode(resolveSessionSecret({ NODE_ENV: 'production', SESSION_SECRET: 'seguro-123' }))
  assert.equal(value, 'seguro-123')
})
