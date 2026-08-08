import test from 'node:test'
import assert from 'node:assert/strict'

import {
  REPARACIONES_HISTORICAS,
  estadoReparacionHistorica,
  guardiaReparacionHistorica,
} from '../lib/kpi-history-repair.mjs'

test('la reparacion corrige los ultimos cierres que no conservaron el total mostrado en KPI', () => {
  assert.deepEqual(REPARACIONES_HISTORICAS, [
    {
      centroId: 1,
      centro: 'BRISAS DEL GOLF',
      periodo: '2026-07',
      year: 2026,
      month: 7,
      antes: { inicio: 205, final: 205, activos: 0 },
      despues: { inicio: 205, final: 189, activos: 0 },
    },
    {
      centroId: 2,
      centro: 'ANCLAS MALL',
      periodo: '2026-07',
      year: 2026,
      month: 7,
      antes: { inicio: 148, final: 135, activos: 0 },
      despues: { inicio: 135, final: 122, activos: 0 },
    },
    {
      centroId: 10,
      centro: 'LOS NARANJOS',
      periodo: '2026-07',
      year: 2026,
      month: 7,
      antes: { inicio: 86, final: 89, activos: 8 },
      despues: { inicio: 85, final: 88, activos: 8 },
    },
  ])
})

test('restaura Anclas al cierre que mostraba el KPI antes del snapshot', () => {
  const reparacion = REPARACIONES_HISTORICAS.find((fila) => fila.centroId === 2)

  assert.deepEqual(reparacion.antes, { inicio: 148, final: 135, activos: 0 })
  assert.deepEqual(reparacion.despues, { inicio: 135, final: 122, activos: 0 })
})

test('detecta una reparacion pendiente cuando la fila conserva el valor auditado', () => {
  const reparacion = REPARACIONES_HISTORICAS[0]
  assert.equal(estadoReparacionHistorica(reparacion.antes, reparacion), 'pendiente')
})

test('reconoce una reparacion ya aplicada y permite repetir el proceso', () => {
  const reparacion = REPARACIONES_HISTORICAS[0]
  assert.equal(estadoReparacionHistorica(reparacion.despues, reparacion), 'aplicada')
})

test('la guardia de escritura usa el estado actual reconocido', () => {
  const reparacion = REPARACIONES_HISTORICAS.find((fila) => fila.centroId === 10)
  const actual = { inicio: '86', final: '89', activos: '8' }

  assert.deepEqual(guardiaReparacionHistorica(actual, reparacion), {
    antes: { inicio: 86, final: 89, activos: 8 },
    despues: { inicio: 85, final: 88, activos: 8 },
  })
})

test('aborta ante una edicion concurrente que no coincide con ningun estado conocido', () => {
  const reparacion = REPARACIONES_HISTORICAS[0]
  assert.equal(estadoReparacionHistorica({ ...reparacion.antes, final: 999 }, reparacion), 'conflicto')
})
