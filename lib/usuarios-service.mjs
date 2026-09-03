import {
  ROL_COORDINADOR,
  ROLES_OPERATIVOS,
  accionesGestionUsuario,
  assertGestionUsuarios,
  centrosDestinoUsuarios,
  esGerencia,
  puedeAsignarUsuario,
  puedeGestionarUsuario,
  rolesAsignablesUsuarios,
} from './current-user.mjs'
import { accessPurpose } from './access-tokens.mjs'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DENIED = 'No tienes permiso para gestionar este usuario.'
const CREATE_RETRY_ERROR = 'No se pudo crear el usuario. Intenta nuevamente.'
const SERIALIZABLE = { isolationLevel: 'Serializable' }

function parseId(value) {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) throw new Error('Identificador inválido.')
  return id
}

function normalizeInput(input, { creating }) {
  const nombre = String(input?.nombre || '').trim()
  if (!nombre) throw new Error('Nombre es requerido.')
  const email = creating ? String(input?.email || '').trim().toLowerCase() : undefined
  if (creating && !EMAIL.test(email)) throw new Error('Escribe un correo válido.')
  const rol = String(input?.rol || '')
  const centerInputs = Array.isArray(input?.centros) ? input.centros : []
  const operationalCenterId = ROLES_OPERATIVOS.includes(rol)
    ? (input?.centro_id == null || input.centro_id === '' ? null : parseId(input.centro_id))
    : null
  return {
    nombre,
    email,
    rol,
    centro_id: ROLES_OPERATIVOS.includes(rol) ? operationalCenterId : null,
    centros: rol === ROL_COORDINADOR
      ? [...new Set(centerInputs.map(parseId))].sort((a, b) => a - b)
      : [],
  }
}

function duplicateError(actor, existing) {
  if (esGerencia(actor.rol)) return new Error('El correo ya está registrado.')
  if (puedeGestionarUsuario(actor, existing)) {
    return new Error('El correo ya está registrado en un usuario visible.')
  }
  return new Error(DENIED)
}

function assignmentOf(row) {
  return { rol: row.rol, centroId: row.centro_id, centros: row.centros }
}

function sameIds(left, right) {
  const a = [...new Set((left || []).map(Number).filter(Number.isInteger))].sort((x, y) => x - y)
  const b = [...new Set((right || []).map(Number).filter(Number.isInteger))].sort((x, y) => x - y)
  return a.length === b.length && a.every((id, index) => id === b[index])
}

function safeDeliveryCode(error) {
  const rawCode = String(error?.code || '')
  return /^[A-Z0-9_]{1,40}$/.test(rawCode) ? rawCode : 'DELIVERY_FAILED'
}

function reportDeliveryError(logError, error) {
  try {
    logError('[password:request-reset]', { code: safeDeliveryCode(error) })
  } catch {
    // La telemetría nunca puede alterar la respuesta pública.
  }
}

export function createPublicPasswordReset({ repository, accessTokens, deliverAccess, schedule, logError = console.error }) {
  return async function requestPasswordReset(email) {
    const mail = String(email || '').trim().toLowerCase()
    if (!mail) return { ok: true }
    try {
      const prepared = await repository.transaction(async (query) => {
        const user = await repository.findUserByEmail(query, mail)
        if (!user) return null
        const purpose = accessPurpose(user)
        const hours = purpose === 'reset' ? 2 : 48
        const issued = await accessTokens.replace(query, {
          userId: user.id,
          purpose,
          hours,
          cooldownMinutes: 15,
        })
        if (issued.suppressed) return null
        return { user: issued.user, purpose, token: issued.token }
      })
      if (prepared) {
        schedule(async () => {
          try {
            await deliverAccess(prepared)
          } catch (error) {
            reportDeliveryError(logError, error)
          }
        })
      }
    } catch (error) {
      reportDeliveryError(logError, error)
    }
    return { ok: true }
  }
}

