'use server'
import { sql } from '../../lib/db'
import { requireCurrentUser } from '../../lib/auth'
import { centrosDe, esGerencia, puedeGestionarUsuarios } from '../../lib/current-user.mjs'

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
      viewUsers: puedeGestionarUsuarios(user),
      viewCenters: esGerencia(user.rol),
      viewAdminTraining: esGerencia(user.rol),
      viewMetas: esGerencia(user.rol),
      viewZoho: esGerencia(user.rol),
    },
  }
}
