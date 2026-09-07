// ── Fuente de verdad de permisos ──────────────────────────────────────────
// Master: todos los centros + configuración global + gestión de acceso.
// Gerencia de lectura (admin_general/supervisor): todos los centros SIN escritura.
// Coordinador operativo: manda como administrador SOLO en los centros que le
//   asignaron (tabla usuario_centros). No toca configuración global.
// Administradora: manda en su único centro (usuarios.centro_id).
// Asistente: opera su centro, pero no cierra/reabre el mes ni elimina registros.
// Coach: NO opera el centro. Tiene cuenta para estudiar su puesto y nada más
//   (su trabajo del día, marcar asistencia, vive en /coach/<token>, fuera de la
//   sesión). El middleware lo encierra en el árbol de entrenamiento de su
//   centro; aquí se le niega, además, cerrar el mes y eliminar registros, que
//   son las dos acciones destructivas que la sesión sí alcanza.
export const ADMIN_MASTER_EMAIL = 'fperez@teamsolutionss.com'
export const ROL_ADMIN_MASTER = 'admin_master'
export const ADMIN_READONLY_ROLES = new Set(['admin_general', 'supervisor'])
export const ADMIN_ROLES = new Set([ROL_ADMIN_MASTER, ...ADMIN_READONLY_ROLES])
export const ROL_COORDINADOR = 'coordinador'
export const ROL_ASISTENTE = 'asistente'
export const ROL_COACH = 'coach'

// Puestos que NO mandan sobre los datos del centro. Antes esto era
// `rol !== 'asistente'` escrito dos veces; con el Coach ya son dos puestos y
// un tercero se agrega aquí, no en cada guarda.
const SIN_MANDO = new Set([ROL_ASISTENTE, ROL_COACH])

function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function rolDe(userOrRol) {
  return typeof userOrRol === 'string' ? userOrRol : userOrRol?.rol
}

export function isMaster(user) {
  return Boolean(
    user
    && user.rol === ROL_ADMIN_MASTER
    && normalizarEmail(user.email) === ADMIN_MASTER_EMAIL
  )
}

export function esMaster(user) {
  return isMaster(user)
}

export function isMasterRole(rol) {
  return rol === ROL_ADMIN_MASTER
}

export function esSoloLectura(userOrRol) {
  return ADMIN_READONLY_ROLES.has(rolDe(userOrRol))
}

export function esGerencia(rol) {
  return ADMIN_ROLES.has(rol)
}

// null = sin límite (gerencia ve todos los centros).
export function centrosDe(user) {
  if (!user) return []
  if (user.rol === ROL_ADMIN_MASTER) return isMaster(user) ? null : []
  if (esGerencia(user.rol)) return null
  if (user.rol === ROL_COORDINADOR) return (user.centros || []).map(Number)
  return user.centro_id == null ? [] : [Number(user.centro_id)]
}

export async function loadCurrentUser(session, query) {
  if (!session?.uid) throw new Error('No autenticado')
  const rows = await query`
    SELECT u.id, u.nombre, u.email, u.rol, u.centro_id, u.password_hash,
           u.blocked_until,
           (u.blocked_until IS NOT NULL AND u.blocked_until > CURRENT_TIMESTAMP) AS bloqueado,
           COALESCE(ARRAY_AGG(uc.centro_id) FILTER (WHERE uc.centro_id IS NOT NULL), '{}') AS centros
    FROM usuarios u
    LEFT JOIN usuario_centros uc ON uc.usuario_id = u.id
    WHERE u.id = ${Number(session.uid)}
    GROUP BY u.id
  `
  if (!rows[0]?.password_hash || usuarioBloqueado(rows[0])) throw new Error('No autenticado')
  if (rows[0].rol === ROL_ADMIN_MASTER && !isMaster(rows[0])) throw new Error('No autorizado')
  const { password_hash: _passwordHash, ...user } = rows[0]
  return { ...user, uid: Number(user.id), centros: (user.centros || []).map(Number) }
}

