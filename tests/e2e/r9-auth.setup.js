import { test as setup, expect } from '@playwright/test'
import { R9_EMAIL,R9_PASSWORD,R9_STATE,recordR9Auth } from './helpers/r9-fixture.mjs'
setup('autenticación real y drenaje local R9',async ({page})=>{
  setup.setTimeout(90_000)
  await page.goto('/login',{waitUntil:'networkidle'})
  await page.locator('input[type=email]').fill(R9_EMAIL)
  await page.locator('input[type=password]').fill(R9_PASSWORD)
  await page.locator('button[type=submit]').click()
  await page.waitForURL('**/centro/2')
  await expect(page.locator('h1')).toContainText('Centro R9')
  await page.waitForLoadState('networkidle')
  // Briefing itself is a read which persists its automatic receipt. Wait for
  // it (or its explicitly resolved empty state), then let every request drain.
  await page.waitForTimeout(1500)
  await page.waitForLoadState('networkidle')
  await recordR9Auth()
  await page.context().storageState({path:R9_STATE})
})
