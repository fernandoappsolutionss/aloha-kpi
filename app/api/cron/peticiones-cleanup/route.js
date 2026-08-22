import { rechazoCron } from '../../../../lib/cron-auth.mjs'
import { peticionCleanupService } from '../../../../lib/peticion-cleanup-runtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request) {
  const rechazo = rechazoCron(request, process.env.CRON_SECRET)
  if (rechazo) return rechazo
  try {
    return Response.json({ ok: true, ...(await peticionCleanupService.run({ budgetMs: 260000 })) })
  } catch (error) {
    console.error('[peticiones-cleanup]', error)
    return Response.json({ error: 'La limpieza de peticiones falló.' }, { status: 500 })
  }
}
