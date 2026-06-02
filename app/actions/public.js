'use server'
import { sql } from '../../lib/db'

// Conteos públicos para la pantalla de login (sin autenticación).
// Solo devuelve agregados no sensibles: número de centros y de usuarios.
export async function getPublicStats() {
  try {
    const [c] = await sql`SELECT count(*)::int AS n FROM centros`
    const [u] = await sql`SELECT count(*)::int AS n FROM usuarios`
    return { centros: c?.n ?? 0, usuarios: u?.n ?? 0 }
  } catch {
    return { centros: 0, usuarios: 0 }
  }
}
