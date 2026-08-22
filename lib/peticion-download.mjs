import { canAccessCentro } from './current-user.mjs'
import { sanitizePdfName } from './peticion-pdf.mjs'

const notFound = () => Response.json({ error: 'Cotización no encontrada.' }, { status: 404 })

export function createPeticionDownloadHandler({ authenticate, findQuote, getBlob }) {
  return async function download(cotizacionId) {
    let actor
    try { actor = await authenticate() } catch (error) {
      if (/No autenticado/i.test(String(error?.message || error))) {
        return Response.json({ error: 'No autenticado.' }, { status: 401 })
      }
      throw error
    }
    const quote = await findQuote(cotizacionId)
    if (!quote || !canAccessCentro(actor, quote.centro_id)) return notFound()
    const blob = await getBlob(quote.blob_pathname)
    if (!blob || blob.statusCode !== 200 || !blob.stream) return notFound()
    const filename = sanitizePdfName(quote.archivo_nombre)
    return new Response(blob.stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }
}
