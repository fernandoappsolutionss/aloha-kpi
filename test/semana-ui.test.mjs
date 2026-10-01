import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('gráfica semanal usa SVG accesible y modelo puro', () => {
  const source = read('../components/semana/GraficaSemanal.js')
  assert.match(source, /modeloGrafica\(/)
  assert.match(source, /role="img"/)
  assert.match(source, /aria-label=/)
  assert.doesNotMatch(source, /<title>/)
  assert.match(source, /Sin datos todavía/)
})

test('página Semana conserva marco y estados recuperables', () => {
  const source = read('../app/centro/[id]/semana/page.js')
  assert.match(source, /<Sidebar/)
  assert.match(source, /<CentroNavigation/)
  assert.match(source, /id="main-content"/)
  assert.match(source, /data-page-state=/)
  assert.match(source, /Reintentar/)
  assert.match(source, /Actualizar ahora/)
  assert.match(source, /async function cargar\(\) \{[\s\S]*?setDatos\(null\)/)
})

test('tablero semanal usa una sola acción y TableScroller', () => {
  const source = read('../components/semana/TableroSemanal.js')
  assert.equal((source.match(/getTableroSemanal\(\)/g) || []).length, 1)
  assert.match(source, /<TableScroller/)
  assert.match(read('../app/dashboard/page.js'), /<TableroSemanal/)
  assert.match(read('../app/globals.css'), /@media \(max-width: 767px\)[\s\S]*\.semana-grid/)
})
