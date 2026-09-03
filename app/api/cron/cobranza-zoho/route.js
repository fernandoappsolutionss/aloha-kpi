// GET /api/cron/cobranza-zoho — cron de lunes a viernes (vercel.json:
// 0 0 * * 2-6 UTC = 7pm Panamá lun-vie). Cuenta las facturas VENCIDAS de hoy
// en Zoho Books por centro y escribe la casilla del día en kpi_semanas
// (cob_dN de la semana correspondiente). Zoho es la fuente de verdad: si una
// administradora digitó a mano, el cron lo pisa esa misma tarde.
// Auth fail-closed por CRON_SECRET, igual que /api/cron/llenado.
import { sql } from '../../../../lib/db'
import { hoyISO } from '../../../../lib/operaciones'
import { rechazoCron } from '../../../../lib/cron-auth.mjs'
import { contarVencidasHoy, semanaDiaKpi } from '../../../../lib/zoho-cobranza.mjs'
import { zohoRefreshToken } from '../../../../lib/zoho-conexion'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function GET(request) {
  const rechazo = rechazoCron(request, process.env.CRON_SECRET)
  if (rechazo) return rechazo

  const hoy = hoyISO()
  const casilla = semanaDiaKpi(hoy)
  if (!casilla) return Response.json({ ok: true, fecha: hoy, skip: 'fin de semana' })

  const refreshToken = await zohoRefreshToken()
  if (!refreshToken) {
    return Response.json({ ok: false, error: 'Zoho sin conectar: entra a /dashboard/zoho y conecta la cuenta' }, { status: 503 })
  }

  const [y, m] = hoy.split('-').map(Number)
  const { porCentro, sinClasificar } = await contarVencidasHoy(refreshToken)

  const escritos = []
  const cerrados = []
  for (const [centroIdStr, vencidas] of Object.entries(porCentro)) {
    const centroId = Number(centroIdStr)
    const [mes] = await sql`SELECT estado FROM mes_kpi WHERE centro_id = ${centroId} AND year = ${y} AND month = ${m}`
    if (mes?.estado === 'cerrado') { cerrados.push(centroId); continue }
    const d = casilla.dia
    await sql`
      INSERT INTO kpi_semanas (centro_id, year, month, semana, cob_d1, cob_d2, cob_d3, cob_d4, cob_d5)
      VALUES (${centroId}, ${y}, ${m}, ${casilla.semana},
        CASE WHEN ${d} = 1 THEN ${vencidas} ELSE 0 END,
        CASE WHEN ${d} = 2 THEN ${vencidas} ELSE 0 END,
        CASE WHEN ${d} = 3 THEN ${vencidas} ELSE 0 END,
        CASE WHEN ${d} = 4 THEN ${vencidas} ELSE 0 END,
        CASE WHEN ${d} = 5 THEN ${vencidas} ELSE 0 END)
      ON CONFLICT (centro_id, year, month, semana) DO UPDATE SET
        cob_d1 = CASE WHEN ${d} = 1 THEN ${vencidas} ELSE kpi_semanas.cob_d1 END,
        cob_d2 = CASE WHEN ${d} = 2 THEN ${vencidas} ELSE kpi_semanas.cob_d2 END,
        cob_d3 = CASE WHEN ${d} = 3 THEN ${vencidas} ELSE kpi_semanas.cob_d3 END,
        cob_d4 = CASE WHEN ${d} = 4 THEN ${vencidas} ELSE kpi_semanas.cob_d4 END,
        cob_d5 = CASE WHEN ${d} = 5 THEN ${vencidas} ELSE kpi_semanas.cob_d5 END,
        updated_at = now()`
    escritos.push({ centroId, vencidas })
  }

  return Response.json({
    ok: true,
    fecha: hoy,
    semana: casilla.semana,
    dia: casilla.dia,
    escritos,
    cerrados,
    sinClasificar,
  })
}
