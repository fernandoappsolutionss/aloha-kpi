import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const nextConfig = require('../next.config.js')

test('ws queda externo al bundle del servidor', () => {
  assert.ok(nextConfig.serverExternalPackages?.includes('ws'))
})
