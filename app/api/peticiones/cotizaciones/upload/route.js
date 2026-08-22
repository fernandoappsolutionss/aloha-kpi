import { handleUpload } from '@vercel/blob/client'
import { requireCurrentUser } from '../../../../../lib/auth'
import { peticionUploadService } from '../../../../../lib/peticion-upload-runtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json()
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const input = JSON.parse(clientPayload || '{}')
        const actor = await requireCurrentUser()
        return await peticionUploadService.authorizeToken(actor, { ...input, pathname })
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        await peticionUploadService.complete({ blob, tokenPayload })
      },
    })
    return Response.json(response)
  } catch (error) {
    console.error('[peticion-upload]', error)
    return Response.json({ error: error?.message || 'No se pudo procesar la carga.' }, { status: 400 })
  }
}
