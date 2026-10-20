import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { timingSafeEqual } from 'node:crypto'
import { cronAutorizado } from '../lib/cron-auth.mjs'
import { API_ACCESS_MATRIX, ACCESS_KINDS } from '../lib/access-matrix.mjs'

const file = 'app/api/cron/cerebro-sales/route.js'
const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replace(/^export /gm, '')

test('Cerebro declara cron y servicio o Master; rechaza llamadas no autorizadas antes de sincronizar', async () => {
  assert.equal(API_ACCESS_MATRIX[`${file}#GET`], ACCESS_KINDS.cron)
  assert.equal(API_ACCESS_MATRIX[`${file}#POST`], ACCESS_KINDS.serviceOrMaster)
  let runs = 0, masterCalls = 0, master = false
  const { GET, POST } = new Function('timingSafeEqual', 'cronAutorizado', 'zohoRefreshToken', 'syncCerebroSales', 'requireCurrentMaster', 'process', `${source}\nreturn {GET, POST}`)(
    timingSafeEqual, cronAutorizado, async () => 'fake-zoho',
    async () => { runs++; return { ok: true } },
    async () => { masterCalls++; if (!master) throw new Error('No autorizado') },
    { env: { CRON_SECRET: 'cron-test', CRM_SERVICE_TOKEN: 'service-test' } },
  )
  const request = (headers = {}) => new Request('https://example.invalid/api/cron/cerebro-sales', { headers })
  assert.equal((await GET(request())).status, 401)
  assert.equal((await POST(request())).status, 403)
  assert.equal((await POST(request({ origin: 'https://otro.invalid' }))).status, 403)
  assert.equal(masterCalls, 0)
  assert.equal((await POST(request({ origin: 'https://example.invalid', 'x-service-token': 'wrong' }))).status, 403)
  assert.equal(runs, 0)
  assert.equal((await GET(request({ authorization: 'Bearer cron-test' }))).status, 200)
  assert.equal((await POST(request({ 'x-service-token': 'service-test' }))).status, 200)
  assert.equal(masterCalls, 1)
  master = true
  assert.equal((await POST(request({ origin: 'https://example.invalid' }))).status, 200)
  assert.equal(runs, 3)
})
