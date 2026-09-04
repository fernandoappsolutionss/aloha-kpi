import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { buildNextEnvironment } from '../tests/e2e/helpers/next-server-env.mjs'
import { requireDisposableGate } from '../tests/e2e/helpers/r3-fixture.mjs'
import { createDialogLifetime } from '../components/dialog-lifetime.mjs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

export const PUBLIC_ROUTES = ['/', '/login', '/forgot-password', '/set-password']
export const AUTH_ACCOUNT_ROUTES = ['/perfil']

test('R5 oculta SVG decorativos de KPI, avisos, tendencias y exportación al lector de pantalla', () => {
  for (const path of ['page.js', 'reporte/page.js']) {
    const icons = read(`../app/dashboard/${path}`).match(/<svg\b[^>]*>/g) || []
    assert.ok(icons.length > 0, `${path}: fixture de iconos existente`)
    assert.equal(icons.every(icon => /aria-hidden="true"/.test(icon)), true, `${path}: SVG decorativo sin aria-hidden`)
  }
})

test('R5 permite que los títulos vacíos hereden el mínimo móvil de 15px', () => {
  for (const [path, text] of [['ranking/page.js', 'Aún no hay datos para clasificar'], ['alertas/page.js', 'No hay alertas todavía']]) {
    const source = read(`../app/dashboard/${path}`)
    const tag = source.match(new RegExp(`<div[^>]*>${text}</div>`))?.[0]
    assert.ok(tag, `${path}: rama vacía existente`)
    assert.doesNotMatch(tag, /fontSize:\s*1[0-4](?:\.\d+)?\b/, `${path}: inline impide heredar 15px móvil`)
    assert.match(source, /className="main operations-page"/, `${path}: hereda el mínimo móvil operativo`)
  }
})

test('operación administrativa declara estados explícitos y tablas con alternativas móviles', () => {
  for (const path of ['page.js', 'ranking/page.js', 'alertas/page.js', 'reporte/page.js', 'metas/page.js', 'centros/page.js', 'zoho/page.js']) {
    const source = read(`../app/dashboard/${path}`)
    assert.match(source, /id="main-content"/, path)
    assert.match(source, /data-page-state=/, path)
    assert.match(source, /role="alert"|role=\{.*'alert'/, path)
    assert.doesNotMatch(source, /catch\(\(\) => \{\}\)/, path)
  }
  for (const path of ['page.js', 'ranking/page.js', 'reporte/page.js', 'centros/page.js']) {
    const source = read(`../app/dashboard/${path}`)
    assert.match(source, /<TableScroller/, path)
    assert.match(source, /<OperationalCard/, path)
    assert.match(source, /<caption/, path)
    assert.doesNotMatch(source, /overflowX:\s*['"]auto/, path)
  }
})

test('auditoría R5 separa actor coordinador y no entra en los modos mutantes', () => {
  const script = `import('./playwright.config.mjs').then(({default:c}) => {
    const admin = c.projects.find(p=>p.name==='phone-390');
    const coord = c.projects.find(p=>p.name==='coordinator-audit');
    console.log(JSON.stringify([!admin.testIgnore.test('dashboard-operations.spec.js'), admin.grepInvert.test('@coordinator'), coord.testMatch.test('dashboard-operations.spec.js'), coord.grep.test('coordinator-audit dashboard-operations.spec.js @coordinator acceso'), !coord.grep.test('coordinator-audit dashboard-operations.spec.js lectura'), coord.grep.test('coordinator-audit users-coordinator.spec.js acceso')]));
  })`
  const output = execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8',
    env: { RESPONSIVE_BASE_URL: 'https://readonly.invalid' },
  })
  assert.deepEqual(JSON.parse(output), [true, true, true, true, true, true])
})

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

test('acceso y perfil declaran el contrato responsive de estados y campos', () => {
  const home = read('../app/page.js')
  const login = read('../app/login/page.js')
  const forgot = read('../app/forgot-password/page.js')
  const setPassword = read('../app/set-password/page.js')
  const profile = read('../app/perfil/page.js')
  const panelFilter = read('../components/PanelFilter.js')
  const period = read('../components/PeriodSelector.js')
  const playwright = read('../playwright.config.mjs')

  assert.match(home, /redirect\('\/login'\)/)
  assert.doesNotMatch(home, /useRouter|useEffect|['"]use client['"]/)
  for (const [name, source] of Object.entries({ login, forgot, setPassword, profile })) {
    assert.match(source, /<main\b|role="main"/, `${name} expone contenido principal`)
    assert.match(source, /id="main-content"/, `${name} identifica el contenido principal`)
    assert.match(source, /data-page-state=/, `${name} declara su estado de página`)
  }
  for (const source of [login, forgot, setPassword, profile]) {
    assert.match(source, /name=/)
    assert.match(source, /autoComplete=/)
  }
  assert.match(login, /spellCheck=\{false\}/)
  assert.match(login, /role="alert"/)
  assert.match(login, /pending \? 'loading' : error \? 'error' : 'ready'/)
  assert.match(setPassword, /data-page-state="loading"/)
  assert.match(setPassword, /const pageState = loading \|\| info === null \? 'loading' : error \|\| !info\.valid \? 'error' : 'ready'/)
  assert.match(setPassword, /data-page-state=\{pageState\}/)
  assert.match(profile, /hydrated/)
  assert.match(read('../app/globals.css'), /\.profile-page__email[^}]*overflow-wrap:\s*anywhere/s)
  assert.match(panelFilter, /panel-filter__modes/)
  assert.match(panelFilter, /aria-pressed/)
  assert.match(panelFilter, /panel-filter__range/)
  assert.match(period, /role="group"/)
  assert.match(playwright, /grepInvert:\s*\/perfil espera hidratación\|filtros focales\//)
})
