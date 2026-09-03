import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'

const baseURL = String(process.env.RESPONSIVE_BASE_URL || '').replace(/\/$/, '')
const required = [
  'RESPONSIVE_BASE_URL',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
  'E2E_CENTER_EMAIL',
  'E2E_CENTER_PASSWORD',
  'E2E_CENTRO_ID',
]
for (const name of required) assert.ok(process.env[name], `${name} es obligatorio`)
const parsedBaseURL = new URL(baseURL)
assert.ok(['http:', 'https:'].includes(parsedBaseURL.protocol), 'RESPONSIVE_BASE_URL debe ser HTTP(S)')
assert.equal(parsedBaseURL.username, '', 'RESPONSIVE_BASE_URL no admite credenciales')
assert.equal(parsedBaseURL.password, '', 'RESPONSIVE_BASE_URL no admite credenciales')

async function assertNoRootOverflow(page, label) {
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1, `${label}: overflow ${geometry.scrollWidth}/${geometry.clientWidth}`)
}

async function login(context, email, password, expectedPath) {
  const page = await context.newPage()
  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' })
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => expectedPath.test(url.pathname), { timeout: 15_000 })
  return page
}

const browser = await chromium.launch({ channel: 'chrome' })
try {
  const publicContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  try {
    const publicPage = await publicContext.newPage()
    await publicPage.goto(`${baseURL}/login`, { waitUntil: 'networkidle' })
    assert.ok(await publicPage.locator('input[type="email"]').isVisible())
    await assertNoRootOverflow(publicPage, 'login')
  } finally {
    await publicContext.close()
  }

  const adminContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  try {
    const adminPage = await login(adminContext, process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD, /^\/dashboard/)
    await assertNoRootOverflow(adminPage, 'dashboard gerencia')
  } finally {
    await adminContext.close()
  }

  const centerContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  try {
    const centerPath = new RegExp(`^/centro/${Number(process.env.E2E_CENTRO_ID)}(?:/|$)`)
    const centerPage = await login(centerContext, process.env.E2E_CENTER_EMAIL, process.env.E2E_CENTER_PASSWORD, centerPath)
    await assertNoRootOverflow(centerPage, 'inicio centro')
    await centerPage.goto(`${baseURL}/dashboard/usuarios`, { waitUntil: 'domcontentloaded' })
    await centerPage.waitForURL((url) => url.pathname !== '/dashboard/usuarios', { timeout: 15_000 })
  } finally {
    await centerContext.close()
  }
} finally {
  await browser.close()
}
