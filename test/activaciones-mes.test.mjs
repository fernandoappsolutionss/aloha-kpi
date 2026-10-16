import test from 'node:test'
import assert from 'node:assert/strict'
import { movimientosCierreKpi } from '../lib/activaciones-mes.mjs'

const resumen = { ninos_inicio_mes: 156, ninos_final_mes: 146, nuevos_activos_mes: 5 }
const totales = { mesAnterior: 156, aPagar: 146, nuevos: 5, reincorporados: 4, retirados: 19 }
const leer = (extra = {}) => movimientosCierreKpi({ estado: 'cerrado', resumen, snapshot: { totales }, ...extra })

test('un cierre anterior al importador documental conserva sus reincorporados', () => {
  assert.deepEqual(leer(), { nuevos: 5, reincorporados: 4, retirados: 19 })
  assert.deepEqual(leer({ snapshot: { datos: { totales } } }), leer())
})
test('ocho primeros inicios y un reincorporado se conservan como movimientos separados', () => {
  const r = leer({ resumen: { ninos_inicio_mes: 146, ninos_final_mes: 147, nuevos_activos_mes: 8 },
    snapshot: { totales: { mesAnterior: 146, aPagar: 147, nuevos: 8, reincorporados: 1, retirados: 8 } } })
  assert.equal(r.nuevos + r.reincorporados, 9)
  assert.equal(r.nuevos, 8)
})
test('un mes abierto usa el cálculo operativo y nunca su foto anterior', () => {
  assert.equal(leer({ estado: 'abierto' }), null)
})
test('no oculta resúmenes cambiados, fotos incompletas ni balances incoherentes', () => {
  assert.equal(leer({ resumen: { ...resumen, ninos_final_mes: 145 } }), null)
  assert.equal(leer({ snapshot: { totales: { ...totales, reincorporados: 3 } } }), null)
  assert.equal(leer({ snapshot: { totales: { ...totales, retirados: null } } }), null)
  assert.equal(leer({ snapshot: null }), null)
})
