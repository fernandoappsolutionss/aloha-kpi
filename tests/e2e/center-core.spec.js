import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { auditPage, capturePage } from './helpers/audit-page.js'
import { readR8Manifest, setR8BriefingVisible } from './helpers/r8-fixture.mjs'

test.beforeEach(async ({page}) => {
  await readR8Manifest() // Never skip a missing fixture or fall back to admin.
  await page.addInitScript(()=>localStorage.setItem('ts_period',JSON.stringify({year:2026,quarter:3})))
  page.on('console',message=>{ if (['error','warning'].includes(message.type())) console.log('R8 browser:',message.text()) })
})
test.afterEach(async ({page},testInfo) => {
  if (page.isClosed()) return
  await page.waitForLoadState('networkidle')
  if (testInfo.status !== testInfo.expectedStatus) {
    console.log('R8 geometry', await page.locator('main *').evaluateAll(els=>els.filter(el=>el.clientWidth>0 && el.scrollWidth>el.clientWidth+1 && !el.closest('[data-horizontal-scroll]')).map(el=>({tag:el.tagName,cls:el.className,text:el.textContent.slice(0,45),width:el.clientWidth,scroll:el.scrollWidth}))))
  }
  if (testInfo.status === 'passed' && !/error fatal|Growth abierto/.test(testInfo.title)) await capturePage(page,{name:testInfo.title,testInfo})
})

async function ready(page,path) {
  await page.goto(path,{waitUntil:'networkidle'})
  await expect(page.locator('#main-content[data-page-state=ready]')).toHaveCount(1)
}
async function axe(page) {
  const results = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()
  expect(results.violations).toEqual([])
}

test('mezcla anual real conserva cerrado y suma graduado automático',async ({page}) => {
  await page.goto('/centro/3',{waitUntil:'networkidle'})
  const annual = page.getByRole('heading',{name:'Graduados 2026 · logro 🎓'}).locator('..')
  await expect(annual.locator('.num').first()).toHaveText('3') // 2 cerrado + 1 automático, guardado abierto=0
  await expect(annual.locator('.num').nth(1)).toHaveText('27%') // 3/(5+5+1)
})

test('Resumen: tarjetas completas o tabla contenida y documento sin overflow',async ({page}) => {
  await ready(page,'/centro/3')
  const phone = page.viewportSize().width < 768
  await auditPage(page,{mobile:page.viewportSize().width <= 1024})
  const cards = page.locator('.center-month-cards .operational-card')
  if (phone) {
    await expect(cards).toHaveCount(3)
    await expect(cards.last()).toContainText('Septiembre')
    await expect(cards.last().locator('dd')).toHaveText(['1','1','1 · 2.5%','40','9','No'])
    await expect(page.getByRole('region',{name:'Resultados por mes',exact:true})).toBeHidden()
    const brokenWords = await page.locator('.center-summary-grid .label').evaluateAll(labels=>labels.flatMap(label=>{
      const text = label.firstChild
      if (text?.nodeType !== Node.TEXT_NODE) return []
      return [...text.textContent.matchAll(/\S+/g)].filter(match=>{
        const range=document.createRange(); range.setStart(text,match.index); range.setEnd(text,match.index+match[0].length)
        return range.getClientRects().length > 1
      }).map(match=>match[0])
    }))
    expect(brokenWords,'Las etiquetas se parten solo entre palabras, sin encoger fuente').toEqual([])
  } else {
    const table = page.getByRole('region',{name:'Resultados por mes',exact:true})
    await expect(table).toBeVisible()
    await expect(table.locator('tbody tr').last().locator('td')).toHaveText(['Septiembre','1','1','1 · 2.5%','40','9 ✗','No'])
  }
  await axe(page)
})

test('Ruta: gráfico medido, equivalente textual, escenarios y controles accesibles',async ({page}) => {
  await ready(page,'/centro/3/ruta-nivel')
  await auditPage(page,{mobile:page.viewportSize().width <= 1024})
  const geometry = await page.locator('.measured-chart').evaluate(el=>({wrapper:el.getBoundingClientRect().width,svg:el.querySelector('svg').getBoundingClientRect().width}))
  expect(Math.abs(geometry.wrapper-geometry.svg)).toBeLessThanOrEqual(1)
  await expect(page.getByRole('table',{name:'Proyección mensual de niños por escenario'}).locator('tbody tr')).not.toHaveCount(0)
  await expect(page.getByRole('progressbar',{name:/Progreso/})).toHaveAttribute('aria-valuetext',/%/)
  await page.getByRole('button',{name:'Plan de acción',exact:true}).click()
  await expect(page.getByRole('button',{name:'Plan de acción',exact:true})).toHaveAttribute('aria-pressed','true')
  await axe(page)
})

