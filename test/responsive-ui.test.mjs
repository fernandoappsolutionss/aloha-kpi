import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { buildNextEnvironment } from '../tests/e2e/helpers/next-server-env.mjs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

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
