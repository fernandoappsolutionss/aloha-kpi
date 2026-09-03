import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

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
