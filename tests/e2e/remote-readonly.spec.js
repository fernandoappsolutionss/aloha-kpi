import { test,expect } from '@playwright/test'
import { PUBLIC_CASES,ADMIN_PATHS,COORDINATOR_PATHS,remoteSettings,allowedPath,publicPageIsReady } from './helpers/remote-readonly.mjs'
const settings=remoteSettings()
test.beforeEach(async({page})=>{
  await page.route('**/*',route=>{
    const url=new URL(route.request().url())
    if(url.origin!==settings.baseURL||url.searchParams.has('token'))return route.abort('blockedbyclient')
    if(url.pathname.startsWith('/_next/')||/\.(png|svg|ico|woff2?|ttf)$/.test(url.pathname)||allowedPath(url.pathname))return route.continue()
    return route.abort('blockedbyclient')
  })
})
async function measure(page){
  const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,main:document.querySelectorAll('main').length}))
  expect(result).toEqual({overflow:false,main:1})
}
async function login(page,actor){
  await page.goto('/login',{waitUntil:'networkidle'})
  expect(new URL(page.url()).origin).toBe(settings.baseURL)
  expect(new URL(page.url()).pathname).toBe('/login')
  const form=page.locator('form').filter({has:page.locator('input[type=email]')})
  await expect(form).toHaveCount(1)
  await expect(form.locator('input[type=password]')).toBeVisible()
  await form.locator('input[type=email]').fill(actor.email)
  await form.locator('input[type=password]').fill(actor.password)
  await form.locator('button[type=submit]').click()
  await page.waitForURL(url=>url.origin===settings.baseURL&&url.pathname==='/dashboard')
  await page.waitForLoadState('networkidle')
}
for(const item of PUBLIC_CASES)test(item.id,async({page})=>{
  for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
    await page.setViewportSize(viewport)
    const response=await page.goto(item.path,{waitUntil:'networkidle'})
    expect(response.status()).toBe(200)
    await page.waitForFunction(publicPageIsReady,{criteria:item,origin:settings.baseURL},{timeout:30000})
    await measure(page)
  }
})
test('P05',async({page})=>{await page.goto('/dashboard/usuarios');await page.waitForURL(url=>url.origin===settings.baseURL&&url.pathname==='/login');await measure(page)})
test('P06',async({request})=>{const response=await request.get('/e2e-primitives',{maxRedirects:0});expect(response.status()).toBe(404)})
if(settings.mode==='authenticated')for(const [actor,paths,prefix]of [[settings.admin,ADMIN_PATHS,'A'],[settings.coordinator,COORDINATOR_PATHS,'C']])test(prefix+'01',async({page})=>{
  await login(page,actor)
  for(const path of paths){await page.goto(path,{waitUntil:'networkidle'});expect(new URL(page.url()).origin).toBe(settings.baseURL);expect(new URL(page.url()).pathname).toBe(path);await expect(page.locator('#main-content[data-page-state=ready]')).toBeVisible();await measure(page)}
  if(prefix==='C'){await page.getByRole('button',{name:/Nuevo usuario|Crear usuario/}).click();await expect(page.getByRole('form',{name:'Editor de usuario'})).toBeVisible();await page.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(page.getByRole('form',{name:'Editor de usuario'})).toHaveCount(0)}
  await page.waitForLoadState('networkidle')
})
