'use server'
import { requireCurrentCentroAccess, requireCurrentAdmin } from '../../lib/auth'
import { fallo } from '../../lib/errores'
import { peticionesRepository } from '../../lib/peticiones-repository'
import { createPeticionesService } from '../../lib/peticiones-service.mjs'
import { peticionUploadService, verifyStoredQuote } from '../../lib/peticion-upload-runtime'
import { requireBlobToken } from '../../lib/peticion-blob'
import { notifyPeticionDecision } from '../../lib/peticion-notificaciones-runtime'

const service = createPeticionesService({
  repo: peticionesRepository,
  verifyQuote: verifyStoredQuote,
  notifyDecision: notifyPeticionDecision,
})
async function runAction(name, work) {
  try { return await work() } catch (error) {
    const result = fallo(name, error)
    if (/^[0-9A-Z]{5}$/.test(String(error?.code || ''))) {
      return { error: 'No se pudo completar la operación. Intenta de nuevo.' }
    }
    return result
  }
}

export async function listPeticiones(centroId, anio, trimestre) {
  return runAction('listPeticiones', async () => {
    const panel = await service.listPanel(await requireCurrentCentroAccess(centroId), { centroId, anio, trimestre })
    return { ...panel, capabilities: { uploadsAvailable: Boolean(process.env.BLOB_READ_WRITE_TOKEN) } }
  })
}

export async function createComentario(centroId, anio, trimestre, texto) {
  return runAction('createComentario', async () =>
    service.createComentario(await requireCurrentCentroAccess(centroId), { centroId, anio, trimestre, texto }))
}

export async function updateComentario(centroId, id, texto) {
  return runAction('updateComentario', async () =>
    service.updateComentario(await requireCurrentCentroAccess(centroId), { centroId, id, texto }))
}

export async function createPeticionDraft(centroId, anio, trimestre, input) {
  return runAction('createPeticionDraft', async () =>
    service.createDraft(await requireCurrentCentroAccess(centroId), { ...input, centroId, anio, trimestre }))
}

export async function updatePeticionDraft(centroId, id, input) {
  return runAction('updatePeticionDraft', async () =>
    service.updateDraft(await requireCurrentCentroAccess(centroId), { ...input, centroId, id }))
}

export async function submitPeticion(centroId, id) {
  return runAction('submitPeticion', async () =>
    service.submitPeticion(await requireCurrentCentroAccess(centroId), { centroId, id }))
}

export async function changePeticionStatus(centroId, id, estado, cotizacionAprobadaId = null) {
  return runAction('changePeticionStatus', async () =>
    service.changeStatus(await requireCurrentAdmin(), { centroId, id, estado, cotizacionAprobadaId }))
}

export async function discardPeticionDraft(centroId, id) {
  return runAction('discardPeticionDraft', async () =>
    service.discardDraft(await requireCurrentCentroAccess(centroId), { centroId, id }))
}

export async function eliminarPeticion(centroId, id) {
  return runAction('eliminarPeticion', async () =>
    service.eliminarPeticion(await requireCurrentAdmin(), { centroId, id }))
}

export async function prepareCotizacionUpload(centroId, input) {
  return runAction('prepareCotizacionUpload', async () => {
    requireBlobToken()
    return await peticionUploadService.prepare(await requireCurrentCentroAccess(centroId), { ...input, centroId })
  })
}

export async function getCotizacionUploadStatus(centroId, peticionId, cotizacionId) {
  return runAction('getCotizacionUploadStatus', async () =>
    peticionUploadService.status(await requireCurrentCentroAccess(centroId), { centroId, peticionId, cotizacionId }))
}

export async function discardCotizacionAttempt(centroId, peticionId, cotizacionId) {
  return runAction('discardCotizacionAttempt', async () =>
    peticionUploadService.discardAttempt(await requireCurrentCentroAccess(centroId), { centroId, peticionId, cotizacionId }))
}
