'use server'
import { sql } from '../../lib/db'
import { hashPassword, createSession } from '../../lib/auth'
import { crearInvitacion } from '../../lib/invitations'

// Solicitud pública de restablecimiento ("¿Olvidaste tu contraseña?").
// Siempre responde ok (no revela si el correo existe). No devuelve el enlace.
export async function requestPasswordReset(email) {
  const mail = (email || '').trim().toLowerCase()
  if (!mail) return { ok: true }
  const [user] = await sql`SELECT id, email, nombre FROM usuarios WHERE email = ${mail}`
  if (user) {
    try { await crearInvitacion(user, 'reset', 2) } catch { /* no romper */ }
  }
  return { ok: true }
}

// Info de un token (para la página de crear/restablecer contraseña).
export async function getTokenInfo(token) {
  if (!token) return { valid: false }
  const [row] = await sql`
    SELECT t.purpose, t.expires_at, t.used_at, u.nombre, u.email
    FROM password_tokens t JOIN usuarios u ON u.id = t.user_id
    WHERE t.token = ${token}
  `
  if (!row) return { valid: false }
  if (row.used_at) return { valid: false, reason: 'usado' }
  if (new Date(row.expires_at) < new Date()) return { valid: false, reason: 'vencido' }
  return { valid: true, nombre: row.nombre, email: row.email, purpose: row.purpose }
}

// Fija la contraseña usando un token válido, marca el token usado e inicia sesión.
export async function setPassword(token, nueva) {
  if (!token) return { error: 'Enlace inválido.' }
  if (!nueva || String(nueva).length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  const [row] = await sql`
    SELECT t.expires_at, t.used_at, u.id, u.rol, u.centro_id, u.nombre, u.email
    FROM password_tokens t JOIN usuarios u ON u.id = t.user_id
    WHERE t.token = ${token}
  `
  if (!row) return { error: 'Enlace inválido.' }
  if (row.used_at) return { error: 'Este enlace ya fue usado.' }
  if (new Date(row.expires_at) < new Date()) return { error: 'Este enlace venció. Pide uno nuevo.' }

  const hash = await hashPassword(String(nueva))
  await sql`UPDATE usuarios SET password_hash = ${hash} WHERE id = ${row.id}`
  await sql`UPDATE password_tokens SET used_at = now() WHERE token = ${token}`
  await createSession(row)
  return { ok: true, rol: row.rol, centro_id: row.centro_id, nombre: row.nombre, email: row.email }
}
