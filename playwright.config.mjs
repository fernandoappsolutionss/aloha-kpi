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
if (process.env.E2E_R10_AUDIT) throw new Error('R10 exige su configuración local dedicada.')
const dialogsRun = process.env.E2E_R3_DIALOGS === '1'
const comparisonsRun = process.env.E2E_R6_COMPARISONS === '1'
const operationsRun = process.env.E2E_R9_OPERATIONS === '1'
if (operationsRun && remoteRun) throw new Error('R9 solo permite ejecución local disposable.')
if (operationsRun) process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1'
const centerCoreRun = process.env.E2E_R8_CENTER_CORE === '1'
if (centerCoreRun && remoteRun) throw new Error('R8 solo permite ejecución local disposable.')
if ([operationsRun, dialogsRun, comparisonsRun, centerCoreRun, process.env.E2E_RUN_MUTATIONS === '1'].filter(Boolean).length > 1) {
  throw new Error('Los gates con fixture son exclusivos; no se pueden combinar.')
}
if (comparisonsRun && remoteRun) throw new Error('R6 solo permite ejecución local disposable.')
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
const mutationProjects = !remoteRun && process.env.E2E_RUN_MUTATIONS === '1' ? [{
  name: 'users-mutations-local',
  testMatch: /users-mutations\.local\.spec\.js/,
  dependencies: ['setup'],
  fullyParallel: false,
  workers: 1,
  use: { viewport: { width: 390, height: 844 }, storageState: 'tests/e2e/.auth/admin.json', trace: 'off', screenshot: 'off', video: 'off' },
}] : []
const mutationRun = mutationProjects.length > 0
// Los errores del mutante no deben generar snapshots del DOM con bearer tokens.
if (mutationRun) process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1'
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
  E2E_NEXT_PROFILE: operationsRun ? 'center-operations' : centerCoreRun ? 'center-core' : dialogsRun ? 'dialogs' : 'authenticated',
  E2E_NEXT_PORT: '3000',
  DATABASE_URL: testDatabase,
  USUARIOS_TEST_DATABASE_URL: testDatabase,
  E2E_DATABASE_CONFIRM: 'disposable',
  E2E_NEON_HTTP: process.env.E2E_NEON_HTTP,
  E2E_NEON_WSPROXY: process.env.E2E_NEON_WSPROXY,
  E2E_DELIVERY_MODE: process.env.E2E_DELIVERY_MODE || 'stub',
  SESSION_SECRET: process.env.SESSION_SECRET,
  ...(dialogsRun || centerCoreRun || operationsRun ? {
    CRM_API_URL: 'http://127.0.0.1:4317',
    CRM_SERVICE_TOKEN: process.env.CRM_SERVICE_TOKEN,
    ...(operationsRun ? { E2E_R9_OPERATIONS:'1' } : centerCoreRun ? { E2E_R8_CENTER_CORE: '1' } : { E2E_R3_DIALOGS: '1' }),
  } : {}),
}

