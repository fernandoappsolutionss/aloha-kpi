import { timingSafeEqual } from 'node:crypto'
import { cronAutorizado } from '../../../../lib/cron-auth.mjs'
import { zohoRefreshToken } from '../../../../lib/zoho-conexion'
import { syncCerebroSales } from '../../../../lib/cerebro-sales.mjs'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

function serviceAuthorized(request) {
  const expected = process.env.CRM_SERVICE_TOKEN
  const token = request.headers.get('x-service-token')
  return Boolean(expected && token && Buffer.byteLength(token) === Buffer.byteLength(expected)
    && timingSafeEqual(Buffer.from(token), Buffer.from(expected)))
}

async function run() {
  try {
    const token = await zohoRefreshToken()
    if (!token) return Response.json({ ok: false, error: 'Zoho sin conectar' }, { status: 503 })
    const result = await syncCerebroSales(token)
    return Response.json(result, { status: result.ok ? 200 : 503 })
  } catch {
    return Response.json({ ok: false, error: 'No se completó la lectura contable' }, { status: 503 })
  }
}

export async function GET(request) {
  if (!cronAutorizado(request, process.env.CRON_SECRET)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  return run()
}

// Operational replay with the existing server-to-server identity; no browser access.
export async function POST(request) {
  if (!serviceAuthorized(request)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  return run()
}
