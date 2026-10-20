// Ejecutar con administradora-runtime.mjs activo; escribe solo en su base desechable.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium, expect } from '@playwright/test'
import { extractText, getDocumentProxy } from 'unpdf'
import pg from 'pg'
const out = resolve('.scratch/administradora-e2e')
const r = JSON.parse(await readFile(resolve(out, 'runtime.json'), 'utf8'))
assert.equal(new URL(r.baseURL).hostname, '127.0.0.1')
assert.equal(new URL(r.database).hostname, '127.0.0.1')
assert.equal(new URL(r.database).pathname, '/administradora_test')
const db = new pg.Pool({ connectionString: r.database })
await db.query('TRUNCATE semana_planes, semana_cuotas, semana_juegos RESTART IDENTITY CASCADE')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
process.once('SIGTERM', async () => { await browser.close(); await db.end(); process.exit(1) })
const checks = [], errors = [], contexts = []
const check = text => { checks.push(text); console.log('PASS', text) }
const pageFor = async email => {
  const context = await browser.newContext({ baseURL: r.baseURL, viewport: { width: Number(process.argv[2] || 1440), height: 1000 } }); contexts.push(context)
  context.setDefaultTimeout(30000)
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('/login')
  await expect(page.locator('[data-hydrated=true]')).toBeVisible()
  await page.locator('input[type=email]').fill(email)
  await page.locator('input[type=password]').fill(r.password)
  await page.getByRole('button', { name: 'Ingresar al sistema', exact: true }).click()
  await page.waitForURL(url => url.pathname !== '/login', { timeout: 60000 })
  return page
}
const nav = async (page, name) => {
  await page.getByRole('navigation', { name: 'Pasos de mi semana' }).getByRole('link', { name }).click()
  await expect(page.locator('#main-content[data-page-state=ready]')).toBeVisible({ timeout: 60000 })
}
let page
try {
  page = await pageFor('admin@e2e.invalid')
  assert.equal(await page.evaluate(() => localStorage.getItem('aloha_rol')), 'administradora')
  await page.goto('/centro/2/semana')
  await expect(page.getByRole('heading', { name: 'Tu avance, día a día' })).toBeVisible({ timeout: 60000 })
  check('Login real de administradora, sesión y carga automática de su semana')
  await page.getByText('Metas y cuotas · editar y enviar a coordinación', { exact: true }).click()
  await page.getByLabel('Cuota de Nuevos inscritos', { exact: true }).fill('7')
  await page.getByRole('button', { name: 'Guardar cuotas', exact: true }).click()
  await expect(page.getByText('Cuotas guardadas para aprobación.', { exact: true })).toBeVisible({ timeout: 30000 })
  assert.equal(await page.getByRole('button', { name: 'Aprobar cuotas', exact: true }).count(), 0)
  const daily = page.getByRole('region', { name: 'Avance diario de Nuevos inscritos' })
  await expect(daily.getByRole('row')).toHaveCount(8)
  assert.equal((await daily.locator('tbody tr td:nth-child(3)').allTextContents()).reduce((n, value) => n + Number(value), 0), 7)
  const today = daily.locator('.semana-diaria--hoy')
  await expect(today.locator('td').nth(0)).toHaveText('2')
  check('Cuota semanal 7 guardada; siete cuotas diarias suman 7; dos inscripciones reales del día')
  await nav(page, /Condición y fórmula/)
  await page.getByRole('button', { name: 'Inexistencia', exact: true }).click()
  await page.getByLabel('Datos y razonamiento de la condición', { exact: true }).fill('Prueba QA: el centro inicia su gestión. Debemos establecer comunicación y conocer lo que se necesita.')
  await page.getByRole('button', { name: 'Guardar condición', exact: true }).click()
  const formula = page.locator('[data-tour="semana.formula"]')
  await expect(formula.getByLabel('Acción concreta')).toHaveCount(4, { timeout: 30000 })
  for (let i = 0; i < 4; i++) {
    const form = formula.locator('form').nth(i)
    await form.getByLabel('Acción concreta').fill(`Acción QA paso ${i + 1}`)
    await form.getByLabel('Responsable', { exact: true }).fill('Administradora QA')
    await form.getByLabel('Fecha', { exact: true }).fill(r.hoy)
    await form.getByLabel('Evidencia esperada', { exact: true }).fill(`Registro QA ${i + 1}`)
    await form.getByRole('button', { name: 'Agregar objetivo' }).click()
    await expect(formula.getByText(`Acción QA paso ${i + 1}`, { exact: true })).toBeVisible({ timeout: 30000 })
  }
  await expect(page.getByText('Plan preparado', { exact: true })).toBeVisible()
  check('Condición fundamentada y cuatro pasos de fórmula preparados desde sus formularios')
  await nav(page, /Mis acciones/)
  const buttons = page.getByRole('button', { name: 'Registrar acción realizada', exact: true })
  await expect(buttons.nth(1)).toBeDisabled()
  for (let i = 0; i < 4; i++) {
    const item = page.locator('.semana-objetivo').filter({ has: page.getByText(`Acción QA paso ${i + 1}`, { exact: true }) })
    await item.getByLabel('Evidencia del resultado', { exact: true }).fill(`Evidencia QA paso ${i + 1}: comprobada en el registro ficticio.`)
    await item.getByRole('button', { name: 'Registrar acción realizada' }).click()
    await expect(item.getByRole('button', { name: 'Reabrir acción' })).toBeVisible({ timeout: 30000 })
  }
  assert.equal(await page.getByRole('button', { name: 'Verificar evidencia', exact: true }).count(), 0)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Reabrir acción', exact: true })).toHaveCount(4, { timeout: 30000 })
  check('Ejecución en orden, evidencia guardada y cuatro acciones conservadas tras recargar')
  await nav(page, /Juegos/)
  await page.getByLabel('Nombre del juego', { exact: true }).fill('Reto QA de bienvenida')
  await page.getByRole('combobox', { name: 'Resultado a mejorar', exact: true }).selectOption('nuevos_inscritos')
  await page.getByLabel('Meta al cierre (entero)', { exact: true }).fill('7')
  await page.getByLabel('Quiénes participan', { exact: true }).fill('Administradora y asistente QA')
  await page.getByLabel('Reglas: qué cuenta y cómo se comprueba', { exact: true }).fill('Siete inscripciones de esta semana, comprobadas en los registros del centro QA.')
  await page.getByLabel('Premio o reconocimiento', { exact: true }).fill('Reconocimiento QA en reunión')
  await page.getByRole('button', { name: 'Guardar propuesta de juego' }).click()
  await expect(page.getByRole('heading', { name: 'Reto QA de bienvenida' })).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('Propuesta pendiente', { exact: true })).toBeVisible()
  assert.equal(await page.getByRole('button', { name: /Aprobar/ }).count(), 0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Reto QA de bienvenida' })).toBeVisible({ timeout: 30000 })
  const { rows: [game] } = await db.query('SELECT * FROM semana_juegos WHERE centro_id=2')
  assert.equal(game.estado, 'propuesto'); assert.equal(game.propuesta_por, 101)
  check('Juego propuesto por administradora, persistido y pendiente de aprobación; no puede autoaprobar')
  const coordinator = await pageFor('coord@e2e.invalid')
  await coordinator.goto('/centro/2/semana/juegos')
  await coordinator.getByRole('button', { name: /Aprobar/ }).click({ timeout: 60000 })
  await expect(coordinator.getByText('Aprobado por coordinación', { exact: true })).toBeVisible({ timeout: 30000 })
  await coordinator.goto('/centro/2/semana')
  await coordinator.getByText('Metas y cuotas · editar y enviar a coordinación', { exact: true }).click({ timeout: 60000 })
  await coordinator.getByRole('button', { name: 'Aprobar cuotas', exact: true }).click({ timeout: 60000 })
  await expect(coordinator.getByText('Cuotas aprobadas.', { exact: true })).toBeVisible({ timeout: 30000 })
  await coordinator.goto('/centro/2/semana/acciones')
  await coordinator.getByRole('button', { name: 'Verificar evidencia', exact: true }).first().click({ timeout: 60000 })
  await expect(coordinator.getByRole('button', { name: 'Verificar evidencia', exact: true })).toHaveCount(3, { timeout: 30000 })
  check('Coordinador real aprueba juego y cuotas y verifica una evidencia')
  await nav(page, /Mi cumplimiento/)
  const report = page.getByRole('article', { name: 'Informe imprimible de cumplimiento' })
  await expect(report).toContainText('4 de 4 acciones realizadas · 1 verificadas.', { timeout: 30000 })
  await expect(report).toContainText('Evidencia QA paso 4')
  assert.equal(await report.locator('ol').first().evaluate(el => getComputedStyle(el).listStyleType), 'decimal')
  await expect(report.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Nuevos inscritos', exact: true }) })).toContainText('7 · Aprobada')
  const before = JSON.stringify((await db.query('SELECT (SELECT jsonb_agg(p) FROM semana_planes p) planes, (SELECT jsonb_agg(o ORDER BY id) FROM semana_objetivos o) objetivos, (SELECT jsonb_agg(c ORDER BY codigo) FROM semana_cuotas c) cuotas')).rows)
  await page.evaluate(() => { window.__printed = 0; window.addEventListener('beforeprint', () => window.__printed++) })
  await page.getByRole('button', { name: 'Imprimir / guardar PDF', exact: true }).click()
  assert.ok(await page.evaluate(() => window.__printed > 0), 'El botón debe activar la impresión nativa')
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('navigation', { name: 'Pasos de mi semana' })).not.toBeVisible()
  const pdf = await page.pdf({ path: resolve(out, 'cumplimiento-administradora.pdf'), format: 'A4', printBackground: true })
  const extracted = await extractText(new Uint8Array(pdf), { mergePages: true })
  const normalize = text => text.toLowerCase().replace(/\s/g, '')
  for (const text of ['Centro QA Administradora', 'Evidencia QA paso 4', 'Fecha de revisión', '7 · Aprobada']) assert.ok(normalize(extracted.text).includes(normalize(text)), `PDF incluye ${text}`)
  const document = await getDocumentProxy(new Uint8Array(pdf))
  try {
    for (let i = 1; i <= document.numPages; i++) {
      const sheet = await document.getPage(i), text = await sheet.getTextContent()
      for (const item of text.items.filter(item => item.str?.trim())) {
        assert.ok(item.transform[4] >= 38 && item.transform[4] + item.width <= sheet.view[2] - 38, `Texto dentro de márgenes A4: ${item.str}`)
      }
    }
  } finally { await document.cleanup() }
  assert.equal(JSON.stringify((await db.query('SELECT (SELECT jsonb_agg(p) FROM semana_planes p) planes, (SELECT jsonb_agg(o ORDER BY id) FROM semana_objetivos o) objetivos, (SELECT jsonb_agg(c ORDER BY codigo) FROM semana_cuotas c) cuotas')).rows), before)
  check(`Botón nativo de impresión y PDF A4 de ${extracted.totalPages} páginas completos, sin modificar plan ni cuotas`)
  await page.emulateMedia({ media: 'screen' })
  await page.getByRole('combobox', { name: 'Semana del informe', exact: true }).selectOption(r.referencia)
  await expect(report).toContainText('Semana cerrada · registros guardados', { timeout: 30000 })
  await expect(report).not.toContainText('Acción QA paso 4')
  check('Informe histórico separado del plan actual')
  await page.setViewportSize({ width: 390, height: 844 })
  for (const name of [/Avance y cuotas/, /Condición y fórmula/, /Mis acciones/, /Mi cumplimiento/, /Juegos/]) {
    await nav(page, name)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Sin desborde en ${name}`)
  }
  await page.screenshot({ path: resolve(out, 'juego-administradora-movil.png'), fullPage: true })
  check('Cinco pantallas navegables en móvil de 390 px sin desborde horizontal')
  await page.goto('/centro/3/semana')
  await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 60000 })
  assert.equal(await page.getByRole('button', { name: 'Guardar cuotas' }).count(), 0)
  check('Administradora no accede al centro ajeno')
  assert.deepEqual(errors, [])
  await writeFile(resolve(out, 'resultado.json'), JSON.stringify({ checks, errors, browser: 'cerrado en finally', real: ['Next', 'login', 'sesión', 'Server Actions', 'PostgreSQL'], ficticio: 'Centro QA, usuarios y registros; CRM externo sin eventos' }, null, 2))
} catch (error) {
  if (page && !page.isClosed()) { await page.screenshot({ path: resolve(out, 'fallo.png'), fullPage: true }); await writeFile(resolve(out, 'fallo.txt'), await page.locator('body').innerText()) }
  throw error
} finally {
  await browser.close(); await db.end()
  assert.ok(contexts.every(c => c.pages().length === 0))
  console.log('Navegador: contextos y pestañas propios cerrados y comprobados')
}
