import { createHash } from 'node:crypto'
import { MAX_PDF_BYTES } from './peticiones-domain.mjs'

export class PdfValidationError extends Error {
  constructor(message) { super(message); this.name = 'PdfValidationError' }
}

export function sanitizePdfName(name) {
  const base = String(name || 'cotizacion.pdf').split(/[\\/]/).pop()
  const clean = base.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '')
  return `${clean.replace(/\.pdf$/i, '') || 'cotizacion'}.pdf`
}

export async function inspectPdfStream(readable) {
  const hash = createHash('sha256')
  let bytes = 0
  let prefix = new Uint8Array()
  for await (const chunkValue of readable) {
    const chunk = chunkValue instanceof Uint8Array ? chunkValue : new Uint8Array(chunkValue)
    bytes += chunk.byteLength
    if (bytes > MAX_PDF_BYTES) throw new PdfValidationError('El PDF supera 10 MB.')
    if (prefix.byteLength < 5) {
      const take = chunk.slice(0, 5 - prefix.byteLength)
      const joined = new Uint8Array(prefix.byteLength + take.byteLength)
      joined.set(prefix)
      joined.set(take, prefix.byteLength)
      prefix = joined
    }
    hash.update(chunk)
  }
  if (bytes === 0) throw new PdfValidationError('El PDF está vacío.')
  if (new TextDecoder().decode(prefix) !== '%PDF-') throw new PdfValidationError('El archivo no tiene firma PDF válida.')
  return { bytes, sha256: hash.digest('hex') }
}
