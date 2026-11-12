// GET /r/<código> — destino del QR de la tarjeta. Lleva a la landing de clase
// de prueba del país con el código de referido en su propio parámetro.
import { referidos } from '../../../lib/referidos'
import { CODIGO_RE, CUENTA_PA, LANDING } from '../../../lib/referidos/reglas.mjs'

export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  const codigo = String((await params).codigo || '').toLowerCase()
  const cuenta = CODIGO_RE.test(codigo) ? await referidos.cuentaPorCodigo(codigo).catch(() => null) : null
  const destino = new URL(LANDING[cuenta || CUENTA_PA])
  if (cuenta) {
    destino.searchParams.set('referido', codigo)
    destino.searchParams.set('utm_source', 'referido')
    destino.searchParams.set('utm_medium', 'tarjeta')
    destino.searchParams.set('utm_campaign', codigo)
  }
  return new Response(null, { status: 302, headers: { location: destino.toString(), 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' } })
}
