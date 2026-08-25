'use server'
import { sql } from '../../lib/db'
import { requireSession, requireAdmin, requireCentroAccess, requireCurrentAdmin, centrosDe } from '../../lib/auth'
import { fallo } from '../../lib/errores'

const PAISES = ['PA', 'VE']
const ORDEN_ROL = ['coordinador', 'administradora', 'asistente']

// Solo los centros del usuario: gerencia todos, el coordinador los suyos,
// administradora/asistente el propio. Alimenta el selector "Ir a centro".
export async function listCentros() {
  const centroIds = centrosDe(await requireSession())
  if (centroIds === null) return await sql`SELECT id, nombre, region, pais FROM centros ORDER BY nombre`
  return await sql`SELECT id, nombre, region, pais FROM centros WHERE id = ANY(${centroIds}::int[]) ORDER BY nombre`
}

export async function getCentroNombre(id) {
  await requireCentroAccess(id)
  const rows = await sql`SELECT nombre FROM centros WHERE id = ${id}`
  return rows[0]?.nombre || null
}

// Centros con sus miembros: administradora, asistente y los coordinadores
// operativos que lo tienen asignado. `miembros` alimenta la columna Equipo.
export async function listCentrosConUsuarios() {
  await requireAdmin()
  const centros = await sql`
    SELECT c.id, c.nombre, c.region, c.pais, COUNT(u.id)::int AS user_count
    FROM centros c
    LEFT JOIN usuarios u ON u.centro_id = c.id
    GROUP BY c.id, c.nombre, c.region, c.pais
    ORDER BY c.nombre
  `
  const miembros = await sql`
    SELECT u.id, u.nombre, u.email, u.rol, u.centro_id AS centro_id,
           (u.password_hash IS NOT NULL) AS activo
    FROM usuarios u
    WHERE u.centro_id IS NOT NULL AND u.rol <> 'admin_general' AND u.rol <> 'supervisor'
    UNION ALL
    SELECT u.id, u.nombre, u.email, u.rol, uc.centro_id AS centro_id,
           (u.password_hash IS NOT NULL) AS activo
    FROM usuario_centros uc
    JOIN usuarios u ON u.id = uc.usuario_id
  `
  return centros.map((centro) => ({
    ...centro,
    miembros: miembros
      .filter((m) => Number(m.centro_id) === Number(centro.id))
      .sort((a, b) => ORDEN_ROL.indexOf(a.rol) - ORDEN_ROL.indexOf(b.rol) || a.nombre.localeCompare(b.nombre)),
  }))
}

// El país define las fechas patrias que salta el calendario de itinerarios.
export async function createCentro({ nombre, region, pais }) {
  await requireAdmin()
  if (!nombre || !nombre.trim()) return { error: 'El nombre es requerido.' }
  if (!PAISES.includes(pais)) return { error: 'Indica el país del centro: Panamá o Venezuela.' }
  await sql`INSERT INTO centros (nombre, region, pais) VALUES (${nombre.trim().toUpperCase()}, ${region || null}, ${pais})`
  return { ok: true }
}

export async function updateCentro(id, { nombre, region, pais }) {
  await requireAdmin()
  if (!nombre || !nombre.trim()) return { error: 'El nombre es requerido.' }
  if (!PAISES.includes(pais)) return { error: 'Indica el país del centro: Panamá o Venezuela.' }
  await sql`UPDATE centros SET nombre = ${nombre.trim().toUpperCase()}, region = ${region || null}, pais = ${pais} WHERE id = ${id}`
  return { ok: true }
}

export async function deleteCentro(id) {
  try {
    await requireCurrentAdmin()
    // usuarios.centro_id -> ON DELETE SET NULL; resumen/kpi/mes/trimestres -> ON DELETE CASCADE.
    // peticiones.centro_id -> ON DELETE RESTRICT: un centro con historial no se borra en silencio.
    await sql`DELETE FROM centros WHERE id = ${id}`
    return { ok: true }
  } catch (error) {
    if (error?.code === '23503') {
      return { error: 'Este centro tiene historial operativo o peticiones y no puede eliminarse.' }
    }
    return fallo('deleteCentro', error)
  }
}
