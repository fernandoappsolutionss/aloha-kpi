import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { sql } from './db'
import { resolveSessionSecret } from './session-secret.mjs'
import {
  loadCurrentUser, assertCentroAccess, assertAdmin, assertPanelGerencia,
  assertPuedeCerrarMes, assertPuedeEliminar, canAccessCentro, centrosDe,
  esGerencia, vePanelGerencia,
} from './current-user.mjs'

const COOKIE = 'aloha_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 días

function getSecret() {
  return resolveSessionSecret(process.env)
}

export function hashPassword(pw) {
  return bcrypt.hash(pw, 10)
}
export function verifyPassword(pw, hash) {
  if (!hash) return Promise.resolve(false)
  return bcrypt.compare(pw, hash)
}

// Gerencia: manda en todos los centros y en la configuración global.
export function isAdminRole(rol) {
  return esGerencia(rol)
}

export async function createSession(user) {
  // Un coordinador sin lista de centros en la fila: se leen aquí para que el
  // middleware (Edge, sin base de datos) sepa a qué centros entra.
  const centros = user.centros ?? (user.rol === 'coordinador'
    ? (await sql`SELECT centro_id FROM usuario_centros WHERE usuario_id = ${user.id}`).map((r) => Number(r.centro_id))
    : [])
  const token = await new SignJWT({
    uid: user.id,
    rol: user.rol,
    centro_id: user.centro_id ?? null,
    // Centros del coordinador operativo: el middleware corre en el Edge y no
    // puede consultar la base, así que viajan en el token.
    centros,
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

// Gerencia entra a cualquier centro; el coordinador a los suyos; el resto
// solo al propio.
export async function requireCentroAccess(centroId) {
  const s = await requireSession()
  if (!canAccessCentro(s, centroId)) throw new Error('No autorizado para este centro')
  return s
}

// El panel /dashboard: gerencia (todos los centros) o coordinador (los suyos).
// Devuelve `centroIds`: null = sin límite, array = alcance del coordinador.
export async function requireAlcanceGerencia() {
  const s = await requireSession()
  assertPanelGerencia(s)
  return { sesion: s, centroIds: centrosDe(s) }
}

export async function requireCurrentUser() {
  return await loadCurrentUser(await requireSession(), sql)
}

export async function requireCurrentCentroAccess(centroId) {
  return assertCentroAccess(await requireCurrentUser(), centroId)
}

export async function requireCurrentAdmin() {
  return assertAdmin(await requireCurrentUser())
}

// Acciones vedadas al asistente. Releen el usuario en la base (fail-closed):
// un cambio de rol surte efecto sin esperar a que expire la cookie.
export async function requireCurrentPuedeCerrarMes(centroId) {
  const user = await requireCurrentUser()
  assertCentroAccess(user, centroId)
  return assertPuedeCerrarMes(user)
}

export async function requireCurrentPuedeEliminar(centroId) {
  const user = await requireCurrentUser()
  assertCentroAccess(user, centroId)
  return assertPuedeEliminar(user)
}

export { vePanelGerencia, centrosDe }
