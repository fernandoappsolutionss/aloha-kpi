import { handleUpload } from '@vercel/blob/client'
import { requireCurrentUser } from '../../../../../lib/auth'
import { peticionUploadService } from '../../../../../lib/peticion-upload-runtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'No se pudo procesar la carga.' }, { status: 400 }) }
  try {
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
    // Un fallo en onUploadCompleted (callback) debe responder 500: los
    // emisores de webhooks tratan 4xx como "no reintentar", lo que mataría
    // la autocuración de complete() (idempotente por diseño). Un fallo en
    // onBeforeGenerateToken (autorización) sigue siendo 400: ahí sí es un
    // error del cliente que no se arregla reintentando igual.
    const status = body?.type === 'blob.upload-completed' ? 500 : 400
    const message = /^[0-9A-Z]{5}$/.test(String(error?.code || '')) ? 'No se pudo procesar la carga.' : (error?.message || 'No se pudo procesar la carga.')
    return Response.json({ error: message }, { status })
  }
}
