import test from 'node:test'
import assert from 'node:assert/strict'
import { balanceCuadro } from '../lib/balance-cuadro.mjs'

const anterior = { valor: 128, year: 2026, month: 9 }
const totales = { nuevos: 4, reincorporados: 0, retirados: 2, aPagar: 130 }

test('octubre arranca en el cierre de septiembre y suma sus movimientos', () => {
  assert.deepEqual(balanceCuadro({ anterior, totales }), {
    inicio: 128, final: 130, periodoAnterior: '2026-09', nuevos: 4,
    reincorporados: 0, retirados: 2, padron: 130, diferencia: 0,
  })
})

test('un nuevo inicio cambia el balance sin cambiar la base cerrada', () => {
  assert.equal(balanceCuadro({ anterior, totales: { ...totales, nuevos: 5, aPagar: 131 } }).final, 131)
  assert.equal(anterior.valor, 128)
})

test('nuevas reincorporaciones y retiros se incorporan al balance', () => {
  assert.equal(balanceCuadro({ anterior, totales: { ...totales, reincorporados: 2, retirados: 3 } }).final, 131)
})

test('no reemplaza el padrón ni esconde diferencias positivas o negativas', () => {
  for (const delta of [-3, 6]) {
    const t = { ...totales, aPagar: 130 + delta }
    const result = balanceCuadro({ anterior, totales: t })
    assert.equal(result.final, 130)
    assert.equal(result.diferencia, delta)
    assert.equal(t.aPagar, 130 + delta)
  }
})

test('cierre cero y cambio de año son válidos', () => {
  const result = balanceCuadro({ anterior: { valor: 0, year: 2026, month: 12 }, totales: { ...totales, retirados: 0 } })
  assert.equal(result.inicio, 0)
  assert.equal(result.final, 4)
  assert.equal(result.periodoAnterior, '2026-12')
})

test('sin cierre disponible no inventa una base', () => {
  for (const anterior of [null, { valor: null }, { valor: 'invalido' }]) {
    assert.equal(balanceCuadro({ anterior, totales }), null)
  }
})

test('un balance negativo conserva la discrepancia en lugar de ocultarla', () => {
  const result = balanceCuadro({ anterior: { ...anterior, valor: 1 }, totales: { ...totales, nuevos: 0, retirados: 2 } })
  assert.equal(result.final, -1)
  assert.equal(result.diferencia, 131)
})
