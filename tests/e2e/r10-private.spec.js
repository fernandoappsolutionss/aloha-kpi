import {test,expect} from '@playwright/test'
import {readR10Manifest} from './helpers/r10-fixture.mjs'
import {ready,axe} from './helpers/r10-audit.mjs'
import {auditPage} from './helpers/audit-page.js'
test('privado: dos superficies sin sesión y sin persistir secretos',async({browser,baseURL})=>{
  test.setTimeout(360000)
  if(process.env.E2E_CAPTURE_DIR)throw new Error('Privado R10 prohíbe captura.')
  const fixture=await readR10Manifest()
  for(const [width,height]of [[320,568],[375,667],[390,844],[430,932],[768,1024],[1440,900]]){
    const context=await browser.newContext({baseURL,viewport:{width,height}})
    try{
      const page=await context.newPage()
      for(const path of ['/coach/'+fixture.token,'/set-password?token='+encodeURIComponent(fixture.accessToken)]){
        await page.goto(path);await ready(page)
        await auditPage(page,{mobile:width<=1024})
        if([390,1440].includes(width))for(const theme of ['light','dark']){await page.evaluate(t=>{document.documentElement.dataset.theme=t},theme);await axe(page)}
      }
    }finally{await context.close()}
  }
})
