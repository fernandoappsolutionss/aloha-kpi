import { sql, withTransaction } from './db.js'
import { ROLES_OPERATIVOS } from './current-user.mjs'

// Era una tercera copia de la misma lista; el Coach la habria dejado sin
// aparecer en la pantalla del coordinador mientras si podia crearlo.
const OPERATIVE_ROLES = [...ROLES_OPERATIVOS]

const USER_COLUMNS = `
  u.id, u.nombre, u.email, u.rol, u.centro_id, u.blocked_until,
  (u.blocked_until IS NOT NULL AND u.blocked_until > CURRENT_TIMESTAMP) AS bloqueado,
  c.nombre AS centro_nombre,
  (u.password_hash IS NOT NULL) AS activo
`

export const usuariosRepository = {
  async transaction(work, options) {
    return withTransaction(work, options)
  },

  async loadActor(query, uid, { lock = false } = {}) {
    const [actor] = await query(
      `SELECT id, nombre, email, rol, centro_id, password_hash, blocked_until,
              (blocked_until IS NOT NULL AND blocked_until > CURRENT_TIMESTAMP) AS bloqueado
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

  // LA LISTA DE COACHES DEL CENTRO, que es de donde sale el nombre de la cuenta.
  // La ficha (coaches) ya existe: la crea la administradora en Grupos y
  // Fusiones y de ella cuelgan los grupos. Al dar de alta la cuenta se escoge
  // esa ficha en vez de volver a teclear el nombre, y así la cuenta y el
  // horario quedan pegados por coaches.usuario_id.
  async listCoaches(query, centerIds) {
    if (Array.isArray(centerIds) && centerIds.length === 0) return []
    const filtro = centerIds === null ? '' : ' AND co.centro_id = ANY($1::int[])'
    return await query(
      `SELECT co.id, co.centro_id, co.nombre, co.usuario_id
       FROM coaches co
       WHERE co.activo${filtro}
       ORDER BY co.nombre`,
      centerIds === null ? [] : [centerIds.map(Number)]
    )
  },

  async lockCoach(query, id) {
    const [coach] = await query(
      'SELECT id, centro_id, nombre, activo, usuario_id FROM coaches WHERE id = $1 FOR UPDATE',
      [Number(id)]
    )
    return coach
  },

  async linkCoachToUser(query, coachId, usuarioId) {
    await query('UPDATE coaches SET usuario_id = $1, updated_at = now() WHERE id = $2',
      [Number(usuarioId), Number(coachId)])
  },

  // Dejar de ser Coach suelta la ficha: si no, el horario seguiría apuntando a
  // una cuenta que ya no es coach y esa persona vería "Mis grupos" para siempre.
  async unlinkCoachUser(query, usuarioId) {
    await query('UPDATE coaches SET usuario_id = NULL, updated_at = now() WHERE usuario_id = $1',
      [Number(usuarioId)])
  },

  async findByEmail(query, email) {
    const [user] = await query(
      `SELECT id, nombre, email, rol, centro_id, password_hash, blocked_until,
              (blocked_until IS NOT NULL AND blocked_until > CURRENT_TIMESTAMP) AS bloqueado
       FROM usuarios WHERE LOWER(email) = LOWER($1)`,
      [email]
    )
    return user
  },

  async lockUser(query, id) {
    const [user] = await query(
      `SELECT id, nombre, email, rol, centro_id, password_hash, blocked_until,
              (blocked_until IS NOT NULL AND blocked_until > CURRENT_TIMESTAMP) AS bloqueado
       FROM usuarios WHERE id = $1 FOR UPDATE`,
      [Number(id)]
    )
    if (!user) return user
    const centers = await query(
      `SELECT centro_id FROM usuario_centros
       WHERE usuario_id = $1 ORDER BY centro_id FOR SHARE`,
      [Number(id)]
    )
    return { ...user, centros: centers.map((row) => Number(row.centro_id)) }
  },

  async insertUser(query, { nombre, email, rol, centro_id }) {
    const [user] = await query(
      `INSERT INTO usuarios (nombre, email, rol, centro_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol, centro_id, password_hash, blocked_until,
                 (blocked_until IS NOT NULL AND blocked_until > CURRENT_TIMESTAMP) AS bloqueado`,
      [nombre, email, rol, centro_id]
    )
    return user
  },

  async updateUser(query, id, { nombre, rol, centro_id }) {
    const [user] = await query(
      `UPDATE usuarios SET nombre = $1, rol = $2, centro_id = $3
       WHERE id = $4
       RETURNING id, nombre, email, rol, centro_id, password_hash, blocked_until,
                 (blocked_until IS NOT NULL AND blocked_until > CURRENT_TIMESTAMP) AS bloqueado`,
      [nombre, rol, centro_id, Number(id)]
    )
    return user
  },

  async replaceCoordinatorCenters(query, usuarioId, ids) {
    const userId = Number(usuarioId)
    const centerIds = [...new Set((ids || []).map(Number))].sort((a, b) => a - b)
    await query('DELETE FROM usuario_centros WHERE usuario_id = $1', [userId])
    if (centerIds.length === 0) return
    await query(
      `INSERT INTO usuario_centros (usuario_id, centro_id)
       SELECT $1, centro_id FROM unnest($2::int[]) AS centro_id`,
      [userId, centerIds]
    )
  },

  async deleteUser(query, id) {
    await query('DELETE FROM usuarios WHERE id = $1', [Number(id)])
  },

  async updateBlockedUntil(query, id, blockedUntil) {
    const [user] = await query(
      `UPDATE usuarios SET blocked_until = $2
       WHERE id = $1
       RETURNING id, nombre, email, rol, centro_id, password_hash, blocked_until,
                 (blocked_until IS NOT NULL AND blocked_until > CURRENT_TIMESTAMP) AS bloqueado`,
      [Number(id), blockedUntil]
    )
    return user
  },

  async insertAccessHistory(query, { userId, actorId, action, previousBlockedUntil, newBlockedUntil, motivo }) {
    await query(
      `INSERT INTO usuario_acceso_historial
        (user_id, actor_id, action, previous_blocked_until, new_blocked_until, motivo)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [Number(userId), Number(actorId), action, previousBlockedUntil, newBlockedUntil, motivo]
    )
  },
}
