// Descarga de la carta fiscal de FF Soluciones (material del curso `fiscal`).
// No va en public/: es un documento interno de la empresa de Los Naranjos. Se
// sirve solo con sesión y solo a quien alcanza ese centro, o a gerencia.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { requireCurrentUser } from '../../../../../lib/auth'
import { puedeVerMaterialFiscal } from '../../../../../lib/entrenamiento/oficio/cursos/fiscal.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// next.config.js lo incluye en el bundle de esta ruta (outputFileTracingIncludes).
const ARCHIVO = join(process.cwd(), 'lib/entrenamiento/material/informacion-fiscal-ff-soluciones.docx')

export async function GET() {
  let u
  try { u = await requireCurrentUser() } catch { return new Response('No autenticado.', { status: 401 }) }
  if (!puedeVerMaterialFiscal(u)) return new Response('Este material es solo de ALOHA Los Naranjos.', { status: 403 })
  const archivo = await readFile(ARCHIVO)
  return new Response(archivo, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="Informacion fiscal FF Soluciones.docx"',
      'Cache-Control': 'private, no-store',
    },
  })
}
