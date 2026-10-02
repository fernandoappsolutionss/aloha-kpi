// QA local: source env.sh && node tests/semana-audit/browser.mjs
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const base = process.env.SEMANA_QA_URL || 'http://localhost:4577'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))
assert.equal(process.env.E2E_DATABASE_CONFIRM, 'disposable')
const credentials = readFileSync(process.env.SEMANA_QA_CREDENTIALS || '/private/tmp/aloha-semana-qa-20261001/credenciales.txt', 'utf8')
  .split('\n').filter(line => line.includes('|')).slice(1)
  .map(line => line.split('|').map(value => value.trim()))
const out = '.scratch/semana-audit'
mkdirSync(out, { recursive: true })
const results = []
const browser = await chromium.launch({ headless: true })
const contexts = []
const errors = []
const issues = []
function pass(name) { results.push(name); console.log('PASS', name) }
async function ready(page) {
  await page.locator('main[data-page-state="ready"]').waitFor({ timeout: 60000 })
}
async function login(role) {
  const row = credentials.find(item => item[0] === role)
  assert.ok(row, `Credencial local faltante: ${role}`)
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  context.setDefaultTimeout(30000)
  contexts.push(context)
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(`${role}: ${error.message}`))
  await page.goto(`${base}/login`)
  await page.locator('[data-hydrated="true"]').waitFor()
  await page.getByLabel('Correo electrónico').fill(row[1])
  await page.getByLabel('Contraseña', { exact: true }).fill(row[2])
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click()
  await page.waitForURL(url => url.pathname !== '/login', { timeout: 60000 })
  return page
}
async function open(page, path) { await page.goto(`${base}${path}`); await ready(page) }
async function noOverflow(page, name) {
  const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }))
  if (size.document > size.viewport + 1) issues.push(`${name}: desborde ${JSON.stringify(size)}`)
  else pass(name)
}
try {
  const admin = await login('administradora')
  const payloads = []
  const responses = []
  admin.on('response', response => {
    if (response.request().method() === 'POST' && response.request().headers()['next-action']) {
      // Una recarga puede cancelar una respuesta en streaming de Next en dev.
      responses.push(Promise.race([
        response.text(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Respuesta cancelada')), 10000)),
      ]).then(text => payloads.push(text)).catch(() => {}))
    }
  })
  await open(admin, '/centro/1/semana#plan-batalla')
  const planViewport = await admin.evaluate(() => ({ top: document.getElementById('plan-batalla')?.getBoundingClientRect().top, height: innerHeight }))
  assert.ok(planViewport.top >= 0 && planViewport.top < planViewport.height, `El acceso directo debe mostrar el plan: ${JSON.stringify(planViewport)}`)
  pass('Enlace directo espera la carga y desplaza al plan de batalla')
  await admin.getByRole('heading', { name: 'Cuotas semanales', exact: true }).waitFor()
  assert.equal(await admin.getByRole('button', { name: 'Aprobar cuotas', exact: true }).count(), 0)
  assert.equal(await admin.getByText(/Lectura de la gráfica:/).count(), 0)
  if (await admin.getByRole('button', { name: 'Cambiar', exact: true }).count()) {
    await admin.getByRole('button', { name: 'Cambiar', exact: true }).click()
  }
  await admin.getByRole('button', { name: 'Emergencia', exact: true }).click()
  await admin.getByRole('button', { name: 'Guardar condición', exact: true }).click()
  await admin.locator('.semana-plan__pasos').waitFor()
  const steps = await admin.locator('.semana-plan__pasos > li').count()
  for (let index = 0; index < steps; index++) {
    const step = admin.locator('.semana-plan__pasos > li').nth(index)
    await step.getByPlaceholder('Escribe un objetivo').fill(`QA objetivo del paso ${index + 1}`)
    await step.getByPlaceholder('Responsable', { exact: true }).fill('Equipo Demo')
    await step.getByRole('button', { name: 'Agregar objetivo', exact: true }).click()
    await step.getByText(`QA objetivo del paso ${index + 1}`, { exact: true }).first().waitFor()
  }
  await admin.getByText('Plan completo', { exact: true }).waitFor()
  await admin.getByRole('button', { name: 'Guardar cuotas', exact: true }).click()
  await admin.getByText('Cuotas guardadas para aprobación.', { exact: true }).waitFor()
  pass('Administradora asigna condición, completa fórmula y propone cuotas')
  await admin.reload(); await ready(admin)
  await admin.getByText('Plan completo', { exact: true }).waitFor()
  await Promise.all(responses)
  assert.ok(payloads.length > 0)
  assert.ok(!payloads.some(text => /"(?:lectura_auto|lectura_motivo|lectura|discrepancia)"\s*:/.test(text)), 'Lectura automática filtrada en respuesta')
  pass('Persistencia al recargar y lectura automática ausente en respuestas de administradora')
  await admin.setViewportSize({ width: 390, height: 844 })
  await noOverflow(admin, 'Semana móvil 390 px sin desborde')
  await admin.screenshot({ path: `${out}/semana-mobile.png`, fullPage: true })
  await admin.setViewportSize({ width: 1440, height: 1000 })
  await admin.screenshot({ path: `${out}/semana-desktop.png`, fullPage: true })

  const coordinator = await login('coordinador')
  await open(coordinator, '/dashboard/reunion-semanal')
  assert.equal(await coordinator.locator('.semana-reunion__centro').count(), 2)
  assert.equal(await coordinator.getByRole('heading', { name: 'Centro Demo Valencia' }).count(), 0)
  const north = coordinator.locator('.semana-reunion__centro').filter({ has: coordinator.getByRole('heading', { name: 'Centro Demo Norte' }) })
  const approvalRequest = coordinator.waitForRequest(request => request.method() === 'POST' && Boolean(request.headers()['next-action']) && Boolean(request.postData()?.includes('ninos_activos')))
  await north.getByRole('button', { name: 'Aprobar cuotas', exact: true }).click()
  await coordinator.getByText('Cuotas de Centro Demo Norte aprobadas.', { exact: true }).waitFor()
  const approval = await approvalRequest
  const approvalHeaders = { 'next-action': approval.headers()['next-action'], 'content-type': approval.headers()['content-type'], origin: base }
  const deniedAdmin = await admin.request.post(`${base}/centro/1/semana`, { headers: approvalHeaders, data: approval.postData() })
  assert.equal(deniedAdmin.status(), 500, 'El servidor debe rechazar aprobación de la administradora')
  assert.match(await deniedAdmin.text(), /No autorizado|"digest"/)
  const foreignArgs = JSON.parse(approval.postData()); foreignArgs[0] = 10
  const deniedCoordinator = await coordinator.request.post(`${base}/dashboard/reunion-semanal`, { headers: approvalHeaders, data: JSON.stringify(foreignArgs) })
  assert.equal(deniedCoordinator.status(), 500, 'El servidor debe rechazar aprobación en un centro ajeno')
  assert.match(await deniedCoordinator.text(), /No autorizado|"digest"/)
  pass('Servidor rechaza aprobación directa de administradora y coordinación fuera de alcance')
  await north.getByLabel('Texto', { exact: true }).fill('QA coordinar las llamadas del centro')
  await north.getByRole('button', { name: 'Guardar orden', exact: true }).click()
  await coordinator.getByText('Orden registrada para Centro Demo Norte.', { exact: true }).waitFor()
  pass('Coordinador ve solo sus centros, aprueba cuotas y deja una orden')
  await coordinator.setViewportSize({ width: 390, height: 844 })
  await noOverflow(coordinator, 'Reunión móvil 390 px sin desborde')
  await coordinator.screenshot({ path: `${out}/reunion-mobile.png`, fullPage: true })

  await admin.reload(); await ready(admin)
  await admin.getByText('QA coordinar las llamadas del centro', { exact: true }).first().waitFor()
  assert.ok(await admin.locator('.semana-cuotas__tabla').getByText('Aprobada', { exact: true }).count() > 0)
  const quota = admin.getByLabel('Cuota de Niños activos al cierre', { exact: true })
  await quota.fill(String(Number(await quota.inputValue()) + 1))
  await admin.getByRole('button', { name: 'Guardar cuotas', exact: true }).click()
  await admin.getByText('Cuotas guardadas para aprobación.', { exact: true }).waitFor()
  assert.ok(await admin.locator('.semana-cuotas__tabla tbody tr').first().getByText('Propuesta', { exact: true }).count())
  pass('Orden llega al centro; editar cuota aprobada exige nueva aprobación')

  for (const role of ['asistente', 'admin_general', 'admin_master', 'coach']) {
    const page = await login(role)
    if (role === 'coach') {
      await page.goto(`${base}/centro/1/semana`)
      await page.waitForURL(url => url.pathname === '/centro/1/mis-grupos')
      assert.equal(await page.locator('.semana-grid').count(), 0)
      pass('Coach no opera Semana y se redirige a sus grupos')
      continue
    }
    const management = role === 'admin_general' || role === 'admin_master'
    await open(page, management ? '/dashboard/reunion-semanal' : '/centro/1/semana')
    if (management) {
      assert.equal(await page.locator('.semana-reunion__centro').count(), 3)
      assert.equal(await page.getByRole('button', { name: 'Aprobar cuotas', exact: true }).count(), role === 'admin_master' ? 3 : 0)
    } else {
      assert.equal(await page.getByText(/Lectura de la gráfica:/).count(), 0)
      assert.equal(await page.getByRole('button', { name: 'Aprobar cuotas', exact: true }).count(), 0)
      assert.equal(await page.getByRole('button', { name: 'Cambiar', exact: true }).count(), 0)
    }
    pass(`Permisos visibles ${role}`)
  }
  await coordinator.goto(`${base}/centro/10/semana`)
  await coordinator.waitForURL(url => url.pathname === '/dashboard')
  assert.equal(await coordinator.locator('.semana-grid').count(), 0)
  pass('Coordinador rechazado fuera de su alcance')
  await admin.goto(`${base}/centro/2/semana`)
  await admin.waitForURL(url => url.pathname === '/centro/1')
  assert.equal(await admin.locator('.semana-grid').count(), 0)
  pass('Administradora rechazada en otro centro')
  assert.deepEqual(errors, [])
  assert.deepEqual(issues, [])
  pass('Sin errores JavaScript no controlados')
} finally {
  writeFileSync(`${out}/browser-results.json`, JSON.stringify({ results, errors, issues }, null, 2))
  await Promise.all(contexts.map(context => context.close()))
  await browser.close()
}
