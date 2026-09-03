'use server'
import { requireCurrentAdmin } from '../../lib/auth'
import { zohoConexionInfo } from '../../lib/zoho-conexion'
import { EMAIL_ZOHO_AUTORIZADO } from '../../lib/zoho-cobranza.mjs'

export async function getZohoEstado() {
  try { await requireCurrentAdmin() } catch { return { error: 'No autorizado' } }
  const conexion = await zohoConexionInfo()
  return {
    conexion, // { email, conectado_por, conectado_at } | null
    clientConfigurado: Boolean(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET),
    emailAutorizado: EMAIL_ZOHO_AUTORIZADO,
  }
}
