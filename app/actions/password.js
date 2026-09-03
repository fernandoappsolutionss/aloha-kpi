'use server'
import { after } from 'next/server'
import { sql } from '../../lib/db'
import { hashPassword, createSession } from '../../lib/auth'
import { accessTokensRepository } from '../../lib/access-tokens-repository'
import { createAccessTokenService } from '../../lib/access-tokens.mjs'
import { deliverAccess } from '../../lib/invitations'
import { createPublicPasswordReset } from '../../lib/usuarios-service.mjs'

const accessTokens = createAccessTokenService({ repo: accessTokensRepository })
const requestReset = createPublicPasswordReset({
  repository: accessTokensRepository,
  accessTokens,
  deliverAccess,
  schedule: after,
})

// Solicitud pública de restablecimiento ("¿Olvidaste tu contraseña?").
// Siempre responde ok (no revela si el correo existe). No devuelve el enlace.
export async function requestPasswordReset(email) {
  return requestReset(email)
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
  try {
    const passwordHash = await hashPassword(String(nueva))
    const user = await accessTokens.consume({ token, passwordHash })
    await createSession(user)
    return { ok: true, rol: user.rol, centro_id: user.centro_id, nombre: user.nombre, email: user.email }
  } catch (error) {
    const safe = ['Enlace inválido.', 'Este enlace ya fue usado.', 'Este enlace venció. Pide uno nuevo.']
    return { error: safe.includes(error?.message) ? error.message : 'No pudimos actualizar la contraseña.' }
  }
}
