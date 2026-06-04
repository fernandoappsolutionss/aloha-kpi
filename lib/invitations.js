// Creación de tokens de invitación / restablecimiento y envío del enlace.
// Módulo server-only (usa sql, headers y el envío de correo). No es 'use server':
// es un helper interno para las acciones (no se expone al cliente).
import { headers } from 'next/headers'
import { sql } from './db'
import { sendEmail, invitacionHtml } from './email'

function genToken() {
  const r = () => globalThis.crypto.randomUUID().replace(/-/g, '')
  return r() + r() // 256 bits
}

export async function baseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '')
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host')
  const proto = h.get('x-forwarded-proto') || 'https'
  return `${proto}://${host}`
}

// Crea un token para el usuario, intenta enviar el correo y devuelve el enlace.
// `user`: { id, email, nombre }. `purpose`: 'invite' | 'reset'.
export async function crearInvitacion(user, purpose, horas) {
  const token = genToken()
  const expira = new Date(Date.now() + horas * 3600 * 1000).toISOString()
  await sql`INSERT INTO password_tokens (token, user_id, purpose, expires_at) VALUES (${token}, ${user.id}, ${purpose}, ${expira})`
  const link = `${await baseUrl()}/set-password?token=${token}`
  const r = await sendEmail({
    to: user.email,
    subject: purpose === 'reset' ? 'Restablece tu contraseña · ALOHA KPI' : 'Crea tu contraseña · ALOHA KPI',
    html: invitacionHtml({ nombre: user.nombre, link, tipo: purpose }),
  })
  return { link, emailSent: r.sent, emailReason: r.reason }
}
