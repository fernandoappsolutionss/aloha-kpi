import { test, expect } from '@playwright/test'
import { auditPage } from './helpers/audit-page.js'

test.use({ screenshot: 'off', trace: 'off', video: 'off' })
for (const [width, height] of [[320,568], [375,667], [390,844], [430,932], [768,1024], [1440,900]]) {
  test(`coordinador conserva alcance, menú y opciones exactas a ${width}x${height}`, async ({ browser }, info) => {
    const context = await browser.newContext({ baseURL: info.project.use.baseURL, storageState: 'tests/e2e/.auth/coordinator.json', viewport: { width, height } })
    try {
      const page = await context.newPage()
      await page.goto('/dashboard/usuarios')
      await expect(page.locator('#main-content[data-page-state="ready"]')).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Usuarios de mis centros' })).toBeVisible()
      await expect(page.getByRole('button', { name: /Eliminar/i })).toHaveCount(0)
      // Solo reportar la lista de correos filtrados; jamás volcar HTML/Flight.
      const forbidden = ['E2E_ADMIN_EMAIL', 'E2E_COORDINATOR_EMAIL'].map(key => process.env[key])
      expect(forbidden.every(Boolean)).toBe(true)
      const html = await page.content()
      expect(forbidden.filter(email => html.includes(email)), 'Correos fuera del alcance presentes en HTML').toEqual([])
      if (width <= 1024) await page.getByRole('button', { name: 'Abrir menú', exact: true }).click()
      await expect(page.getByRole('link', { name: 'Usuarios', exact: true })).toBeVisible()
      for (const href of ['/dashboard/centros', '/dashboard/metas', '/dashboard/entrenamiento', '/dashboard/zoho']) {
        await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0)
      }
      if (width <= 1024) await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Crear usuario', exact: true }).click()
      const editor = page.getByRole('form', { name: 'Editor de usuario' })
      await expect(editor).toBeVisible()
      expect(await editor.getByLabel('Rol', { exact: true }).locator('option').evaluateAll(nodes => nodes.map(n => n.value))).toEqual(['administradora', 'asistente'])
      expect(await editor.getByLabel('Centro', { exact: true }).locator('option').evaluateAll(nodes => nodes.map(n => n.value).sort())).toEqual([process.env.E2E_CENTRO_ID, process.env.E2E_COORDINATOR_SECOND_CENTER_ID].sort())
      await expect(page.locator('.users-table')).toBeVisible({ visible: width >= 768 })
      await expect(page.locator('.users-cards')).toBeVisible({ visible: width < 768 })
      await auditPage(page, { mobile: width <= 1024 })
    } finally { await context.close() }
  })
}
