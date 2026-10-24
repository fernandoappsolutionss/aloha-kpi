// Usa únicamente el PostgreSQL desechable de administradora-runtime.mjs.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium, expect } from '@playwright/test'
import pg from 'pg'
import { lunesDe } from '../../lib/caja/semanas.mjs'
const out = resolve('.scratch/administradora-e2e')
const r = JSON.parse(await readFile(resolve(out, 'runtime.json'), 'utf8'))
assert.equal(new URL(r.database).hostname, '127.0.0.1'); assert.equal(new URL(r.database).pathname, '/administradora_test')
assert.equal(new URL(r.baseURL).hostname, '127.0.0.1')
const db = new pg.Pool({ connectionString: r.database })
let browser, context
const checks = [], errors = []
const check = text => { checks.push(text); console.log('PASS', text) }
try {
  for(const file of ['2026-09-24-caja.sql','2026-10-17-caja-direccion.sql']) await db.query(await readFile(resolve('db/migrations',file),'utf8'))
  await db.query("INSERT INTO usuarios(id,nombre,email,password_hash,rol) SELECT 103,'Dirección QA','admin@alohapanama.com',password_hash,'coordinador' FROM usuarios WHERE id=101 ON CONFLICT(id) DO NOTHING")
  await db.query('INSERT INTO usuario_centros(usuario_id,centro_id) VALUES(103,2) ON CONFLICT DO NOTHING')
  await db.query('TRUNCATE caja_cuentas, caja_direccion_ciclos, caja_direccion_eventos, caja_compromisos, caja_baldes, caja_reglas RESTART IDENTITY CASCADE')
  await db.query("INSERT INTO caja_cuentas(id,empresa,banco,numero,nombre,tipo,saldo_ancla,saldo_ancla_fecha) VALUES(901,'altavia','BG','000123','Cuenta ficticia QA','operativa',1000,$1)",[r.hoy])
  await db.query("INSERT INTO caja_baldes(empresa,vigente_desde,dueno_pct,impuesto_pct) VALUES('altavia',$1,10,5)",[r.hoy])
  browser = await chromium.launch({channel:'chrome',headless:true})
  context = await browser.newContext({baseURL:r.baseURL,viewport:{width:1440,height:1000}})
  context.setDefaultTimeout(30000)
  const page = await context.newPage(); page.on('pageerror',e=>errors.push(e.message))
  await page.goto('/login'); await expect(page.locator('[data-hydrated=true]')).toBeVisible()
  await page.locator('input[type=email]').fill('admin@alohapanama.com'); await page.locator('input[type=password]').fill(r.password)
  await page.getByRole('button',{name:'Ingresar al sistema',exact:true}).click(); await page.waitForURL(u=>u.pathname!='/login',{timeout:60000})
  await page.goto('/dashboard/caja'); await expect(page.getByRole('heading',{name:'Curva de 13 semanas',exact:true})).toBeVisible({timeout:60000})
  await expect(page.getByRole('heading',{name:'Movimientos importados',exact:true})).toBeVisible({timeout:60000})
  check('Dirección Operativa entra a caja con su autorización vigente')
  const day=r.hoy.replaceAll('-','')
  const movements=[[1000,'DEPOSITO QA','qa-ingreso'],[-100,'TRANSFERENCIA SOCIO QA','qa-socio'],[-50,'SERVICIO QA','qa-servicio']]
  const ofx=`OFXHEADER:100\nDATA:OFXSGML\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>USD\n<BANKACCTFROM><BANKID>BG\n<ACCTID>000123\n<ACCTTYPE>CHECKING\n</BANKACCTFROM><BANKTRANLIST>${movements.map(([m,memo,id])=>`<STMTTRN><TRNTYPE>OTHER\n<DTPOSTED>${day}120000\n<TRNAMT>${m}\n<FITID>${id}\n<MEMO>${memo}\n</STMTTRN>`).join('')}</BANKTRANLIST><LEDGERBAL><BALAMT>1850\n<DTASOF>${day}120000\n</LEDGERBAL></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`
  const file={name:'extracto-qa.ofx',mimeType:'application/x-ofx',buffer:Buffer.from(ofx)}
  await page.getByLabel('Archivo del banco',{exact:true}).setInputFiles(file)
  await page.getByText('Revisar los 3 movimientos del archivo',{exact:true}).click()
  const preview=page.getByRole('region',{name:'Detalle del extracto',exact:true})
  await expect(preview.getByRole('row')).toHaveCount(4)
  await expect(preview).toContainText('TRANSFERENCIA SOCIO QA')
  await page.getByRole('button',{name:'Guardar 3 movimientos',exact:true}).click()
  const ledger=page.getByRole('region',{name:'Movimientos bancarios importados',exact:true})
  await expect(ledger.getByRole('row')).toHaveCount(4,{timeout:30000})
  check('Extracto muestra las tres operaciones antes de importar y conserva todas después')
  await page.getByLabel('Filtrar movimientos',{exact:true}).selectOption('salidas')
  await expect(ledger.getByRole('row')).toHaveCount(3)
  const pending=page.getByRole('region',{name:'Movimientos por clasificar',exact:true})
  for(const [memo,clase] of [['DEPOSITO QA','ingreso'],['TRANSFERENCIA SOCIO QA','dueno'],['SERVICIO QA','servicios']]) {
    const row=pending.getByRole('row').filter({hasText:memo})
    await row.getByRole('combobox').selectOption(clase)
    await row.getByRole('button',{name:/Guardar clasificación/}).click()
    await expect(row).toHaveCount(0,{timeout:30000})
  }
  await page.getByLabel('Filtrar movimientos',{exact:true}).selectOption('dueno')
  await expect(ledger.getByRole('row')).toHaveCount(2)
  await expect(ledger).toContainText('TRANSFERENCIA SOCIO QA')
  await page.reload(); await expect(page.getByRole('heading',{name:'Movimientos importados',exact:true})).toBeVisible({timeout:30000})
  assert.equal((await db.query('SELECT count(*)::int n FROM caja_movimientos')).rows[0].n,3)
  check('Clasificación persistida: se ven gastos ya clasificados y la transferencia al socio')
  await page.getByLabel('Archivo del banco',{exact:true}).setInputFiles(file)
  await expect(page.getByText('0 nuevos · 3 ya cargados · 0 quedarán por clasificar.',{exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Guardar solo el saldo del banco',exact:true}).click()
  await expect(page.getByRole('status').filter({hasText:'Saldo del banco actualizado'})).toBeVisible()
  assert.equal((await db.query('SELECT count(*)::int n FROM caja_movimientos')).rows[0].n,3)
  check('Reimportar el mismo extracto no duplica movimientos')
  const direction=page.getByRole('region',{name:'Dirección Operativa de caja',exact:true})
  await direction.getByRole('button',{name:'Agregar acción',exact:true}).click()
  const action=direction.getByRole('group',{name:'Acción 1',exact:true})
  await action.getByLabel('Tipo',{exact:true}).selectOption('dueno')
  await action.getByLabel('Resultado concreto',{exact:true}).fill('Coordinar transferencia ficticia del socio')
  await action.getByLabel('Responsable',{exact:true}).fill('Dirección QA')
  await action.getByLabel('Fecha límite',{exact:true}).fill(r.hoy)
  await action.getByLabel('Semana afectada (lunes)',{exact:true}).fill(lunesDe(r.hoy))
  await action.getByLabel('Impacto esperado USD',{exact:true}).fill('100')
  await direction.getByLabel('Bitácora de esta actualización',{exact:true}).fill('Prueba de coordinación, sin ejecutar pagos.')
  await direction.getByRole('button',{name:'Guardar plan y bitácora',exact:true}).click()
  await expect(direction.getByText('Plan y bitácora guardados.',{exact:true})).toBeVisible()
  await page.reload(); await expect(action.getByLabel('Tipo',{exact:true})).toHaveValue('dueno',{timeout:30000})
  assert.equal((await db.query('SELECT count(*)::int n FROM caja_compromisos')).rows[0].n,0)
  check('Acción de transferencia persiste sin duplicar pagos programados ni ejecutar dinero')
  await page.getByText('Cómo coordinar la transferencia al socio',{exact:true}).click()
  await expect(direction).toContainText('la curva ya separa esta participación')
  for(const width of [1440,390,320]) {
    await page.setViewportSize({width,height:1000})
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Caja sin desborde ${width}`)
    await page.screenshot({path:resolve(out,`caja-${width}.png`),fullPage:true})
  }
  check('Caja, checklist explicado y procedimiento del socio en escritorio, 390 y 320 px')
  assert.deepEqual(errors,[])
  await writeFile(resolve(out,'caja-resultado.json'),JSON.stringify({checks,errors},null,2))
} finally {
  await context?.close(); if(browser){assert.equal(browser.contexts().length,0);await browser.close();assert.equal(browser.isConnected(),false)}
  await db.end(); console.log('Navegador y conexión propios cerrados y comprobados')
}
