// GET /api/zoho/connect — arranca el login OAuth con Zoho. Solo el Master
// del KPI puede iniciarlo. El callback valida por separado la cuenta externa
// de Zoho Books (latinchinapanama@gmail.com).
import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { requireCurrentMaster } from '../../../../lib/auth'
import { ZOHO_ACCOUNTS } from '../../../../lib/zoho-cobranza.mjs'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try { await requireCurrentMaster() } catch {
    return Response.redirect(new URL('/login', request.url))
  }
  if (!process.env.ZOHO_CLIENT_ID) {
    return Response.redirect(new URL('/dashboard/zoho?error=config', request.url))
  }

  const state = crypto.randomBytes(16).toString('hex')
  const store = await cookies()
  store.set('zoho_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })

  const auth = new URL(`${ZOHO_ACCOUNTS}/oauth/v2/auth`)
  auth.searchParams.set('response_type', 'code')
  auth.searchParams.set('client_id', process.env.ZOHO_CLIENT_ID)
  // invoices.READ = leer facturas; profile.READ = saber QUÉ correo se logueó.
  auth.searchParams.set('scope', 'ZohoBooks.invoices.READ,AaaServer.profile.READ')
  auth.searchParams.set('redirect_uri', new URL('/api/zoho/callback', request.url).toString())
  auth.searchParams.set('access_type', 'offline') // pide refresh token
  auth.searchParams.set('prompt', 'consent')      // lo pide SIEMPRE (si no, reconectar no lo devuelve)
  auth.searchParams.set('state', state)
  return Response.redirect(auth.toString())
}
