import { createPeticionUploadService } from './peticion-upload-service.mjs'
import { peticionBlob } from './peticion-blob'
import { peticionesRepository } from './peticiones-repository'

export async function verifyStoredQuote(quote) {
  const actual = await peticionBlob.inspect(quote.blob_pathname)
  if (Number(actual.bytes) !== Number(quote.archivo_bytes) || actual.sha256 !== quote.archivo_sha256) {
    throw new Error('El PDF cambió después de validarse.')
  }
  return true
}

export const peticionUploadService = createPeticionUploadService({ repo: peticionesRepository, blob: peticionBlob })
