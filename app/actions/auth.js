'use server'
import { sql } from '../../lib/db'
import {
  createSession, destroySession, verifyPassword, hashPassword, requireSession,
} from '../../lib/auth'
import { assertUsuarioVigente } from '../../lib/current-user.mjs'
import { accessTokensRepository } from '../../lib/access-tokens-repository'
import { createAccessTokenService } from '../../lib/access-tokens.mjs'

const accessTokens = createAccessTokenService({ repo: accessTokensRepository })

export async function login(email, password) {
  if (!email || !password) return { error: 'Correo y contraseña son requeridos.' }
  const mail = String(email).trim().toLowerCase()
  const rows = await sql`
    SELECT id, nombre, email, rol, centro_id, password_hash, blocked_until,
           (blocked_until IS NOT NULL AND blocked_until > CURRENT_TIMESTAMP) AS bloqueado
    FROM usuarios WHERE email = ${mail}
  `
  const user = rows[0]
  if (!user) return { error: 'Correo o contraseña incorrectos.' }
  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return { error: 'Correo o contraseña incorrectos.' }
  try {
    assertUsuarioVigente(user)
  } catch (error) {
    return { error: error?.message === 'Cuenta bloqueada temporalmente.' ? error.message : 'No autorizado' }
  }

  await createSession(user)
  return { ok: true, rol: user.rol, centro_id: user.centro_id, nombre: user.nombre, email: user.email }
}

export async function logout() {
  await destroySession()
  return { ok: true }
}

export async function changePassword(nueva) {
  const session = await requireSession()
  if (!nueva || String(nueva).length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  }
  const passwordHash = await hashPassword(String(nueva))
  await accessTokens.changePassword({ userId: Number(session.uid), passwordHash })
  return { ok: true }
}