test('KPI: 15 tarjetas y controles etiquetados comparten valores al rotar',async ({page}) => {
  await ready(page,'/centro/3/kpi')
  const original = page.viewportSize()
  await auditPage(page,{mobile:original.width <= 1024})
  expect(await page.locator('main input:visible').evaluateAll(inputs=>inputs.filter(el=>!el.labels?.length || !el.name || el.type !== 'number' || el.inputMode !== 'numeric' || el.min !== '0').map(el=>el.id))).toEqual([])
  const ids = await page.locator('main [id]').evaluateAll(els=>els.map(el=>el.id))
  expect(new Set(ids).size).toBe(ids.length)
  await expect(page.getByLabel('Matriculados',{exact:true})).toHaveValue('7')
  const mobile = original.width < 768
  await expect(page.locator('.kpi-week-cards .operational-card')).toHaveCount(15)
  if (mobile) {
    const firstCard = page.locator('.kpi-week-cards .operational-card').first()
    expect((await firstCard.innerText()).match(/Día [1-5]/g)).toHaveLength(5)
    for (let day=1; day<=5; day++) await expect(firstCard.getByLabel(`Día ${day}`,{exact:true})).toHaveCount(1)
  }
  await expect(page.getByRole('region',{name:'KPI semanal',exact:true}))[mobile?'toBeHidden':'toBeVisible']()
  const prefix = mobile ? 'mobile' : 'desktop'
  const input = page.locator(`#kpi-${prefix}-0-cob-0`)
  await input.fill('17') // UI draft only: no save/close/reopen.
  await page.setViewportSize({width:mobile?844:390,height:mobile?390:844})
  await expect(page.locator(`#kpi-${mobile?'desktop':'mobile'}-0-cob-0`)).toHaveValue('17')
  await auditPage(page,{mobile:true})
  await page.setViewportSize(original)
  await expect(input).toHaveValue('17')
  await axe(page)
  if (process.env.E2E_CAPTURE_DIR && original.width === 320) {
    await page.evaluate(()=>window.scrollTo(0,0))
    await page.screenshot({path:`${process.env.E2E_CAPTURE_DIR}/kpi-320-viewport.png`})
    await page.locator('.kpi-week-cards .operational-card').first().screenshot({path:`${process.env.E2E_CAPTURE_DIR}/kpi-320-first-card.png`})
  }
})

test('historial cerrado conserva semanas guardadas y navegación no escribe formularios',async ({page}) => {
  await ready(page,'/centro/3/kpi')
  await page.getByRole('button',{name:'Mes anterior',exact:true}).click()
  await expect(page.getByRole('button',{name:'Reabrir mes',exact:true})).toBeVisible()
  const prefix=page.viewportSize().width < 768 ? 'mobile' : 'desktop'
  await expect(page.locator(`#kpi-${prefix}-0-ing-0`)).toHaveValue('2')
  await expect(page.locator(`#kpi-${prefix}-0-des-0`)).toHaveValue('1')
  await expect(page.locator(`#kpi-${prefix}-0-cob-4`)).toHaveValue('4')
  await expect(page.locator(`#kpi-${prefix}-0-ing-0`)).toBeDisabled()
  await expect(page.getByLabel('Nuevos ingresos venta',{exact:true})).toHaveValue('10')
  await page.getByRole('button',{name:'Mes siguiente',exact:true}).click()
  await expect(page.getByRole('button',{name:'Guardar',exact:true})).toBeVisible()
  await expect(page.getByLabel('Matriculados',{exact:true})).toHaveValue('7')
})

for (const period of [null,{year:2026,quarter:3},{year:2026,quarter:2}]) test(`período hidratado despacha una sola carga: ${period?.quarter ?? 'sin guardar'}`,async ({page}) => {
  await page.goto('/perfil',{waitUntil:'networkidle'})
  await page.evaluate(value=>value ? localStorage.setItem('ts_period',JSON.stringify(value)) : localStorage.removeItem('ts_period'),period)
  // The beforeEach init script is intentionally not re-run on SPA navigation.
  const loads=[]
  page.on('request',request=>{
    if (request.method() !== 'POST') return
    try {
      const args=JSON.parse(request.postData())
      if (Array.isArray(args) && args.length===3 && String(args[0])==='3' && args[1]===2026 && [2,3].includes(args[2])) loads.push(args)
    } catch {}
  })
  // Use the real Sidebar link, preserving the stored period across navigation.
  if (page.viewportSize().width <= 1024) await page.getByRole('button',{name:'Abrir menú',exact:true}).click()
  await page.getByRole('link',{name:'Resumen',exact:true}).click()
  await page.waitForURL('**/centro/3')
  await expect(page.getByRole('heading',{name:/Centro R8 de Aprendizaje/})).toBeVisible()
  await expect(page.locator('#main-content[data-page-state=ready]')).toHaveCount(1)
  await page.waitForLoadState('networkidle')
  expect(loads).toHaveLength(1)
  expect(loads[0].slice(1)).toEqual([2026,period?.quarter ?? 3])
  await expect(page.getByText(`Resumen de centro · Q${period?.quarter ?? 3} 2026`,{exact:true})).toBeVisible()
})

test('Growth abierto no provoca overflow del Resumen de fondo',async ({page}) => {
  await setR8BriefingVisible(true)
  try {
    await ready(page,'/centro/3')
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  } finally { await setR8BriefingVisible(false) }
})

for (const route of ['/centro/3','/centro/3/ruta-nivel','/centro/3/kpi']) test(`error fatal conserva shell sin KPI ficticio: ${route}`,async ({page}) => {
  await page.route('**/centro/3**',async routeHandler=>{
    if (routeHandler.request().method() === 'POST') return routeHandler.abort('failed')
    return routeHandler.continue()
  })
  await page.goto(route,{waitUntil:'networkidle'})
  await expect(page.locator('#main-content[data-page-state=error]')).toHaveCount(1)
  await expect(page.locator('main [role=alert]')).toBeVisible()
  await expect(page.locator('main input,main .kpi,main .growth-chart')).toHaveCount(0)
  await expect(page.locator('main')).toHaveCount(1)
})
