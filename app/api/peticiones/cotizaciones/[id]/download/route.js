import { requireCurrentUser } from '../../../../../../lib/auth'
import { createPeticionDownloadHandler } from '../../../../../../lib/peticion-download.mjs'
import { peticionBlob } from '../../../../../../lib/peticion-blob'
import { peticionesRepository } from '../../../../../../lib/peticiones-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const download = createPeticionDownloadHandler({
  authenticate: requireCurrentUser,
  findQuote: (id) => peticionesRepository.findDownloadableQuote(id),
  getBlob: (pathname) => peticionBlob.get(pathname),
})

export async function GET(_request, { params }) {
  const { id } = await params
  return await download(id)
}
