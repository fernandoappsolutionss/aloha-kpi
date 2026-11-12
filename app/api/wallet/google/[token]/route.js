// GET /api/wallet/google/<token> — asegura el objeto en Google Wallet con el
// saldo vigente y redirige al enlace de guardado.
import { referidos, baseUrl } from '../../../../../lib/referidos'
import { enlaceGuardar, googleConfig } from '../../../../../lib/referidos/wallet-google.mjs'
import { enviarWallet } from '../../../../../lib/referidos/wallet'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  const config = googleConfig()
  if (!config) return new Response('Google Wallet no está configurado.', { status: 404 })
  const tarjeta = await referidos.tarjetaPorToken((await params).token)
  if (!tarjeta) return new Response('No encontrado', { status: 404 })
  // Espera el candado de envío: no se redirige suponiendo que otro ya creó el objeto.
  const r = await enviarWallet(tarjeta.id, { esperar: true, crearGoogle: true }).catch((error) => { console.error('[wallet google]', error); return {} })
  if (!r.ok) return new Response('No se pudo preparar la tarjeta. Intenta de nuevo en un momento.', { status: 503, headers: { 'retry-after': '5' } })
  return new Response(null, { status: 302, headers: { location: await enlaceGuardar(tarjeta, { config, base: baseUrl() }), 'cache-control': 'private, no-store' } })
}
