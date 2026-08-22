import { get, del, list } from '@vercel/blob'
import { inspectPdfStream } from './peticion-pdf.mjs'

export function requireBlobToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('Falta BLOB_READ_WRITE_TOKEN para gestionar cotizaciones.')
}

export const peticionBlob = {
  async inspect(pathname) {
    requireBlobToken()
    const result = await get(pathname, { access: 'private' })
    if (!result || result.statusCode !== 200 || !result.stream) throw new Error('El PDF cargado no existe.')
    return await inspectPdfStream(result.stream)
  },
  async get(pathname) { requireBlobToken(); return await get(pathname, { access: 'private' }) },
  async delete(pathname) { requireBlobToken(); return await del(pathname) },
  async listPage({ prefix, cursor, limit = 250 }) {
    requireBlobToken()
    const page = await list({ prefix, cursor, limit })
    return {
      blobs: page.blobs.map(({ pathname, size, uploadedAt }) => ({ pathname, size, uploadedAt })),
      hasMore: page.hasMore,
      cursor: page.hasMore ? page.cursor : undefined,
    }
  },
}
