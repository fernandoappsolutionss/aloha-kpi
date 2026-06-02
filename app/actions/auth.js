'use server'
import { sql } from '../../lib/db'
import {
  createSession, destroySession, verifyPassword, hashPassword, requireSession,
} from '../../lib/auth'

export async function login(email, password) {
  if (!email || !password) return { error: 'Correo y contraseña son requeridos.' }
  const mail = String(email).trim().toLowerCase()
  const rows = await sql`
    SELECT id, nombre, email, rol, centro_id, password_hash
    FROM usuarios WHERE email = ${mail}
  `
  const user = rows[0]
  if (!user) return { error: 'Correo o contraseña incorrectos.' }
  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return { error: 'Correo o contraseña incorrectos.' }

  await createSession(user)
  return { ok: true, rol: user.rol, centro_id: user.centro_id, nombre: user.nombre, email: user.email }
}

export async function logout() {
  destroySession()
  return { ok: true }
}

export async function changePassword(nueva) {
  const s = await requireSession()
  if (!nueva || String(nueva).length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  }
  const hash = await hashPassword(String(nueva))
  await sql`UPDATE usuarios SET password_hash = ${hash} WHERE id = ${s.uid}`
  return { ok: true }
}
