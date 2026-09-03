import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { auditPage } from './helpers/audit-page.js'
import { readR3GrowthReceipt, readR3Manifest } from './helpers/r3-fixture.mjs'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

async function settleLayout(page) {
  await page.evaluate(async () => {
    await document.fonts?.ready
    await Promise.all(document.getAnimations().filter((animation) =>
      animation.effect?.getComputedTiming().iterations !== Infinity
    ).map((animation) => animation.finished.catch(() => {})))
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  })
}

async function expectInsideViewport(locator, page, label) {
  await expect(locator, `${label} debe estar visible`).toBeVisible()
  await settleLayout(page)
  const box = await locator.boundingBox()
  const viewport = page.viewportSize()
  expect(box, `${label} debe tener geometría medible`).not.toBeNull()
  expect(box.x, `${label}: borde izquierdo`).toBeGreaterThanOrEqual(-1)
  expect(box.y, `${label}: borde superior`).toBeGreaterThanOrEqual(-1)
  expect(box.x + box.width, `${label}: borde derecho`).toBeLessThanOrEqual(viewport.width + 1)
  expect(box.y + box.height, `${label}: borde inferior`).toBeLessThanOrEqual(viewport.height + 1)
}

async function expectAxeClean(page, include = null) {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  if (include) builder = builder.include(include)
  const result = await builder.analyze()
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([])
}

async function expectFocusTrap(page, dialog) {
  const focusables = dialog.locator(FOCUSABLE)
  expect(await focusables.count(), 'el diálogo necesita al menos un control enfocable').toBeGreaterThan(0)
  await focusables.last().focus()
  await page.keyboard.press('Tab')
  await expect(focusables.first()).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(focusables.last()).toBeFocused()
}

async function expectDialogContract(page, dialog, label, state = 'ready', scope = null) {
  await expect(dialog).toHaveCount(1)
  await expectInsideViewport(dialog, page, label)
  await expect(dialog.getByRole('button', { name: 'Cerrar diálogo' })).toBeVisible()
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  await expectFocusTrap(page, dialog)

  const body = dialog.locator('.dialog__body')
  await body.evaluate((node) => { node.scrollTop = node.scrollHeight })
  await expect(dialog.locator('.dialog__header')).toBeVisible()
  const footer = dialog.locator('.dialog__footer')
  if (await footer.count()) await expect(footer).toBeVisible()

  await auditPage(page, { mobile: true, state, scope })
  await expectAxeClean(page)
}

function draftText(selector, value) {
  return async (dialog) => {
    const field = dialog.locator(selector.replace('input[type="text"]', 'input:not([type]),input[type="text"]')).first()
    await expect(field).toBeVisible()
    await field.fill(value)
    return async () => expect(field).toHaveValue(value)
  }
}

async function draftFirstNonEmptyOption(dialog) {
  const field = dialog.locator('select').first()
  const value = await field.locator('option:not([value=""])').first().getAttribute('value')
  if (!value) throw new Error('E2E_CENTRO_ID no cumple fixture para borrador del retiro.')
  await field.selectOption(value)
  return async () => expect(field).toHaveValue(value)
}

