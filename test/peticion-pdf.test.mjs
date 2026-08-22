import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectPdfStream, sanitizePdfName } from '../lib/peticion-pdf.mjs'

const stream = (chunks) => new ReadableStream({
  start(controller) {
    for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk))
    controller.close()
  },
})

test('acepta firma PDF repartida entre chunks y calcula hash fijo', async () => {
  const result = await inspectPdfStream(stream(['%P', 'DF-1.7\ncontenido']))
  assert.equal(result.bytes, 18)
  assert.match(result.sha256, /^[0-9a-f]{64}$/)
})

test('rechaza firma incorrecta, vacío y exceso de 10 MiB', async () => {
  await assert.rejects(() => inspectPdfStream(stream(['texto'])), /firma PDF/)
  await assert.rejects(() => inspectPdfStream(stream([])), /vacío/)
  const huge = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(10 * 1024 * 1024 + 1)); controller.close() } })
  await assert.rejects(() => inspectPdfStream(huge), /10 MB/)
})

test('sanea el nombre sin usarlo como pathname', () => {
  assert.equal(sanitizePdfName('../../Cotización Ágil.pdf'), 'Cotizacion_Agil.pdf')
})
