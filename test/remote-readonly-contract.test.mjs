import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
test('remoto solo acepta origen limpio y modos explícitos; authenticated nunca omite actores',async()=>{
  const m=await import('../tests/e2e/helpers/remote-readonly.mjs').catch(()=>null)
  assert.ok(m,'Existe un contrato remoto independiente')
  assert.equal(m.remoteSettings({RESPONSIVE_BASE_URL:'https://example.invalid'}).mode,'public')
  for(const extra of [{REMOTE_READONLY_MODE:'unknown'},{REMOTE_READONLY_MODE:'authenticated'},{E2E_R10_AUDIT:'1'},{E2E_CENTER_EMAIL:'x'},{E2E_COACH_TOKEN:'x'},{E2E_CAPTURE_DIR:'/tmp'},{DATABASE_URL:'x'},{E2E_VALID_ACCESS_TOKEN:'x'},{E2E_RUN_MUTATIONS:'1'},{E2E_R3_DIALOGS:'1'}]) assert.throws(()=>m.remoteSettings({RESPONSIVE_BASE_URL:'https://example.invalid',...extra}))
  for(const url of ['https://example.invalid/path','https://example.invalid?token=x','https://u:p@example.invalid','ftp://example.invalid']) assert.throws(()=>m.remoteSettings({RESPONSIVE_BASE_URL:url}))
  const auth=m.remoteSettings({RESPONSIVE_BASE_URL:'https://example.invalid',REMOTE_READONLY_MODE:'authenticated',E2E_ADMIN_EMAIL:'a@example.invalid',E2E_ADMIN_PASSWORD:'dummy',E2E_COORDINATOR_EMAIL:'c@example.invalid',E2E_COORDINATOR_PASSWORD:'dummy'})
  assert.equal(auth.mode,'authenticated')
  assert.equal(m.allowedPath('/dashboard/crecimiento'),false)
  assert.equal(m.allowedPath('/centro/2'),false)
  assert.equal(m.allowedPath('/coach/opaque'),false)
  assert.equal(m.allowedPath('/set-password?token=opaque'),false)
  assert.equal(m.allowedPath('/dashboard/usuarios'),true)
})
test('config remoto separa públicos y autenticados sin artefactos ni servidor local',()=>{
 const cwd=fileURLToPath(new URL('..',import.meta.url))
 const inspect=env=>JSON.parse(execFileSync(process.execPath,['--input-type=module','--eval',"import('./playwright.remote.config.mjs').then(({default:c})=>console.log(JSON.stringify({projects:c.projects,use:c.use,reporter:c.reporter,webServer:c.webServer,preserve:c.preserveOutput})))"],{cwd,env,encoding:'utf8'}))
 const env={RESPONSIVE_BASE_URL:'http://127.0.0.1:3000'}
 const publicConfig=inspect(env)
 assert.equal(publicConfig.projects[0].name,'public');assert.equal(publicConfig.webServer,undefined)
 assert.equal(publicConfig.use.storageState,undefined)
 assert.deepEqual([publicConfig.use.trace,publicConfig.use.screenshot,publicConfig.use.video],['off','off','off'])
 assert.equal(publicConfig.preserve,'never')
 assert.equal(inspect({...env,REMOTE_READONLY_MODE:'authenticated',E2E_ADMIN_EMAIL:'a',E2E_ADMIN_PASSWORD:'b',E2E_COORDINATOR_EMAIL:'c',E2E_COORDINATOR_PASSWORD:'d'}).projects[0].name,'authenticated')
})
