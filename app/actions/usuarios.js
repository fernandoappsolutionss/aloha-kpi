'use server'
import { sql } from '../../lib/db'
import { requireAdmin, hashPassword } from '../../lib/auth'

export async function listUsuarios() {
  await requireAdmin()
  return await sql`
    SELECT u.id, u.nombre, u.email, u.rol, u.centro_id, c.nombre AS centro_nombre
    FROM usuarios u
    LEFT JOIN centros c ON c.id = u.centro_id
    ORDER BY u.nombre
  `
}

export async function createUsuario({ nombre, email, password, rol, centro_id }) {
  await requireAdmin()
  if (!nombre?.trim() || !email?.trim()) return { error: 'Nombre y email son requeridos.' }
  if (!password?.trim()) return { error: 'La contraseña es requerida.' }
  const mail = email.trim().toLowerCase()
  const exists = await sql`SELECT id FROM usuarios WHERE email = ${mail}`
  if (exists[0]) return { error: 'Ya existe un usuario con ese correo.' }

  const hash = await hashPassword(password)
  const cid = rol === 'admin_general' ? null : (centro_id || null)
  await sql`
    INSERT INTO usuarios (nombre, email, password_hash, rol, centro_id)
    VALUES (${nombre.trim()}, ${mail}, ${hash}, ${rol}, ${cid})
  `
  return { ok: true }
}

export async function updateUsuario(id, { nombre, rol, centro_id }) {
  await requireAdmin()
  const cid = rol === 'admin_general' ? null : (centro_id || null)
  await sql`UPDATE usuarios SET nombre = ${nombre}, rol = ${rol}, centro_id = ${cid} WHERE id = ${id}`
  return { ok: true }
}

export async function deleteUsuario(id) {
  const s = await requireAdmin()
  if (String(s.uid) === String(id)) return { error: 'No puedes eliminar tu propia cuenta.' }
  await sql`DELETE FROM usuarios WHERE id = ${id}`
  return { ok: true }
}
