import { test } from 'node:test'
import assert from 'node:assert/strict'
import { comparacionCierres, coberturaResumen, puntosResumen } from '../lib/resumen-tablero-semanal.mjs'
import { sumarDias } from '../lib/semana-cierre.mjs'
import { escalaSugerida, modeloMensual } from '../lib/grafica-mensual-hca.mjs'
import { lecturaCondicion } from '../lib/condiciones/lectura.mjs'

const serie = valores => valores.map((valor, i) => ({ semanaFin: sumarDias('2026-08-06', i * 7), valor }))
const anclas = serie([null, 125, 125, 125, 126, 126, 126, 128, 126, 131, 132, 134])
const brisas = serie([null, 183, 183, 195, 189, 189, 188, 200, 208, 208, 208, 208])
const centro = valores => ({ serie: valores, ultimaCerrada: '2026-10-15' })

test('solo se presentan seis semanas y la abierta no reemplaza el cierre', () => {
  const puntos = puntosResumen(anclas, '2026-10-15')
  assert.equal(puntos.length, 6)
  assert.deepEqual(puntos.map(p => p.valor), [126, 128, 126, 131, 132, 134])
  assert.deepEqual(puntos.filter(p => p.abierto).map(p => p.periodo), ['2026-10-22'])
  assert.equal(anclas.length, 12)
  assert.equal(anclas[0].abierto, undefined)
  const { porcentaje, ...comparacion } = comparacionCierres(centro(anclas))
  assert.deepEqual(comparacion, { anterior: 131, actual: 132, delta: 1 })
  assert.ok(Math.abs(porcentaje - 100 / 131) < 1e-12)
})

test('Anclas y Brisas conservan su referencia calculada con todo el historial cerrado', () => {
  assert.equal(lecturaCondicion(anclas.slice(0, -1).map(p => p.valor)).condicion, 'normal')
  assert.equal(lecturaCondicion(brisas.slice(0, -1).map(p => p.valor)).condicion, 'emergencia')
  assert.deepEqual(comparacionCierres(centro(brisas)), { anterior: 208, actual: 208, delta: 0, porcentaje: 0 })
})

test('huecos de cierres no se saltan y cero no se convierte en dato ausente', () => {
  assert.equal(comparacionCierres(centro(anclas.filter(p => p.semanaFin !== '2026-10-08'))), null)
  assert.equal(comparacionCierres(centro(anclas.map(p => p.semanaFin === '2026-10-15' ? { ...p, valor: null } : p))), null)
  assert.deepEqual(comparacionCierres(centro([{ semanaFin: '2026-10-08', valor: 0 }, { semanaFin: '2026-10-15', valor: 1 }])), { anterior: 0, actual: 1, delta: 1, porcentaje: null })
})

test('la semana abierta depende del cierre local de cada centro', () => {
  assert.equal(puntosResumen(anclas, '2026-10-22').some(p => p.abierto), false)
  assert.equal(puntosResumen(anclas, '2026-10-08').filter(p => p.abierto).length, 2)
})

test('cobertura identifica centros faltantes por fecha, preserva subtotal y nunca inventa total', () => {
  const cero = anclas.map(p => ({ ...p, valor: 0 }))
  const datos = { centros: [{ nombre: 'Anclas', serie: anclas }, { nombre: 'Cero válido', serie: cero }, { nombre: 'El Viñedo', serie: [] }],
    consolidada: anclas.map(p => ({ ...p, valor: null, subtotal: p.valor, disponibles: p.valor == null ? 1 : 2, total: 3, incompleta: true })) }
  const cobertura = coberturaResumen(datos)
  assert.equal(cobertura.length, 6)
  assert.deepEqual(cobertura.at(-1).faltantes, ['El Viñedo'])
  assert.equal(cobertura.at(-1).subtotal, 134)
  assert.equal(cobertura.at(-1).valor, null)
  assert.deepEqual(coberturaResumen({ centros: [], consolidada: [] }), [])
})

test('la escala completa se conserva al recortar la vista e incluye las cuotas', () => {
  const completa = anclas.map(p => p.semanaFin === '2026-10-08' ? { ...p, cuota: 140 } : p)
  const escala = escalaSugerida(completa)
  const modelo = modeloMensual({ puntos: puntosResumen(completa, '2026-10-15'), escala, ancho: 340, alto: 172 })
  assert.equal(modelo.min, escala.min)
  assert.equal(modelo.max, escala.max)
  assert.ok(modelo.max >= 140)
  assert.equal(modelo.tramos.filter(t => t.provisional).length, 1)
  assert.equal(modelo.tramos[1].sentido, 'empeora')
  assert.ok(modelo.puntos.every(p => p.y >= modelo.margen.arriba && p.y <= modelo.alto - modelo.margen.abajo))
})
