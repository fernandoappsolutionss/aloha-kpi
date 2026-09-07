import {
  ADMIN_MASTER_EMAIL,
  ROL_COACH,
  ROL_COORDINADOR,
  ROL_ADMIN_MASTER,
  ROLES_OPERATIVOS,
  accionesGestionUsuario,
  assertGestionUsuarios,
  assertMaster,
  assertUsuarioVigente,
  assertVerUsuarios,
  centrosDestinoUsuarios,
  esGerencia,
  esSoloLectura,
  isMaster,
  puedeAsignarUsuario,
  puedeGestionarUsuario,
  puedeGestionarUsuarios,
  rolesAsignablesUsuarios,
} from './current-user.mjs'
import { accessPurpose } from './access-tokens.mjs'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DENIED = 'No tienes permiso para gestionar este usuario.'
const CREATE_RETRY_ERROR = 'No se pudo crear el usuario. Intenta nuevamente.'
const SERIALIZABLE = { isolationLevel: 'Serializable' }

function isoOrNull(value) {
  return value ? new Date(value).toISOString() : null
}

function parseId(value) {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) throw new Error('Identificador inválido.')
  return id
}

function normalizeInput(input, { creating }) {
  const rolPedido = String(input?.rol || '')
  // Cuenta de Coach creada DESDE LA FICHA: el nombre no se teclea, se escoge de
  // la lista del centro y lo pone el servidor (repo.lockCoach). Por eso aquí no
  // se exige: la ficha manda sobre lo que venga del navegador.
  const coachId = creating && rolPedido === ROL_COACH && input?.coach_id != null && input.coach_id !== ''
    ? parseId(input.coach_id)
    : null
  const nombre = String(input?.nombre || '').trim()
  if (!nombre && !coachId) throw new Error('Nombre es requerido.')
  const email = creating ? String(input?.email || '').trim().toLowerCase() : undefined
  if (creating && !EMAIL.test(email)) throw new Error('Escribe un correo válido.')
  const rol = rolPedido
  const centerInputs = Array.isArray(input?.centros) ? input.centros : []
  const operationalCenterId = ROLES_OPERATIVOS.includes(rol)
    ? (input?.centro_id == null || input.centro_id === '' ? null : parseId(input.centro_id))
    : null
  return {
    nombre,
    coachId,
    email,
    rol,
    centro_id: ROLES_OPERATIVOS.includes(rol) ? operationalCenterId : null,
    centros: rol === ROL_COORDINADOR
      ? [...new Set(centerInputs.map(parseId))].sort((a, b) => a - b)
      : [],
  }
}

function normalizeBlockInput(input, now) {
  const motivo = String(input?.motivo || input?.reason || '').trim()
  if (!motivo) throw new Error('El motivo es requerido.')
  const blockedUntil = new Date(input?.blockedUntil || input?.blocked_until || '')
  if (Number.isNaN(blockedUntil.getTime())) throw new Error('Selecciona una fecha válida.')
  if (blockedUntil.getTime() <= now.getTime()) throw new Error('Selecciona una fecha futura.')
  return { blockedUntil: blockedUntil.toISOString(), motivo }
}

