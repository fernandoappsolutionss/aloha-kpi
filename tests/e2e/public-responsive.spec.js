import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { auditPage } from './helpers/audit-page.js'

test.use({ trace: 'off' })

const PUBLIC_PAGES = [
  { path: '/', state: 'ready', redirectedTo: /\/login$/ },
  { path: '/login', state: 'ready' },
  { path: '/forgot-password', state: 'ready' },
  { path: '/set-password', state: 'error' },
]

async function expectInsideViewport(page, locator, label) {
  await expect(locator, label).toBeVisible()
  const box = await locator.boundingBox()
  const viewport = page.viewportSize()
  expect(box, `${label}: geometría`).not.toBeNull()
  expect(box.x, `${label}: borde izquierdo`).toBeGreaterThanOrEqual(-1)
  expect(box.x + box.width, `${label}: borde derecho`).toBeLessThanOrEqual(viewport.width + 1)
}

async function expectAxeClean(page) {
  await page.evaluate(async () => {
    await document.fonts?.ready
    await Promise.all(document.getAnimations().filter((animation) =>
      animation.effect?.getComputedTiming().iterations !== Infinity
    ).map((animation) => animation.finished.catch(() => {})))
  })
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([])
}

for (const route of PUBLIC_PAGES) {
  test(`público ${route.path} conserva estado, geometría y accesibilidad`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      viewport: testInfo.project.use.viewport,
    })
    try {
      const page = await context.newPage()
      await page.goto(route.path, { waitUntil: 'domcontentloaded' })
      if (route.redirectedTo) await expect(page).toHaveURL(route.redirectedTo)
      await auditPage(page, { mobile: true, state: route.state })
      await expectAxeClean(page)
    } finally {
      await context.close()
    }
  })
}

test('login expone campos correctos y muestra loading en el mismo árbol durante un POST retenido', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, viewport: testInfo.project.use.viewport })
  try {
    const page = await context.newPage()
    let releasePost
    await page.route('**/login', async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      await new Promise((resolve) => { releasePost = resolve })
      await route.abort()
    })
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#main-content')).toHaveAttribute('data-hydrated', 'true')
    const email = page.getByLabel('Correo electrónico')
    await expect(email).toHaveAttribute('type', 'email')
    await expect(email).toHaveAttribute('autocomplete', 'email')
    await email.fill('invalid@e2e.invalid')
    await page.getByLabel('Contraseña').fill('credencial-inválida')
    const submit = page.getByRole('button', { name: 'Ingresar al sistema' })
    await expectInsideViewport(page, submit, 'CTA de ingreso')
    const click = submit.click({ noWaitAfter: true })
    await expect(page.locator('#main-content[data-page-state="loading"]')).toHaveCount(1)
    await expect.poll(() => typeof releasePost).toBe('function')
    releasePost()
    void click.catch(() => {})
  } finally {
    await context.close()
  }
})

test('login muestra error y alerta con credenciales inválidas tras hidratar', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, viewport: testInfo.project.use.viewport })
  try {
    const page = await context.newPage()
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#main-content')).toHaveAttribute('data-hydrated', 'true')
    await page.getByLabel('Correo electrónico').fill('invalid@e2e.invalid')
    await page.getByLabel('Contraseña').fill('credencial-inválida')
    await page.getByRole('button', { name: 'Ingresar al sistema' }).click()
    await expect(page.locator('#main-content[data-page-state="error"]')).toHaveCount(1)
    await expect(page.locator('#main-content').getByRole('alert')).toBeVisible()
  } finally {
    await context.close()
  }
})

test('set-password-valid muestra formulario sin consumir el token fixture', async ({ browser }, testInfo) => {
  const token = process.env.E2E_VALID_ACCESS_TOKEN
  expect(token, 'falta E2E_VALID_ACCESS_TOKEN para la fixture local').toBeTruthy()
  const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, viewport: testInfo.project.use.viewport })
  try {
    const page = await context.newPage()
    await page.goto(`/set-password?token=${encodeURIComponent(token)}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#main-content[data-page-state="ready"]')).toHaveCount(1, { timeout: 30_000 })
    const password = page.getByLabel('Nueva contraseña')
    await expect(password).toHaveCSS('font-size', '16px')
    await expectInsideViewport(page, page.getByRole('button', { name: /contraseña y entrar/i }), 'CTA de set-password-valid')
    await auditPage(page, { mobile: true, state: 'ready' })
    await expectAxeClean(page)
  } finally {
    await context.close()
  }
})

test('set-password-valid expone error de validación sin enviar ni consumir la fixture', async ({ browser }, testInfo) => {
  const token = process.env.E2E_VALID_ACCESS_TOKEN
  expect(token, 'falta E2E_VALID_ACCESS_TOKEN para la fixture local').toBeTruthy()
  const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, viewport: testInfo.project.use.viewport })
  try {
    const page = await context.newPage()
    await page.goto(`/set-password?token=${encodeURIComponent(token)}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#main-content[data-page-state="ready"]')).toHaveCount(1, { timeout: 30_000 })
    await page.getByLabel('Nueva contraseña').fill('corta')
    await page.getByLabel('Confirmar contraseña').fill('corta')
    await page.getByRole('button', { name: /contraseña y entrar/i }).click()
    await expect(page.locator('#main-content[data-page-state="error"]')).toHaveCount(1)
    await expect(page.locator('#main-content').getByRole('alert')).toContainText(/al menos 8 caracteres/i)
  } finally {
    await context.close()
  }
})

