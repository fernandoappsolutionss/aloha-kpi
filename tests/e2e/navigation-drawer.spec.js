import { test, expect } from '@playwright/test'
import { auditPage } from './helpers/audit-page'

test('shell no desborda y drawer conserva navegación, foco, inert y cierre completo', async ({ page }, testInfo) => {
  await page.goto('/dashboard', { waitUntil: 'networkidle' })
  const mobile = testInfo.project.use.viewport.width <= 1024
  await auditPage(page, { mobile, state: null })
  const rootGeometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(rootGeometry.scrollWidth).toBeLessThanOrEqual(rootGeometry.clientWidth + 1)

  const sidebar = page.getByRole('complementary', { name: 'Navegación principal' })
  if (!mobile) {
    await expect(sidebar).toBeVisible()
    await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeHidden()
    await expect(sidebar.getByRole('link', { name: 'Panel general' })).toHaveAttribute('aria-current', 'page')
    return
  }

  const trigger = page.getByRole('button', { name: 'Abrir menú' })
  await expect(trigger).toBeVisible()
  await page.evaluate(() => { document.body.style.overflow = 'clip' })
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Navegación principal' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cerrar menú' })).toBeFocused()
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  await expect(page.locator('.shell > main')).toHaveAttribute('inert', '')
  await expect(page.locator('.mobile-bar')).toHaveAttribute('inert', '')

  const themeToggle = dialog.getByRole('button', { name: 'Cambiar tema claro u oscuro' })
  const initialPressed = await themeToggle.getAttribute('aria-pressed')
  expect(['true', 'false']).toContain(initialPressed)
  await themeToggle.click()
  await expect(themeToggle).toHaveAttribute('aria-pressed', initialPressed === 'true' ? 'false' : 'true')

  const focusables = dialog.locator('a[href],button:not([disabled]),select,input')
  await focusables.last().focus()
  await page.keyboard.press('Tab')
  await expect(focusables.first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(page.locator('body')).toHaveCSS('overflow', 'clip')
  await expect(page.locator('.shell > main')).not.toHaveAttribute('inert', '')
  await expect(page.locator('.mobile-bar')).not.toHaveAttribute('inert', '')

  await trigger.click()
  await dialog.getByRole('button', { name: 'Cerrar menú' }).click()
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()

  await trigger.click()
  const drawerBox = await dialog.boundingBox()
  const backdrop = page.getByRole('button', { name: 'Cerrar menú al tocar fuera' })
  await backdrop.click({ position: { x: drawerBox.width + 8, y: 100 } })
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()

  await trigger.click()
  const growthLink = dialog.getByRole('link', { name: 'Crecimiento' })
  await expect(growthLink.locator('svg')).toHaveAttribute('aria-hidden', 'true')
  await growthLink.click()
  await expect(page).toHaveURL(/\/dashboard\/crecimiento$/)
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Abrir menú' })).not.toBeFocused()
})

test('coordinador conserva el menú de panel en Perfil sin enlaces de centro inválidos', async ({ browser }, testInfo) => {
  const viewport = testInfo.project.use.viewport
  const mobile = viewport.width <= 1024
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    storageState: 'tests/e2e/.auth/coordinator.json',
    viewport,
  })
  try {
    const page = await context.newPage()
    await page.goto('/perfil', { waitUntil: 'networkidle' })
    await auditPage(page, { mobile, state: null })

    if (mobile) await page.getByRole('button', { name: 'Abrir menú' }).click()
    const navigation = mobile
      ? page.getByRole('dialog', { name: 'Navegación principal' })
      : page.getByRole('complementary', { name: 'Navegación principal' })
    await expect(navigation.getByText('Panel', { exact: true })).toBeVisible()
    await expect(navigation.getByRole('link', { name: 'Panel general' })).toHaveAttribute('href', '/dashboard')
    await expect(navigation.getByRole('link', { name: 'Usuarios' })).toHaveAttribute('href', '/dashboard/usuarios')
    await expect(navigation.getByRole('link', { name: 'Gestión centros' })).toHaveCount(0)
    const invalidCenterLinks = await navigation.locator('a[href^="/centro/"]').evaluateAll((links) => (
      links.map((link) => link.getAttribute('href')).filter((href) => /^\/centro\/(?:null|undefined)?(?:\/|$)/.test(href))
    ))
    expect(invalidCenterLinks).toEqual([])
  } finally {
    await context.close()
  }
})

test('cuenta de centro conserva su shell válido en Perfil', async ({ browser }, testInfo) => {
  const centerId = process.env.E2E_CENTRO_ID
  expect(centerId, 'E2E_CENTRO_ID es obligatorio').toMatch(/^[1-9]\d*$/)
  const viewport = testInfo.project.use.viewport
  const mobile = viewport.width <= 1024
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    storageState: 'tests/e2e/.auth/center.json',
    viewport,
  })
  try {
    const page = await context.newPage()
    await page.goto('/perfil', { waitUntil: 'networkidle' })
    await auditPage(page, { mobile, state: null })

    if (mobile) await page.getByRole('button', { name: 'Abrir menú' }).click()
    const navigation = mobile
      ? page.getByRole('dialog', { name: 'Navegación principal' })
      : page.getByRole('complementary', { name: 'Navegación principal' })
    await expect(navigation.getByText('Mi centro', { exact: true })).toBeVisible()
    await expect(navigation.getByRole('link', { name: 'Resumen' })).toHaveAttribute('href', `/centro/${centerId}`)
    await expect(navigation.getByRole('link', { name: 'Usuarios' })).toHaveCount(0)
    const invalidCenterLinks = await navigation.locator('a[href^="/centro/"]').evaluateAll((links) => (
      links.map((link) => link.getAttribute('href')).filter((href) => /^\/centro\/(?:null|undefined)?(?:\/|$)/.test(href))
    ))
    expect(invalidCenterLinks).toEqual([])
  } finally {
    await context.close()
  }
})
