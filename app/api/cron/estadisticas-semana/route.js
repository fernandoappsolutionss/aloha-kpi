import { rechazoCron } from '../../../../lib/cron-auth.mjs'
import { recalcularSemanas } from '../../../../lib/estadisticas-semana/servicio.js'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(request) {
  const rechazo = rechazoCron(request, process.env.CRON_SECRET)
  if (rechazo) return rechazo
  try {
    return Response.json({ ok: true, ...await recalcularSemanas({ now: new Date() }) })
  } catch (error) {
    console.error('[estadisticas-semana] cron:', error)
    return Response.json({ ok: false, error: 'No se pudo recalcular la semana.' }, { status: 500 })
  }
}
