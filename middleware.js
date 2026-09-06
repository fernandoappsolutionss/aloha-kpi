import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { resolveSessionSecret } from './lib/session-secret.mjs'
import { vePanelGerencia, canAccessCentro, ROL_COACH } from './lib/current-user.mjs'

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

// EL COACH NO OPERA EL CENTRO. Tiene cuenta para una sola cosa: estudiar su
// puesto y que se lo firmen. Su trabajo del día —marcar la asistencia de su
// grupo— vive en /coach/<token>, que no pasa por la sesión ni por este
// matcher. Así que dentro de /centro/<id> solo alcanza el árbol de
// entrenamiento; el KPI, el cuadro y los grupos le quedan cerrados aquí, en el
// Edge, antes de que se pinte una sola pantalla.
//
// Esto NO sustituye las guardas del servidor: las acciones destructivas se le
// niegan además en lib/current-user.mjs (puedeCerrarMes / puedeEliminar).
function rutaDelCoach(pathname, centroId) {
  const entrenamiento = `/centro/${centroId}/entrenamiento`
  return pathname === entrenamiento || pathname.startsWith(`${entrenamiento}/`)
}

// A dónde mandar a alguien que no puede estar donde está. Un usuario sin
// centro asignado va a /perfil: redirigirlo a /centro/null daría un bucle.
// El Coach aterriza en SU entrenamiento, que es lo único que tiene: mandarlo
// al resumen del centro lo dejaría rebotando contra la guarda de abajo.
function destino(payload) {
  if (verPanel(payload)) return '/dashboard'
  const centro = centroInicial(payload)
  if (!centro) return '/perfil'
  return payload?.rol === ROL_COACH ? `/centro/${centro}/entrenamiento` : `/centro/${centro}`
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
    // El Coach entra a su centro solo por el entrenamiento.
    if (centroId && payload?.rol === ROL_COACH && !rutaDelCoach(pathname, centroId)) {
      const url = req.nextUrl.clone()
      url.pathname = `/centro/${centroId}/entrenamiento`
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

// `/entrenamiento/:path*` son los 325 mp3 del entrenamiento (public/entrenamiento/**).
// Estaban fuera del matcher, así que Next los servía como cualquier archivo
// estático: con la URL se oía la presentación o la guía de cualquier módulo SIN
// CUENTA, desde internet. Meterlos aquí los pone detrás de la misma guarda de
// sesión que el resto, sin mover 89 MB de sitio ni meterlos en el bundle.
//
// ponytail: esto exige SESIÓN, no el orden del entrenamiento. Aplicarle la
// puerta a cada mp3 pediría leer el progreso en la base, y el middleware corre
// en el Edge sin base de datos; haría falta una ruta propia por clip. El agujero
// que había —audio público en internet— queda cerrado; que alguien con cuenta
// adivine la URL del clip de un módulo que no le toca es otra cosa, y la voz de
// guía orienta el paso, no enseña el módulo.
export const config = {
  matcher: ['/dashboard/:path*', '/centro/:path*', '/entrenamiento/:path*', '/perfil', '/login'],
}
