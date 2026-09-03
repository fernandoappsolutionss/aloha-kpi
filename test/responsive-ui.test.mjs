import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { buildNextEnvironment } from '../tests/e2e/helpers/next-server-env.mjs'
import { requireDisposableGate } from '../tests/e2e/helpers/r3-fixture.mjs'
import { createDialogLifetime } from '../components/dialog-lifetime.mjs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('respuesta tardía de una instancia desmontada no cierra el diálogo nuevo del mismo dueño', async () => {
  let surface = 'primera'
  let resolveSave
  const pending = new Promise((resolve) => { resolveSave = resolve })
  const oldInstance = createDialogLifetime()
  const completion = pending.then(oldInstance.guard(() => { surface = null }))
  oldInstance.dispose()
  surface = 'segunda'
  const currentInstance = createDialogLifetime()
  resolveSave()
  await completion
  assert.equal(surface, 'segunda')
  currentInstance.guard(() => { surface = null })()
  assert.equal(surface, null)
})

test('fixture R3 rechaza transporte remoto antes de cualquier consulta', () => {
  const env = { E2E_R3_DIALOGS: '1', E2E_DATABASE_CONFIRM: 'disposable',
    DATABASE_URL: 'postgres://dummy:dummy@aloha-r2-pg:5432/aloha_r2',
    USUARIOS_TEST_DATABASE_URL: 'postgres://dummy:dummy@aloha-r2-pg:5432/aloha_r2',
    E2E_ADMIN_EMAIL: 'admin@e2e.invalid',
    E2E_NEON_HTTP: 'http://127.0.0.1:4446/sql', E2E_NEON_WSPROXY: '127.0.0.1:5435' }
  assert.doesNotThrow(() => requireDisposableGate(env))
  assert.throws(() => requireDisposableGate({ ...env, E2E_NEON_HTTP: 'https://remote.invalid/sql' }), /local/)
  assert.throws(() => requireDisposableGate({ ...env, E2E_NEON_WSPROXY: 'remote.invalid:5435' }), /local/)
  assert.throws(() => requireDisposableGate({ ...env, RESPONSIVE_BASE_URL: 'https://remote.invalid' }), /local/)
})

test('el CSS global no contiene antipatrones que oculten o animen todo', () => {
  const css = read('../app/globals.css')
  assert.doesNotMatch(css, /transition:\s*all\b/)
  assert.doesNotMatch(css, /body[^}]*overflow-x:\s*hidden/s)
  assert.match(css, /100dvh/)
  assert.match(css, /safe-area-inset/)
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/)
})

test('existen primitivas accesibles compartidas', () => {
  const dialog = read('../components/Dialog.js')
  assert.match(dialog, /role="dialog"/)
  assert.match(dialog, /aria-modal="true"/)
  assert.match(dialog, /Escape/)
  assert.match(dialog, /initialFocusRef/)
  assert.match(dialog, /focus\(\)/)
  const table = read('../components/TableScroller.js')
  assert.match(table, /role="region"/)
  assert.match(table, /tabIndex=\{0\}/)
  assert.match(table, /data-horizontal-scroll/)
  const card = read('../components/OperationalCard.js')
  assert.match(card, /headingLevel\s*=\s*3/)
  assert.match(card, /const Heading/)
})

