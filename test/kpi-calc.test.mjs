import test from 'node:test'
import assert from 'node:assert/strict'

import { ninosDeclarados, quarterMetrics } from '../lib/kpi-calc.js'

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

test('el panel muestra el cierre declarado, no la proyeccion viva del mes abierto', () => {
  const months = [
    { declarado: true, ninosFinal: 830 },   // julio cerrado
    { declarado: false, ninosFinal: 849 },  // agosto abierto (balance vivo)
  ]
  assert.equal(ninosDeclarados(months, 810), 830)
})

test('sin meses declarados en el rango, el panel usa la semilla del mes anterior', () => {
  const months = [{ declarado: false, ninosFinal: 120 }]
  assert.equal(ninosDeclarados(months, 115), 115)
  assert.equal(ninosDeclarados(months), 0)
})

test('entre varios meses declarados manda el ultimo, aunque cierre en cero', () => {
  const months = [
    { declarado: true, ninosFinal: 90 },
    { declarado: true, ninosFinal: 0 },
  ]
  assert.equal(ninosDeclarados(months, 80), 0)
})
