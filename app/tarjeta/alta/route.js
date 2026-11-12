// GET /tarjeta/alta?e=<evento>&r=<inscripción> — enlace de la confirmación del
// CRM. De un solo uso; nunca revela la tarjeta de un miembro que ya existía.
import { referidos } from '../../../lib/referidos'

export const dynamic = 'force-dynamic'
const UUID = /^[0-9a-f-]{36}$/i

export async function GET(request) {
  const url = new URL(request.url)
  const eventId = url.searchParams.get('e') || '', registrationId = url.searchParams.get('r') || ''
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
  let destino = '/tarjeta/pide-tu-enlace'
  if (UUID.test(eventId) && UUID.test(registrationId)) {
    const r = await referidos.consumirAlta({ eventId, registrationId, ip }).catch((error) => { console.error('[tarjeta/alta]', error); return {} })
    if (r.token) destino = `/tarjeta/${r.token}`
  }
  return new Response(null, { status: 302, headers: { location: destino, 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' } })
}
