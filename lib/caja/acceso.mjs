// Curva 13 de caja (Altavia + F&F): acceso por persona, no por rol.
// admin_general es solo lectura en el resto del KPI, pero Frederick sí opera
// la caja. Fail-closed: sin correo exacto en la lista, no entra.
import { isMaster, ROL_ADMIN_MASTER } from '../current-user.mjs'

export const CAJA_EMAILS = Object.freeze([
  'fperez@teamsolutionss.com',
  'admin@alohapanama.com',
  'froberts@alohapanama.com',
  'vcampos@alohapanama.com',
])

export function puedeVerCaja(user) {
  const email = String(user?.email || '').trim().toLowerCase()
  if (!email || !CAJA_EMAILS.includes(email)) return false
  // El rol Master exige además el correo Master (misma regla que el resto del KPI).
  if (user.rol === ROL_ADMIN_MASTER) return isMaster(user)
  return true
}

export function assertCaja(user) {
  if (!puedeVerCaja(user)) throw new Error('No autorizado')
  return user
}
