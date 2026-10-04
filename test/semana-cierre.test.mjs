import { test } from 'node:test'
import assert from 'node:assert/strict'
import { juevesDeCierre, rangoSemana, ultimasSemanas, sumarDias, diaDeSemana, fechaCivil, semanaAbierta, plazoCondicionVencido, mesesDeSemana, zonaHorariaCentro } from '../lib/semana-cierre.mjs'

test('jueves de cierre y rango viernes a jueves', () => {
  assert.equal(juevesDeCierre('2026-10-01'), '2026-10-01')
  assert.equal(juevesDeCierre('2026-10-02'), '2026-10-08')
  assert.equal(juevesDeCierre('2026-09-26'), '2026-10-01')
  assert.equal(juevesDeCierre('2027-01-01'), '2027-01-07')
  assert.deepEqual(rangoSemana('2026-10-01'), { desde: '2026-09-25', hasta: '2026-10-01' })
  assert.throws(() => rangoSemana('2026-09-30'), /no es jueves de cierre/)
  assert.throws(() => juevesDeCierre('2026-02-30'), /Fecha inválida/)
  assert.throws(() => juevesDeCierre(null), /Fecha inválida/)
})

test('historia y día de ejecución cruzan mes y año', () => {
  assert.deepEqual(ultimasSemanas('2026-10-01', 3), ['2026-09-17', '2026-09-24', '2026-10-01'])
  assert.equal(ultimasSemanas('2026-10-01').length, 12)
  assert.equal(sumarDias('2026-02-28', 1), '2026-03-01')
  assert.equal(diaDeSemana('2026-09-25'), 1)
  assert.equal(diaDeSemana('2026-10-01'), 7)
  assert.deepEqual(mesesDeSemana('2026-10-01'), [{ year: 2026, month: 9 }, { year: 2026, month: 10 }])
})

test('fecha y plazo usan la zona del centro', () => {
  const instante = new Date('2026-10-01T04:30:00Z')
  assert.equal(fechaCivil(instante, 'America/Panama'), '2026-09-30')
  assert.equal(fechaCivil(instante, 'America/Caracas'), '2026-10-01')
  assert.equal(semanaAbierta(instante, 'America/Panama'), '2026-10-01')
  assert.equal(plazoCondicionVencido('2026-10-01', new Date('2026-10-02T14:59:00Z'), 'America/Panama'), false)
  assert.equal(plazoCondicionVencido('2026-10-01', new Date('2026-10-02T15:00:00Z'), 'America/Panama'), true)
  assert.equal(zonaHorariaCentro({ pais: 'VE' }), 'America/Caracas')
  assert.equal(zonaHorariaCentro({ pais: 'PA' }), 'America/Panama')
})

test('viernes en Caracas aún es jueves en Panamá y abre semanas distintas', () => {
  const instante = new Date('2026-10-02T04:30:00Z')
  assert.equal(fechaCivil(instante, 'America/Caracas'), '2026-10-02')
  assert.equal(fechaCivil(instante, 'America/Panama'), '2026-10-01')
  assert.equal(semanaAbierta(instante, 'America/Caracas'), '2026-10-08')
  assert.equal(semanaAbierta(instante, 'America/Panama'), '2026-10-01')
})
