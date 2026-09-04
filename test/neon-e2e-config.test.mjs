import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveNeonE2EConfig } from '../lib/neon-e2e-config.mjs'

const disposableDatabase = 'postgres://fixture:fixture@db.invalid:5432/fixture'

test('no configura transportes E2E cuando no existe ninguna variable del gate', () => {
  assert.equal(resolveNeonE2EConfig({}), null)
})

test('rechaza una configuración E2E parcial sin confirmación disposable', () => {
  assert.throws(
    () => resolveNeonE2EConfig({ E2E_NEON_HTTP: 'http://127.0.0.1:4446/sql' }),
    /configuración E2E de Neon incompleta/i,
  )
})

test('rechaza el gate disposable cuando falta cualquier transporte o base de prueba', () => {
  assert.throws(
    () => resolveNeonE2EConfig({
      E2E_DATABASE_CONFIRM: 'disposable',
      E2E_NEON_HTTP: 'http://127.0.0.1:4446/sql',
    }),
    /faltan variables obligatorias/i,
  )
})

test('rechaza una DATABASE_URL distinta de la base disposable declarada', () => {
  assert.throws(
    () => resolveNeonE2EConfig({
      E2E_DATABASE_CONFIRM: 'disposable',
      E2E_NEON_HTTP: 'http://127.0.0.1:4446/sql',
      E2E_NEON_WSPROXY: '127.0.0.1:5435',
      USUARIOS_TEST_DATABASE_URL: disposableDatabase,
      DATABASE_URL: 'postgres://fixture:fixture@other.invalid:5432/other',
    }),
    /DATABASE_URL debe coincidir/i,
  )
})

test('produce una configuración local explícita con HTTP sin caché y WebSocket sin TLS', () => {
  assert.deepEqual(resolveNeonE2EConfig({
    E2E_DATABASE_CONFIRM: 'disposable',
    E2E_NEON_HTTP: 'http://127.0.0.1:4446/sql',
    E2E_NEON_WSPROXY: '127.0.0.1:5435',
    USUARIOS_TEST_DATABASE_URL: disposableDatabase,
    DATABASE_URL: disposableDatabase,
  }), {
    fetchEndpoint: 'http://127.0.0.1:4446/sql',
    wsProxy: '127.0.0.1:5435/v1',
    useSecureWebSocket: false,
    forceDisablePgSSL: true,
    pipelineTLS: false,
    pipelineConnect: false,
    fetchOptions: { cache: 'no-store' },
  })
})
