import test from 'node:test'
import assert from 'node:assert/strict'
import { calendarioPlan, estadoCalendarioPlan, estadoCondicion, PRIMER_CIERRE_REUNION } from '../lib/reunion-semanal.mjs'
import { semanaAbierta, sumarDias } from '../lib/semana-cierre.mjs'
import { enriquecerTableroConPlanes } from '../lib/plan-semana.mjs'

test('el arranque confirmado usa el cierre 22, reunión 23 y ejecución hasta 29', () => {
  assert.deepEqual(calendarioPlan(PRIMER_CIERRE_REUNION), {
    cierre: '2026-10-22', reunion: '2026-10-23', desde: '2026-10-23', hasta: '2026-10-29',
  })
  assert.equal(calendarioPlan('2026-12-31').hasta, '2027-01-07')
  assert.throws(() => calendarioPlan('2026-10-23'))
})

test('preparación no genera atraso; desde el primer cierre se aplica viernes 10 local', () => {
  for (const zona of ['America/Panama', 'America/Caracas']) {
    assert.equal(estadoCalendarioPlan('2026-10-15', new Date('2026-11-01T18:00Z'), zona).plazoVencido, false)
    assert.equal(estadoCalendarioPlan('2026-10-22', new Date('2026-10-23T13:59Z'), zona).plazoVencido, false)
    assert.equal(estadoCalendarioPlan('2026-10-22', new Date('2026-10-23T15:01Z'), zona).plazoVencido, true)
  }
  assert.equal(estadoCalendarioPlan('2026-10-22', new Date('2026-10-23T14:30Z'), 'America/Panama').plazoVencido, false)
  assert.equal(estadoCalendarioPlan('2026-10-22', new Date('2026-10-23T14:30Z'), 'America/Caracas').plazoVencido, true)
})

test('el calendario cambia automáticamente al plan 23–29 en cada centro al pasar a viernes', () => {
  for (const [zona, antes, despues] of [
    ['America/Panama', '2026-10-23T04:59Z', '2026-10-23T05:00Z'],
    ['America/Caracas', '2026-10-23T03:59Z', '2026-10-23T04:00Z'],
  ]) {
    const previo = sumarDias(semanaAbierta(new Date(antes), zona), -7)
    const cierre = sumarDias(semanaAbierta(new Date(despues), zona), -7)
    assert.equal(estadoCalendarioPlan(previo, new Date(antes), zona).preparacion, true)
    const plan = estadoCalendarioPlan(cierre, new Date(despues), zona)
    assert.equal(plan.preparacion, false)
    assert.equal(plan.desde, '2026-10-23')
    assert.equal(plan.hasta, '2026-10-29')
  }
})

test('la condición formal prevalece; una sugerencia no se presenta como confirmación', () => {
  const lectura = { condicion: 'normal' }
  assert.equal(estadoCondicion({ condicion: 'peligro', lectura }).nombre, 'Peligro')
  assert.equal(estadoCondicion({ condicion: 'peligro', lectura }).estado, 'Confirmada')
  assert.equal(estadoCondicion({ lectura }).origen, 'sugerida')
  assert.match(estadoCondicion({ lectura }).estado, /pendiente de confirmar/)
  assert.equal(estadoCondicion().condicion, null)
  assert.equal(estadoCondicion().nombre, 'Sin datos suficientes')
  assert.match(estadoCondicion({ lectura: { estado: 'recuperacion' } }).nombre, /Recuperación/)
})

test('tablero conserva estado real del plan y evalúa plazo solo desde el arranque', () => {
  const centros = [{ id: 1, pais: 'PA', serie: [] }]
  const [preparacion] = enriquecerTableroConPlanes(centros, [], [], '2026-10-15', new Date('2026-10-17T18:00Z'))
  assert.equal(preparacion.preparacion, true)
  assert.equal(preparacion.plazoVencido, false)
  assert.equal(preparacion.condicion, null)
  const [arranque] = enriquecerTableroConPlanes(centros, [], [], '2026-10-22', new Date('2026-10-23T16:00Z'))
  assert.equal(arranque.preparacion, false)
  assert.equal(arranque.plazoVencido, true)
  assert.equal(arranque.estadoPlan, 'sin_condicion')
})
