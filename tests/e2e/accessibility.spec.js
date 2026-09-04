import { test,expect } from '@playwright/test'
import { actorPage,ready,axe,ADMIN_ROUTES,CENTER_ROUTES } from './helpers/r10-audit.mjs'
for(const theme of ['light','dark']) test('WCAG A/AA completo ambos actores tema '+theme,async({browser},testInfo)=>{
  test.skip(![390,1440].includes(testInfo.project.use.viewport.width),'Axe en los dos tamaños vinculantes')
  test.setTimeout(600000)
  const failures=[]
  for(const [actor,routes] of [[undefined,['/','/login','/forgot-password','/set-password']],['admin',ADMIN_ROUTES],['coordinator',['/dashboard','/dashboard/usuarios']],['center',CENTER_ROUTES.map(s=>'/centro/2'+s)]]) {
    const {context,page}=await actorPage(browser,testInfo,actor)
    await context.addInitScript(value=>{localStorage.setItem('aloha_theme',value)},theme)
    try {
      for(const route of routes) {
        await page.goto(route);await ready(page);await expect(page.locator('html')).toHaveAttribute('data-theme',theme);await axe(page,failures)
        if(actor==='center' && testInfo.project.use.viewport.width===390 && route.endsWith('/entrenamiento')) {
          await page.getByRole('button',{name:'Abrir menú',exact:true}).click()
          await axe(page,failures)
          await page.getByRole('button',{name:'Cerrar menú',exact:true}).click()
        }
      }
      if(actor==='center') {
        await page.goto('/centro/2/cuadro');await ready(page);await page.getByRole('button',{name:'Nuevo pedido',exact:true}).click();await axe(page,failures);await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click()
        await page.goto('/centro/2/historial');await ready(page)
        for(const label of ['Comparativa','Cuadro de negocio','Tabla detalle']) {
          await page.getByRole('group',{name:'Vistas del historial'}).getByRole('button',{name:label,exact:true}).click()
          for(const summary of await page.locator('.chart-data summary').all())await summary.click()
          await axe(page,failures)
        }
        await page.goto('/centro/2/foda');await ready(page);await page.getByRole('tab',{name:'Petición',exact:true}).click();await axe(page,failures)
        await page.goto('/centro/2/entrenamiento');await ready(page);await page.getByText('Preguntas frecuentes',{exact:true}).click();await page.locator('.ent-faq summary').first().click();await axe(page,failures)
      }
    }finally{await context.close()}
  }
  expect(failures).toEqual([])
})
