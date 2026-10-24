import { sql } from '../../../../../lib/db'
import { requireCentroAccess } from '../../../../../lib/auth'

export const dynamic = 'force-dynamic'
export async function GET(request, { params }) {
  const { id } = await params
  if (!/^\d+$/.test(id)) return new Response('Archivo no encontrado.', { status: 404 })
  try {
    const [ref] = await sql`SELECT p.centro_id FROM semana_objetivos o JOIN semana_planes p ON p.id=o.plan_id WHERE o.id=${id}`
    if (!ref) return new Response('Archivo no encontrado.', { status: 404 })
    const usuario = await requireCentroAccess(ref.centro_id)
    if (usuario.rol === 'coach') return new Response('No autorizado.', { status: 403 })
    const [archivo] = await sql`SELECT nombre,tipo,encode(contenido,'base64') AS datos FROM semana_evidencias WHERE objetivo_id=${id}`
    if (!archivo) return new Response('Archivo no encontrado.', { status: 404 })
    return new Response(Buffer.from(archivo.datos, 'base64'), { headers: {
      'Content-Type': archivo.tipo,
      'Content-Disposition': `attachment; filename="evidencia"; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`,
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    } })
  } catch { return new Response('No se pudo abrir el adjunto.', { status: 403 }) }
}
