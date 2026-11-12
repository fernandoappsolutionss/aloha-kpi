// Servicio de referidos con las dependencias reales (Neon + CRM). Server-only.
import { sql, withTransaction } from '../db'
import { crmCall, centrosDeCuenta } from '../crm'
import { crearServicio } from './servicio.mjs'
import { CUENTAS } from './reglas.mjs'

export const referidos = crearServicio({ sql, withTransaction, crm: crmCall, centrosDeCuenta })

// Importa un evento y acredita su cuenta. Nunca lanza: un fallo de referidos
// no puede romper la acción del centro que lo disparó.
export async function reconciliarEvento(eventId) {
  try {
    const [espejo] = await sql`SELECT crm_account_id FROM centro_eventos WHERE crm_event_id = ${eventId}`
    if (!espejo || !CUENTAS.includes(espejo.crm_account_id)) return { ok: false }
    const importado = await referidos.importarEvento({ id: eventId })
    if (importado.error) return { ok: false, error: importado.error }
    const acreditado = await referidos.acreditar(espejo.crm_account_id)
    await enviarWalletDe(acreditado.miembros)
    return { ok: true }
  } catch (error) {
    console.error('[referidos] reconciliarEvento', error)
    return { ok: false }
  }
}

// Empuja el saldo nuevo a las tarjetas de Wallet (si está configurado).
export async function enviarWalletDe(miembroIds = []) {
  if (!miembroIds.length) return
  try {
    const { enviarWallet } = await import('./wallet.js')
    for (const id of miembroIds) await enviarWallet(id)
  } catch (error) {
    console.error('[referidos] enviarWallet', error)
  }
}

export const baseUrl = () => (process.env.REFERIDOS_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://aloha-kpi.vercel.app').replace(/\/$/, '')
