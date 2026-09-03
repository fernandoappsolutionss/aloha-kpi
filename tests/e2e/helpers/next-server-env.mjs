const PROFILE_KEYS = {
  ungated: [],
  authenticated: [
    'DATABASE_URL',
    'USUARIOS_TEST_DATABASE_URL',
    'E2E_DATABASE_CONFIRM',
    'E2E_NEON_HTTP',
    'E2E_NEON_WSPROXY',
    'E2E_DELIVERY_MODE',
    'SESSION_SECRET',
  ],
  primitives: [
    'E2E_UI_FIXTURES',
    'E2E_DATABASE_CONFIRM',
  ],
}

export function buildNextEnvironment(source, profile) {
  const keys = PROFILE_KEYS[profile]
  if (!keys) throw new Error('Perfil de servidor E2E desconocido.')
  if (keys.some((name) => !source[name])) {
    throw new Error(`Faltan variables para el servidor E2E ${profile}.`)
  }
  if (profile !== 'ungated' && source.E2E_DATABASE_CONFIRM !== 'disposable') {
    throw new Error('El servidor E2E exige confirmación disposable.')
  }
  if (profile === 'authenticated' && source.DATABASE_URL !== source.USUARIOS_TEST_DATABASE_URL) {
    throw new Error('Las bases E2E declaradas no coinciden.')
  }

  return Object.fromEntries([
    ['NODE_ENV', 'development'],
    ['NEXT_TELEMETRY_DISABLED', '1'],
    ...keys.map((name) => [name, source[name]]),
  ])
}
