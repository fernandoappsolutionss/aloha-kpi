import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { resolveSessionSecret } from './lib/session-secret.mjs'

// El middleware corre en el Edge Runtime: solo verifica el JWT de la cookie
// (no toca la base de datos). Esto protege las rutas en el servidor, de modo
// que manipular localStorage en el navegador ya no da acceso.

function getSecret() {
  return resolveSessionSecret(process.env)
}

async function getPayload(req) {
  const token = req.cookies.get('aloha_session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload
  } catch {
    return null
  }
}

function isAdmin(rol) {
  return rol === 'admin_general' || rol === 'supervisor'
}

export async function middleware(req) {
  const { pathname } = req.nextUrl
  const payload = await getPayload(req)

  // /login: si ya hay sesión, redirige al panel correspondiente.
  if (pathname === '/login') {
    if (payload) {
      const url = req.nextUrl.clone()
      url.pathname = isAdmin(payload.rol) ? '/dashboard' : `/centro/${payload.centro_id}`
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Resto de rutas del matcher: requieren sesión.
  if (!payload) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Área de administración: solo admin/supervisor.
  if (pathname.startsWith('/dashboard') && !isAdmin(payload.rol)) {
    const url = req.nextUrl.clone()
    url.pathname = `/centro/${payload.centro_id}`
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/centro/:path*', '/perfil', '/login'],
}
