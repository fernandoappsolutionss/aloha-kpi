import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { auditPage, capturePage } from './helpers/audit-page.js'

test.beforeEach(async ({ page }) => {
  if (process.env.E2E_R6_COMPARISONS !== '1' || process.env.RESPONSIVE_BASE_URL) {
    throw new Error('R6 requiere su gate local disposable; no navegar en remoto.')
  }
  await page.addInitScript(() => localStorage.setItem('ts_panel_filter', JSON.stringify({ mode: 'trimestre', year: 2026, quarter: 3 })))
})

async function audit(page, width) {
  await auditPage(page, { mobile: width <= 1024 })
  await page.evaluate(async () => Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))))
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([])
  await page.evaluate(async () => { document.activeElement?.blur(); window.scrollTo(0, 0); await new Promise(resolve => requestAnimationFrame(resolve)) })
  await capturePage(page, { name: new URL(page.url()).pathname, testInfo: test.info() })
}

async function scroller(page, name) {
  const region = page.getByRole('region', { name, exact: true })
  await expect(region).toHaveAttribute('data-horizontal-scroll', '')
  await expect(page.locator('main [data-horizontal-scroll]')).toHaveCount(1)
  const tableWidth = (await region.locator('table').boundingBox()).width
  expect(tableWidth, 'la tabla conserva su anchura de comparación, sin expansión max-content').toBeCloseTo(name === 'Crecimiento por centro' ? 1120 : 1100, 0)
  expect((await region.locator('tbody td').first().boundingBox()).width, 'la columna sticky no ocupa todo el móvil').toBeLessThanOrEqual(200)
  const dims = await region.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }))
  if (dims.scroll > dims.client) {
    await region.evaluate(el => { el.scrollLeft = 180 })
    expect(await region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0)
    const first = region.locator('tbody td').first()
    await expect(first).toHaveCSS('position', 'sticky')
    expect(Math.abs((await first.boundingBox()).x - (await region.boundingBox()).x)).toBeLessThanOrEqual(2)
    await region.evaluate(el => { el.scrollLeft = 0 })
  }
  if (page.viewportSize().width <= 1025) expect(dims.scroll).toBeGreaterThan(dims.client)
}

test('Crecimiento mantiene única tabla local, controles y banda del motor dentro del viewport', async ({ page }) => {
  await page.goto('/dashboard/crecimiento')
  await expect(page.locator('#main-content[data-page-state="ready"]')).toHaveCount(1)
  await expect(page.locator('tbody')).toContainText('Centro Fixture R6 Comparaciones')
  await scroller(page, 'Crecimiento por centro')
  await page.getByRole('searchbox', { name: 'Buscar centro' }).fill('Fixture R6')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  expect(await page.locator('.growth-admin-gap > strong').evaluate(el => el.getBoundingClientRect().height <= parseFloat(getComputedStyle(el).lineHeight) + 1), 'el número de niños no se parte entre líneas').toBe(true)
  await expect(page.locator('tbody').getByRole('link', { name: /Abrir ruta de/ })).toHaveAttribute('href', '/centro/910006/ruta-nivel')
  await audit(page, page.viewportSize().width)
})

test('Crecimiento muestra opciones largas completas y apila los filtros en móvil', async ({ page }) => {
  await page.goto('/dashboard/crecimiento')
  await expect(page.locator('#main-content[data-page-state="ready"]')).toHaveCount(1)
  await page.evaluate(async () => { await document.fonts.ready })
  for (const [name, value, text] of [
    ['Filtrar por calidad de datos', 'medium', 'Datos por revisar'],
    ['Filtrar por prioridad', 'capacity', 'Revisar capacidad'],
    ['Ordenar centros', 'growth', 'Mayor crecimiento'],
  ]) {
    const select = page.getByRole('combobox', { name, exact: true })
    await select.selectOption(value)
    await expect(select).toHaveValue(value)
    const rendered = await select.evaluate(el => {
      const style = getComputedStyle(el)
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const text = el.selectedOptions[0].textContent
      const letterSpacing = parseFloat(style.letterSpacing) || 0
      return {
        text,
        required: context.measureText(text).width + letterSpacing * Math.max(0, text.length - 1),
        available: el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      }
    })
    expect(rendered.text).toBe(text)
    expect(rendered.available, `${text}: el texto cabe sin invadir el padding de la flecha`).toBeGreaterThanOrEqual(rendered.required)
  }
  const controls = page.locator('.growth-admin-controls')
  if (page.viewportSize().width < 768) {
    const container = await controls.boundingBox()
    const boxes = await controls.locator('input, select').evaluateAll(els => els.map(el => {
      const box = el.getBoundingClientRect()
      return { x: box.x, y: box.y, width: box.width, bottom: box.bottom }
    }))
    expect(boxes).toHaveLength(4)
    for (let i = 0; i < boxes.length; i++) {
      expect(Math.abs(boxes[i].x - container.x)).toBeLessThanOrEqual(1)
      expect(Math.abs(boxes[i].width - container.width), 'cada filtro ocupa el ancho completo').toBeLessThanOrEqual(1)
      if (i) expect(boxes[i].y, 'los filtros no comparten fila').toBeGreaterThanOrEqual(boxes[i - 1].bottom)
    }
  }
  await auditPage(page, { mobile: true })
  await controls.scrollIntoViewIfNeeded()
  await page.evaluate(() => document.activeElement?.blur())
  await capturePage(page, { name: 'crecimiento-filtros-largos', testInfo: test.info() })
})

