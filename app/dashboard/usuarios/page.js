import { redirect } from 'next/navigation'
import { getUsuariosPageData } from '../../actions/usuarios'
import UsuariosClient from './UsuariosClient'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const data = await getUsuariosPageData()
  if (!data || data.error) redirect('/perfil')
  return <UsuariosClient initialData={data} />
}