const INVENTORY = [
  {
    label: 'Aperturar grupo',
    path: '/centro/2/grupos',
    dialogName: 'Aperturar grupo',
    prepare: async (page) => ({ trigger: page.getByRole('button', { name: /Aperturar grupo/i }) }),
    draft: draftText('input[type="text"]', 'R3-borrador-grupo'),
  },
  {
    label: 'Inscribir niño en Grupos',
    path: '/centro/2/grupos',
    dialogName: 'Inscribir niño',
    prepare: async (page) => ({ trigger: page.getByRole('button', { name: 'Inscribir niño', exact: true }) }),
    draft: draftText('input[type="text"]', 'Niño borrador R3'),
  },
  {
    label: 'Plan del niño',
    path: '/centro/2/grupos',
    dialogName: 'Plan de Niño Fixture R3',
    prepare: async (page) => {
      const group = page.locator('[data-grupo="930002"]')
      await expect(group, 'E2E_CENTRO_ID no cumple fixture para Grupo R3').toContainText('Grupo R3')
      await group.focus()
      await group.click()
      const sheet = page.getByRole('dialog', { name: /Grupo R3/i })
      await expect(sheet).toBeVisible()
      const trigger = sheet.getByRole('button', { name: /Ver plan de Niño Fixture R3/i })
      await expect(trigger, 'E2E_CENTRO_ID no cumple fixture para Plan de Niño Fixture R3').toBeVisible()
      return {
        trigger,
        after: async () => {
          await sheet.getByRole('button', { name: 'Cerrar el detalle' }).click()
          await expect(sheet).toBeHidden()
        },
      }
    },
  },
  {
    label: 'Crear clase de prueba',
    path: '/centro/2/eventos',
    dialogName: 'Crear clase de prueba',
    prepare: async (page) => ({ trigger: page.getByRole('button', { name: /Nueva clase de prueba/i }) }),
    draft: draftText('input[type="text"]', 'Clase borrador R3'),
  },
  {
    label: 'Inscribir registro de evento',
    path: '/centro/2/eventos',
    dialogName: 'Inscribir niño',
    prepare: async (page) => {
      const eventRow = page.getByRole('row', { name: /Clase Fixture R3/i }).first()
      await expect(eventRow, 'E2E_CENTRO_ID no cumple fixture para Clase Fixture R3').toBeVisible()
      await eventRow.click()
      await expect(page.getByText('Niño Registro R3')).toBeVisible()
      const trigger = page.getByRole('button', { name: 'Inscribir', exact: true })
      await expect(trigger, 'E2E_CENTRO_ID no cumple fixture para registro pendiente').toBeVisible()
      return { trigger }
    },
    draft: draftText('input[type="text"]', 'Niño Registro R3 borrador'),
  },
  {
    label: 'Retirar desde Cuadro',
    path: '/centro/2/cuadro',
    dialogName: 'Retirar a Niño Fixture R3',
    prepare: async (page) => {
      const groupRow = page.getByRole('row', { name: /Grupo R3/i }).first()
      await expect(groupRow, 'E2E_CENTRO_ID no cumple fixture para Grupo R3 en Cuadro').toBeVisible()
      await groupRow.click()
      const trigger = page.getByRole('button', { name: 'Retirar', exact: true })
      await expect(trigger, 'E2E_CENTRO_ID no cumple fixture para Retirar').toBeVisible()
      return { trigger }
    },
    draft: draftFirstNonEmptyOption,
  },
]

async function loadCase(page, item) {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto(item.path, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#main-content[data-page-state="ready"]')).toHaveCount(1, { timeout: 60_000 })
  await page.evaluate(() => { document.body.style.overflow = 'clip' })
  return item.prepare(page)
}

async function openInventoryDialog(page, item, trigger) {
  await trigger.focus()
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: item.dialogName, exact: true })
  await expect(dialog, `E2E_CENTRO_ID no cumple fixture para ${item.label}`).toBeVisible()
  return dialog
}

