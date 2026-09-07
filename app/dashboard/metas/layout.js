import { redirect } from 'next/navigation'
import { requireSession } from '../../../lib/auth'
import { esGerencia } from '../../../lib/current-user.mjs'

export default async function MetasLayout({ children }) {
  try {
    const user = await requireSession()
    if (!esGerencia(user.rol)) throw new Error('No autorizado')
  } catch { redirect('/dashboard') }
  return children
}
