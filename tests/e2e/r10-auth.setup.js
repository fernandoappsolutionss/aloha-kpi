import { test,expect } from '@playwright/test'
import { R10_EMAIL,R10_PASSWORD,R10_STATE,recordR10Auth } from './helpers/r10-fixture.mjs'
test('actores locales separados y carga inicial drenada',async({browser,baseURL})=>{
  test.setTimeout(180000)
  for(const actor of ['admin','coordinator','center']) {
    const context=await browser.newContext({baseURL,viewport:{width:390,height:844}})
    try {
      const page=await context.newPage()
      await page.goto('/login',{waitUntil:'networkidle'})
      await page.locator('input[type=email]').fill(actor==='center'?R10_EMAIL:process.env[`E2E_${actor.toUpperCase()}_EMAIL`])
      await page.locator('input[type=password]').fill(actor==='center'?R10_PASSWORD:process.env[`E2E_${actor.toUpperCase()}_PASSWORD`])
      await page.locator('button[type=submit]').click()
      await page.waitForURL(actor==='center'?'**/centro/2':'**/dashboard')
      await expect(page.locator('#main-content[data-page-state=ready]')).toBeVisible()
      await expect(page.locator('[data-navigation-state=ready]')).toHaveCount(1)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1200)
      await page.waitForLoadState('networkidle')
      await context.storageState({path:actor==='center'?R10_STATE:`tests/e2e/.auth/r10-${actor}.json`})
    } finally {await context.close()}
  }
  await recordR10Auth()
})
