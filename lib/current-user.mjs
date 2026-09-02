// ── Fuente de verdad de permisos ──────────────────────────────────────────
// Gerencia (admin_general/supervisor): todos los centros + configuración global.
// Coordinador operativo: manda como administrador SOLO en los centros que le
//   asignaron (tabla usuario_centros). No toca configuración global.
// Administradora: manda en su único centro (usuarios.centro_id).
// Asistente: opera su centro, pero no cierra/reabre el mes ni elimina registros.
export const ADMIN_ROLES = new Set(['admin_general', 'supervisor'])
export const ROL_COORDINADOR = 'coordinador'
export const ROL_ASISTENTE = 'asistente'

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
  return Boolean(user) && user.rol !== ROL_ASISTENTE
}

export function puedeEliminar(user) {
  return Boolean(user) && user.rol !== ROL_ASISTENTE
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
  if (!puedeCerrarMes(user)) throw new Error('El asistente no puede cerrar ni reabrir el mes.')
  return user
}

export function assertPuedeEliminar(user) {
  if (!puedeEliminar(user)) throw new Error('El asistente no puede eliminar registros.')
  return user
}

export const ROLES_OPERATIVOS = Object.freeze(['administradora', 'asistente'])
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
  const editar = puedeGestionarUsuario(actor, objetivo)
  const active = Boolean(objetivo?.active ?? objetivo?.activo ?? objetivo?.password_hash)
  return {
    editar,
    reenviarInvitacion: editar && !active,
    enviarRestablecimiento: editar && active,
    eliminar: Boolean(editar && esGerencia(actor?.rol) && actor.id !== objetivo?.id && objetivo?.rol !== 'admin_general'),
  }
}

export function assertGestionUsuarios(actor) {
  if (!puedeGestionarUsuarios(actor)) throw new Error('No autorizado.')
  return actor
}
