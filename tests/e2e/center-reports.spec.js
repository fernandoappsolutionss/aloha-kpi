import { test,expect } from '@playwright/test'
import { actorPage,ready,geometry } from './helpers/r10-audit.mjs'
import { r10Snapshot, readR10Manifest } from './helpers/r10-fixture.mjs'
import { capturePage } from './helpers/audit-page.js'
test('Historial muestra diez gráficos y tablas equivalentes sin partir palabras',async({browser},testInfo)=>{
  const {context,page}=await actorPage(browser,testInfo,'center')
  try {
    await page.goto('/centro/2/historial');await ready(page)
    const before=await r10Snapshot()
    const broken=await page.locator('.history-view-tabs button').evaluateAll(buttons=>buttons.flatMap(button=>{
      const text=button.firstChild
      if(text?.nodeType!==Node.TEXT_NODE)return ['Etiqueta no textual']
      return [...text.textContent.matchAll(/\S+/g)].filter(match=>{
        const range=document.createRange();range.setStart(text,match.index);range.setEnd(text,match.index+match[0].length)
        return range.getClientRects().length>1
      }).map(match=>match[0])
    }))
    expect(broken).toEqual([])
    let count=0
    for(const [label,charts]of [['Tendencias',4],['Comparativa',4],['Cuadro de negocio',2],['Tabla detalle',0]]) {
      await page.getByRole('group',{name:'Vistas del historial'}).getByRole('button',{name:label,exact:true}).click()
      await expect(page.locator('.measured-chart')).toHaveCount(charts)
      for(const chart of await page.locator('.measured-chart').all())await expect(chart.locator('.recharts-wrapper > svg.recharts-surface')).toBeVisible()
      count+=charts
      for(const detail of await page.locator('.chart-data').all()) {
        await detail.locator('summary').click()
        await expect(detail.locator('tbody tr').first().locator('th')).not.toHaveText('')
        expect(await detail.locator('tbody tr').count()).toBeGreaterThan(0)
      }
      await geometry(page,testInfo,'historial-'+label)
    }
    expect(count).toBe(10)
    expect(await r10Snapshot()).toEqual(before)
  }finally{await context.close()}
})
test('fallos de guardado conservan ready, contenido y controles recuperables',async({browser},testInfo)=>{
  const {context,page}=await actorPage(browser,testInfo,'center')
  try {
    for(const suffix of ['cuadro','cumplimiento','foda']) {
      await page.goto('/centro/2/'+suffix);await ready(page)
      const before=await r10Snapshot()
      if(suffix==='cuadro')await page.getByRole('button',{name:'Nuevo pedido',exact:true}).click()
      const abort=route=>route.request().method()==='POST'?route.abort('failed'):route.continue()
      await page.route('**/centro/2/**',abort)
      await page.getByRole('button',{name:suffix==='cuadro'?'Guardar pedido':suffix==='foda'?'Guardar FODA':'Guardar',exact:true}).click()
      await expect(page.locator('#main-content')).toHaveAttribute('data-page-state','ready')
      const scope=suffix==='cuadro'?page.getByRole('dialog'):page.locator('#main-content')
      await expect(scope.getByRole('status').filter({hasText:/Error|No se pudo|Failed to fetch/i})).toBeVisible()
      await expect(page.getByRole('button',{name:suffix==='cuadro'?'Guardar pedido':suffix==='foda'?'Guardar FODA':'Guardar',exact:true})).toBeEnabled()
      await page.unroute('**/centro/2/**',abort)
      if(suffix==='cuadro')await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click()
      expect(await r10Snapshot()).toEqual(before)
    }
  }finally{await context.close()}
})
test('pedido se abre como diálogo, conserva labels y cancela sin escribir',async({browser},testInfo)=>{
  const {context,page}=await actorPage(browser,testInfo,'center')
  try{
    await page.goto('/centro/2/cuadro');await ready(page)
    const groupPanel=page.locator('.panel').filter({has:page.getByRole('heading',{name:'Control de grupos',exact:true})})
    const heading=await groupPanel.locator('.panel__title').boundingBox(),hint=await groupPanel.locator('.panel__head .label').boundingBox()
    expect(heading.y+heading.height<=hint.y || heading.x+heading.width+7<=hint.x).toBe(true)
    await groupPanel.locator('.panel__head').evaluate(node=>node.scrollIntoView({block:'center'}))
    await capturePage(page,{testInfo,name:'cuadro-control-grupos-header',locator:groupPanel.locator('.panel__head')})
    const before=await r10Snapshot()
    await page.getByRole('button',{name:'Nuevo pedido',exact:true}).click()
    const dialog=page.getByRole('dialog',{name:'Nuevo pedido',exact:true})
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Observaciones',{exact:true}).fill('Sin enviar')
    await geometry(page,testInfo,'pedido-dialogo')
    await page.setViewportSize({width:testInfo.project.use.viewport.width,height:390})
    await dialog.getByLabel('Observaciones',{exact:true}).focus()
    const submit=dialog.getByRole('button',{name:'Guardar pedido',exact:true})
    await submit.scrollIntoViewIfNeeded()
    const footer=await submit.boundingBox()
    expect(footer.y).toBeGreaterThanOrEqual(0);expect(footer.y+footer.height).toBeLessThanOrEqual(390)
    await page.setViewportSize(testInfo.project.use.viewport)
    await dialog.getByRole('button',{name:'Cancelar',exact:true}).click()
    await expect(dialog).toHaveCount(0)
    expect(await r10Snapshot()).toEqual(before)
  }finally{await context.close()}
})
test('Cuadro conserva grupo expandido, deserción y foto cerrada vacía',async({browser},testInfo)=>{
  const {context,page}=await actorPage(browser,testInfo,'center')
  try {
    await page.goto('/centro/2/cuadro');await ready(page)
    const before=await r10Snapshot()
    const group=page.getByRole('button',{name:'Grupo R10-1',exact:true})
    await group.click();await expect(group).toHaveAttribute('aria-expanded','true')
    await expect(page.locator('#'+await group.getAttribute('aria-controls'))).toBeVisible()
    await geometry(page,testInfo,'cuadro-grupo-expandido')
    await group.click()
    await expect(page.getByText('Diego R10 Retirado Apellido Extraordinariamente Largo',{exact:true})).toBeVisible()
    const manifest=await readR10Manifest(),closed=manifest.months.at(-1)
    await page.getByLabel('Año',{exact:true}).selectOption(String(closed[1]));await ready(page)
    await page.getByLabel('Mes',{exact:true}).selectOption(String(closed[2]));await ready(page)
    await expect(page.getByText(/Mes cerrado · foto congelada/)).toBeVisible()
    await expect(page.getByRole('button',{name:'Nuevo pedido',exact:true})).toHaveCount(0)
    await expect(page.getByRole('button',{name:'Sincronizar con KPI',exact:true})).toBeDisabled()
    await geometry(page,testInfo,'cuadro-cerrado-vacio')
    expect(await r10Snapshot()).toEqual(before)
  }finally{await context.close()}
})
test('reportes: matrices tabs y formación conservan lectura e interacción local',async({browser},testInfo)=>{
  const {context,page}=await actorPage(browser,testInfo,'center')
  try {
    await page.goto('/centro/2/cumplimiento');await ready(page)
    const before=await r10Snapshot()
    const tabs=page.getByRole('tab')
    await tabs.first().focus();await page.keyboard.press('ArrowRight');await ready(page)
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected','true')
    await expect(page.locator('.compliance-matrix')).toHaveCount(5)
    for(const row of await page.locator('.compliance-matrix tbody tr').all()) {
      await expect(row.locator('th[scope=row]')).toHaveCount(1)
      await expect(row.getByRole('button')).toHaveCount(2)
      await expect(row.getByRole('button',{name:'Sí',exact:true})).toHaveCount(1)
      await expect(row.getByRole('button',{name:'No',exact:true})).toHaveCount(1)
    }
    await geometry(page,testInfo,'cumplimiento-matriz')
    await page.goto('/centro/2/foda');await ready(page)
    await page.getByRole('tab',{name:'Comentario',exact:true}).focus();await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tabpanel',{name:'Petición',exact:true})).toBeVisible()
    await page.keyboard.press('Home')
    await page.getByRole('textbox',{name:'Comentario',exact:true}).fill('Comentario no enviado')
    await page.getByRole('textbox',{name:'Comentario',exact:true}).fill('')
    await page.getByRole('button',{name:'Editar',exact:true}).first().click()
    await page.getByRole('textbox',{name:'Editar comentario',exact:true}).fill('Edición cancelada, sin guardar')
    if(testInfo.project.use.viewport.width<768) {
      const editor=page.getByRole('textbox',{name:'Editar comentario',exact:true})
      const ratio=await editor.evaluate(n=>n.getBoundingClientRect().width/n.parentElement.parentElement.getBoundingClientRect().width)
      expect(ratio,'Editor FODA ocupa la fila completa').toBeGreaterThan(.95)
    }
    await geometry(page,testInfo,'foda-edicion')
    await page.getByRole('button',{name:'Cancelar',exact:true}).click()
    await geometry(page,testInfo,'foda-tabs')
    await page.goto('/centro/2/entrenamiento');await ready(page)
    await page.getByText('Preguntas frecuentes',{exact:true}).click()
    await page.locator('.ent-faq summary').first().click()
    await geometry(page,testInfo,'formacion-faq')
    await page.goto('/centro/2/entrenamiento/meta');await ready(page)
    await page.locator('input[type=radio]').first().check()
    await geometry(page,testInfo,'formacion-modulo')
    expect(await r10Snapshot()).toEqual(before)
  }finally{await context.close()}
})
test('FODA gerencia cancela confirmaciones destructivas sin cambiar registros',async({browser},testInfo)=>{
  const {context,page}=await actorPage(browser,testInfo,'admin')
  try {
    await page.goto('/centro/2/foda');await ready(page)
    const before=await r10Snapshot()
    await page.getByRole('button',{name:'Eliminar',exact:true}).click()
    await expect(page.getByRole('dialog',{name:'Eliminar registro',exact:true})).toBeVisible()
    await geometry(page,testInfo,'foda-confirmacion')
    await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click()
    await page.locator('.foda-request-row').last().getByRole('button',{name:'Anulada',exact:true}).click()
    await expect(page.getByRole('dialog',{name:'Anular petición',exact:true})).toBeVisible()
    await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click()
    expect(await r10Snapshot()).toEqual(before)
  }finally{await context.close()}
})
