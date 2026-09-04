import {test,expect} from '@playwright/test'
import {prepareSupervisor,cleanupSupervisor,SUPERVISOR} from './helpers/final-navigation-fixture.mjs'
import {auditPage,capturePage} from './helpers/audit-page'

test.beforeAll(async({},info)=>{if([390,1440].includes(info.project.use.viewport.width))await prepareSupervisor()})
test.afterAll(async({},info)=>{if([390,1440].includes(info.project.use.viewport.width))await cleanupSupervisor()})
for(const actor of ['admin','supervisor','coordinator']) test(`contexto centro de ${actor}: destinos, teclado, retorno y Perfil`,async({browser},info)=>{
  test.skip(![390,1440].includes(info.project.use.viewport.width),'Actores focales en teléfono y escritorio.')
  test.setTimeout(120000)
  const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:info.project.use.viewport})
  context.setDefaultTimeout(15000)
  try {
    const page=await context.newPage(),mobile=page.viewportSize().width<=1024,id=process.env.E2E_CENTRO_ID
    const origins=['http://127.0.0.1:3000','http://localhost:3000']
    await page.route('**/*',route=>origins.includes(new URL(route.request().url()).origin)&&!new URL(route.request().url()).pathname.startsWith('/api/zoho/')?route.continue():route.abort())
    await page.goto('/login',{waitUntil:'networkidle'})
    const prefix=actor==='admin'?'E2E_ADMIN':'E2E_COORDINATOR'
    await page.locator('input[type=email]').fill(actor==='supervisor'?SUPERVISOR.email:process.env[prefix+'_EMAIL'])
    await page.locator('input[type=password]').fill(actor==='supervisor'?SUPERVISOR.password:process.env[prefix+'_PASSWORD'])
    await page.locator('button[type=submit]').click();await page.waitForURL(/\/dashboard$/)
    async function nav(){
      expect(origins).toContain(new URL(page.url()).origin)
      await expect(page.locator('aside.sb')).toHaveAttribute('data-navigation-state','ready')
      if(await page.locator('.growth-briefing').isVisible())await page.locator('.growth-briefing').getByRole('button',{name:'Cerrar diálogo'}).click()
      if(mobile)await page.getByRole('button',{name:'Abrir menú',exact:true}).click()
      return page.locator('aside.sb')
    }
    async function enter(link){await link.focus();await page.keyboard.press('Enter')}
    let menu=await nav()
    await enter(menu.getByRole('button',{name:'Ir a centro',exact:true}))
    await enter(menu.locator(`a[href="/centro/${id}"]`))
    await page.waitForURL(url=>url.pathname===`/centro/${id}`);await page.waitForLoadState('networkidle')
    menu=await nav()
    const destinations=[['Resumen',''],['KPI Semanal','/kpi'],['Grupos y Fusiones','/grupos'],['Cuadro de Negocio','/cuadro'],['Clases de Prueba','/eventos'],['Cumplimiento','/cumplimiento'],['FODA','/foda'],['Historial','/historial'],['Entrenamiento','/entrenamiento']]
    for(const [label,suffix] of destinations)await expect(menu.getByRole('link',{name:label,exact:true})).toHaveAttribute('href',`/centro/${id}${suffix}`)
    await expect(menu.locator('a[aria-current=page]')).toHaveCount(1)
    await enter(menu.getByRole('link',{name:'Grupos y Fusiones',exact:true}))
    await page.waitForURL(url=>url.pathname===`/centro/${id}/grupos`);await page.waitForLoadState('networkidle')
    menu=await nav();await expect(menu.getByRole('link',{name:'Grupos y Fusiones',exact:true})).toHaveAttribute('aria-current','page')
    await expect(menu.locator('a[aria-current=page]')).toHaveCount(1)
    await auditPage(page,{mobile})
    await capturePage(page,{name:`final-nav-${actor}`,testInfo:info,locator:menu})
    await enter(menu.getByRole('link',{name:actor==='coordinator'?'Volver al panel':'Volver a Administración',exact:true}))
    await page.waitForURL(url=>url.pathname==='/dashboard');menu=await nav()
    await expect(menu.getByRole('link',{name:'Panel general',exact:true})).toHaveAttribute('aria-current','page')
    await expect(menu.getByRole('link',{name:'Conexión Zoho',exact:true})).toHaveCount(actor==='coordinator'?0:1)
    await enter(menu.getByRole('link',{name:'Mi perfil',exact:true}))
    await page.waitForURL(url=>url.pathname==='/perfil');menu=await nav()
    await expect(menu.getByRole('link',{name:'Panel general',exact:true})).toHaveAttribute('href','/dashboard')
    await expect(menu.getByRole('link',{name:'Mi perfil',exact:true})).toHaveAttribute('aria-current','page')
    await expect(menu.locator('a[aria-current=page]')).toHaveCount(1)
    if(actor==='coordinator')await expect(menu.getByRole('link',{name:'Gestión centros',exact:true})).toHaveCount(0)
  }finally{await context.close()}
})
