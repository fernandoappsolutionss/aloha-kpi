import test from 'node:test'
import assert from 'node:assert/strict'

import {
  REPARACIONES_HISTORICAS,
  estadoReparacionHistorica,
  guardiaReparacionHistorica,
} from '../lib/kpi-history-repair.mjs'

test('la reparacion solo incluye meses cerrados auditados', () => {
  assert.equal(REPARACIONES_HISTORICAS.length, 8)
  assert.ok(REPARACIONES_HISTORICAS.every((fila) => fila.periodo <= '2026-07'))
})

test('encadena Los Naranjos junio con julio desde cualquiera de sus estados auditados', () => {
  const reparacionesJunio = REPARACIONES_HISTORICAS.filter(
    (fila) => fila.centroId === 10 && fila.periodo === '2026-06',
  )
  const reparacion = reparacionesJunio[0]

  assert.equal(reparacionesJunio.length, 1)
  assert.deepEqual(reparacion.antes, { inicio: 89, final: 85, activos: 0 })
  assert.deepEqual(reparacion.alternativasAntes, [{ inicio: 88, final: 85, activos: 0 }])
  assert.deepEqual(reparacion.despues, { inicio: 88, final: 86, activos: 0 })
  assert.equal(
    estadoReparacionHistorica({ inicio: 88, final: 85, activos: 0 }, reparacion),
    'pendiente',
  )
  assert.equal(
    estadoReparacionHistorica({ inicio: 88, final: 86, activos: 0 }, reparacion),
    'aplicada',
  )
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
  const reparacion = REPARACIONES_HISTORICAS.find(
    (fila) => fila.centroId === 10 && fila.periodo === '2026-06',
  )
  const actual = { inicio: '88', final: '85', activos: '0' }

  assert.deepEqual(guardiaReparacionHistorica(actual, reparacion), {
    antes: { inicio: 88, final: 85, activos: 0 },
    despues: { inicio: 88, final: 86, activos: 0 },
  })
})

test('aborta ante una edicion concurrente que no coincide con ningun estado conocido', () => {
  const reparacion = REPARACIONES_HISTORICAS[0]
  assert.equal(estadoReparacionHistorica({ ...reparacion.antes, final: 999 }, reparacion), 'conflicto')
})
