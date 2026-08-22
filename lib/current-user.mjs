export const ADMIN_ROLES = new Set(['admin_general', 'supervisor'])

export async function loadCurrentUser(session, query) {
  if (!session?.uid) throw new Error('No autenticado')
  const rows = await query`
    SELECT id, nombre, email, rol, centro_id, password_hash
    FROM usuarios
    WHERE id = ${Number(session.uid)}
  `
  if (!rows[0]?.password_hash) throw new Error('No autenticado')
  const { password_hash: _passwordHash, ...user } = rows[0]
  return user
}

export function assertCentroAccess(user, centroId) {
  if (!user) throw new Error('No autenticado')
  if (!ADMIN_ROLES.has(user.rol) && String(user.centro_id) !== String(centroId)) {
    throw new Error('No autorizado para este centro')
  }
  return user
}

export function assertAdmin(user) {
  if (!user || !ADMIN_ROLES.has(user.rol)) throw new Error('No autorizado')
  return user
}

export function canAccessCentro(user, centroId) {
  return Boolean(user && (ADMIN_ROLES.has(user.rol) || String(user.centro_id) === String(centroId)))
}
