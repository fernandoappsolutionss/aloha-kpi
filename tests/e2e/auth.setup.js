import { test as setup, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const allActorsRequired = [
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
  'E2E_COORDINATOR_EMAIL',
  'E2E_COORDINATOR_PASSWORD',
  'E2E_CENTER_EMAIL',
  'E2E_CENTER_PASSWORD',
  'E2E_CENTRO_ID',
]

function requireAuthEnvironment() {
  const required = process.env.E2E_R3_DIALOGS === '1'
    ? ['E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD']
    : allActorsRequired
  const missing = required.filter((name) => !process.env[name])
  if (missing.length > 0) throw new Error(`Faltan variables E2E de autenticación: ${missing.join(', ')}`)
  if (process.env.E2E_R3_DIALOGS === '1') return null
  const centerId = Number(process.env.E2E_CENTRO_ID)
  if (!Number.isInteger(centerId) || centerId <= 0 || String(centerId) !== process.env.E2E_CENTRO_ID) {
    throw new Error('E2E_CENTRO_ID debe ser un entero positivo canónico.')
  }
  return centerId
}

async function authenticate({ browser, baseURL, emailName, passwordName, expectedPath, allowedRoles, expectedCenterId, statePath }) {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } })
  try {
    const page = await context.newPage()
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.locator('input[type="email"]').fill(process.env[emailName])
    await page.locator('input[type="password"]').fill(process.env[passwordName])
    const valuesReady = await page.evaluate(({ email, password }) => (
      document.querySelector('input[type="email"]')?.value === email
      && document.querySelector('input[type="password"]')?.value === password
    ), { email: process.env[emailName], password: process.env[passwordName] })
    if (!valuesReady) throw new Error('El formulario de login no conservó los valores E2E antes del submit.')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL((url) => expectedPath.test(url.pathname), { timeout: 30_000 })

    const sessionView = await page.evaluate(() => ({
      role: localStorage.getItem('aloha_rol'),
      centerId: localStorage.getItem('aloha_centro_id'),
    }))
    expect(allowedRoles).toContain(sessionView.role)
    if (expectedCenterId !== undefined) expect(sessionView.centerId).toBe(String(expectedCenterId))
    const readyStarted = Date.now()
    await expect(page.locator('#main-content[data-page-state="ready"]')).toHaveCount(1, { timeout: 45_000 })
    console.log('Setup local ready tras ms:', Date.now() - readyStarted)
    await expect(page.locator('[data-navigation-state="ready"]')).toHaveCount(1)
    await page.waitForLoadState('networkidle')
    await context.storageState({ path: statePath })
  } finally {
    await context.close()
  }
}

setup('autentica actores E2E en contextos aislados', async ({ browser, baseURL }) => {
  setup.setTimeout(120_000)
  const centerId = requireAuthEnvironment()
  if (!baseURL) throw new Error('Playwright no recibió baseURL.')
  await mkdir('tests/e2e/.auth', { recursive: true })

  await authenticate({
    browser, baseURL,
    emailName: 'E2E_ADMIN_EMAIL', passwordName: 'E2E_ADMIN_PASSWORD',
    expectedPath: /^\/dashboard(?:\/|$)/, allowedRoles: ['admin_general', 'supervisor'],
    statePath: 'tests/e2e/.auth/admin.json',
  })
  if (process.env.E2E_R3_DIALOGS === '1') return
  await authenticate({
    browser, baseURL,
    emailName: 'E2E_COORDINATOR_EMAIL', passwordName: 'E2E_COORDINATOR_PASSWORD',
    expectedPath: /^\/dashboard(?:\/|$)/, allowedRoles: ['coordinador'],
    statePath: 'tests/e2e/.auth/coordinator.json',
  })
  // R6 no abre centros: su Growth se limita al overview administrativo.
  if (process.env.E2E_R6_COMPARISONS === '1') return
  await authenticate({
    browser, baseURL,
    emailName: 'E2E_CENTER_EMAIL', passwordName: 'E2E_CENTER_PASSWORD',
    expectedPath: new RegExp(`^/centro/${centerId}(?:/|$)`), allowedRoles: ['administradora', 'asistente'],
    expectedCenterId: centerId,
    statePath: 'tests/e2e/.auth/center.json',
  })
})
