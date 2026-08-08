import test from 'node:test'
import assert from 'node:assert/strict'

import {
  REPARACIONES_HISTORICAS,
  estadoReparacionHistorica,
} from '../lib/kpi-history-repair.mjs'

test('la reparacion solo incluye meses cerrados auditados', () => {
  assert.equal(REPARACIONES_HISTORICAS.length, 9)
  assert.ok(REPARACIONES_HISTORICAS.every((fila) => fila.periodo <= '2026-07'))
})

test('encadena Los Naranjos junio con julio sin inventar nuevos activos', () => {
  const reparacionesJunio = REPARACIONES_HISTORICAS.filter(
    (fila) => fila.centroId === 10 && fila.periodo === '2026-06',
  )

  assert.equal(reparacionesJunio.length, 2)
  assert.deepEqual(reparacionesJunio.at(-1)?.antes, { inicio: 88, final: 85, activos: 0 })
  assert.deepEqual(reparacionesJunio.at(-1)?.despues, { inicio: 88, final: 86, activos: 0 })
})

test('detecta una reparacion pendiente cuando la fila conserva el valor auditado', () => {
  const reparacion = REPARACIONES_HISTORICAS[0]
  assert.equal(estadoReparacionHistorica(reparacion.antes, reparacion), 'pendiente')
})

test('reconoce una reparacion ya aplicada y permite repetir el proceso', () => {
  const reparacion = REPARACIONES_HISTORICAS[0]
  assert.equal(estadoReparacionHistorica(reparacion.despues, reparacion), 'aplicada')
})

test('aborta ante una edicion concurrente que no coincide con ningun estado conocido', () => {
  const reparacion = REPARACIONES_HISTORICAS[0]
  assert.equal(estadoReparacionHistorica({ ...reparacion.antes, final: 999 }, reparacion), 'conflicto')
})
