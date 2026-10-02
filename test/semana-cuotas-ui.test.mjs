import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('KPI Mensual conserva captura y cierre pero remite las cuotas a Semana', () => {
  const page = read('../app/centro/[id]/kpi/page.js')
  assert.match(page, /saveKpiMes/)
  assert.match(page, /cerrarMes/)
  assert.match(page, /weekInput\(semIdx,tipo,di,'desktop'\)/)
  assert.match(page, /Las cuotas de cada semana se fijan en la pestaña <Link[^>]+>Semana<\/Link>/)
  assert.doesNotMatch(page, /calcMeta|¿Cumple\?|metaN\s*\/\s*5/)
})

test('Semana permite editar cuotas enteras y restringe aprobación visual a coordinación', () => {
  const page = read('../app/centro/[id]/semana/page.js')
  const cuotas = read('../components/semana/CuotasSemana.js')
  assert.match(page, /<CuotasSemana/)
  assert.match(cuotas, /inputMode="numeric"/)
  assert.match(cuotas, /min="0"/)
  assert.match(cuotas, /step="1"/)
  assert.match(cuotas, /puedeAprobar\s*&&/)
  assert.match(cuotas, /Guardar cuotas/)
  assert.match(cuotas, /Aprobar cuotas/)
})

test('Reunión usa una llamada de carga y gerencia no recibe controles de aprobación', () => {
  const page = read('../app/dashboard/reunion-semanal/page.js')
  const sidebar = read('../components/Sidebar.js')
  assert.match(page, /getReunionSemanal\(\)/)
  assert.match(page, /Primero el centro que más creció\. Al que va abajo se le pide su plan\./)
  assert.match(page, /centro\.puedeAprobar\s*&&/)
  assert.match(sidebar, /Reunión semanal[\s\S]*\/dashboard\/reunion-semanal/)
  assert.match(page, /aprobarCuotas\(centro\.id, centro\.semanaAbierta, cuotas\)/)
  assert.match(page, /agregarOrden\(centro\.id, centro\.ultimaCerrada, valores\)/)
})
