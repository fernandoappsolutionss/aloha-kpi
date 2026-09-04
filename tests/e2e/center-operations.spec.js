import { test,expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { auditPage, capturePage } from './helpers/audit-page'
import { readR9Manifest,r9Snapshot } from './helpers/r9-fixture.mjs'
test('operaciones R9 accesibles y exclusivamente de lectura',async ({page,request},testInfo)=>{
  test.setTimeout(180_000)
  const fixture=await readR9Manifest()
  const before=await r9Snapshot()
  const mobile=page.viewportSize().width<=1024
  async function audit(scope=null) {
    await expect(page.locator('main')).toHaveCount(1)
    await auditPage(page,{mobile,scope})
    const builder=new AxeBuilder({page})
    if(scope) builder.include(scope)
    const results=await builder.analyze()
    expect(results.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([])
  }
  try {
    await page.goto('/centro/2/grupos',{waitUntil:'networkidle'})
    await audit()
    if(page.viewportSize().width===320) {await page.locator('h1').click();await capturePage(page,{name:'r9-grupos',testInfo})}
    const open=page.getByRole('button',{name:'Abrir grupo R9-1',exact:true})
    await open.click()
    await expect(page.locator('button[aria-label="Abrir grupo R9-1"]')).toHaveAttribute('aria-expanded','true')
    await audit()
    await page.getByRole('tab',{name:/Itinerario/}).click();await audit()
    await page.getByRole('tab',{name:/Niños/}).click()
    await page.getByRole('button',{name:/Ver plan de Bruno/}).click()
    const dialog=page.getByRole('dialog',{name:/Plan de Bruno/})
    await expect(dialog.getByRole('radio').first()).toBeVisible()
    expect(await dialog.getByRole('radio').count()).toBeGreaterThan(1)
    await audit('.plan-nino-dialog')
    await dialog.getByRole('radio').last().check()
    await expect(dialog.getByLabel('Fecha manual de inicio')).toBeVisible()
    await dialog.getByLabel('Fecha manual de inicio').fill(fixture.past)
    await audit('.plan-nino-dialog')
    await dialog.getByRole('button',{name:'Cancelar',exact:true}).click()
    await expect(dialog).toHaveCount(0)
    await page.getByRole('button',{name:/Ver plan de Ana/}).click()
    const existingPlan=page.getByRole('dialog',{name:/Plan de Ana/})
    await expect(existingPlan.locator('.itin-fila').first()).toBeVisible();await audit('.plan-nino-dialog')
    await existingPlan.getByRole('button',{name:'Cerrar diálogo',exact:true}).click()
    if(page.viewportSize().width<=1180) {await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(open).toBeFocused()}
    for(const label of ['Fusiones','Horarios','Coaches y salones']) {
      await page.getByRole('button',{name:label,exact:true}).click()
      await page.waitForLoadState('networkidle');await audit()
    }
    await page.goto('/centro/2/eventos',{waitUntil:'networkidle'})
    await audit()
    if(page.viewportSize().width<768) {
      const status=page.getByRole('article').getByText('Publicado',{exact:true})
      await expect(status).toBeVisible()
      const lines=await status.evaluate(element=>{
        const range=document.createRange();range.selectNodeContents(element)
        return Array.from(range.getClientRects()).filter(rect=>rect.width>0).map(rect=>rect.top)
      })
      expect(new Set(lines).size,'El estado corto Publicado debe conservar una sola línea').toBe(1)
    }
    await page.getByRole('button',{name:/Ver registros de Clase R9/}).click()
    await expect(page.getByText('Registro R9 de Apellido Extraordinariamente Largo',{exact:false}).first()).toBeVisible()
    await audit()
    if(page.viewportSize().width===320) {await page.locator('h1').click();await capturePage(page,{name:'r9-eventos',testInfo})}
    const menuTrigger=page.getByRole('button',{name:'Acciones de Clase R9 Aprendizaje Integral',exact:true})
    await menuTrigger.click();await expect(page.getByRole('menu')).toBeVisible();await audit();await page.keyboard.press('Escape');await expect(menuTrigger).toBeFocused()
    await page.getByRole('button',{name:/Nueva clase de prueba/}).click()
    await expect(page.getByRole('dialog')).toBeVisible();await audit('.dialog')
    await page.getByRole('button',{name:'Cancelar',exact:true}).click()
    // No Coach launcher, no URL in titles/logs/artifacts; private fixture token.
    try { await page.goto('/coach/'+fixture.token,{waitUntil:'networkidle'}) } catch { throw new Error('No se pudo abrir la superficie privada local.') }
    await audit()
    if(page.viewportSize().width<768) {
      const date=page.getByLabel('Fecha de clase',{exact:true})
      await expect(date).toHaveValue(fixture.today)
      await expect(date.locator('option')).toHaveCount(2)
      await expect(page.getByRole('button',{name:'Quitar marca',exact:true})).toBeVisible()
      for(const value of [fixture.past,fixture.today]) {
        await date.selectOption(value);await audit()
        await expect(page.getByRole('group',{name:/Asistencia de Ana/}).getByRole('button',{name:'Presente',exact:true})).toHaveAttribute('aria-pressed',value===fixture.today?'true':'false')
        await expect(page.getByRole('button',{name:'Quitar marca',exact:true})).toHaveCount(value===fixture.today?1:0)
      }
      await page.getByRole('button',{name:'Clase anterior',exact:true}).click();await expect(date).toHaveValue(fixture.past)
      await page.getByRole('button',{name:'Clase siguiente',exact:true}).click();await expect(date).toHaveValue(fixture.today)
      const group=page.getByRole('group',{name:/Asistencia de Ana/})
      for(const name of ['Presente','Ausente','Justificado']) await expect(group.getByRole('button',{name,exact:true})).toBeVisible()
    } else {
      await expect(page.getByRole('region',{name:'Asistencia de todas las clases'})).toBeVisible()
      await expect(page.locator('td select')).toHaveCount(4)
      await expect(page.getByRole('combobox',{name:/Asistencia de Ana.*Segunda clase/})).toHaveValue('presente')
      await expect(page.getByRole('combobox',{name:/Asistencia de Ana.*Primera clase/})).toHaveValue('')
    }
    await page.getByRole('button',{name:/Nota de Ana/}).click()
    await audit('.coach-note')
    await page.getByRole('button',{name:'Cancelar',exact:true}).click()
  } finally {
    expect(await r9Snapshot(),'La navegación posterior a auth no modifica ninguna tabla').toEqual(before)
    const ledger=await (await request.get('http://127.0.0.1:4317/stats')).json()
    expect(ledger.mutatingAttempts).toBe(0)
    console.log(`R9 ${testInfo.project.name}: DB sin cambios; CRM mutatingAttempts=0; lecturas=${ledger.readCalls}`)
  }
})

for (const finding of ['horarios','coach','contactos']) test(`R9 revisión restaura ${finding}`,async ({page,request},testInfo)=>{
  test.setTimeout(120_000)
  const fixture=await readR9Manifest(),before=await r9Snapshot()
  const soft=expect.configure({soft:true,timeout:1000})
  async function audit() {
    await auditPage(page,{mobile:page.viewportSize().width<=1024})
    const result=await new AxeBuilder({page}).analyze()
    expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([])
  }
  try {
    if(finding==='coach') {
      try {await page.goto('/coach/'+fixture.token,{waitUntil:'networkidle'})}catch{throw new Error('Fallo de apertura privada local')}
      await soft(page.getByText('Cierre estimado: '+fixture.today.slice(8,10)+'/'+fixture.today.slice(5,7),{exact:true})).toBeVisible()
      const student=page.viewportSize().width<768?page.getByRole('article').filter({hasText:'Bruno R9'}):page.getByRole('row').filter({hasText:'Bruno R9'})
      await soft(student.getByText(/baja potencial/)).toBeVisible()
      await audit()
    } else {
      await page.goto('/centro/2/grupos',{waitUntil:'networkidle'})
      if(finding==='horarios') {
        await page.getByRole('button',{name:'Horarios',exact:true}).click()
        const schedule=page.locator('.schedule-list')
        const day=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][new Date(fixture.today+'T12:00:00Z').getUTCDay()||1]
        await page.getByRole('button',{name:day,exact:true}).click()
        const group=schedule.getByRole('article').filter({has:page.getByRole('heading',{name:'Grupo R9-1',exact:true})})
        await soft(group).toContainText('TINY')
        await soft(group).toContainText('2 niños')
        await page.getByRole('button',{name:'Lun',exact:true}).click()
        const reservation=schedule.getByRole('article').filter({has:page.getByRole('heading',{name:'Clase de prueba',exact:true})})
        for(const value of ['Tiny','Coach R9 Nombre Largo de Aprendizaje Integral','2:45 pm–4:15 pm','este salón no se puede usar para grupos']) await soft(reservation).toContainText(value)
        if(page.viewportSize().width>1024) {
          const dense=page.locator('.schedule-calendar [title^="Clase de prueba"]')
          await expect(dense).toBeVisible()
          for(const value of ['Tiny','Coach R9 Nombre Largo de Aprendizaje Integral','este salón no se puede usar para grupos']) await expect(dense).toHaveAttribute('title',new RegExp(value))
        }
        await audit()
        await page.getByRole('button',{name:'Mar',exact:true}).click()
        const slot=schedule.getByRole('article').filter({has:page.getByRole('heading',{name:'Disponible 6:30 pm–7:30 pm',exact:true})})
        for(const value of ['par en otro salón','Atractivo','Razón','Coaches libres','Coach R9 Nombre Largo de Aprendizaje Integral']) await soft(slot).toContainText(value)
        if(page.viewportSize().width>1024) await expect(page.locator('.schedule-calendar [title]').filter({hasText:'6:30 pm–7:30 pm'})).toHaveAttribute('title',/par en otro salón.*Coaches libres: Coach R9/)
        await audit()
      } else {
        async function checkContacts(dialog) {
          for(const [name,type] of [['telefono','tel'],['correo','email']]) {
            await soft(dialog.locator('input[name="'+name+'"]')).toHaveAttribute('type',type)
            await soft(dialog.locator('input[name="'+name+'"]')).toHaveAttribute('autocomplete',type)
          }
          await audit()
          await dialog.getByRole('button',{name:'Cancelar',exact:true}).click()
        }
        await page.getByRole('button',{name:'Inscribir niño',exact:true}).click()
        await checkContacts(page.getByRole('dialog',{name:'Inscribir niño',exact:true}))
        await page.getByRole('button',{name:'Abrir grupo R9-1',exact:true}).click()
        const row=page.locator('.grp-roster__item, tbody tr').filter({hasText:'Ana R9'})
        await row.getByRole('button',{name:'Editar',exact:true}).click()
        await checkContacts(page.getByRole('dialog',{name:/Editar a Ana/}))
        await page.goto('/centro/2/eventos',{waitUntil:'networkidle'})
        await page.getByRole('button',{name:/Ver registros de Clase R9/}).click()
        await page.getByRole('button',{name:/Agregar invitado/}).click()
        for(const [name,autocomplete] of [['first_name','given-name'],['last_name','family-name'],['email','email'],['phone','tel']]) await soft(page.locator('input[name="'+name+'"]')).toHaveAttribute('autocomplete',autocomplete)
        await audit()
        await page.getByRole('button',{name:/Cancelar/}).click()
      }
    }
  }finally{
    expect(await r9Snapshot()).toEqual(before)
    expect((await (await request.get('http://127.0.0.1:4317/stats')).json()).mutatingAttempts).toBe(0)
    console.log(`R9 revisión ${finding} ${testInfo.project.name}: DB invariante; CRM mutatingAttempts=0`)
  }
})

test('los fallos de lectura conservan shell y main de error, nunca un vacío exitoso',async ({page,request},testInfo)=>{
  test.skip(testInfo.project.name!=='phone-320','Estado fatal focal en teléfono; geometría normal cubre seis anchos.')
  test.setTimeout(90_000)
  const fixture=await readR9Manifest(),before=await r9Snapshot()
  await page.route('**/*',route=>route.request().method()==='POST'?route.abort('failed'):route.continue())
  try {
    for(const path of ['/centro/2/grupos','/centro/2/eventos','/coach/'+fixture.token]) {
      try {await page.goto(path,{waitUntil:'networkidle'})}catch{throw new Error('No se pudo abrir la prueba local de fallo de lectura.')}
      await expect(page.locator('main')).toHaveCount(1)
      await expect(page.locator('#main-content[data-page-state="error"]')).toHaveCount(1)
      await expect(page.getByRole('alert').first()).toBeVisible()
      await auditPage(page,{mobile:true,state:'error'})
    }
  }finally{
    expect(await r9Snapshot()).toEqual(before)
    expect((await (await request.get('http://127.0.0.1:4317/stats')).json()).mutatingAttempts).toBe(0)
  }
})
