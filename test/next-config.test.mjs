import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const nextConfig = require('../next.config.js')

test('tracing usa la raíz de la configuración, independiente del caller', () => {
  assert.equal(nextConfig.outputFileTracingRoot, fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, ''))
})

test('ws queda externo al bundle del servidor', () => {
  assert.ok(nextConfig.serverExternalPackages?.includes('ws'))
})

test('no publica CORS wildcard sobre descargas autenticadas', async () => {
  const rules = typeof nextConfig.headers === 'function' ? await nextConfig.headers() : []
  const values = rules.flatMap((rule) => rule.headers || []).filter((header) => header.key.toLowerCase() === 'access-control-allow-origin')
  assert.equal(values.some((header) => header.value === '*'), false)
})
