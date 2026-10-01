import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

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

test('tablero muestra Sin dato si la semana abierta falla, aunque la cerrada tenga 12', () => {
  const source = read('../components/semana/TableroSemanal.js')
  const helper = source.match(/^const (mostrar|actual) = .*$/gm)
  assert.equal(helper?.length, 2)
  const { actual, mostrar } = runInNewContext(`${helper.join(';\n')};\n({ actual, mostrar })`)
  assert.equal(mostrar(actual({ abierta: { ninos_activos: null }, cerrada: { ninos_activos: 12 } }, 'ninos_activos')), 'Sin dato')
})

test('plan y tablero muestran condición, estado y discrepancia', () => {
  const plan = read('../components/semana/PlanSemana.js')
  assert.match(plan, /Más condiciones/)
  assert.match(plan, /Plazo: viernes 10:00/)
  assert.match(plan, /Lectura de la gráfica/)
  assert.match(plan, /Cambiar/)
  assert.match(read('../app/centro/[id]/semana/page.js'), /<PlanSemana/)
  assert.match(read('../components/semana/GraficaSemanal.js'), /colorCondicion\(p\.condicion\)/)
  const tablero = read('../components/semana/TableroSemanal.js')
  assert.match(tablero, /Condición/)
  assert.match(tablero, /Discrepancia/)
})