test('Historial presenta tres meses cerrados y filtros con etiquetas, sin tabla artificial', async ({ page }) => {
  await page.goto('/dashboard/historial')
  await page.getByLabel('Centro', { exact: true }).selectOption('910006')
  await page.getByLabel('Trimestre', { exact: true }).selectOption('3')
  await expect(page.locator('#main-content[data-page-state="ready"]')).toHaveCount(1)
  await expect(page.locator('main [data-horizontal-scroll]')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Ver centro Centro Fixture R6 Comparaciones' })).toBeVisible()
  const months = page.locator('.history-months').first()
  for (const label of ['Julio', 'Agosto', 'Septiembre']) await expect(months.getByText(label, { exact: true })).toBeVisible()
  for (const count of ['104', '109', '115']) await expect(months.getByText(count, { exact: true })).toBeVisible()
  const width = page.viewportSize().width
  const boxes = await months.locator(':scope > div').evaluateAll(els => els.map(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })))
  expect(new Set(boxes.map(b => Math.round(b.x))).size).toBe(width < 768 ? 1 : width <= 1024 ? 2 : 3)
  await audit(page, width)
})

test('Entrenamiento conserva completo, tour y quiz con módulos nombrados y reset accesible', async ({ page }) => {
  await page.goto('/dashboard/entrenamiento')
  await page.getByLabel('Filtrar por centro').selectOption('910006')
  await expect(page.locator('#main-content[data-page-state="ready"]')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Quién completó el entrenamiento' })).toBeVisible()
  await scroller(page, 'Progreso de entrenamiento')
  await expect(page.getByRole('columnheader', { name: /^Módulo 1:/ })).toHaveCount(1)
  const row = page.locator('tbody tr').filter({ hasText: 'Administradora Fixture R6' })
  await expect(row).toContainText('✓')
  await expect(row.getByRole('cell', { name: 'tour', exact: true })).toHaveCount(1)
  await expect(row.getByRole('cell', { name: 'quiz', exact: true })).toHaveCount(1)
  await expect(row.getByRole('button', { name: 'Reiniciar progreso de Administradora Fixture R6' })).toHaveCount(1)
  await audit(page, page.viewportSize().width)
})

test('Dashboard mide el SVG con su wrapper y expone toda la serie como texto fuera de img', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.locator('#main-content[data-page-state="ready"]')).toHaveCount(1, { timeout: 15_000 })
  const chart = page.getByRole('img', { name: 'Evolución de niños activos', exact: true })
  await expect(chart).toBeVisible()
  const svg = chart.locator('svg.recharts-surface')
  await expect(svg).toBeVisible()
  const legend = page.getByRole('group', { name: 'Datos de evolución de niños activos' })
  await expect(legend).toBeVisible()
  expect(await legend.evaluate(el => Boolean(el.closest('[role="img"]')))).toBe(false)
  for (const month of ["Jul '26", "Ago '26", "Sep '26"]) await expect(legend).toContainText(month)
  // Comparar la alternativa textual con el valor real que expone cada punto.
  const entries = legend.locator(':scope > span')
  const dots = chart.locator('.recharts-area-dots circle')
  await expect(dots).toHaveCount(3)
  for (let i = 0; i < 3; i++) {
    const value = await entries.nth(i).locator('strong').innerText()
    await dots.nth(i).hover({ force: true })
    await expect(chart.locator('.recharts-tooltip-wrapper')).toContainText(`Niños: ${value}`)
  }
  const originalWidth = page.viewportSize().width
  for (const targetWidth of [originalWidth, Math.max(320, originalWidth - 50), originalWidth]) {
    await page.setViewportSize({ width: targetWidth, height: 900 })
    await expect.poll(async () => Math.abs((await chart.boundingBox()).width - (await svg.boundingBox()).width)).toBeLessThanOrEqual(1)
    expect((await svg.boundingBox()).width).toBeLessThanOrEqual(targetWidth)
  }
  await audit(page, page.viewportSize().width)
})

for (const path of ['/dashboard/crecimiento', '/dashboard/historial', '/dashboard/entrenamiento']) {
  test(`${path} distingue carga y error sin presentar vacío`, async ({ page }) => {
    let release
    let intercepted = false
    const gate = new Promise(resolve => { release = resolve })
    await page.route(`**${path}`, async route => {
      if (route.request().method() !== 'POST') return route.continue()
      intercepted = true
      await gate
      await route.fulfill({ status: 500, contentType: 'text/plain', body: 'Error local R6' })
    })
    await page.goto(path)
    await expect(page.locator('#main-content[data-page-state="loading"]')).toHaveCount(1)
    await expect(page.locator('main').getByRole('status')).toBeVisible()
    await expect.poll(() => intercepted).toBe(true)
    release()
    await expect(page.locator('#main-content[data-page-state="error"]')).toHaveCount(1)
    await expect(page.locator('main').getByRole('alert')).toBeVisible()
    await expect(page.getByText('No hay registros con los filtros seleccionados')).toHaveCount(0)
  })
}

test('@coordinator bloquea Entrenamiento por URL con contexto fresco', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, storageState: 'tests/e2e/.auth/coordinator.json' })
  try {
    const page = await context.newPage()
    await page.goto('/dashboard/entrenamiento')
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { name: 'Quién completó el entrenamiento' })).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Progreso de entrenamiento' })).toHaveCount(0)
  } finally { await context.close() }
})
