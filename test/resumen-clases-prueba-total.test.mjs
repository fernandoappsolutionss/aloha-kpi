import test from 'node:test'
import assert from 'node:assert/strict'
import { totalClasesPrueba } from '../lib/resumen-clases-prueba-total.mjs'

const centro = (nombre, invitados, asistentes, agendados, cambios = {}) => ({ nombre, clasesPrueba: {
  mes: { invitados, asistentes, desde: '2026-10-01', hasta: '2026-10-17' },
  proximas: { invitados: agendados }, ...cambios,
} })

test('el consolidado pondera por personas, no promedia porcentajes de centros', () => {
  const resultado = totalClasesPrueba([centro('A', 10, 10, 2), centro('B', 90, 0, 16)])
  assert.equal(resultado.invitados, 100); assert.equal(resultado.asistentes, 10)
  assert.equal(resultado.porcentaje, 10); assert.equal(resultado.agendados, 18)
  assert.equal(resultado.disponibles, 2); assert.equal(resultado.total, 2)
})

test('los fallos se excluyen con cobertura explícita; un cero conocido sí participa', () => {
  const resultado = totalClasesPrueba([centro('A', 0, 0, 0), { nombre: 'B', clasesPrueba: { error: 'CRM no disponible' } }, centro('C', 5, 0, 1)])
  assert.equal(resultado.invitados, 5); assert.equal(resultado.asistentes, 0); assert.equal(resultado.porcentaje, 0)
  assert.equal(resultado.disponibles, 2); assert.deepEqual(resultado.faltantes, ['B'])
})

test('ausencia de datos no inventa ceros; cero invitados no inventa un porcentaje', () => {
  const vacio = totalClasesPrueba([])
  assert.equal(vacio.invitados, null); assert.equal(vacio.asistentes, null); assert.equal(vacio.agendados, null)
  const cero = totalClasesPrueba([centro('A', 0, 0, 4)])
  assert.equal(cero.invitados, 0); assert.equal(cero.asistentes, 0); assert.equal(cero.porcentaje, null); assert.equal(cero.agendados, 4)
  const fallido = totalClasesPrueba([{ nombre: 'A', clasesPrueba: { error: 'CRM' } }])
  assert.equal(fallido.invitados, null); assert.equal(fallido.porcentaje, null); assert.deepEqual(fallido.faltantes, ['A'])
})

test('cambiar período cambia resultados, conserva agenda y solo suma centros recibidos', () => {
  const a = centro('A', 24, 6, 2, { seisSemanas: { invitados: 61, asistentes: 18, desde: '2026-09-11', hasta: '2026-10-22' } })
  const b = centro('B', 47, 12, 16, { seisSemanas: { invitados: 125, asistentes: 43, desde: '2026-09-11', hasta: '2026-10-22' } })
  assert.equal(totalClasesPrueba([a, b]).invitados, 71)
  const seis = totalClasesPrueba([a, b], 'seisSemanas')
  assert.equal(seis.invitados, 186); assert.equal(seis.asistentes, 61); assert.equal(seis.agendados, 18)
  assert.equal(totalClasesPrueba([a], 'seisSemanas').invitados, 61)
  assert.throws(() => totalClasesPrueba([a], 'todos'), /inválido/)
})

test('rangos locales distintos no se presentan como una fecha común', () => {
  const a = centro('A', 3, 1, 2), b = centro('B', 4, 1, 3, { mes: { invitados: 4, asistentes: 1, desde: '2026-10-01', hasta: '2026-10-18' } })
  const resultado = totalClasesPrueba([a, b])
  assert.equal(resultado.rangoComun, null); assert.equal(resultado.rangos.length, 2)
  assert.deepEqual(totalClasesPrueba([a]).rangoComun, { desde: '2026-10-01', hasta: '2026-10-17' })
})

test('conteos incompletos o inválidos no contaminan sumas ni tasas', () => {
  for (const datos of [centro('A', null, 0, 1), centro('A', 1, 2, 0), centro('A', 1, 0, -1)]) {
    const resultado = totalClasesPrueba([datos])
    assert.equal(resultado.disponibles, 0); assert.equal(resultado.invitados, null)
  }
})

test('conversión consolida matrículas sobre asistentes de la misma cohorte, sin promediar tasas', () => {
  const a = centro('A', 10, 2, 4), b = centro('B', 90, 18, 12)
  a.clasesPrueba.mes.matriculados = 2
  b.clasesPrueba.mes.matriculados = 3
  const total = totalClasesPrueba([a, b])
  assert.equal(total.matriculados, 5); assert.equal(total.asistentesConversion, 20)
  assert.equal(total.conversion, 25); assert.equal(total.conversionDisponibles, 2)
})

test('matrícula desconocida conserva los otros indicadores y usa cobertura propia', () => {
  const a = centro('A', 10, 2, 4), b = centro('B', 90, 18, 12)
  a.clasesPrueba.mes.matriculados = 1
  const total = totalClasesPrueba([a, b])
  assert.equal(total.asistentes, 20); assert.equal(total.matriculados, 1)
  assert.equal(total.asistentesConversion, 2); assert.equal(total.conversion, 50)
  assert.deepEqual(total.conversionFaltantes, ['B'])
  assert.equal(totalClasesPrueba([b]).matriculados, null)
  b.clasesPrueba.mes.matriculados = 19
  assert.equal(totalClasesPrueba([b]).matriculados, null)
  b.clasesPrueba.mes.asistentes = 0; b.clasesPrueba.mes.matriculados = 0
  assert.equal(totalClasesPrueba([b]).matriculados, 0)
  assert.equal(totalClasesPrueba([b]).conversion, null)
})
