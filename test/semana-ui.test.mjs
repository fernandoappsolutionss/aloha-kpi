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

test('panel distingue períodos, cobertura y fuente del dato mensual', () => {
  const tablero = read('../components/semana/TableroSemanal.js')
  const dashboard = read('../app/dashboard/page.js')
  const action = read('../app/actions/dashboard.js')
  assert.match(tablero, /centro\.semanaAbierta/)
  assert.match(tablero, /centro\.ultimaCerrada/)
  assert.match(tablero, /centro\.zonaHoraria/)
  assert.match(tablero, /p\.subtotal/)
  assert.match(tablero, /p\.disponibles.*p\.total/)
  assert.match(tablero, /Sin cálculo todavía/)
  assert.match(tablero, /Sin dato del cálculo/)
  assert.match(dashboard, /último dato mensual declarado/)
  assert.match(dashboard, /fechaDato\(c\)/)
  assert.match(action, /ninosPeriodoFin/)
  assert.match(action, /ninosFuente/)
})

test('semana recién abierta y cálculo sin dato tienen mensajes diferentes', () => {
  const source = read('../components/semana/TableroSemanal.js')
  const helpers = source.match(/^const (mostrar|actual) = .*$/gm)
  const mostrarActual = source.match(/const mostrarActual = [\s\S]*?\n}/)?.[0]
  const { mostrar } = runInNewContext(`${helpers.join(';\n')};\n${mostrarActual};\n({ mostrar: mostrarActual })`)
  const base = { abierta: { ninos_activos: null }, serie: [{ detalle: { error: 'Falta el cierre del mes anterior.' } }] }
  assert.equal(mostrar({ ...base, calculoAbierto: { ninos_activos: false } }, 'ninos_activos'), 'Sin cálculo todavía')
  assert.equal(mostrar({ ...base, calculoAbierto: { ninos_activos: true, retiros: false } }, 'ninos_activos'), 'Falta el cierre del mes anterior.')
  assert.equal(mostrar({ ...base, calculoAbierto: { ninos_activos: true, retiros: false } }, 'retiros'), 'Sin cálculo todavía')
  assert.equal(mostrar({ ...base, calculoAbierto: { facturas_vencidas: true } }, 'facturas_vencidas'), 'Sin dato del cálculo')
  assert.equal(mostrar({ ...base, calculoAbierto: { ninos_activos: true }, abierta: { ninos_activos: 0 } }, 'ninos_activos'), '0')
})

test('plan y tablero muestran condición, estado y discrepancia', () => {
  const plan = read('../components/semana/PlanSemana.js')
  assert.match(plan, /Más condiciones/)
  assert.match(plan, /Plazo: viernes 10:00/)
  assert.match(plan, /Lectura automática de la gráfica/)
  assert.match(plan, /Cambiar/)
  assert.match(read('../app/centro/[id]/semana/page.js'), /<TrabajoSemanal/)
  assert.match(read('../components/semana/TrabajoSemanal.js'), /<PlanSemana/)
  assert.match(read('../components/semana/GraficaSemanal.js'), /colorCondicion\(p\.condicion\)/)
  const tablero = read('../components/semana/TableroSemanal.js')
  assert.match(tablero, /Condición/)
  assert.match(tablero, /Discrepancia/)
})
