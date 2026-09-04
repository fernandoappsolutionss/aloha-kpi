import { test,expect } from '@playwright/test'
import { actorPage,ready,geometry,activeNavigation,CENTER_ROUTES } from './helpers/r10-audit.mjs'
test('centro: quince rutas con usuario no privilegiado, incluido el oficio',async({browser},testInfo)=>{
  test.setTimeout(300000)
  const {context,page}=await actorPage(browser,testInfo,'center')
  try {
    for(const suffix of CENTER_ROUTES) {
      console.log('Lectura centro: '+(suffix||'resumen'))
      await page.goto('/centro/2'+suffix)
      await ready(page)
      await geometry(page,testInfo,'centro-'+(suffix||'resumen'))
      await activeNavigation(page,testInfo.project.use.viewport.width<=1024)
    }
    await expect(page.locator('aside.sb a[href="/dashboard/usuarios"]')).toHaveCount(0)
    await expect(page.locator('aside.sb a[href="/dashboard/centros"]')).toHaveCount(0)
    await page.goto('/dashboard/usuarios')
    await expect(page).not.toHaveURL(/\/dashboard\/usuarios$/)
    await page.waitForLoadState('networkidle')
  } finally {await context.close()}
})