export function usuarioBloqueado(user, now = new Date()) {
  if (!user) return false
  if (typeof user.bloqueado === 'boolean') return user.bloqueado
  if (!user.blocked_until) return false
  const until = new Date(user.blocked_until)
  if (Number.isNaN(until.getTime())) return true
  return until.getTime() > now.getTime()
}

export function assertUsuarioVigente(user) {
  if (!user?.password_hash) throw new Error('No autenticado')
  assertUsuarioNoBloqueado(user)
  return user
}

export function assertUsuarioNoBloqueado(user) {
  if (!user) throw new Error('Usuario no encontrado.')
  if (usuarioBloqueado(user)) throw new Error('Cuenta bloqueada temporalmente.')
  if (user.rol === ROL_ADMIN_MASTER && !isMaster(user)) throw new Error('No autorizado')
  return user
}

// Recorta filas con centro_id al alcance recibido (null = sin límite).
export function soloDeMisCentros(rows, centroIds) {
  if (centroIds === null) return rows
  const permitidos = new Set((centroIds || []).map(Number))
  return rows.filter((row) => permitidos.has(Number(row.centro_id)))
}

export function canAccessCentro(user, centroId) {
  const permitidos = centrosDe(user)
  if (permitidos === null) return Boolean(user)
  return permitidos.some((id) => String(id) === String(centroId))
}

export function puedeLeerCentro(user, centroId) {
  return canAccessCentro(user, centroId)
}

export function puedeEscribirCentro(user, centroId) {
  if (!user) return false
  if (isMaster(user)) return true
  if (user.rol === ROL_ADMIN_MASTER) return false
  if (esSoloLectura(user)) return false
  if (user.rol === ROL_COACH) return false
  return canAccessCentro(user, centroId)
}

// Manda dentro de ese centro: gerencia o el coordinador que lo tiene asignado.
export function esAdminDe(user, centroId) {
  if (!user) return false
  if (isMaster(user)) return true
  if (esSoloLectura(user)) return false
  return user.rol === ROL_COORDINADOR && canAccessCentro(user, centroId)
}

// El panel /dashboard: gerencia (todos) y coordinador (filtrado a los suyos).
export function vePanelGerencia(user) {
  return Boolean(user && (isMaster(user) || esSoloLectura(user) || user.rol === ROL_COORDINADOR))
}

export function puedeCerrarMes(user) {
  if (!user) return false
  if (user.rol === ROL_ADMIN_MASTER) return isMaster(user)
  return !esSoloLectura(user) && !SIN_MANDO.has(user.rol)
}

export function puedeEliminar(user) {
  if (!user) return false
  if (user.rol === ROL_ADMIN_MASTER) return isMaster(user)
  return !esSoloLectura(user) && !SIN_MANDO.has(user.rol)
}

export function puedeVerOficio(userOrRol) {
  if (!userOrRol) return false
  if (typeof userOrRol === 'string') return userOrRol === ROL_ADMIN_MASTER || !ADMIN_READONLY_ROLES.has(userOrRol)
  if (userOrRol.rol === ROL_ADMIN_MASTER) return isMaster(userOrRol)
  return isMaster(userOrRol) || !esSoloLectura(userOrRol)
}

export function assertCentroAccess(user, centroId) {
  if (!user) throw new Error('No autenticado')
  if (!canAccessCentro(user, centroId)) throw new Error('No autorizado para este centro')
  return user
}

export function assertReadCentro(user, centroId) {
  return assertCentroAccess(user, centroId)
}

export function assertWriteCentro(user, centroId) {
  if (!user) throw new Error('No autenticado')
  if (!puedeEscribirCentro(user, centroId)) {
    throw new Error(esSoloLectura(user) ? 'Tu rol es de solo lectura.' : 'No autorizado para este centro')
  }
  return user
}

// Configuración global (crear centros, metas, Zoho): solo Master.
export function assertAdmin(user) {
  if (!isMaster(user)) throw new Error('No autorizado')
  return user
}

export function assertMaster(user) {
  return assertAdmin(user)
}

export function assertPanelGerencia(user) {
  if (!vePanelGerencia(user)) throw new Error('No autorizado')
  return user
}

export function assertOficio(user) {
  if (!puedeVerOficio(user)) throw new Error('No autorizado')
  return user
}

