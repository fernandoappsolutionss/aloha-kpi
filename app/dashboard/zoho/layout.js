import { redirect } from 'next/navigation'
import { requireCurrentAdmin } from '../../../lib/auth'

export default async function ZohoLayout({ children }) {
  try { await requireCurrentAdmin() } catch { redirect('/dashboard') }
  return children
}
