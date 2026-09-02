import {
  accionesGestionUsuario,
  assertGestionUsuarios,
  centrosDestinoUsuarios,
  esGerencia,
  rolesAsignablesUsuarios,
} from './current-user.mjs'

export function createUsuariosService({ repo }) {
  return {
    async pageData(session) {
      return repo.transaction(async (query) => {
        const actor = assertGestionUsuarios(await repo.loadActor(query, Number(session?.uid), { lock: false }))
        const scope = centrosDestinoUsuarios(actor)
        const centers = await repo.listCenters(query, scope)
        const rows = await repo.listUsers(query, scope)
        return {
          actor: { id: actor.id, role: actor.rol },
          title: actor.rol === 'coordinador' ? 'Usuarios de mis centros' : 'Gestión de usuarios',
          centers,
          assignableRoles: rolesAsignablesUsuarios(actor),
          capabilities: { createUser: scope === null || scope.length > 0, deleteUser: esGerencia(actor.rol) },
          users: rows.map((row) => {
            const allowed = accionesGestionUsuario(actor, row)
            const relationshipCenterIds = Array.isArray(row.centros)
              ? row.centros.map(Number).filter(Number.isInteger)
              : []
            const centerIds = relationshipCenterIds.length > 0
              ? relationshipCenterIds
              : (row.centro_id == null ? [] : [Number(row.centro_id)])
            const relationshipCenterNames = Array.isArray(row.centros_nombres)
              ? row.centros_nombres.filter(Boolean)
              : []
            return {
              id: row.id,
              nombre: row.nombre,
              email: row.email,
              role: row.rol,
              centerId: row.centro_id,
              centerIds,
              centerNames: relationshipCenterNames.length > 0
                ? relationshipCenterNames
                : (row.centro_nombre ? [row.centro_nombre] : []),
              active: Boolean(row.activo ?? row.password_hash),
              actions: {
                edit: allowed.editar,
                resendInvitation: allowed.reenviarInvitacion,
                sendPasswordReset: allowed.enviarRestablecimiento,
                delete: allowed.eliminar,
              },
            }
          }),
        }
      })
    },
  }
}
