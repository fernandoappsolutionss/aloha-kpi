import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { auditPage } from './helpers/audit-page'

async function openHarness(page) {
  const response = await page.goto('/e2e-primitives')
  expect(response?.status(), 'el harness gated debe responder 200').toBe(200)
}

test('Dialog controla foco, Tab, Escape, backdrop y restaura el scroll exacto', async ({ page }) => {
  await openHarness(page)
  const trigger = page.getByRole('button', { name: 'Abrir diálogo' })
  await page.evaluate(() => { document.body.style.overflow = 'clip' })
  await trigger.focus()
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Detalle accesible' })
  await expect(dialog).toBeVisible()
  await expect(page.getByLabel('Nombre de prueba')).toBeFocused()
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')

  const focusables = dialog.locator('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')
  await focusables.last().focus()
  await page.keyboard.press('Tab')
  await expect(focusables.first()).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(focusables.last()).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(page.locator('body')).toHaveCSS('overflow', 'clip')

  await trigger.click()
  await dialog.getByText('El contenido no cierra el diálogo').click()
  await expect(dialog).toBeVisible()
  await page.locator('.dialog-backdrop').click({ position: { x: 4, y: 4 } })
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('TableScroller crea la única región horizontal y conserva la primera columna fija', async ({ page }) => {
  await openHarness(page)
  const region = page.getByRole('region', { name: 'Comparación de prueba' })
  await expect(region).toBeVisible()
  await expect(region.getByText('Desliza para comparar')).toBeVisible()

  const before = await region.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    scrollLeft: node.scrollLeft,
  }))
  expect(before.scrollWidth).toBeGreaterThan(before.clientWidth)
  expect(before.scrollLeft).toBe(0)
  await region.evaluate((node) => { node.scrollLeft = 180 })
  await expect.poll(() => region.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0)

  const sticky = region.locator('tbody td').first()
  await expect(sticky).toHaveCSS('position', 'sticky')
  const geometry = await Promise.all([region.boundingBox(), sticky.boundingBox()])
  expect(Math.abs(geometry[1].x - geometry[0].x)).toBeLessThanOrEqual(2)
})

test('OperationalCard respeta el nivel de heading y omite campos vacíos', async ({ page }) => {
  await openHarness(page)
  const card = page.locator('.operational-card')
  await expect(card).toHaveCount(1)
  await expect(card.getByRole('heading', { name: 'Centro Faro', level: 4 })).toBeVisible()
  await expect(card.getByText('DAVID')).toBeVisible()
  await expect(card.getByText('Activo')).toBeVisible()
  await expect(card.getByText('Campo vacío')).toHaveCount(0)
  await expect(card.getByText('Campo nulo')).toHaveCount(0)
})

test('MeasuredChart entrega la medida real y responde a ResizeObserver', async ({ page }) => {
  await openHarness(page)
  const chart = page.getByRole('img', { name: 'Evolución de prueba' })
  const measure = page.getByTestId('chart-measure')
  await expect(measure).toBeVisible()

  const firstWidth = Number(await measure.getAttribute('data-width'))
  const firstBox = await chart.boundingBox()
  expect(firstWidth).toBe(Math.round(firstBox.width))
  expect(await measure.getAttribute('data-height')).toBe('180')

  await page.getByRole('button', { name: 'Reducir gráfico' }).click()
  await expect.poll(async () => Number(await measure.getAttribute('data-width'))).toBeLessThan(firstWidth)
  const resizedWidth = Number(await measure.getAttribute('data-width'))
  const resizedBox = await chart.boundingBox()
  expect(resizedWidth).toBe(Math.round(resizedBox.width))
})

test('auditPage valida geometría, tipografía, targets y overflow local en Chrome', async ({ page }) => {
  await openHarness(page)
  await auditPage(page, { mobile: true, state: null })
})

test('GrowthSummaryBand expone progreso nombrado, datos y acción con tipografía móvil legible', async ({ page }) => {
  await openHarness(page)
  const band = page.getByRole('region', { name: 'Ruta al Nivel 2' })
  // Etapa 170–200, 185 es exactamente el 50%; dato independiente del presenter.
  await expect(band.getByRole('progressbar', { name: 'Avance al Nivel 2' })).toHaveAttribute('aria-valuenow', '50')
  await expect(band).toContainText('185')
  await expect(band).toContainText('Faltan 15')
  await expect(band).toContainText('191 niños')
  await auditPage(page, { mobile: true, state: null, scope: '.growth-band' })
  const smallSizes = await band.locator('small, .growth-band__stage, .growth-band__numberline span').evaluateAll(els => els.map(el => parseFloat(getComputedStyle(el).fontSize)))
  expect(smallSizes.every(size => size >= 13)).toBe(true)
  const axe = await new AxeBuilder({ page }).include('.growth-band').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(axe.violations).toEqual([])
  await band.getByRole('button', { name: 'Ver ruta completa' }).click()
  await expect(page.getByRole('status')).toHaveText('Ruta de prueba abierta')
})
