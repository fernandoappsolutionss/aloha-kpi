// Composición server-only: resuelve el nombre del centro y sus destinatarios,
// arma el correo (lib/peticion-notificaciones.mjs) y lo envía con lib/email.js.
// Nunca lanza: una falla de correo no debe tumbar el cambio de estado que ya
// se confirmó en la base de datos (ver lib/peticiones-service.mjs:changeStatus).
import { sql } from './db'
import { sendEmail } from './email'
import { peticionesRepository } from './peticiones-repository'
import { decisionEmail } from './peticion-notificaciones.mjs'

export async function notifyPeticionDecision({ peticion, estado, actor, cotizacionAprobada }) {
  try {
    const [centro] = await sql`SELECT nombre FROM centros WHERE id = ${peticion.centro_id}`
    const centroNombre = centro?.nombre || `Centro ${peticion.centro_id}`
    const recipients = await peticionesRepository.listCentroRecipients(peticion.centro_id)
    const baseUrl = process.env.APP_BASE_URL || 'https://aloha-kpi.vercel.app'
    const { subject, html } = decisionEmail({ peticion, estado, actor, cotizacionAprobada, centroNombre, baseUrl })
    const results = await Promise.allSettled(recipients.map((r) => sendEmail({ to: r.email, subject, html })))
    let sent = 0
    let failed = 0
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value?.sent) sent++
      else failed++
    }
    if (failed) console.error('[peticion-notificaciones] envíos fallidos', failed, 'de', results.length)
    return { sent, failed }
  } catch (error) {
    console.error('[peticion-notificaciones] error al notificar', error)
    return { sent: 0, failed: 0 }
  }
}
