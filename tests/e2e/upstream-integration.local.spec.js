import { test, expect } from '@playwright/test'

test.beforeAll(() => {
  if (process.env.RESPONSIVE_BASE_URL || process.env.E2E_DATABASE_CONFIRM !== 'disposable') {
    throw new Error('La integración upstream exige servidor y base disposable locales.')
  }
})

async function navigation(page, mobile) {
  if (mobile) await page.getByRole('button', { name: 'Abrir menú' }).click()
  return page.getByRole(mobile ? 'dialog' : 'complementary', { name: 'Navegación principal' })
}

for (const [actor, returnLabel] of [['admin', 'Volver a Administración'], ['coordinator', 'Volver al panel']]) {
  test(`${actor}: retorno persistente desde centro y gate Zoho`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      viewport: testInfo.project.use.viewport,
      storageState: `tests/e2e/.auth/${actor}.json`,
    })
    try {
      const page = await context.newPage()
      // Do not initiate OAuth or write training progress.
      await page.route('**/api/zoho/**', () => { throw new Error('OAuth fuera del smoke') })
      const mobile = testInfo.project.use.viewport.width <= 1024
      const training = `/centro/${process.env.E2E_CENTRO_ID}/entrenamiento`
      await page.goto(training, { waitUntil: 'networkidle' })
      let nav = await navigation(page, mobile)
      const returnLink = nav.getByRole('link', { name: returnLabel, exact: true })
      await expect(returnLink).toHaveAttribute('href', '/dashboard')
      await expect(nav.locator('[data-tour="nav.entrenamiento"] .sb__badge')).toHaveCount(0)
      await expect(nav.getByRole('link', { name: 'Conexión Zoho', exact: true })).toHaveCount(actor === 'admin' ? 1 : 0)
      if (mobile) await page.keyboard.press('Escape')
      const start = page.getByRole('link', { name: 'Comenzar mi primer módulo' })
      await expect(start).toBeVisible()
      await start.click()
      await expect(page.getByRole('heading', { name: 'Completa este módulo en 2 pasos' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Iniciar recorrido' })).toBeVisible()
      nav = await navigation(page, mobile)
      await nav.getByRole('link', { name: returnLabel, exact: true }).click()
      await expect(page).toHaveURL(/\/dashboard$/)
      if (mobile) {
        await expect(page.getByRole('dialog', { name: 'Navegación principal' })).toBeHidden()
        await expect(page.getByRole('button', { name: 'Abrir menú' })).not.toBeFocused()
      }
      await page.goto('/dashboard/zoho', { waitUntil: 'networkidle' })
      if (actor === 'admin') {
        await expect(page).toHaveURL(/\/dashboard\/zoho$/)
        await expect(page.getByRole('heading', { name: 'Conexión con Zoho' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Falta el registro de la app en Zoho (una sola vez)' })).toBeVisible()
      } else {
        await expect(page).toHaveURL(/\/dashboard$/)
        await expect(page.getByRole('heading', { name: 'Conexión con Zoho' })).toHaveCount(0)
      }
    } finally { await context.close() }
  })
}

test('centro conserva CTA recomendado, dos pasos y regreso al índice sin completar', async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport: testInfo.project.use.viewport,
    storageState: 'tests/e2e/.auth/center.json',
  })
  try {
    const page = await context.newPage()
    const training = `/centro/${process.env.E2E_CENTRO_ID}/entrenamiento`
    await page.goto(training, { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: 'Comenzar mi primer módulo' }).click()
    await expect(page.getByRole('list', { name: 'Pasos del módulo' }).getByRole('listitem')).toHaveCount(2)
    await expect(page.getByRole('button', { name: 'Iniciar recorrido' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Comprobar respuestas' })).toBeDisabled()
    await expect(page.getByRole('button', { name: /Siguiente módulo:/ })).toHaveCount(0)
    await page.getByRole('button', { name: 'Volver a Entrenamiento' }).click()
    await expect(page).toHaveURL(training)
    await expect(page.getByRole('link', { name: 'Comenzar mi primer módulo' })).toBeVisible()
  } finally { await context.close() }
})
