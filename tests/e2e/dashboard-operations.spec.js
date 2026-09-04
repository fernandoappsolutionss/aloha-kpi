import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { auditPage, capturePage } from './helpers/audit-page.js'

const routes = ['/dashboard', '/dashboard/ranking', '/dashboard/alertas', '/dashboard/reporte', '/dashboard/metas', '/dashboard/centros', '/dashboard/zoho']
const tableRoutes = ['/dashboard', '/dashboard/ranking', '/dashboard/reporte', '/dashboard/centros']

for (const path of routes) {
  test(`${path} conserva operación y accesibilidad sin escrituras`, async ({ page }, info) => {
    await page.goto(path)
    await expect(page.locator('#main-content[data-page-state="ready"]')).toHaveCount(1)
    const phone = info.project.use.viewport.width < 768
    if (tableRoutes.includes(path)) {
      const desktop = page.locator('.desktop-only.operational-table')
      const mobile = page.locator('.mobile-only.operational-list')
      await expect(phone ? mobile : desktop).toBeVisible()
      await expect(phone ? desktop : mobile).toBeHidden()
      expect(await desktop.locator('tbody tr').count(), 'Fixture R5 requiere al menos dos centros').toBeGreaterThanOrEqual(2)
      expect(await mobile.locator('.operational-card').count(), 'Fixture R5 requiere tarjetas reales').toBeGreaterThanOrEqual(2)
      await expect(desktop.locator('table caption')).toHaveCount(1)
    }
    if (path === '/dashboard') {
      const surface = page.locator(phone ? '.mobile-only.operational-list' : '.desktop-only.operational-table')
      await expect(surface.getByRole('link', { name: /Ver ranking de/ }).first()).toBeVisible()
      for (const field of ['Administradora', 'Niños', 'N/grupo', 'Nuevos', 'Deserción', 'Cobranza', 'Cumplimiento', 'Tendencia', 'Nivel']) {
        if (phone) await expect(surface.locator('dt').filter({ hasText: new RegExp(`^${field}$`) }).first()).toBeVisible()
      }
    }
    if (path === '/dashboard/alertas') expect(await page.locator('.operations-alert').count(), 'Fixture R5 requiere una alerta').toBeGreaterThan(0)
    if (path === '/dashboard/centros') {
      await expect(page.locator('.center-team:visible').first()).toContainText('Coordinador')
      await expect(page.locator('.center-team:visible').filter({ hasText: 'pendiente' }).first()).toBeVisible()
      if (phone) {
        const card = page.locator('.mobile-only .operational-card').first()
        const edit = await card.getByRole('button', { name: /Editar/ }).boundingBox()
        const actions = await card.locator('.operational-card__actions').boundingBox()
        expect(Math.abs(edit.width - actions.width), 'Acción de centro ocupa ancho disponible').toBeLessThanOrEqual(1)
      }
      await page.getByRole('button', { name: '+ Nuevo centro', exact: true }).click()
      await expect(page.getByRole('form', { name: 'Crear nuevo centro' })).toBeVisible()
      await page.getByLabel('Nombre del centro').fill('Solo estado local — no guardar')
    }
    if (path === '/dashboard/metas') {
      await expect(page.locator('main input[type="number"]')).toHaveCount(5)
      await page.getByLabel('Meta nuevos ingresos por mes', { exact: true }).fill('21')
      await expect(page.getByRole('status')).toContainText('Cambios sin guardar')
    }
    if (path === '/dashboard/zoho') await expect(page.getByRole('status')).toContainText('Desconectado')
    if (phone) {
      for (const grid of await page.locator('main .responsive-grid, main .form-grid').all()) {
        expect(await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 'Grid operativo de una columna en teléfono').toBe(1)
      }
      if (path === '/dashboard/reporte') {
        const action = await page.getByRole('button', { name: 'Exportar CSV' }).boundingBox()
        const container = await page.locator('.operations-actions').boundingBox()
        expect(Math.abs(action.width - container.width)).toBeLessThanOrEqual(1)
      }
    }
    await auditPage(page, { mobile: info.project.use.viewport.width <= 1024 })
    await page.evaluate(async () => Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))))
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([])
    if (process.env.E2E_CAPTURE_DIR) {
      await page.evaluate(async () => { document.activeElement?.blur(); window.scrollTo(0, 0); await new Promise(resolve => requestAnimationFrame(resolve)) })
      await capturePage(page, { name: path, testInfo: info })
    }
    if (path === '/dashboard/centros') await page.getByRole('button', { name: '✕ Cancelar', exact: true }).click()
  })

  test(`${path} distingue carga y error de lectura sin presentar vacíos`, async ({ page }) => {
    let release
    let intercepted = false
    const gate = new Promise(resolve => { release = resolve })
    await page.route(`**${path}`, async route => {
      if (route.request().method() !== 'POST') return route.continue()
      intercepted = true
      await gate
      await route.fulfill({ status: 500, contentType: 'text/plain', body: 'Error local de lectura R5' })
    })
    await page.goto(path)
    await expect(page.locator('#main-content[data-page-state="loading"]')).toHaveCount(1)
    await expect.poll(() => intercepted).toBe(true)
    release()
    await expect(page.locator('#main-content[data-page-state="error"]')).toHaveCount(1)
    await expect(page.locator('main').getByRole('alert')).toBeVisible()
    await expect(page.locator('main .operational-card, main .kpi')).toHaveCount(0)
  })
}

test('@coordinator coordinador no accede a configuración global por URL ni drawer', async ({ page }) => {
  for (const path of ['/dashboard/metas', '/dashboard/centros', '/dashboard/zoho']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { name: /Metas globales|Gestión de centros|Conexión con Zoho/ })).toHaveCount(0)
  }
  await page.getByRole('button', { name: 'Abrir menú', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Usuarios', exact: true })).toBeVisible()
  for (const href of ['/dashboard/centros', '/dashboard/metas', '/dashboard/entrenamiento', '/dashboard/zoho']) await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0)
})
