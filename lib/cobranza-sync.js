import { withTransaction } from './db.js'
import { hoyISO } from './operaciones.js'
import { contarVencidasHoy, semanaDiaKpi } from './zoho-cobranza.mjs'
import { zohoRefreshToken } from './zoho-conexion.js'

export async function sincronizarCobranza({ transaction = withTransaction, contar = contarVencidasHoy,
  token = zohoRefreshToken, hoy = hoyISO(), now = () => new Date() } = {}) {
  const refreshToken = await token()
  if (!refreshToken) throw new Error('Zoho sin conectar. Revisa Conexión Zoho.')
  return transaction(async query => {
    const [lock] = await query`SELECT pg_try_advisory_xact_lock(20261017, 1) AS tomado`
    if (!lock?.tomado) throw new Error('Ya hay una sincronización de cobranza en curso.')
    const inicio = now().toISOString()
    const resultado = await contar(refreshToken, { hoy })
    const fin = now().toISOString()
    const casilla = semanaDiaKpi(hoy)
    const [y, m] = hoy.split('-').map(Number)
    if (resultado.completo) for (const [id, vencidas] of Object.entries(resultado.porCentro)) {
      const centroId = Number(id)
      await query`INSERT INTO cobranza_diaria (centro_id, fecha, vencidas, registrado_at)
        VALUES (${centroId}, ${hoy}, ${vencidas}, ${fin}) ON CONFLICT (centro_id, fecha)
        DO UPDATE SET vencidas = EXCLUDED.vencidas, registrado_at = EXCLUDED.registrado_at`
      // Las actualizaciones de fin de semana quedan en el libro diario; no
      // reescriben el viernes ni inventan una sexta casilla.
      if (!casilla) continue
      await query`INSERT INTO mes_kpi (centro_id, year, month, estado) VALUES (${centroId}, ${y}, ${m}, 'abierto')
        ON CONFLICT (centro_id, year, month) DO NOTHING`
      const [mes] = await query`SELECT estado FROM mes_kpi WHERE centro_id = ${centroId} AND year = ${y} AND month = ${m} FOR UPDATE`
      if (mes?.estado !== 'abierto') continue
      const d = casilla.dia
      await query`INSERT INTO kpi_semanas (centro_id, year, month, semana, cob_d1, cob_d2, cob_d3, cob_d4, cob_d5, cob_nullable)
        VALUES (${centroId}, ${y}, ${m}, ${casilla.semana},
          CASE WHEN ${d}=1 THEN ${vencidas}::int END, CASE WHEN ${d}=2 THEN ${vencidas}::int END,
          CASE WHEN ${d}=3 THEN ${vencidas}::int END, CASE WHEN ${d}=4 THEN ${vencidas}::int END,
          CASE WHEN ${d}=5 THEN ${vencidas}::int END, true)
        ON CONFLICT (centro_id, year, month, semana) DO UPDATE SET
          cob_d1 = CASE WHEN ${d}=1 THEN ${vencidas}::int WHEN NOT kpi_semanas.cob_nullable THEN NULLIF(kpi_semanas.cob_d1,0) ELSE kpi_semanas.cob_d1 END,
          cob_d2 = CASE WHEN ${d}=2 THEN ${vencidas}::int WHEN NOT kpi_semanas.cob_nullable THEN NULLIF(kpi_semanas.cob_d2,0) ELSE kpi_semanas.cob_d2 END,
          cob_d3 = CASE WHEN ${d}=3 THEN ${vencidas}::int WHEN NOT kpi_semanas.cob_nullable THEN NULLIF(kpi_semanas.cob_d3,0) ELSE kpi_semanas.cob_d3 END,
          cob_d4 = CASE WHEN ${d}=4 THEN ${vencidas}::int WHEN NOT kpi_semanas.cob_nullable THEN NULLIF(kpi_semanas.cob_d4,0) ELSE kpi_semanas.cob_d4 END,
          cob_d5 = CASE WHEN ${d}=5 THEN ${vencidas}::int WHEN NOT kpi_semanas.cob_nullable THEN NULLIF(kpi_semanas.cob_d5,0) ELSE kpi_semanas.cob_d5 END,
          cob_nullable = true, updated_at = now()`
    }
    const informe = { ...resultado, inicio, fin, fecha: hoy, guardado: resultado.completo }
    await query`INSERT INTO cobranza_conciliaciones (iniciado_at, terminado_at, fecha, guardado, informe)
      VALUES (${inicio}, ${fin}, ${hoy}, ${informe.guardado}, ${JSON.stringify(informe)}::jsonb)`
    return informe
  }, { isolationLevel: 'ReadCommitted' })
}
