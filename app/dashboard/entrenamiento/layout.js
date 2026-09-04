import { redirect } from 'next/navigation'
import { getNavigationContext } from '../../actions/navigation'

export const dynamic = 'force-dynamic'

export default async function EntrenamientoLayout({ children }) {
  let context
  try { context = await getNavigationContext() } catch { redirect('/login') }
  if (!context) redirect('/login')
  if (!context.capabilities?.viewAdminTraining) redirect('/dashboard')
  return children
}
