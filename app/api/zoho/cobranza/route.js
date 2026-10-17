import { requireCurrentMaster } from '../../../../lib/auth'
import { sincronizarCobranza } from '../../../../lib/cobranza-sync'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Origen no autorizado' }, { status: 403 })
  try { await requireCurrentMaster() } catch { return Response.json({ error: 'No autorizado' }, { status: 403 }) }
  try { return Response.json(await sincronizarCobranza()) }
  catch (error) { return Response.json({ error: error.message }, { status: 503 }) }
}
