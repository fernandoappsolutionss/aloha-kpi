import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

test('config base excluye suites R10/remotas incluso donde hay override por proyecto',()=>{
  const output=execFileSync(process.execPath,['--input-type=module','-e',"import('./playwright.config.mjs').then(({default:c})=>console.log(JSON.stringify(c.projects.filter(p=>p.name.startsWith('phone-')).map(p=>['r10-private.spec.js','center-reports.spec.js','responsive-states.spec.js','accessibility.spec.js','remote-readonly.spec.js'].every(n=>p.testIgnore.test(n))))))"],{cwd:fileURLToPath(new URL('..',import.meta.url)),env:{RESPONSIVE_BASE_URL:'https://example.invalid'},encoding:'utf8'})
  assert.ok(JSON.parse(output).every(Boolean))
})

test('fixture R10 rechaza remoto, IDs ajenos y modos simultáneos antes de conectar',async()=>{
  const module = await import('../tests/e2e/helpers/r10-fixture.mjs').catch(()=>null)
  assert.ok(module,'Debe existir un gate R10 local independiente')
  const env={E2E_R10_AUDIT:'1',E2E_DATABASE_CONFIRM:'disposable',DATABASE_URL:'postgres://dummy:dummy@aloha-r2-pg:5432/aloha_r2',USUARIOS_TEST_DATABASE_URL:'postgres://dummy:dummy@aloha-r2-pg:5432/aloha_r2',E2E_NEON_HTTP:'http://127.0.0.1:4446/sql',E2E_NEON_WSPROXY:'127.0.0.1:5435'}
  assert.doesNotThrow(()=>module.requireR10Gate(env))
  for(const bad of [{RESPONSIVE_BASE_URL:'https://remote.invalid'},{E2E_DATABASE_CONFIRM:''},{E2E_R9_OPERATIONS:'1'},{E2E_R8_CENTER_CORE:'1'},{E2E_R3_DIALOGS:'1'},{E2E_R6_COMPARISONS:'1'},{E2E_RUN_MUTATIONS:'1'},{E2E_CENTRO_ID:'3'},{E2E_NEON_HTTP:'http://remote.invalid/sql'}]) assert.throws(()=>module.requireR10Gate({...env,...bad}))
})
