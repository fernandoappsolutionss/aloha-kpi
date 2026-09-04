import { test,expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { actorPage,ready,geometry } from './helpers/r10-audit.mjs'
import {auditPage} from './helpers/audit-page.js'
const loads={cuadro:'loadCuadro',cumplimiento:'loadCumplimiento',foda:'loadFoda',historial:'getHistorialCentro',entrenamiento:'cargarProgreso','entrenamiento/meta':'cargarProgreso'}
test('tema elegido actualiza controles nativos y color del navegador',async({browser},testInfo)=>{
  const {context,page}=await actorPage(browser,testInfo,'center')
  try {
    await page.goto('/centro/2/cumplimiento');await ready(page)
    if(testInfo.project.use.viewport.width<=1024)await page.getByRole('button',{name:'Abrir menú',exact:true}).click()
    const toggle=page.getByRole('button',{name:'Cambiar tema claro u oscuro',exact:true})
    for(const [theme,color]of [['dark','#012B36'],['light','#FBFAF8']]) {
      await toggle.click();await expect(page.locator('html')).toHaveAttribute('data-theme',theme)
      await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content',color)
      expect(await page.locator('select').first().evaluate(n=>getComputedStyle(n).colorScheme)).toBe(theme)
    }
  }finally{await context.close()}
})
for(const [suffix,action]of Object.entries(loads))test('estados reales de '+suffix,async({browser},testInfo)=>{
  const {context,page}=await actorPage(browser,testInfo,'center')
  let release
  try {
    // Compile the route, drain its automatic writes, then resolve the actual
    // Server Action identity. Never abort Sidebar instead of the page loader.
    await page.goto('/centro/2/'+suffix);await ready(page)
    const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8'))
    const ids=Object.entries(manifest.node).filter(([,entry])=>entry.exportedName===action).map(([id])=>id)
    expect(ids).toHaveLength(1)
    await page.route('**/centro/2/**',async route=>{
      if(route.request().headers()['next-action']!==ids[0])return route.continue()
      await new Promise(resolve=>{release=resolve})
      await route.abort('failed')
    })
    await page.reload({waitUntil:'domcontentloaded'})
    await expect.poll(()=>typeof release).toBe('function')
    await auditPage(page,{mobile:testInfo.project.use.viewport.width<=1024,state:'loading'})
    release()
    await expect(page.locator('#main-content')).toHaveAttribute('data-page-state','error')
    await expect(page.getByRole('alert').first()).toBeVisible()
    await auditPage(page,{mobile:testInfo.project.use.viewport.width<=1024,state:'error'})
    await page.unroute('**/centro/2/**')
    await page.getByRole('button',{name:/Reintentar/}).first().click()
    await ready(page)
    if(suffix==='cuadro')await expect(page.locator('#main-content .alert--error')).toHaveCount(0)
  }finally{release?.();await context.close()}
})
test('fixture larga y rango vacío mantienen datos y límites',async({browser},testInfo)=>{
  const {context,page}=await actorPage(browser,testInfo,'center')
  try {
    await page.goto('/centro/2/foda');await ready(page)
    expect((await page.getByLabel('Fortalezas',{exact:true}).inputValue()).length).toBeGreaterThan(500)
    await geometry(page,testInfo,'estado-largo')
    await page.goto('/centro/2/historial?vista=tabla&rango=custom&from=1900-01&to=1900-02');await ready(page)
    await expect(page.getByText('No hay meses registrados en el rango seleccionado.')).toBeVisible()
    await geometry(page,testInfo,'estado-vacio')
    await page.goto('/centro/2/entrenamiento/inexistente');await ready(page,'error')
    await auditPage(page,{mobile:testInfo.project.use.viewport.width<=1024,state:'error'})
  }finally{await context.close()}
})
test('rotación remide los gráficos sin ocultar datos',async({browser},testInfo)=>{
  test.skip(testInfo.project.use.viewport.width!==390,'Rotación focal 390')
  const {context,page}=await actorPage(browser,testInfo,'center')
  try {
    await page.goto('/centro/2/historial');await ready(page)
    const chart=page.locator('.measured-chart').first()
    const initial=await chart.evaluate(n=>n.clientWidth)
    await page.setViewportSize({width:844,height:390})
    await expect.poll(()=>chart.evaluate(n=>n.clientWidth)).not.toBe(initial)
    await auditPage(page,{mobile:true})
    await page.setViewportSize({width:390,height:844})
    await expect.poll(()=>chart.evaluate(n=>n.clientWidth)).toBe(initial)
    await auditPage(page,{mobile:true})
  }finally{await context.close()}
})
