import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { centrosDe, esGerencia, puedeGestionarUsuarios } from '../lib/current-user.mjs'

// Run the real action/layout, replacing only server I/O boundaries.
function serverModule(path, dependencies, exports) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
    .replace(/^import .* from .*$/gm, '')
    .replace(/export default /g, '')
    .replace(/export /g, '')
  return vm.runInNewContext(`${source}\n;({ ${exports.join(',')} })`, { process, ...dependencies })
}

test('navigation grants Zoho only to current management, never stale role or panel capability', async () => {
  for (const [rol, expected] of [['admin_general', true], ['supervisor', true], ['coordinador', false], ['administradora', false], ['asistente', false]]) {
    const { getNavigationContext } = serverModule('../app/actions/navigation.js', {
      requireCurrentUser: async () => ({ id: 7, rol, centros: [10], centro_id: 10 }),
      sql: async () => [{ id: 10, nombre: 'Centro local' }],
      centrosDe, esGerencia, puedeGestionarUsuarios,
    }, ['getNavigationContext'])
    const context = await getNavigationContext()
    assert.equal(context.capabilities.viewZoho, expected, rol)
    assert.equal(context.actor.role, rol)
  }
})

test('Zoho state denies a stale admin cookie before reading connection metadata', async () => {
  let reads = 0
  const { getZohoEstado } = serverModule('../app/actions/zoho.js', {
    requireAdmin: async () => ({ rol: 'admin_general' }),
    requireCurrentAdmin: async () => { throw new Error('No autorizado') },
    zohoConexionInfo: async () => { reads++; return { email: 'private@example.invalid' } },
    EMAIL_ZOHO_AUTORIZADO: 'allowed@example.invalid',
  }, ['getZohoEstado'])
  const result = await getZohoEstado()
  assert.equal(result.error, 'No autorizado')
  assert.equal(reads, 0)
})

test('Zoho layout redirects rejected current actor to dashboard and admits current admin', async () => {
  for (const allowed of [false, true]) {
    const { ZohoLayout } = serverModule('../app/dashboard/zoho/layout.js', {
      requireCurrentAdmin: async () => { if (!allowed) throw new Error('No autorizado') },
      redirect: (destination) => { throw new Error(`redirect:${destination}`) },
    }, ['ZohoLayout'])
    if (allowed) assert.equal(await ZohoLayout({ children: 'protected-content' }), 'protected-content')
    else await assert.rejects(() => ZohoLayout({ children: 'protected-content' }), /redirect:\/dashboard$/)
  }
})

test('upstream fixture smoke is excluded from every remote viewport', () => {
  const result = execFileSync(process.execPath, ['--input-type=module', '--eval',
    "import('./playwright.config.mjs').then(({default:c})=>console.log(JSON.stringify(c.projects.filter(p=>p.testIgnore).map(p=>p.testIgnore.test('upstream-integration.local.spec.js')))))"], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8',
    env: { RESPONSIVE_BASE_URL: 'https://readonly.invalid' },
  })
  assert.deepEqual(JSON.parse(result), [true, true, true, true, true, true])
})
