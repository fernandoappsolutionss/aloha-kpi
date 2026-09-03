// Transporte server-only para correos de invitación y restablecimiento.
// La emisión e invalidación de tokens pertenece a access-tokens.
import { headers } from 'next/headers.js'
import { sendEmail, invitacionHtml } from './email.js'

export async function baseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '')
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host')
  const proto = h.get('x-forwarded-proto') || 'https'
  return `${proto}://${host}`
}

export async function deliverAccess({ user, purpose, token }) {
  const link = `${await baseUrl()}/set-password?token=${token}`
  const result = await sendEmail({
    to: user.email,
    subject: purpose === 'reset' ? 'Restablece tu contraseña · ALOHA KPI' : 'Crea tu contraseña · ALOHA KPI',
    html: invitacionHtml({ nombre: user.nombre, link, tipo: purpose }),
  })
  return { link, emailSent: result.sent, emailReason: result.reason }
}