const dedicatedSpecs = /(r10-|center-reports|center-user|full-route-audit|responsive-states|accessibility|remote-readonly).*\.(spec|setup)\.js$/
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1'

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: dedicatedSpecs,
  outputDir: mutationRun ? 'test-results/r7-users-mutations' : 'test-results',
  preserveOutput: 'never',
  reporter: operationsRun ? [['./tests/e2e/helpers/r9-reporter.mjs']] : mutationRun ? [['line']] : [['./tests/e2e/helpers/r10-reporter.mjs']],
  expect: { timeout: 10_000 },
  globalSetup: operationsRun ? './tests/e2e/helpers/r9-global-setup.mjs' : centerCoreRun ? './tests/e2e/helpers/r8-global-setup.mjs' : comparisonsRun ? './tests/e2e/helpers/r6-global-setup.mjs' : dialogsRun ? './tests/e2e/helpers/r3-global-setup.mjs' : undefined,
  globalTeardown: operationsRun ? './tests/e2e/helpers/r9-global-teardown.mjs' : centerCoreRun ? './tests/e2e/helpers/r8-global-teardown.mjs' : comparisonsRun ? './tests/e2e/helpers/r6-global-teardown.mjs' : dialogsRun ? './tests/e2e/helpers/r3-global-teardown.mjs' : undefined,
  workers: operationsRun || mutationRun || dialogsRun || comparisonsRun || centerCoreRun ? 1 : undefined,
  use: {
    baseURL,
    channel: 'chrome',
    ...(operationsRun ? {actionTimeout:15_000,navigationTimeout:45_000} : {}),
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  webServer: remoteRun ? undefined : [
    {
      command: 'node tests/e2e/helpers/start-next.mjs',
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: serverEnv,
    },
    ...(dialogsRun || centerCoreRun || operationsRun ? [{
      command: 'node tests/e2e/helpers/crm-readonly-stub.mjs',
      url: 'http://127.0.0.1:4317/health',
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        NODE_ENV: 'development',
        ...(operationsRun ? { ...serverEnv, E2E_R9_OPERATIONS:'1' } : centerCoreRun ? { ...serverEnv, E2E_R8_CENTER_CORE: '1' } : { E2E_R3_DIALOGS: '1' }),
        CRM_SERVICE_TOKEN: process.env.CRM_SERVICE_TOKEN,
      },
    }] : []),
  ],
  projects: operationsRun ? [
    {name:'r9-setup',testMatch:/r9-auth\.setup\.js/,use:{trace:'off',screenshot:'off',video:'off'}},
    ...[...sizes.filter(([n])=>['phone-320','phone-390','tablet-768','desktop-1440'].includes(n)),['desktop-1024',1024,900],['desktop-1025',1025,900]].map(([name,width,height])=>({name,testMatch:/center-operations\.spec\.js/,dependencies:['r9-setup'],fullyParallel:false,use:{viewport:{width,height},storageState:'tests/e2e/.auth/r9-center.json',trace:'off',screenshot:'off',video:'off'}})),
  ] : centerCoreRun ? [
    { name: 'r8-setup', testMatch: /r8-auth\.setup\.js/, use: { trace: 'off', screenshot: 'off' } },
    ...[...sizes, ['desktop-1025', 1025, 900]].map(([name, width, height]) => ({
      name, testMatch: /center-core\.spec\.js/, dependencies: ['r8-setup'], fullyParallel: false,
      use: { viewport: { width, height }, storageState: 'tests/e2e/.auth/r8-center.json' },
    })),
  ] : comparisonsRun ? [
    { name: 'setup', testMatch: /(?:^|\/)auth\.setup\.js$/, use: { trace: 'off', screenshot: 'off' } },
    ...[...sizes.filter(([name]) => ['phone-320', 'phone-390', 'tablet-768', 'desktop-1440'].includes(name)), ['desktop-1025', 1025, 900]].map(([name, width, height]) => ({
      name, testMatch: /dashboard-comparisons\.spec\.js/, dependencies: ['setup'], fullyParallel: false,
      use: { viewport: { width, height }, storageState: 'tests/e2e/.auth/admin.json' },
    })),
  ] : dialogsRun ? [
    {
      name: 'setup',
      testMatch: /(?:^|\/)auth\.setup\.js$/,
      use: { trace: 'off', screenshot: 'off' },
    },
    ...dialogProjects,
  ] : mutationRun ? [
    {
      name: 'setup',
      testMatch: /(?:^|\/)auth\.setup\.js$/,
      use: { trace: 'off', screenshot: 'off' },
    },
    ...mutationProjects,
  ] : [
    {
      name: 'setup',
      testMatch: /(?:^|\/)auth\.setup\.js$/,
      use: { trace: 'off', screenshot: 'off' },
    },
    ...sizes.map(([name, width, height]) => ({
      name,
      dependencies: ['setup'],
      grepInvert: /@coordinator/,
      testIgnore: new RegExp(`${dedicatedSpecs.source}|(r9-auth\\.setup|center-operations\\.spec|auth\\.setup|primitives\\.spec|users-coordinator\\.spec|center-user\\.spec|center-core\\.spec|users-mutations\\.local\\.spec|dialogs\\.spec|dashboard-comparisons\\.spec${remoteRun ? '|upstream-integration\\.local\\.spec' : ''})\\.js`),
      use: { viewport: { width, height }, storageState: 'tests/e2e/.auth/admin.json' },
    })),
    {
      name: 'public-audit',
      testMatch: /public-responsive\.spec\.js/,
      // Este proyecto no carga storageState: conserva sólo los casos públicos.
      grepInvert: /perfil espera hidratación|filtros focales/,
      use: { viewport: { width: 390, height: 844 }, storageState: undefined },
    },
    {
      name: 'coordinator-audit',
      testMatch: /(users-coordinator|dashboard-operations)\.spec\.js/,
      testIgnore: /auth\.setup\.js/,
      grep: /@coordinator|^(?!.*dashboard-operations)/,
      dependencies: ['setup'],
      use: { viewport: { width: 390, height: 844 }, storageState: 'tests/e2e/.auth/coordinator.json' },
    },
  ],
})
