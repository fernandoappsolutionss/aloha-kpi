import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Deliberately standalone: a copy in mktemp resolves Chromium from the checkout.
const mode=process.env.REMOTE_READONLY_MODE||'public'
assert.ok(['public','authenticated'].includes(mode),'Modo inválido')
const allowedCredentials=['E2E_ADMIN_EMAIL','E2E_ADMIN_PASSWORD','E2E_COORDINATOR_EMAIL','E2E_COORDINATOR_PASSWORD']
for(const key of Object.keys(process.env))assert.ok(!((key.startsWith('E2E_')&&!allowedCredentials.includes(key))||/^(DATABASE_URL|USUARIOS_TEST_DATABASE_URL|PETICIONES_TEST_DATABASE_URL|SESSION_SECRET|CRM_SERVICE_TOKEN|BLOB_READ_WRITE_TOKEN|VERCEL_AUTOMATION_BYPASS_SECRET)$/.test(key)),'Entorno prohibido')
const base=new URL(process.env.RESPONSIVE_BASE_URL)
assert.ok(['http:','https:'].includes(base.protocol)&&!base.username&&!base.password&&base.pathname==='/'&&!base.search&&!base.hash,'Origen inválido')
if(mode==='authenticated')assert.ok(process.env.E2E_ADMIN_EMAIL&&process.env.E2E_ADMIN_PASSWORD,'Admin completo obligatorio')
const {chromium}=await import(pathToFileURL(resolve(process.cwd(),'node_modules/playwright/index.mjs')).href)
try {
const browser=await chromium.launch({channel:'chrome'})
try {
  const context=await browser.newContext({baseURL:base.origin,viewport:{width:390,height:844}})
  try {
    const page=await context.newPage()
    await page.route('**/*',route=>{
      const url=new URL(route.request().url())
      if(url.origin!==base.origin||url.searchParams.has('token'))return route.abort('blockedbyclient')
      if(['/','/login','/dashboard','/dashboard/usuarios'].includes(url.pathname)||url.pathname.startsWith('/_next/')||/\.(png|svg|ico|woff2?|ttf)$/.test(url.pathname))return route.continue()
      return route.abort('blockedbyclient')
    })
    const geometry=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1),false,'Overflow')
    await page.goto('/login',{waitUntil:'networkidle'})
    assert.equal(new URL(page.url()).origin,base.origin,'Origen inesperado')
    assert.ok(await page.locator('input[type=email]').isVisible())
    await geometry()
    await page.goto('/dashboard/usuarios')
    await page.waitForURL(url=>url.origin===base.origin&&url.pathname==='/login')
    if(mode==='authenticated') {
      assert.equal(new URL(page.url()).origin,base.origin)
      assert.equal(new URL(page.url()).pathname,'/login')
      assert.equal(await page.locator('form input[type=email]').count(),1)
      assert.equal(await page.locator('form input[type=password]').count(),1)
      await page.locator('form input[type=email]').fill(process.env.E2E_ADMIN_EMAIL)
      await page.locator('form input[type=password]').fill(process.env.E2E_ADMIN_PASSWORD)
      await page.locator('form button[type=submit]').click()
      await page.waitForURL(url=>url.origin===base.origin&&url.pathname==='/dashboard')
      await page.waitForLoadState('networkidle');await geometry()
    }
    console.log('Rollback smoke '+mode+': passed')
  } finally {await context.close()}
} finally {await browser.close()}
} catch { console.error('Rollback smoke '+mode+': failed'); process.exitCode=1 }
