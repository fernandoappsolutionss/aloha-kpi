import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  centrosDe,
  esGerencia,
  esSoloLectura,
  isMaster,
  puedeGestionarUsuarios,
  puedeVerUsuarios,
} from '../lib/current-user.mjs'
import { puedeVerCaja } from '../lib/caja/acceso.mjs'

// Run the real action/layout, replacing only server I/O boundaries.
function serverModule(path, dependencies, exports) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
    .replace(/^import .* from .*$/gm, '')
    .replace(/export default /g, '')
    .replace(/export /g, '')
  return vm.runInNewContext(`${source}\n;({ ${exports.join(',')} })`, { process, ...dependencies })
}

test('navigation grants Zoho only to current Master, never stale role or panel capability', async () => {
  for (const [rol, expected] of [['admin_master', true], ['admin_general', false], ['supervisor', false], ['coordinador', false], ['administradora', false], ['asistente', false]]) {
    const { getNavigationContext } = serverModule('../app/actions/navigation.js', {
      requireCurrentUser: async () => ({ id: 7, rol, email: rol === 'admin_master' ? 'fperez@teamsolutionss.com' : `${rol}@example.invalid`, centros: [10], centro_id: 10 }),
      sql: async () => [{ id: 10, nombre: 'Centro local' }],
      centrosDe, esGerencia, esSoloLectura, isMaster, puedeGestionarUsuarios, puedeVerUsuarios, puedeVerCaja,
    }, ['getNavigationContext'])
    const context = await getNavigationContext()
    assert.equal(context.capabilities.viewZoho, expected, rol)
    // Caja va por correo: solo el Master de esta lista está en la allowlist.
    assert.equal(context.capabilities.viewCaja, expected, `caja ${rol}`)
    assert.equal(context.actor.role, rol)
  }
})

test('Zoho state denies a stale admin cookie before reading connection metadata', async () => {
  let reads = 0
  const { getZohoEstado } = serverModule('../app/actions/zoho.js', {
    requireCurrentMaster: async () => { throw new Error('No autorizado') },
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

test('navigation grants caja by allowlisted email, not by role', async () => {
  for (const [rol, email, expected] of [
    ['admin_general', 'froberts@alohapanama.com', true],
    ['coordinador', 'admin@alohapanama.com', true],
    ['coordinador', 'vcampos@alohapanama.com', true],
    ['admin_general', 'otro@alohapanama.com', false],
    ['coordinador', 'otra@alohapanama.com', false],
  ]) {
    const { getNavigationContext } = serverModule('../app/actions/navigation.js', {
      requireCurrentUser: async () => ({ id: 7, rol, email, centros: [10], centro_id: 10 }),
      sql: async () => [{ id: 10, nombre: 'Centro local' }],
      centrosDe, esGerencia, esSoloLectura, isMaster, puedeGestionarUsuarios, puedeVerUsuarios, puedeVerCaja,
    }, ['getNavigationContext'])
    const context = await getNavigationContext()
    assert.equal(context.capabilities.viewCaja, expected, email)
  }
})

test('caja layout redirects a rejected current actor to dashboard and admits the allowlist', async () => {
  for (const allowed of [false, true]) {
    const { CajaLayout } = serverModule('../app/dashboard/caja/layout.js', {
      requireCurrentCaja: async () => { if (!allowed) throw new Error('No autorizado') },
      redirect: (destination) => { throw new Error(`redirect:${destination}`) },
    }, ['CajaLayout'])
    if (allowed) assert.equal(await CajaLayout({ children: 'protected-content' }), 'protected-content')
    else await assert.rejects(() => CajaLayout({ children: 'protected-content' }), /redirect:\/dashboard$/)
  }
})

test('upstream fixture smoke is excluded from every remote viewport', () => {
  const result = execFileSync(process.execPath, ['--input-type=module', '--eval',
    "import('./playwright.config.mjs').then(({default:c})=>{const names=['phone-320','phone-375','phone-390','phone-430','tablet-768','desktop-1440'];const admins=c.projects.filter(p=>names.includes(p.name));const coordinator=c.projects.find(p=>p.name==='coordinator-audit');console.log(JSON.stringify({names:admins.map(p=>p.name),excluded:admins.map(p=>p.testIgnore.test('upstream-integration.local.spec.js')),coordinatorMatches:coordinator.testMatch.test('upstream-integration.local.spec.js')}))})"], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8',
    env: { RESPONSIVE_BASE_URL: 'https://readonly.invalid' },
  })
  assert.deepEqual(JSON.parse(result), {
    names: ['phone-320', 'phone-375', 'phone-390', 'phone-430', 'tablet-768', 'desktop-1440'],
    excluded: [true, true, true, true, true, true],
    coordinatorMatches: false,
  })
})
