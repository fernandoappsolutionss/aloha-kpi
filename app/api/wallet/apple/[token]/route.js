// GET /api/wallet/apple/<token> — descarga el pase (.pkpass) de la tarjeta.
import { referidos, baseUrl } from '../../../../../lib/referidos'
import { appleConfig, crearPase } from '../../../../../lib/referidos/wallet-apple.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  const config = appleConfig()
  if (!config) return new Response('Apple Wallet no está configurado.', { status: 404 })
  const m = await referidos.tarjetaPorToken((await params).token)
  if (!m) return new Response('No encontrado', { status: 404 })
  return new Response(crearPase(m, { config, base: baseUrl() }), {
    headers: { 'content-type': 'application/vnd.apple.pkpass', 'content-disposition': 'attachment; filename="aloha.pkpass"', 'cache-control': 'private, no-store' },
  })
}
