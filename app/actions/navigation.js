'use server'
import { sql } from '../../lib/db'
import { requireCurrentUser } from '../../lib/auth'
import { centrosDe, esSoloLectura, isMaster, puedeGestionarUsuarios, puedeVerUsuarios } from '../../lib/current-user.mjs'

export async function getNavigationContext() {
  const user = await requireCurrentUser()
  const scope = centrosDe(user)
  const centers = scope === null
    ? await sql`SELECT id,nombre FROM centros ORDER BY nombre`
    : scope.length === 0
      ? []
      : await sql`SELECT id,nombre FROM centros WHERE id=ANY(${scope}::int[]) ORDER BY nombre`
  return {
    actor: { id: user.id, role: user.rol },
    centers: centers.map(({ id, nombre }) => ({ id: Number(id), nombre })),
    capabilities: {
      viewUsers: puedeVerUsuarios(user),
      manageUsers: puedeGestionarUsuarios(user),
      viewCenters: isMaster(user) || esSoloLectura(user),
      viewAdminTraining: isMaster(user),
      viewMetas: isMaster(user) || esSoloLectura(user),
      viewZoho: isMaster(user),
    },
  }
}
