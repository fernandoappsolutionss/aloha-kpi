import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as cuotas from '../lib/cuotas-semana.mjs'
import { ESTADISTICAS_CENTRO as catalogo } from '../lib/estadisticas-semana/catalogo.mjs'

const semanaFin = '2026-09-24'
const caso = () => ({ catalogo, semanaFin,
  series: Object.fromEntries(catalogo.map((m, i) => [m.codigo, [{ semanaFin, estado: 'cerrada', valor: [152, 6, 0, 1, 4][i] }]])),
  filasCuotas: catalogo.map((m, i) => ({ codigo: m.codigo, semana_fin: semanaFin, estado: 'aprobada', cuota: [150, 5, 0, 1, 3][i] })),
})

test('reconocimiento exige todas las cuotas y respeta inversas, incluida cuota cero', () => {
  assert.equal(typeof cuotas.evaluarCuotasCerradas, 'function')
  const input = caso()
  const r = cuotas.evaluarCuotasCerradas(input)
  assert.equal(r.estado, 'cumplido')
  assert.equal(r.porcentaje, 100)
  assert.equal(r.cumplidas, 5)
  input.series.retiros[0].valor = 1
  const incumple = cuotas.evaluarCuotasCerradas(input)
  assert.equal(incumple.estado, 'incumplido')
  assert.equal(incumple.porcentaje, 80)
  assert.equal(incumple.detalles.find(d => d.codigo === 'retiros').falta, 1)
})

test('una sola cuota aprobada, propuesta u otra semana nunca otorga 100% ni podio', () => {
  assert.equal(typeof cuotas.evaluarCuotasCerradas, 'function')
  for (const cambio of [
    i => { i.filasCuotas = i.filasCuotas.slice(0, 1) },
    i => { i.filasCuotas[1].estado = 'propuesta' },
    i => { i.filasCuotas[1].semana_fin = '2026-10-01' },
  ]) {
    const input = caso(); cambio(input)
    const r = cuotas.evaluarCuotasCerradas(input)
    assert.equal(r.estado, 'cuotas_incompletas')
    assert.equal(r.porcentaje, null)
  }
  const r = cuotas.evaluarCuotasCerradas({ ...caso(), filasCuotas: [] })
  assert.equal(r.estado, 'sin_cuotas')
})

test('sin foto cerrada válida no se evalúa, cero real sí se evalúa', () => {
  assert.equal(typeof cuotas.evaluarCuotasCerradas, 'function')
  for (const cambio of [
    i => { i.series.cp_asistidas[0].valor = null },
    i => { i.series.cp_asistidas[0].estado = 'abierta' },
    i => { i.series.cp_asistidas[0].valor = NaN },
    i => { i.series.cp_asistidas[0].valor = -1 },
    i => { i.series.cp_asistidas[0].semanaFin = '2026-10-01' },
  ]) {
    const input = caso(); cambio(input)
    const r = cuotas.evaluarCuotasCerradas(input)
    assert.equal(r.estado, 'datos_pendientes')
    assert.equal(r.porcentaje, null)
  }
  const input = caso(); input.series.cp_asistidas[0].valor = 0
  assert.equal(cuotas.evaluarCuotasCerradas(input).porcentaje, 80)
})

test('cuota inválida no se cuenta como aprobada, fecha Date y decimales SQL funcionan', () => {
  assert.equal(typeof cuotas.evaluarCuotasCerradas, 'function')
  for (const invalida of [null, undefined, '', -1, NaN, Infinity]) {
    const input = caso(); input.filasCuotas[0].cuota = invalida
    assert.equal(cuotas.evaluarCuotasCerradas(input).porcentaje, null)
  }
  const input = caso()
  input.filasCuotas[0].cuota = '150.00'
  input.filasCuotas[0].semana_fin = new Date('2026-09-24T00:00:00Z')
  assert.equal(cuotas.evaluarCuotasCerradas(input).porcentaje, 100)
})

test('ranking compara cumplimiento, superación relativa y comparte puesto en empates', () => {
  assert.equal(typeof cuotas.ordenarRankingSemanal, 'function')
  const evaluacion = (porcentaje, superacionPrincipal = 0) => ({ porcentaje, superacionPrincipal, estado: porcentaje === 100 ? 'cumplido' : porcentaje == null ? 'sin_cuotas' : 'incumplido' })
  const rows = [
    { id: 1, nombre: 'Uno', evaluacionCuotas: evaluacion(80, .9) },
    { id: 2, nombre: 'Dos', evaluacionCuotas: evaluacion(100, .1) },
    { id: 3, nombre: 'Tres', evaluacionCuotas: evaluacion(100, .2) },
    { id: 4, nombre: 'Cuatro', evaluacionCuotas: evaluacion(100, .2) },
    { id: 5, nombre: 'Cinco', evaluacionCuotas: evaluacion(null) },
  ]
  const result = cuotas.ordenarRankingSemanal(rows)
  assert.deepEqual(result.map(r => [r.id, r.posicion, r.medalla]), [[4, 1, '🥇'], [3, 1, '🥇'], [2, 3, '🥉'], [1, 4, null], [5, null, null]])
  assert.equal(rows[0].posicion, undefined)
  assert.deepEqual(cuotas.ordenarRankingSemanal(rows.filter(r => r.id === 1)).map(r => r.medalla), [null])
})
