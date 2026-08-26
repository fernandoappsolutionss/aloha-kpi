import { sql } from './db'
import { requireAlcanceGerencia } from './auth'
import { soloDeMisCentros } from './current-user.mjs'

export { soloDeMisCentros }

// Alcance del panel /dashboard. Gerencia: todos los centros (centroIds = null).
// Coordinador operativo: solo los que tiene asignados.
// El resto del panel filtra en memoria a partir de esta lista, así que basta
// con recortarla aquí para que todo el panel quede acotado.
export async function alcancePanel() {
  const { centroIds } = await requireAlcanceGerencia()
  const centros = centroIds === null
    ? await sql`SELECT id, nombre FROM centros ORDER BY nombre`
    : await sql`SELECT id, nombre FROM centros WHERE id = ANY(${centroIds}::int[]) ORDER BY nombre`
  return { centros, centroIds }
}
