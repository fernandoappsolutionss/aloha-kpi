// ── Fuente de verdad de permisos ──────────────────────────────────────────
// Gerencia (admin_general/supervisor): todos los centros + configuración global.
// Coordinador operativo: manda como administrador SOLO en los centros que le
//   asignaron (tabla usuario_centros). No toca configuración global.
// Administradora: manda en su único centro (usuarios.centro_id).
// Asistente: opera su centro, pero no cierra/reabre el mes ni elimina registros.
// Coach: NO opera el centro. Tiene cuenta para estudiar su puesto y nada más
//   (su trabajo del día, marcar asistencia, vive en /coach/<token>, fuera de la
//   sesión). El middleware lo encierra en el árbol de entrenamiento de su
//   centro; aquí se le niega, además, cerrar el mes y eliminar registros, que
//   son las dos acciones destructivas que la sesión sí alcanza.
export const ADMIN_ROLES = new Set(['admin_general', 'supervisor'])
export const ROL_COORDINADOR = 'coordinador'
export const ROL_ASISTENTE = 'asistente'
export const ROL_COACH = 'coach'

// Puestos que NO mandan sobre los datos del centro. Antes esto era
// `rol !== 'asistente'` escrito dos veces; con el Coach ya son dos puestos y
// un tercero se agrega aquí, no en cada guarda.
const SIN_MANDO = new Set([ROL_ASISTENTE, ROL_COACH])

export function esGerencia(rol) {
  return ADMIN_ROLES.has(rol)
}

// null = sin límite (gerencia ve todos los centros).
export function centrosDe(user) {
  if (!user) return []
  if (esGerencia(user.rol)) return null
  if (user.rol === ROL_COORDINADOR) return (user.centros || []).map(Number)
  return user.centro_id == null ? [] : [Number(user.centro_id)]
}

export async function loadCurrentUser(session, query) {
  if (!session?.uid) throw new Error('No autenticado')
  const rows = await query`
    SELECT u.id, u.nombre, u.email, u.rol, u.centro_id, u.password_hash,
           COALESCE(ARRAY_AGG(uc.centro_id) FILTER (WHERE uc.centro_id IS NOT NULL), '{}') AS centros
    FROM usuarios u
    LEFT JOIN usuario_centros uc ON uc.usuario_id = u.id
    WHERE u.id = ${Number(session.uid)}
    GROUP BY u.id
  `
  if (!rows[0]?.password_hash) throw new Error('No autenticado')
  const { password_hash: _passwordHash, ...user } = rows[0]
  return { ...user, centros: (user.centros || []).map(Number) }
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

// Manda dentro de ese centro: gerencia o el coordinador que lo tiene asignado.
export function esAdminDe(user, centroId) {
  if (!user) return false
  if (esGerencia(user.rol)) return true
  return user.rol === ROL_COORDINADOR && canAccessCentro(user, centroId)
}

// El panel /dashboard: gerencia (todos) y coordinador (filtrado a los suyos).
export function vePanelGerencia(user) {
  return Boolean(user && (esGerencia(user.rol) || user.rol === ROL_COORDINADOR))
}

export function puedeCerrarMes(user) {
  return Boolean(user) && !SIN_MANDO.has(user.rol)
}

export function puedeEliminar(user) {
  return Boolean(user) && !SIN_MANDO.has(user.rol)
}

export function assertCentroAccess(user, centroId) {
  if (!user) throw new Error('No autenticado')
  if (!canAccessCentro(user, centroId)) throw new Error('No autorizado para este centro')
  return user
}

// Configuración global (crear centros, gestionar usuarios): solo gerencia.
export function assertAdmin(user) {
  if (!user || !esGerencia(user.rol)) throw new Error('No autorizado')
  return user
}

export function assertPanelGerencia(user) {
  if (!vePanelGerencia(user)) throw new Error('No autorizado')
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
  return Boolean(actor && (esGerencia(actor.rol) || actor.rol === ROL_COORDINADOR))
}

export function rolesAsignablesUsuarios(actor) {
  if (esGerencia(actor?.rol)) return [...ROLES_ASIGNABLES_GERENCIA]
  if (actor?.rol === ROL_COORDINADOR) return [...ROLES_OPERATIVOS]
  return []
}

export function centrosDestinoUsuarios(actor) {
  if (esGerencia(actor?.rol)) return null
  if (actor?.rol === ROL_COORDINADOR) {
    const centros = centrosDe(actor)
    return [...new Set((centros || []).map(Number).filter(Number.isInteger))]
  }
  return []
}

export function puedeGestionarUsuario(actor, objetivo) {
  if (!actor || !objetivo) return false
  if (esGerencia(actor.rol)) return true
  if (actor.rol !== ROL_COORDINADOR || !ROLES_OPERATIVOS.includes(objetivo.rol)) return false
  return centrosDestinoUsuarios(actor).includes(Number(objetivo.centro_id))
}

export function puedeAsignarUsuario(actor, { rol, centroId, centros = [] } = {}) {
  if (!rolesAsignablesUsuarios(actor).includes(rol)) return false
  if (esGerencia(actor?.rol)) {
    if (rol === ROL_COORDINADOR) return Array.isArray(centros) && centros.length > 0
    return true
  }
  return ROLES_OPERATIVOS.includes(rol) && Number.isInteger(Number(centroId)) && centrosDestinoUsuarios(actor).includes(Number(centroId))
}

export function accionesGestionUsuario(actor, objetivo) {
  const gestionable = puedeGestionarUsuario(actor, objetivo)
  const editar = gestionable && rolesAsignablesUsuarios(actor).includes(objetivo?.rol)
  const active = Boolean(objetivo?.active ?? objetivo?.activo ?? objetivo?.password_hash)
  return {
    editar,
    reenviarInvitacion: gestionable && !active,
    enviarRestablecimiento: gestionable && active,
    eliminar: Boolean(gestionable && esGerencia(actor?.rol) && actor.id !== objetivo?.id && objetivo?.rol !== 'admin_general'),
  }
}

export function assertGestionUsuarios(actor) {
  if (!puedeGestionarUsuarios(actor)) throw new Error('No autorizado.')
  return actor
}
