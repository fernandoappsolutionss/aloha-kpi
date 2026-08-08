import test from 'node:test'
import assert from 'node:assert/strict'

import { quarterMetrics } from '../lib/kpi-calc.js'

test('un balance vivo de cero sigue siendo un cierre valido', () => {
  const result = quarterMetrics([
    {
      centro_id: 2,
      month: 8,
      ninos_inicio_mes: 5,
      ninos_final_mes: 0,
      nuevos_activos_mes: 0,
      retiros_operativos_mes: 5,
      balance_vivo: true,
    },
  ], [], 2, [8], 5)

  assert.equal(result.ninos, 0)
  assert.equal(result.months[0].desercion, 5)
})

test('un mes cerrado conserva un cierre declarado de cero', () => {
  const result = quarterMetrics([
    {
      centro_id: 2,
      month: 8,
      ninos_inicio_mes: 5,
      ninos_final_mes: 0,
      nuevos_activos_mes: 0,
      estado_mes: 'cerrado',
    },
  ], [], 2, [8], 5)

  assert.equal(result.ninos, 0)
})
