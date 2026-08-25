import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { resolveSessionSecret } from './lib/session-secret.mjs'
import { vePanelGerencia, canAccessCentro } from './lib/current-user.mjs'

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

// Panel /dashboard: gerencia (todos los centros) y coordinador operativo
// (filtrado a los suyos). El resto aterriza en su centro.
function verPanel(payload) {
  return vePanelGerencia(payload)
}

// Primer centro al que puede entrar, para redirigir a quien no ve el panel.
function centroInicial(payload) {
  return payload?.centro_id ?? payload?.centros?.[0] ?? null
}

// A dónde mandar a alguien que no puede estar donde está. Un usuario sin
// centro asignado va a /perfil: redirigirlo a /centro/null daría un bucle.
function destino(payload) {
  if (verPanel(payload)) return '/dashboard'
  const centro = centroInicial(payload)
  return centro ? `/centro/${centro}` : '/perfil'
}

export async function middleware(req) {
  const { pathname } = req.nextUrl
  const payload = await getPayload(req)

  // /login: si ya hay sesión, redirige al panel correspondiente.
  if (pathname === '/login') {
    if (payload) {
      const url = req.nextUrl.clone()
      url.pathname = destino(payload)
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

  // Área de administración: gerencia y coordinador operativo.
  if (pathname.startsWith('/dashboard') && !verPanel(payload)) {
    const url = req.nextUrl.clone()
    url.pathname = destino(payload)
    return NextResponse.redirect(url)
  }

  // /centro/<id>: el id de la URL tiene que estar en el alcance del usuario.
  // Las actions ya lo validan contra la base; esto evita además que se pinte
  // la pantalla de un centro ajeno.
  if (pathname.startsWith('/centro/')) {
    const centroId = pathname.split('/')[2]
    if (centroId && !canAccessCentro(payload, centroId)) {
      const url = req.nextUrl.clone()
      url.pathname = destino(payload)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/centro/:path*', '/perfil', '/login'],
}
