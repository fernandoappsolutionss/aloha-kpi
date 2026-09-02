import { sql, withTransaction } from './db.js'

const OPERATIVE_ROLES = ['administradora', 'asistente']

const USER_COLUMNS = `
  u.id, u.nombre, u.email, u.rol, u.centro_id,
  c.nombre AS centro_nombre,
  (u.password_hash IS NOT NULL) AS activo
`

export const usuariosRepository = {
  async transaction(work, options) {
    return withTransaction(work, options)
  },

  async loadActor(query, uid, { lock = false } = {}) {
    const [actor] = await query(
      `SELECT id, nombre, email, rol, centro_id, password_hash
       FROM usuarios WHERE id = $1${lock ? ' FOR UPDATE' : ''}`,
      [Number(uid)]
    )
    if (!actor) return actor

    const centers = await query(
      `SELECT centro_id FROM usuario_centros
       WHERE usuario_id = $1 ORDER BY centro_id${lock ? ' FOR SHARE' : ''}`,
      [Number(uid)]
    )
    return { ...actor, centros: centers.map((row) => Number(row.centro_id)) }
  },

  async listUsers(query, centerIds) {
    if (Array.isArray(centerIds) && centerIds.length === 0) return []

    if (centerIds === null) {
      return await query(
        `SELECT ${USER_COLUMNS},
                COALESCE(ARRAY_AGG(uc.centro_id ORDER BY uc.centro_id)
                  FILTER (WHERE uc.centro_id IS NOT NULL), '{}'::int[]) AS centros,
                COALESCE(ARRAY_AGG(cc.nombre ORDER BY uc.centro_id)
                  FILTER (WHERE cc.nombre IS NOT NULL), '{}'::text[]) AS centros_nombres
         FROM usuarios u
         LEFT JOIN centros c ON c.id = u.centro_id
         LEFT JOIN usuario_centros uc ON uc.usuario_id = u.id
         LEFT JOIN centros cc ON cc.id = uc.centro_id
         GROUP BY u.id, c.nombre
         ORDER BY u.nombre`,
        []
      )
    }

    return await query(
      `SELECT ${USER_COLUMNS}, ARRAY[]::int[] AS centros, ARRAY[]::text[] AS centros_nombres
       FROM usuarios u
       LEFT JOIN centros c ON c.id = u.centro_id
       WHERE u.rol = ANY($1::text[]) AND u.centro_id = ANY($2::int[])
       ORDER BY u.nombre`,
      [OPERATIVE_ROLES, centerIds.map(Number)]
    )
  },

  async listCenters(query, centerIds) {
    if (Array.isArray(centerIds) && centerIds.length === 0) return []
    if (centerIds === null) {
      return await query('SELECT id, nombre FROM centros ORDER BY nombre', [])
    }
    return await query(
      'SELECT id, nombre FROM centros WHERE id = ANY($1::int[]) ORDER BY nombre',
      [centerIds.map(Number)]
    )
  },
}
