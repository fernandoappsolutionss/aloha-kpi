import test from 'node:test'
import assert from 'node:assert/strict'

import {
  REPARACIONES_HISTORICAS,
  estadoReparacionHistorica,
  guardiaReparacionHistorica,
} from '../lib/kpi-history-repair.mjs'

test('la reparacion revierte el doble descuento de Brisas julio 2026', () => {
  assert.deepEqual(REPARACIONES_HISTORICAS, [
    {
      centroId: 1,
      centro: 'BRISAS DEL GOLF',
      periodo: '2026-07',
      year: 2026,
      month: 7,
      antes: { inicio: 205, final: 189, activos: 0 },
      despues: { inicio: 205, final: 205, activos: 0 },
    },
  ])
})

// El bug que se revierte: restar sobre el cierre los retiros que la captura
// semanal declara, cuando el modulo ya los desconto por la fecha real de cada
// niño. Ninguna reparacion puede volver a bajar un cierre sin movimiento que lo
// justifique: con 0 activos nuevos, el final no puede quedar por debajo del
// inicio que arrastra la cadena.
test('ninguna reparacion baja el cierre de un mes sin movimiento que lo respalde', () => {
  for (const reparacion of REPARACIONES_HISTORICAS) {
    const { inicio, final, activos } = reparacion.despues
    assert.ok(
      final >= inicio - activos || activos > 0,
      `${reparacion.centro} ${reparacion.periodo}: el cierre ${final} baja de ${inicio} sin movimiento registrado`,
    )
  }
})

test('no queda ninguna reparacion sobre Anclas ni Los Naranjos de julio 2026', () => {
  const julio = REPARACIONES_HISTORICAS.filter((fila) => fila.periodo === '2026-07')
  assert.deepEqual(
    julio.map((fila) => fila.centroId),
    [1],
    'Anclas cierra julio en 135 y Los Naranjos en 89: reparar esos meses volveria a restar dos veces',
  )
})

test('restaura Brisas al cierre que declara su cuadro de negocio', () => {
  const reparacion = REPARACIONES_HISTORICAS.find((fila) => fila.centroId === 1)

  assert.deepEqual(reparacion.antes, { inicio: 205, final: 189, activos: 0 })
  assert.deepEqual(reparacion.despues, { inicio: 205, final: 205, activos: 0 })
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
  const reparacion = REPARACIONES_HISTORICAS[0]
  const actual = { inicio: '205', final: '189', activos: '0' }

  assert.deepEqual(guardiaReparacionHistorica(actual, reparacion), {
    antes: { inicio: 205, final: 189, activos: 0 },
    despues: { inicio: 205, final: 205, activos: 0 },
  })
})

test('aborta ante una edicion concurrente que no coincide con ningun estado conocido', () => {
  const reparacion = REPARACIONES_HISTORICAS[0]
  assert.equal(estadoReparacionHistorica({ ...reparacion.antes, final: 999 }, reparacion), 'conflicto')
})
