'use server'
import { sql } from '../../lib/db'
import { requireSession, requireAdmin, requireCentroAccess } from '../../lib/auth'

export async function listCentros() {
  await requireSession()
  return await sql`SELECT id, nombre, region FROM centros ORDER BY nombre`
}

export async function getCentroNombre(id) {
  await requireCentroAccess(id)
  const rows = await sql`SELECT nombre FROM centros WHERE id = ${id}`
  return rows[0]?.nombre || null
}

export async function listCentrosConUsuarios() {
  await requireAdmin()
  return await sql`
    SELECT c.id, c.nombre, c.region, COUNT(u.id)::int AS user_count
    FROM centros c
    LEFT JOIN usuarios u ON u.centro_id = c.id
    GROUP BY c.id, c.nombre, c.region
    ORDER BY c.nombre
  `
}

export async function createCentro({ nombre, region }) {
  await requireAdmin()
  if (!nombre || !nombre.trim()) return { error: 'El nombre es requerido.' }
  await sql`INSERT INTO centros (nombre, region) VALUES (${nombre.trim().toUpperCase()}, ${region || null})`
  return { ok: true }
}

export async function updateCentro(id, { nombre, region }) {
  await requireAdmin()
  if (!nombre || !nombre.trim()) return { error: 'El nombre es requerido.' }
  await sql`UPDATE centros SET nombre = ${nombre.trim().toUpperCase()}, region = ${region || null} WHERE id = ${id}`
  return { ok: true }
}

export async function deleteCentro(id) {
  await requireAdmin()
  // usuarios.centro_id -> ON DELETE SET NULL; resumen/kpi/mes/trimestres -> ON DELETE CASCADE.
  await sql`DELETE FROM centros WHERE id = ${id}`
  return { ok: true }
}
