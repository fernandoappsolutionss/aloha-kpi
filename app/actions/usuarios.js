'use server'
import { requireAdmin } from '../../lib/auth'
import { usuariosRepository } from '../../lib/usuarios-repository'
import { accessTokensRepository } from '../../lib/access-tokens-repository'
import { createAccessTokenService } from '../../lib/access-tokens.mjs'
import { createUsuariosService } from '../../lib/usuarios-service.mjs'
import { deliverAccess } from '../../lib/invitations'

const service = createUsuariosService({
  repo: usuariosRepository,
  accessTokens: createAccessTokenService({ repo: accessTokensRepository }),
  deliverAccess,
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

function sessionRef(session) {
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

// Compatibilidad temporal con el cliente actual; P6 consumirá pageData completo.
export async function listUsuarios() {
  const session = await requireAdmin()
  const result = await runAction('pageData', async () => service.pageData(sessionRef(session)))
  if (result?.error) return []
  return result.users.map((user) => ({
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.role,
    centro_id: user.centerId,
    centro_nombre: user.centerNames[0] || null,
    centros: user.centerIds,
    centros_nombres: user.centerNames,
    activo: user.active,
  }))
}

export async function createUsuario(input) {
  const session = await requireAdmin()
  return runAction('create', async () => service.create(sessionRef(session), input))
}

export async function updateUsuario(id, input) {
  const session = await requireAdmin()
  return runAction('update', async () => service.update(sessionRef(session), id, input))
}

export async function reenviarInvitacion(id) {
  const session = await requireAdmin()
  return runAction('resendAccess', async () => service.resendAccess(sessionRef(session), id))
}

export async function deleteUsuario(id) {
  const session = await requireAdmin()
  return runAction('delete', async () => service.delete(sessionRef(session), id))
}