test('set-password-valid cambia a loading mientras su POST real queda retenido sin consumir la fixture', async ({ browser }, testInfo) => {
  const token = process.env.E2E_VALID_ACCESS_TOKEN
  expect(token, 'falta E2E_VALID_ACCESS_TOKEN para la fixture local').toBeTruthy()
  const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, viewport: testInfo.project.use.viewport })
  try {
    const page = await context.newPage()
    await page.goto(`/set-password?token=${encodeURIComponent(token)}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#main-content[data-page-state="ready"]')).toHaveCount(1, { timeout: 30_000 })
    let releasePost
    await page.route('**/set-password?*', async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      await new Promise((resolve) => { releasePost = resolve })
      await route.abort()
    })
    await page.getByLabel('Nueva contraseña').fill('contraseña-e2e-segura')
    await page.getByLabel('Confirmar contraseña').fill('contraseña-e2e-segura')
    const click = page.getByRole('button', { name: /contraseña y entrar/i }).click({ noWaitAfter: true })
    await expect(page.locator('#main-content[data-page-state="loading"]')).toHaveCount(1)
    await expect.poll(() => typeof releasePost).toBe('function')
    releasePost()
    void click.catch(() => {})
  } finally {
    await context.close()
  }
})

test('set-password-valid cambia a error ante respuesta 500 sin consumir la fixture', async ({ browser }, testInfo) => {
  const token = process.env.E2E_VALID_ACCESS_TOKEN
  expect(token, 'falta E2E_VALID_ACCESS_TOKEN para la fixture local').toBeTruthy()
  const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, viewport: testInfo.project.use.viewport })
  try {
    const page = await context.newPage()
    await page.goto(`/set-password?token=${encodeURIComponent(token)}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#main-content[data-page-state="ready"]')).toHaveCount(1, { timeout: 30_000 })
    await page.route('**/set-password?*', async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      await route.fulfill({ status: 500, contentType: 'text/plain', body: 'Fallo de prueba local' })
    })
    await page.getByLabel('Nueva contraseña').fill('contraseña-e2e-segura')
    await page.getByLabel('Confirmar contraseña').fill('contraseña-e2e-segura')
    await page.getByRole('button', { name: /contraseña y entrar/i }).click({ noWaitAfter: true })
    await expect(page.locator('#main-content[data-page-state="error"]')).toHaveCount(1)
    await expect(page.locator('#main-content').getByRole('alert')).toBeVisible()
  } finally {
    await context.close()
  }
})

test('perfil espera hidratación y conserva el correo dentro de la pantalla', async ({ page }) => {
  await page.goto('/perfil', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#main-content[data-page-state="ready"]')).toHaveCount(1)
  await auditPage(page, { mobile: true, state: 'ready' })
  await expectAxeClean(page)
})

test('filtros focales envuelven sin desbordar', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  const panelFilter = page.locator('.panel-filter')
  await page.getByRole('button', { name: 'Mensual' }).click()
  await expect(panelFilter.getByRole('button', { name: 'Personalizado' })).toBeVisible()
  await page.getByRole('button', { name: 'Personalizado' }).click()
  await expect(panelFilter.getByLabel('Desde')).toBeVisible()
  await expect(panelFilter.getByLabel('Hasta')).toBeVisible()
  await expectInsideViewport(page, panelFilter, 'filtro mensual personalizado')

  await page.goto('/dashboard/ranking', { waitUntil: 'domcontentloaded' })
  const period = page.locator('.period')
  for (const selector of [period.getByRole('combobox', { name: 'Periodo trimestre' }), period.getByRole('combobox', { name: 'Periodo año' })]) {
    await expect(selector).toHaveCSS('min-height', '44px')
    await expectInsideViewport(page, selector, 'selector de periodo')
  }
})