for (const item of INVENTORY) {
  test(`diálogo ${item.label} conserva foco, geometría, borrador y cierre`, async ({ page }) => {
      test.setTimeout(120_000)
      const { trigger, after } = await loadCase(page, item)
      const originalOverflow = await page.locator('body').evaluate((node) => node.style.overflow)

      let dialog = await openInventoryDialog(page, item, trigger)
      await expectDialogContract(page, dialog, `${item.label} a 320×568`)
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(trigger).toBeFocused()
      await expect.poll(() => page.locator('body').evaluate((node) => node.style.overflow)).toBe(originalOverflow)

      dialog = await openInventoryDialog(page, item, trigger)
      await page.locator('.dialog-backdrop').last().click({ position: { x: 4, y: 4 } })
      await expect(dialog).toBeHidden()
      await expect(trigger).toBeFocused()
      await expect.poll(() => page.locator('body').evaluate((node) => node.style.overflow)).toBe(originalOverflow)

      await page.setViewportSize({ width: 390, height: 844 })
      dialog = await openInventoryDialog(page, item, trigger)
      const assertDraft = item.draft ? await item.draft(dialog) : null
      const eventTab = item.label === 'Crear clase de prueba' ? dialog.getByRole('tab', { name: 'Precio y Pago' }) : null
      if (eventTab) await eventTab.click()
      await page.setViewportSize({ width: 844, height: 390 })
      if (eventTab) {
        await expect(eventTab).toHaveAttribute('aria-selected', 'true')
        await dialog.getByRole('tab', { name: 'Información' }).click()
      }
      if (assertDraft) await assertDraft()
      await expectDialogContract(page, dialog, `${item.label} a 844×390`)
      await page.setViewportSize({ width: 390, height: 844 })
      if (assertDraft) await assertDraft()
      await expectInsideViewport(dialog, page, `${item.label} tras volver a 390×844`)
      await auditPage(page, { mobile: true })
      await expectAxeClean(page)
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(trigger).toBeFocused()
      await expect.poll(() => page.locator('body').evaluate((node) => node.style.overflow)).toBe(originalOverflow)

      await after?.()
      await page.evaluate(() => { document.body.style.overflow = '' })
  })
}

test('menú de Eventos se mide, queda acotado y restaura el foco', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/centro/2/eventos')
  const trigger = page.getByRole('button', { name: 'Acciones de Clase Fixture R3' })
  await expect(trigger).toBeVisible()
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  const menu = page.getByRole('menu', { name: 'Acciones de Clase Fixture R3' })
  await expectInsideViewport(menu, page, 'menú de acciones a 320 px')
  await expect(menu.getByRole('menuitem').first()).toBeFocused()
  await auditPage(page, { mobile: true })
  await expectAxeClean(page)

  await page.setViewportSize({ width: 844, height: 390 })
  await expectInsideViewport(menu, page, 'menú de acciones tras rotar')
  await page.setViewportSize({ width: 320, height: 568 })
  await expectInsideViewport(menu, page, 'menú de acciones al volver')

  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(trigger).toBeFocused()
})

test('sheet modal conserva vista, foco, inert y locks apilados al rotar', async ({ page }) => {
  const { trigger } = await loadCase(page, INVENTORY[2])
  const sheet = page.getByRole('dialog', { name: /Grupo R3/i })
  const groupTrigger = page.locator('[data-grupo="930002"]')
  const close = sheet.getByRole('button', { name: 'Cerrar el detalle' })
  await expect(close).toBeFocused()
  await expectInsideViewport(sheet, page, 'sheet 320×568')
  await auditPage(page, { mobile: true, scope: '.mobile-sheet' })
  await expectFocusTrap(page, sheet)
  expect(await page.locator('main').evaluate((node) => Boolean(node.closest('[inert]')))).toBe(true)
  await trigger.click()
  const plan = page.getByRole('dialog', { name: 'Plan de Niño Fixture R3' })
  await expect(plan).toBeVisible()
  expect(await sheet.evaluate((node) => Boolean(node.closest('[inert]')))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(plan).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  await sheet.getByRole('tab', { name: /Itinerario/ }).click()
  for (const size of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size)
    await expectInsideViewport(sheet, page, 'sheet tras rotación')
    await expect(sheet.getByRole('tab', { name: /Itinerario/ })).toHaveAttribute('aria-selected', 'true')
    await expectFocusTrap(page, sheet)
    await auditPage(page, { mobile: true, scope: '.mobile-sheet' })
    await expectAxeClean(page)
  }
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(groupTrigger).toBeFocused()
  await expect(page.locator('body')).toHaveCSS('overflow', 'clip')
  await groupTrigger.click()
  await expect(sheet).toBeVisible()
  await page.setViewportSize({ width: 844, height: 390 })
  await page.locator('.grp-backdrop').click({ position: { x: 4, y: 4 } })
  await expect(sheet).toBeHidden()
  await expect(groupTrigger).toBeFocused()
  await expect(page.locator('body')).toHaveCSS('overflow', 'clip')
})

