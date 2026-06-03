import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

const COOKIE = 'aloha_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 días

function getSecret() {
  const s = process.env.SESSION_SECRET
  if (!s) {
    // En producción esto debe estar configurado; en dev avisamos.
    console.warn('[auth] Falta SESSION_SECRET. Usando un valor inseguro de desarrollo.')
    return new TextEncoder().encode('dev-insecure-secret-change-me-please')
  }
  return new TextEncoder().encode(s)
}

export function hashPassword(pw) {
  return bcrypt.hash(pw, 10)
}
export function verifyPassword(pw, hash) {
  if (!hash) return Promise.resolve(false)
  return bcrypt.compare(pw, hash)
}

export function isAdminRole(rol) {
  return rol === 'admin_general' || rol === 'supervisor'
}

export async function createSession(user) {
  const token = await new SignJWT({
    uid: user.id,
    rol: user.rol,
    centro_id: user.centro_id ?? null,
    nombre: user.nombre ?? '',
    email: user.email ?? '',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())

  const store = await cookies()
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export async function destroySession() {
  const store = await cookies()
  store.delete(COOKIE)
}

export async function getSession() {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload
  } catch {
    return null
  }
}

export async function requireSession() {
  const s = await getSession()
  if (!s) throw new Error('No autenticado')
  return s
}

export async function requireAdmin() {
  const s = await requireSession()
  if (!isAdminRole(s.rol)) throw new Error('No autorizado')
  return s
}

// Admin puede ver cualquier centro; una administradora solo el suyo.
export async function requireCentroAccess(centroId) {
  const s = await requireSession()
  if (!isAdminRole(s.rol) && String(s.centro_id) !== String(centroId)) {
    throw new Error('No autorizado para este centro')
  }
  return s
}
