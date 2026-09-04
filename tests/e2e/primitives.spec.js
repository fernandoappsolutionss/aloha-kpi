import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { auditPage } from './helpers/audit-page'
import { PUBLIC_CASES, publicPageIsReady } from './helpers/remote-readonly.mjs'

test('criterios públicos reales rechazan redirect, loading y formulario incorrecto en DOM ficticio', async ({ page }) => {
  const origin = new URL(test.info().project.use.baseURL || 'http://127.0.0.1:3011').origin
  await page.route('**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<main></main>' }))
  for (const criteria of PUBLIC_CASES.slice(2)) {
    const args = { criteria, origin }
    const content = criteria.id === 'P03'
      ? '<h1>¿Olvidaste tu contraseña?</h1><form><input type="email"><button type="submit">Enviar enlace</button></form>'
      : '<h1>Enlace no válido</h1>'
    const html = state => `<main data-page-state="${state}">${content}<a href="/login">Volver al inicio de sesión</a></main>`
    await page.goto('/login')
    await page.setContent(html(criteria.state))
    await expect(page.waitForFunction(publicPageIsReady, args, { timeout: 100 })).rejects.toThrow(/Timeout/)
    await page.goto(criteria.path)
    await page.setContent(html('loading'))
    await expect(page.waitForFunction(publicPageIsReady, args, { timeout: 100 })).rejects.toThrow(/Timeout/)
    await page.setContent(html(criteria.state))
    await page.waitForFunction(publicPageIsReady, args)
    if (criteria.id === 'P03') await page.locator('input').evaluate(node => node.remove())
    else await page.locator('main').evaluate(node => { node.insertAdjacentHTML('beforeend', '<form><input type="password"></form>') })
    await expect(page.waitForFunction(publicPageIsReady, args, { timeout: 100 })).rejects.toThrow(/Timeout/)
  }
})

test('rollback usa el predicate real: rechaza Dashboard detenido/error y acepta anterior/candidato ficticios', async ({ page }) => {
  const { dashboardIsOperational } = await import('./rollback-smoke.mjs')
  const origin = new URL(test.info().project.use.baseURL || 'http://127.0.0.1:3011').origin
  await page.route('**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<main></main>' }))
  await page.goto('/dashboard')
  const content = '<h1>Hola, Fixture.</h1><p>2 centros activos · seguimiento en tiempo real</p><h2>Evolución de niños activos</h2>'
  for (const html of [
    '<main></main>',
    `<main data-page-state="loading">${content}</main>`,
    `<main data-page-state="error">${content}</main>`,
    `<main>${content}<p>Cargando centros…</p></main>`,
    `<main>${content}<p role="alert">No se pudo cargar el panel.</p></main>`,
  ]) {
    await page.setContent(html)
    await expect(page.waitForFunction(dashboardIsOperational, { origin }, { timeout: 100 })).rejects.toThrow(/Timeout/)
  }
  for (const attribute of ['', 'data-page-state="ready"']) {
    await page.setContent(`<main ${attribute}>${content}</main>`)
    await page.waitForFunction(dashboardIsOperational, { origin })
  }
})

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
  await expect(band).toContainText('Faltarían 15')
  await expect(band).toContainText('cierre previsto')
  await expect(band.locator('.growth-band__stage')).toContainText('Septiembre 2026')
  await expect(band.locator('.growth-band__facts')).toContainText('Completar las fechas de inicio')
  await expect(band).toContainText('191 niños')
  await auditPage(page, { mobile: true, state: null, scope: '.growth-band' })
  const smallSizes = await band.locator('small, .growth-band__stage, .growth-band__numberline span').evaluateAll(els => els.map(el => parseFloat(getComputedStyle(el).fontSize)))
  expect(smallSizes.every(size => size >= 13)).toBe(true)
  const axe = await new AxeBuilder({ page }).include('.growth-band').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(axe.violations).toEqual([])
  await band.getByRole('button', { name: 'Ver ruta completa' }).click()
  await expect(page.getByRole('status')).toHaveText('Ruta de prueba abierta')
})
