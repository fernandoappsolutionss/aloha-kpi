// Transporte server-only para correos de invitación y restablecimiento.
// La emisión e invalidación de tokens pertenece a access-tokens.
import { sendEmail, invitacionHtml } from './email.js'

export async function baseUrl(env = process.env) {
  const configured = String(env.APP_URL || '').trim()
  if (!configured) throw new Error('APP_URL no está configurada.')
  let url
  try {
    url = new URL(configured)
  } catch {
    throw new Error('APP_URL no es una URL válida.')
  }
  const localhost = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  const localDevelopment = env.NODE_ENV === 'development' && localhost && url.protocol === 'http:'
  if (url.protocol !== 'https:' && !localDevelopment) {
    throw new Error('APP_URL debe usar HTTPS.')
  }
  if (url.username || url.password || url.search || url.hash || (url.pathname && url.pathname !== '/')) {
    throw new Error('APP_URL debe contener únicamente el origen canónico.')
  }
  return url.origin
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
