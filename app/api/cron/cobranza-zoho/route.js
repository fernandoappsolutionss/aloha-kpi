import { rechazoCron } from '../../../../lib/cron-auth.mjs'
import { sincronizarCobranza } from '../../../../lib/cobranza-sync'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(request) {
  const rechazo = rechazoCron(request, process.env.CRON_SECRET)
  if (rechazo) return rechazo
  try {
    const r = await sincronizarCobranza()
    return Response.json({ ok: r.guardado, fecha: r.fecha, porCentro: r.porCentro,
      revisados: r.revisados, pendientes: r.pendientes.length }, { status: r.guardado ? 200 : 422 })
  } catch (error) {
    console.error('[cobranza-zoho]', error.message)
    return Response.json({ ok: false, error: 'No se completó la carga de Zoho. Se conserva el último conteo.' }, { status: 503 })
  }
}
