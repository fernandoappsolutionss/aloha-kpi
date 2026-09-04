import { test,expect } from '@playwright/test'
import { actorPage,ready,geometry,activeNavigation,ADMIN_ROUTES } from './helpers/r10-audit.mjs'
test('gerencia: doce rutas incluida Zoho sin OAuth',async({browser},testInfo)=>{
  test.setTimeout(360000)
  const {context,page}=await actorPage(browser,testInfo,'admin')
  try {for(const route of ADMIN_ROUTES) { await page.goto(route);await ready(page);await geometry(page,testInfo,'gerencia-'+route);await activeNavigation(page,testInfo.project.use.viewport.width<=1024) }}finally{await context.close()}
})
test('públicas: raíz login recuperación e invitación inválida sin sesión',async({browser},testInfo)=>{
  const {context,page}=await actorPage(browser,testInfo)
  try {for(const route of ['/','/login','/forgot-password','/set-password']) {await page.goto(route);await ready(page);await geometry(page,testInfo,'publica-'+route)}}finally{await context.close()}
})
test('coordinador: dashboard usuarios y cancelar creación',async({browser},testInfo)=>{
  const {context,page}=await actorPage(browser,testInfo,'coordinator')
  try {
    for(const route of ['/dashboard','/dashboard/usuarios']) {await page.goto(route);await ready(page);await geometry(page,testInfo,'coordinador-'+route)}
    await page.getByRole('button',{name:/Nuevo usuario|Crear usuario/}).click()
    await expect(page.getByRole('form',{name:'Editor de usuario'})).toBeVisible()
    await page.getByRole('button',{name:'Cancelar',exact:true}).click()
    await expect(page.getByRole('form',{name:'Editor de usuario'})).toHaveCount(0)
  }finally{await context.close()}
})
