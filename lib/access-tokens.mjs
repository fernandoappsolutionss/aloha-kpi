const PURPOSES = new Set(['invite', 'reset'])

export function accessPurpose(user) {
  if (!user) throw new Error('Usuario no encontrado.')
  return user.password_hash ? 'reset' : 'invite'
}

function defaultToken() {
  const part = () => globalThis.crypto.randomUUID().replaceAll('-', '')
  return part() + part()
}

export function createAccessTokenService({ repo, now = () => new Date(), makeToken = defaultToken }) {
  async function replace(query, { userId, purpose, hours, cooldownMinutes = 0 }) {
    if (!PURPOSES.has(purpose)) throw new Error('Propósito de acceso inválido.')
    const user = await repo.lockUser(query, Number(userId))
    if (!user) throw new Error('Usuario no encontrado.')
    const tokens = await repo.lockTokensForUser(query, user.id)
    const issuedAt = now()
    const cooldownMs = Math.max(0, Number(cooldownMinutes) || 0) * 60_000
    const recent = purpose === 'reset' && cooldownMs > 0 && tokens.some((row) =>
      row.purpose === purpose
      && !row.used_at
      && new Date(row.expires_at) > issuedAt
      && issuedAt.getTime() - new Date(row.created_at).getTime() < cooldownMs
    )
    if (recent) return { suppressed: true, user }
    const token = makeToken()
    const expiresAt = new Date(issuedAt.getTime() + Number(hours) * 3600_000).toISOString()
    await repo.invalidateActive(query, user.id)
    await repo.insertToken(query, { token, user_id: user.id, purpose, expires_at: expiresAt })
    return { suppressed: false, token, expiresAt, user }
  }

  async function consume({ token, passwordHash }) {
    return repo.transaction(async (query) => {
      const found = await repo.findToken(query, token)
      if (!found) throw new Error('Enlace inválido.')
      const user = await repo.lockUser(query, found.user_id)
      if (!user) throw new Error('Enlace inválido.')
      const tokens = await repo.lockTokensForUser(query, user.id)
      const row = tokens.find((candidate) => candidate.token === token)
      if (!row) throw new Error('Enlace inválido.')
      if (!PURPOSES.has(row.purpose)) throw new Error('Enlace inválido.')
      if (row.used_at) throw new Error('Este enlace ya fue usado.')
      if (new Date(row.expires_at) < now()) throw new Error('Este enlace venció. Pide uno nuevo.')
      await repo.updatePassword(query, user.id, passwordHash)
      await repo.invalidateActive(query, user.id)
      return user
    })
  }

  async function changePassword({ userId, passwordHash }) {
    return repo.transaction(async (query) => {
      const user = await repo.lockUser(query, Number(userId))
      if (!user) throw new Error('No autenticado')
      await repo.lockTokensForUser(query, user.id)
      await repo.updatePassword(query, user.id, passwordHash)
      await repo.invalidateActive(query, user.id)
      return user
    })
  }

  async function invalidate(query, { userId }) {
    await repo.lockTokensForUser(query, Number(userId))
    await repo.invalidateActive(query, Number(userId))
  }

  return { replace, consume, changePassword, invalidate }
}
