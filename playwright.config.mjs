import { defineConfig } from '@playwright/test'

function parseBaseURL(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('RESPONSIVE_BASE_URL debe ser una URL HTTP válida.')
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('RESPONSIVE_BASE_URL debe ser HTTP(S) y no contener credenciales.')
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('RESPONSIVE_BASE_URL debe apuntar al origen, sin ruta, query ni fragmento.')
  }
  return url.origin
}

const remoteRun = Boolean(process.env.RESPONSIVE_BASE_URL)
const dialogsRun = process.env.E2E_R3_DIALOGS === '1'
const baseURL = parseBaseURL(process.env.RESPONSIVE_BASE_URL || 'http://127.0.0.1:3000')
const testDatabase = process.env.USUARIOS_TEST_DATABASE_URL
if (dialogsRun && remoteRun) {
  throw new Error('El gate R3 de diálogos no puede ejecutarse contra una URL remota.')
}
if (!remoteRun) {
  const required = ['USUARIOS_TEST_DATABASE_URL', 'E2E_NEON_HTTP', 'E2E_NEON_WSPROXY', 'SESSION_SECRET']
  if (process.env.E2E_DATABASE_CONFIRM !== 'disposable' || required.some((name) => !process.env[name])) {
    throw new Error('E2E local exige base disposable, transportes Neon y secreto de sesión explícitos.')
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL !== testDatabase) {
    throw new Error('DATABASE_URL local no coincide con USUARIOS_TEST_DATABASE_URL.')
  }
}

const sizes = [
  ['phone-320', 320, 568],
  ['phone-375', 375, 667],
  ['phone-390', 390, 844],
  ['phone-430', 430, 932],
  ['tablet-768', 768, 1024],
  ['desktop-1440', 1440, 900],
]
const mutationProjects = process.env.E2E_RUN_MUTATIONS === '1' ? [{
  name: 'users-mutations-local',
  testMatch: /users-mutations\.local\.spec\.js/,
  dependencies: ['setup'],
  fullyParallel: false,
  workers: 1,
  use: { viewport: { width: 390, height: 844 }, storageState: 'tests/e2e/.auth/admin.json' },
}] : []
const mutationRun = mutationProjects.length > 0
const dialogProjects = dialogsRun ? [
  ...sizes
    .filter(([name]) => ['phone-320', 'phone-390', 'tablet-768'].includes(name))
    .map(([name, width, height]) => ({
      name,
      testMatch: /dialogs\.spec\.js/,
      grepInvert: /@growth-local/,
      dependencies: ['setup'],
      use: { viewport: { width, height }, storageState: 'tests/e2e/.auth/admin.json' },
    })),
  {
    name: 'growth-dialog-local',
    testMatch: /dialogs\.spec\.js/,
    grep: /@growth-local/,
    dependencies: ['setup'],
    fullyParallel: false,
    workers: 1,
    use: { viewport: { width: 390, height: 844 }, storageState: 'tests/e2e/.auth/admin.json' },
  },
] : []

const serverEnv = remoteRun ? undefined : {
  E2E_NEXT_PROFILE: dialogsRun ? 'dialogs' : 'authenticated',
  E2E_NEXT_PORT: '3000',
  DATABASE_URL: testDatabase,
  USUARIOS_TEST_DATABASE_URL: testDatabase,
  E2E_DATABASE_CONFIRM: 'disposable',
  E2E_NEON_HTTP: process.env.E2E_NEON_HTTP,
  E2E_NEON_WSPROXY: process.env.E2E_NEON_WSPROXY,
  E2E_DELIVERY_MODE: process.env.E2E_DELIVERY_MODE || 'stub',
  SESSION_SECRET: process.env.SESSION_SECRET,
  ...(dialogsRun ? {
    CRM_API_URL: 'http://127.0.0.1:4317',
    CRM_SERVICE_TOKEN: process.env.CRM_SERVICE_TOKEN,
    E2E_R3_DIALOGS: '1',
  } : {}),
}

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  expect: { timeout: 10_000 },
  globalSetup: dialogsRun ? './tests/e2e/helpers/r3-global-setup.mjs' : undefined,
  globalTeardown: dialogsRun ? './tests/e2e/helpers/r3-global-teardown.mjs' : undefined,
  workers: mutationRun || dialogsRun ? 1 : undefined,
  use: {
    baseURL,
    channel: 'chrome',
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  webServer: remoteRun ? undefined : [
    {
      command: 'node tests/e2e/helpers/start-next.mjs',
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: serverEnv,
    },
    ...(dialogsRun ? [{
      command: 'node tests/e2e/helpers/crm-readonly-stub.mjs',
      url: 'http://127.0.0.1:4317/health',
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        NODE_ENV: 'development',
        E2E_R3_DIALOGS: '1',
        CRM_SERVICE_TOKEN: process.env.CRM_SERVICE_TOKEN,
      },
    }] : []),
  ],
  projects: dialogsRun ? [
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
      use: { trace: 'off', screenshot: 'off' },
    },
    ...dialogProjects,
  ] : mutationRun ? [
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
      use: { trace: 'off', screenshot: 'off' },
    },
    ...mutationProjects,
  ] : [
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
      use: { trace: 'off', screenshot: 'off' },
    },
    ...sizes.map(([name, width, height]) => ({
      name,
      dependencies: ['setup'],
      testIgnore: /(auth\.setup|primitives\.spec|public-responsive\.spec|users-coordinator\.spec|center-user\.spec|users-mutations\.local\.spec|dialogs\.spec)\.js/,
      use: { viewport: { width, height }, storageState: 'tests/e2e/.auth/admin.json' },
    })),
    {
      name: 'public-audit',
      testMatch: /public-responsive\.spec\.js/,
      use: { viewport: { width: 390, height: 844 }, storageState: undefined },
    },
    {
      name: 'coordinator-audit',
      testMatch: /users-coordinator\.spec\.js/,
      dependencies: ['setup'],
      use: { viewport: { width: 390, height: 844 }, storageState: 'tests/e2e/.auth/coordinator.json' },
    },
    {
      name: 'center-audit',
      testMatch: /center-user\.spec\.js/,
      dependencies: ['setup'],
      use: { viewport: { width: 390, height: 844 }, storageState: 'tests/e2e/.auth/center.json' },
    },
  ],
})
