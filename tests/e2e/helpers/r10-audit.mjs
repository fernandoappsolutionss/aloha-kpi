import { expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { auditPage,capturePage,settleVisuals } from './audit-page.js'
import { requireR10Gate } from './r10-fixture.mjs'
import { hrefActivo } from '../../../components/nav-activo.mjs'
// /dashboard/entrenamiento/oficio es la matriz "quién tiene su hat": entró con
// el PR #111, tiene su propio ítem en el menú y nadie la abría en un viewport.
export const ADMIN_ROUTES=['/dashboard','/dashboard/alertas','/dashboard/centros','/dashboard/crecimiento','/dashboard/entrenamiento','/dashboard/entrenamiento/oficio','/dashboard/historial','/dashboard/metas','/dashboard/ranking','/dashboard/reporte','/dashboard/usuarios','/dashboard/zoho','/perfil']
// El árbol /oficio entró con el PR #111 sin una sola prueba de navegador: la
// hoja de SOP y el carrusel de diapositivas no los abría nadie en un viewport.
// El actor `center` es administradora del centro 2, así que of-cen-1 es de su
// puesto y su hoja trae el procedimiento escrito a mano.
export const CENTER_ROUTES=['','/ruta-nivel','/kpi','/grupos','/cuadro','/eventos','/cumplimiento','/foda','/historial','/entrenamiento','/entrenamiento/meta','/entrenamiento/oficio','/entrenamiento/oficio/glosario','/entrenamiento/oficio/of-cen-1','/entrenamiento/oficio/of-cen-1/sop']
const pageErrors=new WeakMap()
export async function actorPage(browser,testInfo,actor) {
  requireR10Gate()
  const context=await browser.newContext({baseURL:testInfo.project.use.baseURL,viewport:testInfo.project.use.viewport,storageState:actor?`tests/e2e/.auth/r10-${actor}.json`:undefined})
  const page=await context.newPage()
  const errors=[];pageErrors.set(page,errors)
  page.on('pageerror',error=>errors.push(error.message))
  // No OAuth, file workflow, or outside service is permitted in this audit.
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url())
    if(url.origin!==testInfo.project.use.baseURL && !['data:','blob:'].includes(url.protocol)) return route.abort('blockedbyclient')
    return route.continue()
  })
  return {context,page}
}
export async function ready(page,state) {
  state ||= new URL(page.url()).pathname==='/set-password'&&!new URL(page.url()).search ? 'error' : 'ready'
  await expect(page.locator('main#main-content')).toHaveCount(1)
  await expect(page.locator(`#main-content[data-page-state="${state}"]`)).toBeVisible({timeout:45000})
  if(await page.locator('aside.sb').count()) await expect(page.locator('[data-navigation-state=ready]')).toHaveCount(1)
  if(await page.locator('[data-peticiones-state]').count()) await expect(page.locator('[data-peticiones-state=ready]')).toHaveCount(1)
  await page.waitForLoadState('networkidle')
  expect(pageErrors.get(page)||[],'Sin errores de render/carga sin manejar').toEqual([])
}
export async function geometry(page,testInfo,name) {
  await auditPage(page,{mobile:testInfo.project.use.viewport.width<=1024,state:await page.locator('#main-content').getAttribute('data-page-state')})
  for(const region of await page.locator('.table-scroller:visible').all()) {
    const dimensions=await region.evaluate(n=>({scroll:n.scrollWidth,client:n.clientWidth}))
    expect(dimensions.scroll).toBeLessThan(15000)
    if(dimensions.scroll<=dimensions.client+1)continue
    await expect(region.locator('.table-scroller__hint').first()).toBeVisible()
    await region.evaluate(n=>{n.scrollLeft=n.scrollWidth})
    const row=region.locator('table').first().locator('tr').first()
    const last=row.locator('th,td').last()
    const a=await region.boundingBox(),b=await last.boundingBox()
    expect(b.x+b.width).toBeLessThanOrEqual(a.x+a.width+1)
    await region.evaluate(n=>{n.scrollLeft=0})
  }
  await capturePage(page,{name,testInfo})
}
export async function axe(page,failures) {
  await settleVisuals(page)
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()
  const violations=result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))
  if(failures) {if(violations.length)failures.push({path:new URL(page.url()).pathname,violations});return}
  expect(violations).toEqual([])
}
export async function activeNavigation(page,mobile) {
  if(await page.locator('.growth-briefing').isVisible()) await page.locator('.growth-briefing').getByRole('button',{name:'Cerrar diálogo'}).click()
  if(mobile) await page.getByRole('button',{name:'Abrir menú'}).click()
  const nav=page.locator('aside.sb')
  const path=new URL(page.url()).pathname
  // Qué enlace tiene que estar activo lo decide la MISMA función que lo pinta
  // (components/nav-activo.mjs): el más específico del menú que cubre la ruta.
  // Antes se recortaba la ruta a mano un nivel, así que
  // /entrenamiento/oficio/<modulo>/sop buscaba un enlace que no existe, y
  // /dashboard/entrenamiento/oficio exigía el enlace del padre cuando el ítem
  // propio es el que manda.
  const hrefs=await nav.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')))
  const target=hrefActivo(path,hrefs)
  expect(target,`ningún enlace del menú cubre ${path}`).toBeTruthy()
  await expect(nav.locator(`a[href="${target}"]`).first()).toBeVisible()
  await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1)
  await expect(nav.locator(`a[href="${target}"]`).first()).toHaveAttribute('aria-current','page')
  if(mobile)await page.getByRole('button',{name:'Cerrar menú',exact:true}).click()
}
