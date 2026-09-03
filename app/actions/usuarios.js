'use server'
import { requireSession } from '../../lib/auth'
import { usuariosRepository } from '../../lib/usuarios-repository'
import { accessTokensRepository } from '../../lib/access-tokens-repository'
import { createAccessTokenService } from '../../lib/access-tokens.mjs'
import { createUsuariosService } from '../../lib/usuarios-service.mjs'
import { deliverAccess } from '../../lib/invitations'
import { usuariosDeliveryForRuntime } from '../../lib/usuarios-delivery.mjs'

const service = createUsuariosService({
  repo: usuariosRepository,
  accessTokens: createAccessTokenService({ repo: accessTokensRepository }),
  deliverAccess: usuariosDeliveryForRuntime({ live: deliverAccess }),
})

const SAFE_MESSAGES = new Set([
  'No autorizado.',
  'No tienes permiso para gestionar este usuario.',
  'Identificador inválido.',
  'Nombre es requerido.',
  'Escribe un correo válido.',
  'El correo ya está registrado.',
  'El correo ya está registrado en un usuario visible.',
  'Selecciona un rol permitido.',
  'Selecciona un centro permitido.',
  'No puedes eliminar esta cuenta.',
  'No puedes eliminar un Administrador General.',
  'No puedes eliminar tu propia cuenta.',
  'Usuario no encontrado.',
])

async function sessionRef() {
  const session = await requireSession()
  return { uid: Number(session.uid) }
}

async function runAction(name, work) {
  try {
    return await work()
  } catch (error) {
    const rawCode = String(error?.code || '')
    console.error(`[usuarios:${name}]`, {
      name: error?.name || 'Error',
      code: /^[A-Z0-9_]{1,40}$/.test(rawCode) ? rawCode : 'UNEXPECTED',
    })
    return {
      error: SAFE_MESSAGES.has(error?.message)
        ? error.message
        : 'No pudimos completar la operación. Intenta de nuevo.',
    }
  }
}

export async function getUsuariosPageData() {
  return runAction('pageData', async () => service.pageData(await sessionRef()))
}

export async function createUsuario(input) {
  return runAction('create', async () => service.create(await sessionRef(), input))
}

export async function updateUsuario(id, input) {
  return runAction('update', async () => service.update(await sessionRef(), id, input))
}

export async function reenviarInvitacion(id) {
  return runAction('resendAccess', async () => service.resendAccess(await sessionRef(), id))
}

export async function deleteUsuario(id) {
  return runAction('delete', async () => service.delete(await sessionRef(), id))
}
