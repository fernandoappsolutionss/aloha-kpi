// GET /api/cron/referidos — diario (vercel.json: 30 9 * * * UTC ≈ 4:30am Panamá).
// Por cada cuenta ALOHA: (a) importa del CRM los eventos de los últimos 45 días
// y futuros, (b) acredita por importe neto y cierra atribuciones SOLO si la
// importación de esta corrida quedó completa y la cuenta tiene cobertura
// histórica, (c) reintenta los envíos de Wallet pendientes.
import { rechazoCron } from '../../../../lib/cron-auth.mjs'
import { referidos, enviarWalletDe } from '../../../../lib/referidos'
import { CUENTAS } from '../../../../lib/referidos/reglas.mjs'
import { sql } from '../../../../lib/db'
import { procesarBajasGoogle } from '../../../../lib/referidos/wallet'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request) {
  const rechazo = rechazoCron(request, process.env.CRON_SECRET)
  if (rechazo) return rechazo
  const limite = Date.now() + 240000
  const reporte = {}
  for (const cuenta of CUENTAS) {
    try {
      const r = await referidos.correrCuenta(cuenta, { desdeDias: 45, hasta: () => Date.now() > limite })
      reporte[cuenta] = { eventos: r.eventos, importados: r.importados, completo: r.completo, movimientos: r.movimientos, cerradas: r.cerradas, ocupado: r.ocupado, error: r.error }
    } catch (error) {
      console.error('[cron referidos]', cuenta, error)
      reporte[cuenta] = { error: 'falló' }
    }
  }
  const pendientes = await sql`SELECT id FROM referidos_miembros WHERE version > wallet_version_enviada ORDER BY id LIMIT 500`
  await enviarWalletDe(pendientes.map((m) => m.id))
  await procesarBajasGoogle().catch((error) => console.error('[cron referidos] bajas', error))
  return Response.json({ ok: true, cuentas: reporte, wallet: pendientes.length })
}