function normalizeUnblockInput(input) {
  const motivo = String(input?.motivo || input?.reason || '').trim()
  if (!motivo) throw new Error('El motivo es requerido.')
  return { motivo }
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

function isCuentaMaster(row) {
  return Boolean(
    isMaster(row)
    || row?.rol === ROL_ADMIN_MASTER
    || String(row?.email || '').trim().toLowerCase() === ADMIN_MASTER_EMAIL
  )
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

export function createUsuariosService({ repo, accessTokens, deliverAccess, now = () => new Date() }) {
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
      const actor = assertGestionUsuarios(assertUsuarioVigente(await repo.loadActor(query, uid, { lock: true })))
      const existing = await repo.findByEmail(query, row.email)
      if (existing) throw duplicateError(actor, existing)
      if (!puedeAsignarUsuario(actor, assignmentOf(row))) throw new Error(DENIED)

      // LA CUENTA DEL COACH SIEMPRE SALE CON FICHA. Dos caminos:
      //   - escogió una de la lista → se bloquea ANTES de insertar la cuenta,
      //     para que dos administradoras a la vez no peguen dos cuentas a una
      //     misma ficha;
      //   - es gente nueva → la ficha NACE aquí, en la misma transacción. Dar
      //     de alta a un coach no puede obligar a registrarlo dos veces, y una
      //     cuenta sin ficha no ve ni un grupo: es una cuenta muerta.
      const coach = row.coachId ? await repo.lockCoach(query, row.coachId) : null
      if (row.coachId) {
        if (!coach || Number(coach.centro_id) !== Number(row.centro_id)) {
          throw new Error('Ese coach no está en el centro seleccionado.')
        }
        if (!coach.activo) throw new Error('Ese coach está desactivado.')
        if (coach.usuario_id) throw new Error('Ese coach ya tiene cuenta.')
      }
      const creaFicha = !coach && row.rol === ROL_COACH && Number.isInteger(Number(row.centro_id))
      if (creaFicha) {
        const repetida = await repo.findCoachByName(query, row.centro_id, row.nombre)
        if (repetida) throw new Error('Ese coach ya está en la lista del centro: escógelo del desplegable.')
      }

      const user = await repo.insertUser(query, {
        nombre: coach ? coach.nombre : row.nombre,
        email: row.email,
        rol: row.rol,
        centro_id: row.centro_id,
      })
      if (coach) await repo.linkCoachToUser(query, coach.id, user.id)
      if (creaFicha) {
        const nueva = await repo.insertCoach(query, { centro_id: row.centro_id, nombre: row.nombre })
        await repo.linkCoachToUser(query, nueva.id, user.id)
      }
      if (row.rol === ROL_COORDINADOR) {
        await repo.replaceCoordinatorCenters(query, user.id, row.centros)
      }
      const issued = await accessTokens.replace(query, { userId: user.id, purpose: 'invite', hours: 48 })
      return { ...issued, purpose: 'invite' }
    }, SERIALIZABLE)
  }

  async function diagnoseCreateConflict(uid, email) {
    return repo.transaction(async (query) => {
      const actor = assertGestionUsuarios(assertUsuarioVigente(await repo.loadActor(query, uid, { lock: false })))
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
      const actor = assertGestionUsuarios(assertUsuarioVigente(await repo.loadActor(query, uid, { lock: true })))
      const target = await repo.lockUser(query, id)
      if (!puedeGestionarUsuario(actor, target)) throw new Error(DENIED)
      if (isCuentaMaster(target)) throw new Error('No puedes modificar esta cuenta.')
      if (!puedeAsignarUsuario(actor, assignmentOf(row))) throw new Error(DENIED)

      await repo.updateUser(query, id, {
        nombre: row.nombre,
        rol: row.rol,
        centro_id: row.centro_id,
      })
      await repo.replaceCoordinatorCenters(query, id, row.centros)
      if (row.rol !== ROL_COACH) await repo.unlinkCoachUser(query, id)

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
      const actor = assertGestionUsuarios(assertUsuarioVigente(await repo.loadActor(query, uid, { lock: true })))
      const target = await repo.lockUser(query, id)
      if (!puedeGestionarUsuario(actor, target) || !isMaster(actor)) throw new Error(DENIED)
      if (Number(actor.id) === id) throw new Error('No puedes eliminar tu propia cuenta.')
      if (isCuentaMaster(target)) throw new Error('No puedes eliminar esta cuenta.')
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
      const actor = assertGestionUsuarios(assertUsuarioVigente(await repo.loadActor(query, uid, { lock: true })))
      const target = await repo.lockUser(query, id)
      if (!puedeGestionarUsuario(actor, target)) throw new Error(DENIED)
      if (isCuentaMaster(target)) throw new Error('No puedes modificar esta cuenta.')
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

  async function blockUser(session, usuarioId, input, options = {}) {
    const uid = parseId(session?.uid)
    const id = parseId(usuarioId)
    const row = normalizeBlockInput(input, options.now || now())
    return repo.transaction(async (query) => {
      const actor = assertMaster(assertUsuarioVigente(await repo.loadActor(query, uid, { lock: true })))
      const target = await repo.lockUser(query, id)
      if (!target) throw new Error('Usuario no encontrado.')
      if (Number(actor.id) === id) throw new Error('No puedes bloquear tu propia cuenta.')
      if (isCuentaMaster(target)) throw new Error('No puedes bloquear esta cuenta.')
      const previousBlockedUntil = isoOrNull(target.blocked_until)
      const saved = await repo.updateBlockedUntil(query, id, row.blockedUntil)
      if (accessTokens?.invalidate) await accessTokens.invalidate(query, { userId: id })
      await repo.insertAccessHistory(query, {
        userId: id,
        actorId: actor.id,
        action: 'block',
        previousBlockedUntil,
        newBlockedUntil: row.blockedUntil,
        motivo: row.motivo,
      })
      return { ok: true, blockedUntil: isoOrNull(saved?.blocked_until) }
    }, SERIALIZABLE)
  }

  async function unblockUser(session, usuarioId, input) {
    const uid = parseId(session?.uid)
    const id = parseId(usuarioId)
    const row = normalizeUnblockInput(input)
    return repo.transaction(async (query) => {
      const actor = assertMaster(assertUsuarioVigente(await repo.loadActor(query, uid, { lock: true })))
      const target = await repo.lockUser(query, id)
      if (!target) throw new Error('Usuario no encontrado.')
      if (Number(actor.id) === id) throw new Error('No puedes desbloquear tu propia cuenta.')
      if (isCuentaMaster(target)) throw new Error('No puedes desbloquear esta cuenta.')
      const previousBlockedUntil = isoOrNull(target.blocked_until)
      const saved = await repo.updateBlockedUntil(query, id, null)
      await repo.insertAccessHistory(query, {
        userId: id,
        actorId: actor.id,
        action: 'unblock',
        previousBlockedUntil,
        newBlockedUntil: null,
        motivo: row.motivo,
      })
      return { ok: true, blockedUntil: isoOrNull(saved?.blocked_until) }
    }, SERIALIZABLE)
  }

  return {
    create,
    update,
    delete: deleteUser,
    resendAccess,
    blockUser,
    unblockUser,
    async pageData(session) {
      return repo.transaction(async (query) => {
        const actor = assertVerUsuarios(assertUsuarioVigente(await repo.loadActor(query, Number(session?.uid), { lock: false })))
        const scope = (isMaster(actor) || esSoloLectura(actor)) ? null : centrosDestinoUsuarios(actor)
        const canManage = puedeGestionarUsuarios(actor)
        const centers = await repo.listCenters(query, scope)
        const rows = await repo.listUsers(query, scope)
        const coaches = await repo.listCoaches(query, scope)
        return {
          actor: { id: actor.id, role: actor.rol },
          title: actor.rol === 'coordinador' ? 'Usuarios de mis centros' : 'Gestión de usuarios',
          centers,
          // Fichas de coach del centro: de aquí sale el nombre de la cuenta.
          coaches: coaches.map((coach) => ({
            id: Number(coach.id),
            centroId: Number(coach.centro_id),
            nombre: coach.nombre,
            conCuenta: coach.usuario_id != null,
          })),
          assignableRoles: rolesAsignablesUsuarios(actor),
          capabilities: {
            createUser: canManage && (scope === null || scope.length > 0),
            deleteUser: isMaster(actor),
            blockUsers: isMaster(actor),
            manageUsers: canManage,
          },
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
              blockedUntil: isoOrNull(row.blocked_until),
              blocked: Boolean(row.bloqueado),
              actions: {
                edit: allowed.editar,
                resendInvitation: allowed.reenviarInvitacion,
                sendPasswordReset: allowed.enviarRestablecimiento,
                delete: allowed.eliminar,
                block: allowed.bloquear,
                unblock: allowed.desbloquear,
              },
            }
          }),
        }
      })
    },
  }
}
