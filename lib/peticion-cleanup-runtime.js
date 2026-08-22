import { createPeticionCleanupService } from './peticion-cleanup.mjs'
import { peticionBlob, requireBlobToken } from './peticion-blob'
import { peticionesRepository } from './peticiones-repository'

export const peticionCleanupService = createPeticionCleanupService({
  repo: peticionesRepository,
  blob: { ...peticionBlob, assertConfigured: requireBlobToken },
})