export function createUsuariosService({ repo, accessTokens, deliverAccess }) {
  async function deliverBestEffort(prepared) {
    try {
      const delivery = await deliverAccess(prepared)
      if (!delivery?.emailSent) {
        return { emailSent: false, emailReason: 'delivery_failed', link: null }
      }
      return { emailSent: true, link: delivery.link || null }
    } catch (error) {
      console.error('[usuarios:delivery]', { code: safeDeliveryCode(error) })
      return { emailSent: false, emailReason: 'delivery_failed', link: null }
    }
  }

  async function createAttempt(uid, row) {
    return repo.transaction(async (query) => {
      const actor = assertGestionUsuarios(await repo.loadActor(query, uid, { lock: true }))
      const existing = await repo.findByEmail(query, row.email)
      if (existing) throw duplicateError(actor, existing)
      if (!puedeAsignarUsuario(actor, assignmentOf(row))) throw new Error(DENIED)

      const user = await repo.insertUser(query, {
        nombre: row.nombre,
        email: row.email,
        rol: row.rol,
        centro_id: row.centro_id,
      })
      if (row.rol === ROL_COORDINADOR) {
        await repo.replaceCoordinatorCenters(query, user.id, row.centros)
      }
      return accessTokens.replace(query, { userId: user.id, purpose: 'invite', hours: 48 })
    }, SERIALIZABLE)
  }

  async function diagnoseCreateConflict(uid, email) {
    return repo.transaction(async (query) => {
      const actor = assertGestionUsuarios(await repo.loadActor(query, uid, { lock: false }))
      const existing = await repo.findByEmail(query, email)
      return { actor, existing }
    }, SERIALIZABLE)
  }

  async function diagnoseCreateConflictSafely(uid, email) {
    try {
      return await diagnoseCreateConflict(uid, email)
    } catch (error) {
      if (error?.code === '40001') throw new Error(CREATE_RETRY_ERROR)
      throw error
    }
  }

  async function create(session, input) {
    const uid = parseId(session?.uid)
    const row = normalizeInput(input, { creating: true })
    let prepared
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        prepared = await createAttempt(uid, row)
        break
      } catch (error) {
        if (error?.code !== '23505' && error?.code !== '40001') throw error
        const { actor, existing } = await diagnoseCreateConflictSafely(uid, row.email)
        if (existing || error.code === '23505') throw duplicateError(actor, existing)
        if (attempt === 1) throw new Error(CREATE_RETRY_ERROR)
      }
    }

    const delivery = await deliverBestEffort(prepared)
    if (!delivery.emailSent) {
      return {
        ok: true,
        kind: 'invitation',
        emailSent: false,
        link: null,
        deliveryError: delivery.emailReason || 'delivery_failed',
      }
    }
    return {
      ok: true,
      kind: 'invitation',
      emailSent: true,
      link: delivery.link || null,
    }
  }

  async function update(session, usuarioId, input) {
    const uid = parseId(session?.uid)
    const id = parseId(usuarioId)
    const row = normalizeInput(input, { creating: false })
    return repo.transaction(async (query) => {
      const actor = assertGestionUsuarios(await repo.loadActor(query, uid, { lock: true }))
      const target = await repo.lockUser(query, id)
      if (!puedeGestionarUsuario(actor, target)) throw new Error(DENIED)
      if (!puedeAsignarUsuario(actor, assignmentOf(row))) throw new Error(DENIED)

      await repo.updateUser(query, id, {
        nombre: row.nombre,
        rol: row.rol,
        centro_id: row.centro_id,
      })
      await repo.replaceCoordinatorCenters(query, id, row.centros)

      const changedAccess = target.rol !== row.rol
        || Number(target.centro_id) !== Number(row.centro_id)
        || (row.rol === ROL_COORDINADOR && !sameIds(target.centros, row.centros))
      if (changedAccess) await accessTokens.invalidate(query, { userId: id })
      return { ok: true }
    }, SERIALIZABLE)
  }

  async function deleteUser(session, usuarioId) {
    const uid = parseId(session?.uid)
    const id = parseId(usuarioId)
    return repo.transaction(async (query) => {
      const actor = assertGestionUsuarios(await repo.loadActor(query, uid, { lock: true }))
      const target = await repo.lockUser(query, id)
      if (!puedeGestionarUsuario(actor, target) || !esGerencia(actor.rol)) throw new Error(DENIED)
      if (Number(actor.id) === id) throw new Error('No puedes eliminar tu propia cuenta.')
      if (target.rol === 'admin_general') throw new Error('No puedes eliminar un Administrador General.')
      await accessTokens.invalidate(query, { userId: id })
      await repo.deleteUser(query, id)
      return { ok: true }
    }, SERIALIZABLE)
  }

  async function resendAccess(session, usuarioId) {
    const uid = parseId(session?.uid)
    const id = parseId(usuarioId)
    const prepared = await repo.transaction(async (query) => {
      const actor = assertGestionUsuarios(await repo.loadActor(query, uid, { lock: true }))
      const target = await repo.lockUser(query, id)
      if (!puedeGestionarUsuario(actor, target)) throw new Error(DENIED)
      const purpose = accessPurpose(target)
      const issued = await accessTokens.replace(query, {
        userId: target.id,
        purpose,
        hours: purpose === 'reset' ? 2 : 48,
      })
      return {
        purpose,
        token: issued.token,
        user: { id: target.id, nombre: target.nombre, email: target.email },
      }
    }, SERIALIZABLE)

    const delivery = await deliverBestEffort(prepared)
    if (prepared.purpose === 'reset') {
      return {
        ok: true,
        kind: 'reset',
        emailSent: Boolean(delivery.emailSent),
        ...(delivery.emailSent ? {} : { deliveryError: 'delivery_failed' }),
      }
    }
    return {
      ok: true,
      kind: 'invitation',
      emailSent: Boolean(delivery.emailSent),
      link: delivery.link || null,
      ...(delivery.emailSent ? {} : { deliveryError: 'delivery_failed' }),
    }
  }

  return {
    create,
    update,
    delete: deleteUser,
    resendAccess,
    async pageData(session) {
      return repo.transaction(async (query) => {
        const actor = assertGestionUsuarios(await repo.loadActor(query, Number(session?.uid), { lock: false }))
        const scope = centrosDestinoUsuarios(actor)
        const centers = await repo.listCenters(query, scope)
        const rows = await repo.listUsers(query, scope)
        return {
          actor: { id: actor.id, role: actor.rol },
          title: actor.rol === 'coordinador' ? 'Usuarios de mis centros' : 'Gestión de usuarios',
          centers,
          assignableRoles: rolesAsignablesUsuarios(actor),
          capabilities: { createUser: scope === null || scope.length > 0, deleteUser: esGerencia(actor.rol) },
          users: rows.map((row) => {
            const allowed = accionesGestionUsuario(actor, row)
            const relationshipCenterIds = Array.isArray(row.centros)
              ? row.centros.map(Number).filter(Number.isInteger)
              : []
            const centerIds = relationshipCenterIds.length > 0
              ? relationshipCenterIds
              : (row.centro_id == null ? [] : [Number(row.centro_id)])
            const relationshipCenterNames = Array.isArray(row.centros_nombres)
              ? row.centros_nombres.filter(Boolean)
              : []
            return {
              id: row.id,
              nombre: row.nombre,
              email: row.email,
              role: row.rol,
              centerId: row.centro_id,
              centerIds,
              centerNames: relationshipCenterNames.length > 0
                ? relationshipCenterNames
                : (row.centro_nombre ? [row.centro_nombre] : []),
              active: Boolean(row.activo ?? row.password_hash),
              actions: {
                edit: allowed.editar,
                resendInvitation: allowed.reenviarInvitacion,
                sendPasswordReset: allowed.enviarRestablecimiento,
                delete: allowed.eliminar,
              },
            }
          }),
        }
      })
    },
  }
}
