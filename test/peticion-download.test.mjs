import test from 'node:test'
import assert from 'node:assert/strict'
import { createPeticionDownloadHandler } from '../lib/peticion-download.mjs'

const actor = { id: 8, rol: 'administradora', centro_id: 10 }
const body = () => new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('%PDF-x')); controller.close() } })

test('stream autorizado usa cabeceras privadas y nunca devuelve URL', async () => {
  const handler = createPeticionDownloadHandler({
    authenticate: async () => actor,
    findQuote: async () => ({ id: 9, centro_id: 10, archivo_nombre: 'Cotización Uno.pdf', blob_pathname: 'peticiones/4/a.pdf' }),
    getBlob: async () => ({ statusCode: 200, stream: body() }),
  })
  const response = await handler(9)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/pdf')
  assert.match(response.headers.get('content-disposition'), /^attachment;/)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal((await response.text()).startsWith('%PDF-'), true)
})

test('id inexistente y centro ajeno producen el mismo 404', async () => {
  const missing = createPeticionDownloadHandler({ authenticate: async () => actor, findQuote: async () => null, getBlob: async () => null })
  const denied = createPeticionDownloadHandler({
    authenticate: async () => actor,
    findQuote: async () => ({ id: 9, centro_id: 11, archivo_nombre: 'x.pdf', blob_pathname: 'x' }),
    getBlob: async () => { throw new Error('no debe leer Blob') },
  })
  assert.equal((await missing(9)).status, 404)
  assert.equal((await denied(9)).status, 404)
  const gone = createPeticionDownloadHandler({
    authenticate: async () => actor,
    findQuote: async () => ({ id: 9, centro_id: 10, archivo_nombre: 'x.pdf', blob_pathname: 'x' }),
    getBlob: async () => ({ statusCode: 500, stream: body() }),
  })
  assert.equal((await gone(9)).status, 404)
})

test('sesión ausente devuelve 401', async () => {
  const handler = createPeticionDownloadHandler({ authenticate: async () => { throw new Error('No autenticado') }, findQuote: async () => null, getBlob: async () => null })
  assert.equal((await handler(9)).status, 401)
  const outage = createPeticionDownloadHandler({ authenticate: async () => { throw new Error('Neon no disponible') }, findQuote: async () => null, getBlob: async () => null })
  await assert.rejects(() => outage(9), /Neon no disponible/)
})
