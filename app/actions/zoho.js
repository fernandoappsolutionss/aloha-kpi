'use server'
import { sql } from '../../lib/db'
import { requireCurrentMaster } from '../../lib/auth'
import { zohoConexionInfo } from '../../lib/zoho-conexion'
import { EMAIL_ZOHO_AUTORIZADO } from '../../lib/zoho-cobranza.mjs'

export async function getZohoEstado() {
  try { await requireCurrentMaster() } catch { return { error: 'No autorizado' } }
  const conexion = await zohoConexionInfo()
  const [ultima] = await sql`SELECT informe FROM cobranza_conciliaciones ORDER BY id DESC LIMIT 1`
  return {
    ultimaConciliacion: ultima?.informe || null,
    conexion, // { email, conectado_por, conectado_at } | null
    clientConfigurado: Boolean(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET),
    emailAutorizado: EMAIL_ZOHO_AUTORIZADO,
  }
}
