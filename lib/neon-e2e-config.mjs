const E2E_KEYS = [
  'E2E_DATABASE_CONFIRM',
  'E2E_NEON_HTTP',
  'E2E_NEON_WSPROXY',
  'USUARIOS_TEST_DATABASE_URL',
]

export function resolveNeonE2EConfig(env) {
  const hasE2ESignal = E2E_KEYS.some((name) => Boolean(env[name]))
  if (!hasE2ESignal) return null

  if (env.E2E_DATABASE_CONFIRM !== 'disposable') {
    throw new Error('Configuración E2E de Neon incompleta: falta la confirmación disposable.')
  }

  const required = ['E2E_NEON_HTTP', 'E2E_NEON_WSPROXY', 'USUARIOS_TEST_DATABASE_URL', 'DATABASE_URL']
  if (required.some((name) => !env[name])) {
    throw new Error('Faltan variables obligatorias para la configuración E2E de Neon.')
  }
  if (env.DATABASE_URL !== env.USUARIOS_TEST_DATABASE_URL) {
    throw new Error('DATABASE_URL debe coincidir con USUARIOS_TEST_DATABASE_URL en E2E.')
  }

  let fetchEndpoint
  try {
    fetchEndpoint = new URL(env.E2E_NEON_HTTP)
  } catch {
    throw new Error('E2E_NEON_HTTP debe ser una URL HTTP válida.')
  }
  if (!['http:', 'https:'].includes(fetchEndpoint.protocol) || fetchEndpoint.username || fetchEndpoint.password) {
    throw new Error('E2E_NEON_HTTP debe ser una URL HTTP válida y sin credenciales.')
  }
  if (/^[a-z]+:\/\//i.test(env.E2E_NEON_WSPROXY) || !/^[^\s/:]+:\d+$/.test(env.E2E_NEON_WSPROXY)) {
    throw new Error('E2E_NEON_WSPROXY debe tener formato host:puerto y no incluir protocolo.')
  }

  return {
    fetchEndpoint: fetchEndpoint.href,
    wsProxy: `${env.E2E_NEON_WSPROXY}/v1`,
    useSecureWebSocket: false,
    forceDisablePgSSL: true,
    pipelineTLS: false,
    pipelineConnect: false,
    fetchOptions: { cache: 'no-store' },
  }
}
