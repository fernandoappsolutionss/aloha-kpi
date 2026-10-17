import test from 'node:test'
import assert from 'node:assert/strict'
import { conversionClases } from '../lib/clases-prueba.mjs'
import { resumenClasesPrueba } from '../lib/estadisticas-semana/resumen-clases-prueba.mjs'
const evento = (start_date, attended, won, attended_won, status = 'completed') => ({ start_date, status,
  stats: { total: 20, attended, won, attended_won, not_attended: 20 - attended, pending: 0, paid: 0, total_revenue: 0 } })

test('matrículas usa la intersección verificada, no todos los ganados ni los pagos', () => {
  assert.deepEqual(conversionClases([evento('2026-10-01T18:00:00Z', 10, 8, 3)]), { matriculados: 3, conversion: 30 })
  assert.deepEqual(conversionClases([evento('2026-10-01T18:00:00Z', 10, 8, 0)]), { matriculados: 0, conversion: 0 })
})

test('dato ausente o contradictorio no inventa cero; sin asistentes deja la tasa vacía', () => {
  for (const n of [undefined, null, -1, 2.5, 4]) {
    assert.deepEqual(conversionClases([evento('2026-10-01T18:00:00Z', 10, 3, n)]), { matriculados: null, conversion: null })
  }
  assert.equal(conversionClases([evento('2026-10-01T18:00:00Z', 1, 3, 2)]).matriculados, null)
  assert.deepEqual(conversionClases([]), { matriculados: 0, conversion: null })
  assert.deepEqual(conversionClases([evento('2026-10-01T18:00:00Z', 0, 3, 0)]), { matriculados: 0, conversion: null })
})

test('mes, seis semanas y último cierre conservan la cohorte y excluyen agenda y borradores', () => {
  const datos = resumenClasesPrueba({ now: new Date('2026-10-17T18:00:00Z'), semanaAbierta: '2026-10-22', clases: [
    evento('2026-09-10T18:00:00Z', 20, 20, 20),
    evento('2026-09-11T18:00:00Z', 10, 6, 4),
    evento('2026-10-01T18:00:00Z', 10, 8, 2),
    evento('2026-10-15T18:00:00Z', 4, 2, 1),
    evento('2026-10-17T16:00:00Z', 2, 2, 1),
    evento('2026-10-22T18:00:00Z', 10, 8, 8, 'published'),
    evento('2026-10-17T16:00:00Z', 10, 8, 8, 'draft'),
    evento('2026-10-17T16:00:00Z', 10, 8, 8, 'cancelled'),
  ] })
  assert.equal(datos.mes.matriculados, 4); assert.equal(datos.mes.conversion, 25)
  assert.equal(datos.ultimoCierre.matriculados, 1); assert.equal(datos.ultimoCierre.conversion, 25)
  assert.equal(datos.actual.matriculados, 1); assert.equal(datos.actual.conversion, 50)
  assert.equal(datos.seisSemanas.matriculados, 8); assert.equal(datos.seisSemanas.conversion, 8 / 26 * 100)
  assert.equal(datos.semanas.reduce((n, s) => n + s.matriculados, 0), 8)
  assert.equal(datos.proximas.invitados, 20)
})
