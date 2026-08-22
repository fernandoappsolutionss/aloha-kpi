'use server'
import { requireCurrentCentroAccess, requireCurrentAdmin } from '../../lib/auth'
import { fallo } from '../../lib/errores'
import { peticionesRepository } from '../../lib/peticiones-repository'
import { createPeticionesService } from '../../lib/peticiones-service.mjs'

const service = createPeticionesService({ repo: peticionesRepository })
async function runAction(name, work) {
  try { return await work() } catch (error) { return fallo(name, error) }
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

export async function changePeticionStatus(centroId, id, estado) {
  return runAction('changePeticionStatus', async () =>
    service.changeStatus(await requireCurrentAdmin(), { centroId, id, estado }))
}

export async function discardPeticionDraft(centroId, id) {
  return runAction('discardPeticionDraft', async () =>
    service.discardDraft(await requireCurrentCentroAccess(centroId), { centroId, id }))
}
