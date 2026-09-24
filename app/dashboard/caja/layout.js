import { redirect } from 'next/navigation'
import { requireCurrentCaja } from '../../../lib/auth'

export default async function CajaLayout({ children }) {
  try { await requireCurrentCaja() } catch { redirect('/dashboard') }
  return children
}
