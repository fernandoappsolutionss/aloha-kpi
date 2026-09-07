import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { neon, neonConfig } from '@neondatabase/serverless'
import { resolveSessionSecret } from './lib/session-secret.mjs'
import { resolveNeonE2EConfig } from './lib/neon-e2e-config.mjs'
import {
  ROL_ADMIN_MASTER,
  ROL_COACH,
  canAccessCentro,
  esSoloLectura,
  isMaster,
  puedeVerOficio,
  puedeVerUsuarios,
  usuarioBloqueado,
  vePanelGerencia,
} from './lib/current-user.mjs'

const COOKIE = 'aloha_session'

const e2eTransport = resolveNeonE2EConfig(process.env)
if (e2eTransport) {
  neonConfig.fetchEndpoint = e2eTransport.fetchEndpoint
}
const fetchOptions = e2eTransport?.fetchOptions || { cache: 'no-store' }

let edgeSql = null
function sqlEdge() {
  if (edgeSql) return edgeSql
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.')
  edgeSql = neon(process.env.DATABASE_URL, { fetchOptions })
  return edgeSql
}

function getSecret() {
  return resolveSessionSecret(process.env)
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map(Number).filter(Number.isInteger)
  if (typeof value !== 'string') return []
  return value
    .replace(/[{}]/g, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item))
    .filter(Number.isInteger)
}

async function loadUser(uid) {
  if (!Number.isInteger(Number(uid))) return null
  const rows = await sqlEdge()`
    SELECT u.id, u.nombre, u.email, u.rol, u.centro_id, u.password_hash,
           u.blocked_until,
           (u.blocked_until IS NOT NULL AND u.blocked_until > CURRENT_TIMESTAMP) AS bloqueado,
           COALESCE(ARRAY_AGG(uc.centro_id) FILTER (WHERE uc.centro_id IS NOT NULL), '{}') AS centros
    FROM usuarios u
    LEFT JOIN usuario_centros uc ON uc.usuario_id = u.id
    WHERE u.id = ${Number(uid)}
    GROUP BY u.id
  `
  const user = rows[0]
  if (!user?.password_hash || usuarioBloqueado(user)) return null
  if (user.rol === ROL_ADMIN_MASTER && !isMaster(user)) return null
  return { ...user, uid: Number(user.id), centros: normalizeArray(user.centros) }
}

async function getCurrentUser(req) {
  const token = req.cookies.get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return await loadUser(payload.uid)
  } catch {
    return null
  }
}

// Panel /dashboard: Master, lectura global y coordinador operativo. El resto
// aterriza en su centro.
function verPanel(user) {
  return vePanelGerencia(user)
}

// Primer centro al que puede entrar, para redirigir a quien no ve el panel.
function centroInicial(user) {
  return user?.centro_id ?? user?.centros?.[0] ?? null
}

// EL COACH NO OPERA EL CENTRO. Tiene cuenta para dos cosas: estudiar su puesto
// (y que se lo firmen) y ver LO SUYO —sus grupos, sus niños, su itinerario— en
// /centro/<id>/mis-grupos, que es solo lectura y sale de coaches.usuario_id.
// Marcar la asistencia sigue viviendo en /coach/<token>, que no pasa por la
// sesión ni por este matcher; mis-grupos deja el link a un clic.
function rutaDelCoach(pathname, centroId) {
  const entrenamiento = `/centro/${centroId}/entrenamiento`
  if (pathname === `/centro/${centroId}/mis-grupos`) return true
  return pathname === entrenamiento || pathname.startsWith(`${entrenamiento}/`)
}

function destino(user) {
  if (verPanel(user)) return '/dashboard'
  const centro = centroInicial(user)
  if (!centro) return '/perfil'
  return user?.rol === ROL_COACH ? `/centro/${centro}/mis-grupos` : `/centro/${centro}`
}

function redirectTo(req, pathname) {
  const url = req.nextUrl.clone()
  url.pathname = pathname
  return NextResponse.redirect(url)
}

function deny(req, user, status = 403) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'No autorizado' }, { status })
  }
  return redirectTo(req, user ? destino(user) : '/login')
}

function nextPrivate() {
  const response = NextResponse.next()
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

function rutaAudioOficio(pathname) {
  return pathname.startsWith('/entrenamiento/oficio/')
    || pathname.startsWith('/entrenamiento/guia/of-')
}

function rutaOficioCentro(pathname, centroId) {
  const base = `/centro/${centroId}/entrenamiento`
  return pathname === `${base}/oficio`
    || pathname.startsWith(`${base}/oficio/`)
    || pathname === `${base}/firmas`
    || pathname.startsWith(`${base}/firmas/`)
}

function rutaDashboardMaster(pathname) {
  return pathname === '/dashboard/entrenamiento'
    || pathname.startsWith('/dashboard/entrenamiento/')
    || pathname === '/dashboard/zoho'
    || pathname.startsWith('/dashboard/zoho/')
}

function rutaDashboardLecturaGlobal(pathname) {
  return pathname === '/dashboard/metas'
    || pathname.startsWith('/dashboard/metas/')
}

function rutaDashboardUsuarios(pathname) {
  return pathname === '/dashboard/usuarios'
    || pathname.startsWith('/dashboard/usuarios/')
}

export async function middleware(req) {
  let pathname
  try { pathname = decodeURIComponent(req.nextUrl.pathname) }
  catch { return NextResponse.json({ error: 'Ruta inválida' }, { status: 400 }) }
  const user = await getCurrentUser(req)

  if (pathname === '/login') {
    if (!user) return NextResponse.next()
    return redirectTo(req, destino(user))
  }

  if (!user) return deny(req, null, 401)

  if (rutaAudioOficio(pathname) && !puedeVerOficio(user)) {
    return deny(req, user)
  }

  if (pathname.startsWith('/entrenamiento/')) {
    return nextPrivate()
  }

  if (pathname.startsWith('/dashboard')) {
    if (!verPanel(user)) return deny(req, user)
    if (rutaDashboardUsuarios(pathname) && !puedeVerUsuarios(user)) return deny(req, user)
    if (rutaDashboardMaster(pathname) && !isMaster(user)) return deny(req, user)
    if (rutaDashboardLecturaGlobal(pathname) && !(isMaster(user) || esSoloLectura(user))) return deny(req, user)
  }

  if (pathname.startsWith('/centro/')) {
    const centroId = pathname.split('/')[2]
    if (centroId && !canAccessCentro(user, centroId)) return deny(req, user)
    if (centroId && user?.rol === ROL_COACH && !rutaDelCoach(pathname, centroId)) {
      return redirectTo(req, `/centro/${centroId}/mis-grupos`)
    }
    if (centroId && rutaOficioCentro(pathname, centroId) && !puedeVerOficio(user)) {
      return deny(req, user)
    }
  }

  if (pathname.startsWith('/api/centro/')) {
    const centroId = pathname.split('/')[3]
    if (centroId && !canAccessCentro(user, centroId)) return deny(req, user)
  }

  if (rutaAudioOficio(pathname) || pathname.includes('/entrenamiento/oficio')) {
    return nextPrivate()
  }
  return NextResponse.next()
}

// `/entrenamiento/:path*` son los mp3 del entrenamiento (public/entrenamiento/**).
// El matcher los pone detrás de sesión viva y, para oficio/guía-of, detrás de
// la misma regla que oculta el catálogo a admin_general/supervisor.
export const config = {
  matcher: ['/dashboard/:path*', '/centro/:path*', '/entrenamiento/:path*', '/perfil', '/login', '/api/centro/:path*'],
}