test('los modales operativos usan Dialog compartido y bloquean el cierre durante escrituras', () => {
  for (const path of [
    '../components/PlanNino.js',
    '../components/growth/GrowthBriefing.js',
    '../app/centro/[id]/grupos/page.js',
    '../app/centro/[id]/cuadro/page.js',
    '../app/centro/[id]/eventos/page.js',
  ]) {
    assert.match(read(path), /from ['"].*Dialog['"]/, `${path} debe consumir Dialog`)
  }

  const dialog = read('../components/Dialog.js')
  assert.match(dialog, /closeDisabled/)
  assert.match(dialog, /stopImmediatePropagation/)
  assert.doesNotMatch(read('../app/centro/[id]/eventos/page.js'), /overflowX:\s*['"]visible/)
})

test('sheet, menú y tour declaran sus contratos responsive y accesibles', () => {
  const grupos = read('../app/centro/[id]/grupos/page.js')
  const eventos = read('../app/centro/[id]/eventos/page.js')
  const tour = read('../components/tour/TourHost.js')
  const css = read('../app/globals.css')

  assert.match(grupos, /mobile-sheet/)
  assert.match(eventos, /role="menu"/)
  assert.match(eventos, /role="menuitem"/)
  assert.match(eventos, /getBoundingClientRect/)
  assert.match(tour, /ResizeObserver/)
  assert.match(tour, /aria-labelledby/)
  assert.match(css, /\.mobile-sheet\s*\{[^}]*max-height:\s*100dvh/s)
  assert.match(css, /\.tour-card\s*\{[^}]*100dvh/s)
})

test('los tokens móviles fijan tipografía y objetivos táctiles', () => {
  const css = read('../app/globals.css')
  assert.match(css, /--mobile-body:\s*15px/)
  assert.match(css, /--mobile-input:\s*16px/)
  assert.match(css, /--touch-target:\s*44px/)
  assert.match(css, /\.btn[^}]*min-height:\s*var\(--touch-target\)/s)
})

test('el layout ofrece salto visible al contenido', () => {
  const layout = read('../app/layout.js')
  assert.match(layout, /href="\#main-content"/)
  assert.match(layout, /Saltar al contenido/)
})

test('el shell móvil declara drawer, breakpoint de tablet y navegación semántica', () => {
  const sidebar = read('../components/Sidebar.js')
  const css = read('../app/globals.css')
  assert.match(sidebar, /matchMedia\('\(max-width: 1024px\)'\)/)
  assert.match(sidebar, /<Link/)
  assert.match(sidebar, /aria-current/)
  assert.match(sidebar, /aria-label="Abrir menú"/)
  assert.match(sidebar, /aria-label="Cerrar menú"/)
  assert.match(css, /\.mobile-bar/)
  assert.match(css, /\.sb--open/)
  assert.match(css, /@media\s*\(max-width:\s*1024px\)/)
})

test('el selector de tema expone estado presionado y no actúa como submit', () => {
  const toggle = read('../components/ThemeToggle.js')
  assert.match(toggle, /type="button"/)
  assert.match(toggle, /aria-pressed=\{dark\}/)
})

test('el launcher authenticated entrega a Next solo la allowlist del servidor', () => {
  const source = {
    NODE_ENV: 'test',
    DATABASE_URL: 'db',
    USUARIOS_TEST_DATABASE_URL: 'db',
    E2E_DATABASE_CONFIRM: 'disposable',
    E2E_NEON_HTTP: 'http://proxy.invalid/sql',
    E2E_NEON_WSPROXY: 'proxy.invalid:443',
    E2E_DELIVERY_MODE: 'stub',
    SESSION_SECRET: 'session',
    E2E_ADMIN_PASSWORD: 'must-not-pass',
    E2E_VALID_ACCESS_TOKEN: 'must-not-pass',
    UNRELATED_SECRET: 'must-not-pass',
  }
  assert.deepEqual(buildNextEnvironment(source, 'authenticated'), {
    NODE_ENV: 'development',
    NEXT_TELEMETRY_DISABLED: '1',
    DATABASE_URL: 'db',
    USUARIOS_TEST_DATABASE_URL: 'db',
    E2E_DATABASE_CONFIRM: 'disposable',
    E2E_NEON_HTTP: 'http://proxy.invalid/sql',
    E2E_NEON_WSPROXY: 'proxy.invalid:443',
    E2E_DELIVERY_MODE: 'stub',
    SESSION_SECRET: 'session',
  })
})

test('el launcher primitives no entrega base, sesión ni credenciales a Next', () => {
  const result = buildNextEnvironment({
    E2E_UI_FIXTURES: '1',
    E2E_DATABASE_CONFIRM: 'disposable',
    DATABASE_URL: 'must-not-pass',
    SESSION_SECRET: 'must-not-pass',
    E2E_ADMIN_PASSWORD: 'must-not-pass',
  }, 'primitives')
  assert.deepEqual(result, {
    NODE_ENV: 'development',
    NEXT_TELEMETRY_DISABLED: '1',
    E2E_UI_FIXTURES: '1',
    E2E_DATABASE_CONFIRM: 'disposable',
  })
})

test('el launcher ungated inicia el smoke 404 sin heredar ningún secreto', () => {
  assert.deepEqual(buildNextEnvironment({
    DATABASE_URL: 'must-not-pass',
    E2E_UI_FIXTURES: '1',
    E2E_DATABASE_CONFIRM: 'disposable',
    SESSION_SECRET: 'must-not-pass',
  }, 'ungated'), {
    NODE_ENV: 'development',
    NEXT_TELEMETRY_DISABLED: '1',
  })
})

test('el modo de mutaciones excluye todos los proyectos de auditoría read-only', () => {
  const cwd = fileURLToPath(new URL('../', import.meta.url))
  const script = "import('./playwright.config.mjs').then(({ default: config }) => console.log(JSON.stringify(config.projects.map(({ name }) => name))))"
  const output = execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd,
    encoding: 'utf8',
    env: {
      DATABASE_URL: 'postgres://fixture:fixture@db.invalid:5432/fixture',
      USUARIOS_TEST_DATABASE_URL: 'postgres://fixture:fixture@db.invalid:5432/fixture',
      E2E_DATABASE_CONFIRM: 'disposable',
      E2E_NEON_HTTP: 'http://127.0.0.1:4446/sql',
      E2E_NEON_WSPROXY: '127.0.0.1:5435',
      E2E_DELIVERY_MODE: 'stub',
      SESSION_SECRET: 'fixture-session-secret-with-enough-length',
      E2E_RUN_MUTATIONS: '1',
    },
  })
  assert.deepEqual(JSON.parse(output), ['setup', 'users-mutations-local'])
})

test('los diálogos con fixture nunca entran al smoke remoto', () => {
  const output = execFileSync(process.execPath, ['--input-type=module', '--eval',
    "import('./playwright.config.mjs').then(({default:c}) => console.log(JSON.stringify(c.projects.filter(p=>p.name.startsWith('phone-')).map(p=>p.testIgnore.test('dialogs.spec.js')))))"], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8',
    env: { RESPONSIVE_BASE_URL: 'https://readonly.invalid' },
  })
  assert.deepEqual(JSON.parse(output), [true, true, true, true])
})