test('un formulario pendiente bloquea Escape, X, Cancelar y backdrop sin escribir', async ({ page }) => {
  const { trigger } = await loadCase(page, INVENTORY[0])
  const dialog = await openInventoryDialog(page, INVENTORY[0], trigger)
  await dialog.getByLabel('Fecha de inicio de clases *').fill('2026-10-01')
  let release
  let intercepted = false
  const held = new Promise((resolve) => { release = resolve })
  await page.route('**/centro/2/grupos', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    intercepted = true
    await held
    await route.abort('failed')
  })
  try {
    await dialog.getByRole('button', { name: 'Aperturar grupo', exact: true }).click()
    await expect.poll(() => intercepted).toBe(true)
    await expect(dialog).toHaveAttribute('aria-busy', 'true')
    await expect(dialog.getByRole('button', { name: 'Cerrar diálogo' })).toBeDisabled()
    await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    await page.keyboard.press('Escape')
    await page.locator('.dialog-backdrop').click({ position: { x: 4, y: 4 } })
    await expect(dialog).toBeVisible()
    release()
    await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeEnabled()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await page.unrouteAll({ behavior: 'wait' })
    await trigger.click()
    await expect(dialog).toBeVisible()
    await expect(dialog).not.toHaveAttribute('aria-busy', 'true')
  } finally {
    release()
    await page.unrouteAll({ behavior: 'wait' })
  }
})

test('tour recalcula tarjeta y foco al avanzar y rotar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/centro/2?tour=meta&paso=1')
  let tour = page.getByRole('dialog', { name: 'Lo primero que ves' })
  await expect(tour).toBeVisible()
  await expect(tour.getByRole('heading', { name: 'Lo primero que ves' })).toBeFocused()
  await expectInsideViewport(tour, page, 'tour paso 1')
  await expectAxeClean(page, '.tour-card')

  await tour.getByRole('button', { name: /Siguiente/i }).click()
  tour = page.getByRole('dialog', { name: 'Tus metas por rol' })
  await expect(tour).toBeVisible()
  await expect(tour.getByRole('heading', { name: 'Tus metas por rol' })).toBeFocused()

  await page.setViewportSize({ width: 844, height: 390 })
  await expectInsideViewport(tour, page, 'tour a 844×390')
  await expectAxeClean(page, '.tour-card')
  await page.setViewportSize({ width: 390, height: 844 })
  await expectInsideViewport(tour, page, 'tour al volver a 390×844')

  await page.keyboard.press('Escape')
  await expect(tour).toBeHidden()
})

test('Escape cierra primero el formulario y después el tour', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/centro/2/grupos?tour=aperturar&paso=1')
  const tour = page.getByRole('dialog', { name: 'Abre el formulario' })
  await expect(tour).toBeVisible()
  await page.getByRole('button', { name: /Aperturar grupo/i }).click()

  const form = page.getByRole('dialog', { name: 'Aperturar grupo', exact: true })
  await expect(form).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(form).toBeHidden()
  await expect(page.locator('.tour-card')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.tour-card')).toBeHidden()
})