export function assertPuedeCerrarMes(user) {
  if (!puedeCerrarMes(user)) throw new Error('Tu puesto no puede cerrar ni reabrir el mes.')
  return user
}

export function assertPuedeEliminar(user) {
  if (!puedeEliminar(user)) throw new Error('Tu puesto no puede eliminar registros.')
  return user
}

// Los puestos que viven DENTRO de un centro (usuarios.centro_id, uno solo) y
// que un coordinador puede dar de alta en los suyos. El Coach entra aquí por eso
// mismo: su cuenta cuelga de un único centro —su centro BASE, el de la
// Administradora que le firma— aunque dé clases en dos.
export const ROLES_OPERATIVOS = Object.freeze(['administradora', 'asistente', 'coach'])
export const ROLES_ASIGNABLES_GERENCIA = Object.freeze(['admin_general', 'coordinador', ...ROLES_OPERATIVOS])

export function puedeGestionarUsuarios(actor) {
  return Boolean(actor && (isMaster(actor) || actor.rol === ROL_COORDINADOR))
}

export function puedeVerUsuarios(actor) {
  return Boolean(actor && (isMaster(actor) || esSoloLectura(actor) || actor.rol === ROL_COORDINADOR))
}

export function rolesAsignablesUsuarios(actor) {
  if (isMaster(actor)) return [...ROLES_ASIGNABLES_GERENCIA]
  if (actor?.rol === ROL_COORDINADOR) return [...ROLES_OPERATIVOS]
  return []
}

export function centrosDestinoUsuarios(actor) {
  if (isMaster(actor)) return null
  if (actor?.rol === ROL_COORDINADOR) {
    const centros = centrosDe(actor)
    return [...new Set((centros || []).map(Number).filter(Number.isInteger))]
  }
  return []
}

export function puedeGestionarUsuario(actor, objetivo) {
  if (!actor || !objetivo) return false
  if (isMaster(actor)) return true
  if (actor.rol !== ROL_COORDINADOR || !ROLES_OPERATIVOS.includes(objetivo.rol)) return false
  return centrosDestinoUsuarios(actor).includes(Number(objetivo.centro_id))
}

export function puedeAsignarUsuario(actor, { rol, centroId, centros = [] } = {}) {
  if (!rolesAsignablesUsuarios(actor).includes(rol)) return false
  if (isMaster(actor)) {
    if (rol === ROL_COORDINADOR) return Array.isArray(centros) && centros.length > 0
    return true
  }
  return ROLES_OPERATIVOS.includes(rol) && Number.isInteger(Number(centroId)) && centrosDestinoUsuarios(actor).includes(Number(centroId))
}

export function accionesGestionUsuario(actor, objetivo) {
  const gestionable = puedeGestionarUsuario(actor, objetivo)
  const protegido = isMaster(objetivo) || objetivo?.rol === ROL_ADMIN_MASTER || normalizarEmail(objetivo?.email) === ADMIN_MASTER_EMAIL
  const editar = gestionable && !protegido && rolesAsignablesUsuarios(actor).includes(objetivo?.rol)
  const active = Boolean(objetivo?.active ?? objetivo?.activo ?? objetivo?.password_hash)
  const bloqueado = usuarioBloqueado(objetivo)
  return {
    editar,
    reenviarInvitacion: gestionable && !protegido && !active,
    enviarRestablecimiento: gestionable && !protegido && active,
    eliminar: Boolean(gestionable && !protegido && isMaster(actor) && actor.id !== objetivo?.id && objetivo?.rol !== 'admin_general'),
    bloquear: Boolean(gestionable && !protegido && isMaster(actor) && actor.id !== objetivo?.id && !bloqueado),
    desbloquear: Boolean(gestionable && !protegido && isMaster(actor) && actor.id !== objetivo?.id && bloqueado),
  }
}

export function assertGestionUsuarios(actor) {
  if (!puedeGestionarUsuarios(actor)) throw new Error('No autorizado.')
  return actor
}

export function assertVerUsuarios(actor) {
  if (!puedeVerUsuarios(actor)) throw new Error('No autorizado.')
  return actor
}
