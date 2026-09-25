import test from 'node:test'
import assert from 'node:assert/strict'
import { lunesDe, sumarDias, ventana13, hoyPanama, fechasDelCompromiso, diasEntre } from '../lib/caja/semanas.mjs'

test('lunes de la semana y ventana de 13 que cruza de mes y de año', () => {
  assert.equal(lunesDe('2026-09-24'), '2026-09-21')
  assert.equal(lunesDe('2026-09-27'), '2026-09-21') // domingo
  assert.equal(lunesDe('2026-09-21'), '2026-09-21')
  const v = ventana13('2026-12-02')
  assert.equal(v.length, 13)
  assert.equal(v[0], '2026-11-30')
  assert.equal(v[12], '2027-02-22')
  assert.equal(sumarDias('2026-02-28', 1), '2026-03-01')
})

test('hoy en Panamá (UTC-5) aunque el servidor esté en UTC', () => {
  assert.equal(hoyPanama(new Date('2026-09-25T03:00:00Z')), '2026-09-24')
})

test('mensual con día 31 cae en el último día de meses cortos', () => {
  assert.deepEqual(
    fechasDelCompromiso({ frecuencia: 'mensual', dia: 31, desde: '2026-01-01' }, '2026-09-01', '2026-11-30'),
    ['2026-09-30', '2026-10-31', '2026-11-30'],
  )
})

test('quincenal paga el 15 y el último día', () => {
  assert.deepEqual(
    fechasDelCompromiso({ frecuencia: 'quincenal', desde: '2026-01-01' }, '2026-09-20', '2026-10-20'),
    ['2026-09-30', '2026-10-15'],
  )
})

test('unico, anual, desde/hasta y activo=false', () => {
  assert.deepEqual(fechasDelCompromiso({ frecuencia: 'unico', fecha: '2026-12-15', desde: '2026-01-01' }, '2026-09-24', '2026-12-31'), ['2026-12-15'])
  assert.deepEqual(fechasDelCompromiso({ frecuencia: 'anual', fecha: '2025-06-16', desde: '2025-01-01' }, '2026-01-01', '2027-12-31'), ['2026-06-16', '2027-06-16'])
  assert.deepEqual(fechasDelCompromiso({ frecuencia: 'mensual', dia: 5, desde: '2026-10-01', hasta: '2026-11-30' }, '2026-09-01', '2026-12-31'), ['2026-10-05', '2026-11-05'])
  assert.deepEqual(fechasDelCompromiso({ frecuencia: 'mensual', dia: 5, desde: '2026-01-01', activo: false }, '2026-09-01', '2026-12-31'), [])
})

test('diasEntre cuenta días calendario entre dos ISO, cruzando mes y año', () => {
  assert.equal(diasEntre('2026-09-17', '2026-09-24'), 7)
  assert.equal(diasEntre('2026-09-24', '2026-09-24'), 0)
  assert.equal(diasEntre('2025-12-30', '2026-01-02'), 3)
  assert.equal(diasEntre('2026-02-27', '2026-03-01'), 2)
  assert.equal(diasEntre('2026-09-25', '2026-09-24'), -1)
})
