'use server'
import { sql } from '../../lib/db'
import { requireAdmin } from '../../lib/auth'
import { crearInvitacion } from '../../lib/invitations'

export async function listUsuarios() {
  await requireAdmin()
  return await sql`
    SELECT u.id, u.nombre, u.email, u.rol, u.centro_id, c.nombre AS centro_nombre,
           (u.password_hash IS NOT NULL) AS activo
    FROM usuarios u
    LEFT JOIN centros c ON c.id = u.centro_id
    ORDER BY u.nombre
  `
}

// Crea el usuario SIN contraseña y le envía (o devuelve) un enlace de invitación
// para que él mismo defina su contraseña. El enlace vence en 48 horas.
export async function createUsuario({ nombre, email, rol, centro_id }) {
  await requireAdmin()
  if (!nombre?.trim() || !email?.trim()) return { error: 'Nombre y email son requeridos.' }
  const mail = email.trim().toLowerCase()
  const exists = await sql`SELECT id FROM usuarios WHERE email = ${mail}`
  if (exists[0]) return { error: 'Ya existe un usuario con ese correo.' }

  const cid = rol === 'admin_general' ? null : (centro_id || null)
  const [user] = await sql`
    INSERT INTO usuarios (nombre, email, password_hash, rol, centro_id)
    VALUES (${nombre.trim()}, ${mail}, NULL, ${rol}, ${cid})
    RETURNING id, nombre, email
  `
  const inv = await crearInvitacion(user, 'invite', 48)
  return { ok: true, link: inv.link, emailSent: inv.emailSent, emailReason: inv.emailReason }
}

export async function updateUsuario(id, { nombre, rol, centro_id }) {
  await requireAdmin()
  const cid = rol === 'admin_general' ? null : (centro_id || null)
  await sql`UPDATE usuarios SET nombre = ${nombre}, rol = ${rol}, centro_id = ${cid} WHERE id = ${id}`
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