test('@growth-local GrowthBriefing usa cierre neutral y conserva el recibo shown', async ({ page }) => {
  test.setTimeout(120_000)
  const manifest = await readR3Manifest()
  expect(manifest.ids.centerGrowth).toBe(3)

  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const trigger = document.querySelector('.skip-link')
      if (trigger && !document.querySelector('[role="dialog"]')) {
        document.body.style.overflow = 'clip'
        trigger.focus()
        observer.disconnect()
      }
    })
    observer.observe(document, { childList: true, subtree: true })
  })
  await page.goto('/centro/3', { waitUntil: 'domcontentloaded' })

  const dialog = page.getByRole('dialog', { name: /Faltan|El reto ahora/i })
  await expect(dialog).toBeVisible({ timeout: 60_000 })
  const title = dialog.getByRole('heading')
  await expect(title.locator('[tabindex="-1"]')).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Ver plan', exact: true })).toBeFocused()
  await expectDialogContract(page, dialog, 'GrowthBriefing', null, '.growth-briefing')
  expect(await page.locator('main').evaluate((node) => Boolean(node.closest('[inert]')))).toBe(true)
  const backgroundOverflow = await page.locator('main').evaluate((node) => ({
    selector: 'main.main', clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
    documentWidth: document.documentElement.scrollWidth, viewport: window.innerWidth,
  }))
  test.info().annotations.push({ type: 'R8-background-geometry', description: JSON.stringify(backgroundOverflow) })
  console.log('Handoff R8: geometría del fondo inert', backgroundOverflow)

  const receipt = () => readR3GrowthReceipt(manifest)
  await expect.poll(async () => Boolean((await receipt())?.shown_at), { timeout: 30_000 }).toBe(true)

  await page.setViewportSize({ width: 844, height: 390 })
  await expectInsideViewport(dialog, page, 'GrowthBriefing a 844×390')
  await page.setViewportSize({ width: 390, height: 844 })
  await expectInsideViewport(dialog, page, 'GrowthBriefing al volver')

  const previous = page.locator('.skip-link')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(previous).toBeFocused()
  await expect.poll(() => page.locator('body').evaluate((node) => node.style.overflow)).toBe('clip')
  const neutral = await receipt()
  expect(neutral?.shown_at).toBeTruthy()
  expect(neutral?.acknowledged_at).toBeNull()
  expect(neutral?.snoozed_until).toBeNull()
})

for (const scenario of [
  { item: INVENTORY[3], submit: 'Crear clase de prueba', fill: async (dialog) => {
    await dialog.getByLabel('Nombre de la clase de prueba *').fill('Borrador abortado')
    await dialog.locator('input[type="datetime-local"]').first().fill('2026-10-01T15:00')
    return async () => expect(dialog.getByLabel('Nombre de la clase de prueba *')).toHaveValue('Borrador abortado')
  } },
  { item: INVENTORY[4], submit: 'Inscribir', fill: async (dialog) => {
    await dialog.getByLabel('Origen del nuevo ingreso *').selectOption('centro')
    return async () => expect(dialog.getByLabel('Origen del nuevo ingreso *')).toHaveValue('centro')
  } },
  { item: INVENTORY[5], submit: 'Retirar del cuadro', fill: draftFirstNonEmptyOption },
]) {
  test(`rechazo de guardado desbloquea ${scenario.item.label} y conserva borrador`, async ({ page }) => {
    const { trigger } = await loadCase(page, scenario.item)
    const dialog = await openInventoryDialog(page, scenario.item, trigger)
    const expectDraft = await scenario.fill(dialog)
    let intercepted = false
    await page.route(`**${scenario.item.path}`, async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      intercepted = true
      await route.abort('failed')
    })
    await dialog.getByRole('button', { name: scenario.submit, exact: true }).click()
    await expect.poll(() => intercepted).toBe(true)
    await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeEnabled()
    await expect(dialog.locator('.alert--error')).toContainText(/No se pudo guardar/)
    await expectDraft()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })
}

test('scrollers operativos son regiones semánticas de TableScroller', async ({ page }) => {
  for (const path of ['/centro/2/cuadro', '/centro/2/grupos']) {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto(path)
    await expect(page.locator('#main-content[data-page-state="ready"]')).toHaveCount(1)
    if (path.endsWith('/grupos')) await page.getByRole('button', { name: 'Horarios', exact: true }).click()
    const scrollers = page.locator('[data-horizontal-scroll]')
    expect(await scrollers.count()).toBeGreaterThan(0)
    for (const scroller of await scrollers.all()) {
      await expect(scroller).toHaveAttribute('role', 'region')
      await expect(scroller).toHaveAttribute('tabindex', '0')
      await expect(scroller).toHaveAttribute('aria-label', /.+/)
      await expect(scroller).toHaveClass(/table-scroller/)
    }
  }
})
