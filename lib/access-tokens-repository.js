import { withTransaction } from './db'

export const accessTokensRepository = {
  async transaction(work) {
    return withTransaction(work, { isolationLevel: 'Serializable' })
  },

  async findUserByEmail(query, email) {
    const [user] = await query(
      `SELECT id, nombre, email, rol, centro_id, password_hash
       FROM usuarios WHERE email = $1`,
      [email]
    )
    return user
  },

  async findToken(query, token) {
    const [row] = await query(
      `SELECT token,user_id,purpose,expires_at,used_at,created_at
       FROM password_tokens WHERE token = $1`,
      [token]
    )
    return row
  },

  async lockUser(query, id) {
    const [user] = await query(
      `SELECT id, nombre, email, rol, centro_id, password_hash
       FROM usuarios WHERE id = $1 FOR UPDATE`,
      [Number(id)]
    )
    return user
  },

  async lockTokensForUser(query, userId) {
    return await query(
      `SELECT token,user_id,purpose,expires_at,used_at,created_at
       FROM password_tokens WHERE user_id = $1
       ORDER BY token FOR UPDATE`,
      [Number(userId)]
    )
  },

  async invalidateActive(query, userId) {
    await query(
      `UPDATE password_tokens
       SET used_at = COALESCE(used_at, now())
       WHERE user_id = $1 AND used_at IS NULL`,
      [Number(userId)]
    )
  },

  async insertToken(query, { token, user_id, purpose, expires_at }) {
    await query(
      `INSERT INTO password_tokens (token, user_id, purpose, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [token, Number(user_id), purpose, expires_at]
    )
  },

  async updatePassword(query, userId, hash) {
    await query(
      'UPDATE usuarios SET password_hash = $2 WHERE id = $1',
      [Number(userId), hash]
    )
  },
}
