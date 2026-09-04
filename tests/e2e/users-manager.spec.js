import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { auditPage } from './helpers/audit-page.js'

test.use({ screenshot: 'off', trace: 'off', video: 'off' })

test('gerencia conserva tabla, tarjetas, editor accesible y eliminación cancelada', async ({ page }, info) => {
  await page.goto('/dashboard/usuarios')
  await expect(page.locator('#main-content[data-page-state="ready"]')).toBeVisible()
  const phone = info.project.use.viewport.width < 768
  const mobile = info.project.use.viewport.width <= 1024
  await expect(page.locator('.users-table')).toBeVisible({ visible: !phone })
  await expect(page.locator('.users-cards')).toBeVisible({ visible: phone })
  if (!phone) expect(await page.locator('.users-table').evaluate(el => getComputedStyle(el).display)).toBe('table')
  const own = page.locator(`[data-user-email="${process.env.E2E_ADMIN_EMAIL}"]:visible`)
  await expect(own).toBeVisible()
  await expect(own.getByRole('button', { name: 'Eliminar', exact: true })).toHaveCount(0)
  const filter = page.getByLabel('Filtrar usuarios por centro')
  const options = await filter.locator('option').evaluateAll(nodes => nodes.map(n => n.value))
  await filter.selectOption(options[1])
  const count = await page.locator('[data-user-email]:visible').count()
  await expect(page.locator('.h-sub').first()).toHaveText(`${count} cuentas`)
  await filter.selectOption('all')
  await page.getByRole('button', { name: 'Crear usuario', exact: true }).click()
  const editor = page.getByRole('form', { name: 'Editor de usuario' })
  for (const [label, name] of [['Nombre', 'nombre'], ['Correo', 'email'], ['Rol', 'rol']]) {
    await expect(editor.getByLabel(label, { exact: true })).toHaveAttribute('name', name)
    await expect(editor.getByLabel(label, { exact: true })).toHaveAttribute('required', '')
  }
  await expect(editor.getByLabel('Nombre', { exact: true })).toHaveAttribute('autocomplete', 'name')
  await expect(editor.getByLabel('Correo', { exact: true })).toHaveAttribute('type', 'email')
  await expect(editor.getByLabel('Correo', { exact: true })).toHaveAttribute('autocomplete', 'email')
  await expect(editor.getByLabel('Correo', { exact: true })).toHaveAttribute('spellcheck', 'false')
  await editor.getByLabel('Rol', { exact: true }).selectOption('coordinador')
  expect(await editor.getByRole('checkbox').count()).toBeGreaterThanOrEqual(2)
  await editor.getByRole('checkbox').first().check()
  await auditPage(page, { mobile })
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(axe.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([])
  await editor.getByRole('button', { name: 'Cancelar', exact: true }).click()
  const remove = page.getByRole('button', { name: 'Eliminar', exact: true }).first()
  await remove.click()
  const dialog = page.getByRole('dialog', { name: 'Eliminar usuario', exact: true })
  await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused()
  await expect(dialog.getByRole('button', { name: 'Confirmar eliminación', exact: true })).toBeVisible()
  await auditPage(page, { mobile, scope: '[role="dialog"]' })
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(remove).toBeFocused()
  await auditPage(page, { mobile })
})
