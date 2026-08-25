'use server'
import { sql } from '../../lib/db'
import { requireAdmin } from '../../lib/auth'
import { crearInvitacion } from '../../lib/invitations'

// Roles que puede asignar gerencia. 'supervisor' existe en la base (gerencia
// histórica) pero no se ofrece al crear usuarios nuevos.
const ROLES = ['admin_general', 'coordinador', 'administradora', 'asistente']
// Un solo centro (usuarios.centro_id). El coordinador usa usuario_centros.
const ROLES_UN_CENTRO = ['administradora', 'asistente']

function normalizarCentros(rol, centro_id, centros) {
  if (rol === 'coordinador') {
    const ids = [...new Set((centros || []).map(Number).filter(Boolean))]
    return { cid: null, ids }
  }
  if (ROLES_UN_CENTRO.includes(rol)) return { cid: centro_id ? Number(centro_id) : null, ids: [] }
  return { cid: null, ids: [] } // admin_general / supervisor: todos los centros
}

async function guardarCentrosCoordinador(usuarioId, ids) {
  await sql`DELETE FROM usuario_centros WHERE usuario_id = ${usuarioId}`
  for (const centroId of ids) {
    await sql`
      INSERT INTO usuario_centros (usuario_id, centro_id) VALUES (${usuarioId}, ${centroId})
      ON CONFLICT DO NOTHING
    `
  }
}

export async function listUsuarios() {
  await requireAdmin()
  return await sql`
    SELECT u.id, u.nombre, u.email, u.rol, u.centro_id, c.nombre AS centro_nombre,
           (u.password_hash IS NOT NULL) AS activo,
           COALESCE(ARRAY_AGG(uc.centro_id) FILTER (WHERE uc.centro_id IS NOT NULL), '{}') AS centros,
           COALESCE(ARRAY_AGG(cc.nombre) FILTER (WHERE cc.nombre IS NOT NULL), '{}') AS centros_nombres
    FROM usuarios u
    LEFT JOIN centros c ON c.id = u.centro_id
    LEFT JOIN usuario_centros uc ON uc.usuario_id = u.id
    LEFT JOIN centros cc ON cc.id = uc.centro_id
    GROUP BY u.id, c.nombre
    ORDER BY u.nombre
  `
}

// Crea el usuario SIN contraseña y le envía (o devuelve) un enlace de invitación
// para que él mismo defina su contraseña. El enlace vence en 48 horas.
export async function createUsuario({ nombre, email, rol, centro_id, centros }) {
  await requireAdmin()
  if (!nombre?.trim() || !email?.trim()) return { error: 'Nombre y email son requeridos.' }
  if (!ROLES.includes(rol)) return { error: 'Rol inválido.' }
  const mail = email.trim().toLowerCase()
  const exists = await sql`SELECT id FROM usuarios WHERE email = ${mail}`
  if (exists[0]) return { error: 'Ya existe un usuario con ese correo.' }

  const { cid, ids } = normalizarCentros(rol, centro_id, centros)
  if (rol === 'coordinador' && ids.length === 0) {
    return { error: 'Un coordinador operativo necesita al menos un centro asignado.' }
  }
  const [user] = await sql`
    INSERT INTO usuarios (nombre, email, password_hash, rol, centro_id)
    VALUES (${nombre.trim()}, ${mail}, NULL, ${rol}, ${cid})
    RETURNING id, nombre, email
  `
  if (ids.length) await guardarCentrosCoordinador(user.id, ids)
  const inv = await crearInvitacion(user, 'invite', 48)
  return { ok: true, link: inv.link, emailSent: inv.emailSent, emailReason: inv.emailReason }
}

export async function updateUsuario(id, { nombre, rol, centro_id, centros }) {
  await requireAdmin()
  if (!ROLES.includes(rol)) return { error: 'Rol inválido.' }
  const { cid, ids } = normalizarCentros(rol, centro_id, centros)
  if (rol === 'coordinador' && ids.length === 0) {
    return { error: 'Un coordinador operativo necesita al menos un centro asignado.' }
  }
  await sql`UPDATE usuarios SET nombre = ${nombre}, rol = ${rol}, centro_id = ${cid} WHERE id = ${id}`
  // Al cambiar de rol se limpian los centros del coordinador (ids vacío).
  await guardarCentrosCoordinador(id, ids)
  return { ok: true }
}

// Reenvía (o regenera) el enlace de acceso de un usuario. Sirve tanto para
// usuarios que aún no activaron su cuenta como para restablecer la contraseña.
export async function reenviarInvitacion(id) {
  await requireAdmin()
  const [user] = await sql`SELECT id, nombre, email, password_hash FROM usuarios WHERE id = ${id}`
  if (!user) return { error: 'Usuario no encontrado.' }
  const purpose = user.password_hash ? 'reset' : 'invite'
  const inv = await crearInvitacion(user, purpose, 48)
  return { ok: true, link: inv.link, emailSent: inv.emailSent, emailReason: inv.emailReason }
}

export async function deleteUsuario(id) {
  const s = await requireAdmin()
  if (String(s.uid) === String(id)) return { error: 'No puedes eliminar tu propia cuenta.' }
  await sql`DELETE FROM usuarios WHERE id = ${id}`
  return { ok: true }
}
