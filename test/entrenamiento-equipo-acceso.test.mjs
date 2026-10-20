import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as currentUser from '../lib/current-user.mjs'
import { resolveAccess } from '../components/access-control.mjs'
import { puedeVerCaja } from '../lib/caja/acceso.mjs'

// Ejecuta el middleware real con la identidad que devolvería la BD en cada llamada.
let actor
const source = readFileSync(new URL('../middleware.js', import.meta.url), 'utf8')
  .replace(/import[\s\S]*?from ['"][^'"]+['"]\n/g, '')
  .replace(/export /g, '')
const deps = {
  ...currentUser, puedeVerCaja,
  process: { env: { DATABASE_URL: 'postgres://local.invalid/test' } },
  NextResponse: {
    next: () => ({ allowed: true, headers: new Map() }),
    redirect: url => ({ redirect: url.pathname }),
    json: (body, options) => ({ body, ...options }),
  },
  jwtVerify: async () => ({ payload: { uid: 5, rol: 'admin_master' } }),
  neon: () => async () => actor ? [{ password_hash: 'hash', ...actor }] : [], neonConfig: {},
  resolveSessionSecret: () => new Uint8Array(32), resolveNeonE2EConfig: () => null,
}
const middleware = new Function(...Object.keys(deps), `${source}\nreturn middleware`)(...Object.values(deps))
const request = pathname => ({
  cookies: { get: () => ({ value: 'fixture' }) },
  nextUrl: { pathname, clone: () => new URL(pathname, 'http://localhost') },
})

test('las rutas de ambas matrices aceptan coordinación sin abrir Zoho ni centros ajenos', async () => {
  actor = { id: 5, rol: 'coordinador', centros: [1, 2] }
  for (const path of ['/dashboard/entrenamiento', '/dashboard/entrenamiento/oficio', '/centro/1/entrenamiento']) {
    assert.equal((await middleware(request(path))).allowed, true, path)
  }
  for (const path of ['/dashboard/zoho', '/centro/3/entrenamiento']) {
    assert.equal((await middleware(request(path))).redirect, '/dashboard', path)
  }
  actor.centros = []
  assert.equal((await middleware(request('/dashboard/entrenamiento'))).allowed, true)
  assert.equal((await middleware(request('/centro/1/entrenamiento'))).redirect, '/dashboard')
})

test('cookie antigua no abre entrenamiento tras cambiar el rol, bloquear o borrar la cuenta', async () => {
  for (const rol of ['admin_general', 'supervisor', 'administradora', 'asistente', 'coach']) {
    actor = { id: 5, rol, centro_id: 1, centros: [] }
    for (const path of ['/dashboard/entrenamiento', '/dashboard/entrenamiento/oficio']) {
      assert.notEqual((await middleware(request(path))).allowed, true, rol)
    }
  }
  for (const cuenta of [null, { id: 5, rol: 'coordinador', centros: [1], bloqueado: true }]) {
    actor = cuenta
    assert.equal((await middleware(request('/dashboard/entrenamiento'))).redirect, '/login')
  }
})

test('menú respeta la capacidad vigente y distingue supervisión del entrenamiento propio', () => {
  const access = resolveAccess({ actor: { role: 'coordinador' }, centers: [{ id: 1 }], capabilities: { viewAdminTraining: true } })
  assert.equal(access.canViewAdminTraining, true)
  assert.equal(access.canViewOficio, true)
  assert.equal(access.isMaster, false)
  const revocado = resolveAccess({ actor: { role: 'coordinador' }, capabilities: { viewAdminTraining: false } })
  assert.equal(revocado.canViewAdminTraining, false)
  assert.equal(revocado.canViewOficio, false)
})
