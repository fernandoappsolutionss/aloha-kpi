import { redirect } from 'next/navigation'
import { requireCurrentAdmin } from '../../../lib/auth'

export default async function MetasLayout({ children }) {
  try { await requireCurrentAdmin() } catch { redirect('/dashboard') }
  return children
}
