const DEV_SECRET = 'dev-insecure-secret-change-me-please'

export function resolveSessionSecret(env = process.env) {
  const configured = String(env.SESSION_SECRET || '').trim()
  if (configured) return new TextEncoder().encode(configured)
  if (env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production') {
    throw new Error('Falta SESSION_SECRET en producción.')
  }
  return new TextEncoder().encode(DEV_SECRET)
}
