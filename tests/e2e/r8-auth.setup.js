import { test as setup, expect } from '@playwright/test'
import { R8_EMAIL, R8_PASSWORD, R8_STATE, readR8Manifest } from './helpers/r8-fixture.mjs'
setup('autentica centro R8 real y espera acciones antes de cerrar contexto',async ({page}) => {
  setup.setTimeout(60_000)
  await readR8Manifest()
  await page.goto('/login',{waitUntil:'networkidle'})
  await page.locator('input[type=email]').fill(R8_EMAIL)
  await page.locator('input[type=password]').fill(R8_PASSWORD)
  await page.locator('button[type=submit]').click()
  await page.waitForURL('**/centro/3')
  await expect(page.locator('h1')).toContainText('Centro R8')
  await page.waitForLoadState('networkidle')
  expect(await page.evaluate(()=>[localStorage.getItem('aloha_rol'),localStorage.getItem('aloha_centro_id')])).toEqual(['administradora','3'])
  await page.context().storageState({path:R8_STATE})
})
