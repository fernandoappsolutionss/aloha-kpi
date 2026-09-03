// GET /api/zoho/callback — vuelta del login de Zoho. Valida el state (CSRF),
// cambia el code por tokens, verifica que quien se logueó sea el correo
// autorizado (fperez@teamsolutionss.com), hace un smoke contra Zoho Books y
// guarda el refresh token en zoho_conexion. Todos los errores redirigen a
// /dashboard/zoho?error=… sin filtrar tokens.
import { cookies } from 'next/headers'
import { getSession, isAdminRole } from '../../../../lib/auth'
import { guardarZohoConexion } from '../../../../lib/zoho-conexion'
import { ZOHO_ACCOUNTS, ORGS_ZOHO, emailAutorizado } from '../../../../lib/zoho-cobranza.mjs'

export const dynamic = 'force-dynamic'

const volver = (request, q) => Response.redirect(new URL(`/dashboard/zoho?${q}`, request.url))

export async function GET(request) {
  const sesion = await getSession()
  if (!sesion || !isAdminRole(sesion.rol)) {
    return Response.redirect(new URL('/login', request.url))
  }

  const url = new URL(request.url)
  if (url.searchParams.get('error')) return volver(request, 'error=zoho')
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const store = await cookies()
  const stateCookie = store.get('zoho_oauth_state')?.value
  store.delete('zoho_oauth_state')
  if (!code || !state || state !== stateCookie) return volver(request, 'error=state')

  // code → tokens
  const params = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: process.env.ZOHO_CLIENT_ID || '',
    client_secret: process.env.ZOHO_CLIENT_SECRET || '',
    redirect_uri: new URL('/api/zoho/callback', request.url).toString(),
  })
  const tokenRes = await fetch(`${ZOHO_ACCOUNTS}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  const tokens = await tokenRes.json()
  if (!tokens.access_token) return volver(request, 'error=token')
  if (!tokens.refresh_token) return volver(request, 'error=refresh')

  // ¿Quién se logueó? Solo el correo autorizado puede dejar la conexión.
  const infoRes = await fetch(`${ZOHO_ACCOUNTS}/oauth/user/info`, {
    headers: { Authorization: `Zoho-oauthtoken ${tokens.access_token}` },
  })
  const info = await infoRes.json().catch(() => ({}))
  const email = info.Email || info.email || ''
  if (!emailAutorizado(email)) {
    return volver(request, `error=usuario&email=${encodeURIComponent(email)}`)
  }

  // Smoke: ¿esta cuenta ve las organizaciones? Basta 1 factura de la primera.
  const org = ORGS_ZOHO[0]
  const smokeRes = await fetch(
    `https://www.zohoapis.com/books/v3/invoices?organization_id=${org.orgId}&per_page=1`,
    { headers: { Authorization: `Zoho-oauthtoken ${tokens.access_token}` } }
  )
  const smoke = await smokeRes.json().catch(() => ({}))
  if (smoke.code !== 0) return volver(request, 'error=books')

  await guardarZohoConexion({ refreshToken: tokens.refresh_token, email, por: sesion.email || sesion.nombre })
  return volver(request, 'ok=1')
}
