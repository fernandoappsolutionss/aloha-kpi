import { test } from 'node:test'
import assert from 'node:assert/strict'
import { modeloGrafica, COLOR_MEJORA, COLOR_EMPEORA, COLOR_IGUAL } from '../lib/grafica-semanal.mjs'

const puntos = valores => valores.map((valor, i) => ({ semanaFin: `semana-${i}`, valor, cuota: null }))
const anclas = puntos([125,125,126,126,126,128,126,131,132,131,127,127]).map((p,i) => ({ ...p, cuota: i === 10 ? 170 : i === 7 ? 140 : null, abierto: i === 11 }))

test('azul mejora, rojo empeora y gris sin cambio', () => {
  const m = modeloGrafica({ puntos: puntos([10, 12, 11, 11]) })
  assert.deepEqual(m.tramos.map(t => t.color), [COLOR_MEJORA, COLOR_EMPEORA, COLOR_IGUAL])
  assert.ok(m.puntos[1].y < m.puntos[0].y)
})

test('en inversas bajar mejora y sube en el eje', () => {
  const m = modeloGrafica({ puntos: puntos([5, 3, 4]), inversa: true })
  assert.deepEqual(m.tramos.map(t => t.color), [COLOR_MEJORA, COLOR_EMPEORA])
  assert.ok(m.puntos[1].y < m.puntos[0].y)
  assert.ok(m.ticks[0].y < m.ticks.at(-1).y)
})

test('Anclas: 125–132 se distingue sin forzar cero ni usar la cuota antigua de 170 como resultado', () => {
  const m = modeloGrafica({ puntos: anclas })
  assert.ok(m.min > 0 && m.min <= 125)
  assert.ok(m.max >= 132 && m.max < 140)
  assert.ok(Math.abs(m.puntos[9].y - m.puntos[10].y) > 80)
  assert.equal(m.puntos[10].cuota, 170)
  assert.equal(m.puntos[10].yCuota, null)
  const conCuotas = modeloGrafica({ puntos: anclas, incluirCuotas: true })
  assert.ok(conCuotas.max >= 170)
  assert.ok(conCuotas.puntos[10].yCuota >= conCuotas.margen.arriba)
})

test('cuotas altas tampoco aplanan los nuevos inscritos; cero es un resultado', () => {
  const serie = puntos([0,2,6,6,0,1,0,1,0,0,0,0])
  serie[10].cuota = 19
  const m = modeloGrafica({ puntos: serie })
  assert.equal(m.min, 0)
  assert.ok(m.max < 10)
  assert.notEqual(m.puntos[0].y, null)
})

test('sin dato o entrada no finita corta la línea; una cuota sola no inventa producción', () => {
  for (const value of [null, undefined, '', NaN, Infinity, 'x']) {
    const m = modeloGrafica({ puntos: puntos([10, value, 12]) })
    assert.equal(m.tramos.length, 0)
    assert.equal(m.puntos[1].y, null)
  }
  assert.equal(modeloGrafica({ puntos: [{ valor: null, cuota: 20 }], incluirCuotas: true }).vacia, true)
})

test('escala fijada se mantiene entre semanas y se amplía si aparece un resultado fuera', () => {
  const escala = { min: 120, max: 140 }
  for (const valores of [[125,132], [127,128]]) {
    const m = modeloGrafica({ puntos: puntos(valores), escala })
    assert.deepEqual([m.min,m.max], [120,140])
    assert.equal(m.expandida, false)
  }
  const m = modeloGrafica({ puntos: puntos([119,145]), escala })
  assert.deepEqual([m.min,m.max], [119,145])
  assert.equal(m.expandida, true)
  assert.ok(m.puntos.every(p => p.y >= m.margen.arriba && p.y <= m.alto - m.margen.abajo))
})

test('semana abierta se marca provisional sin alterar los cierres', () => {
  const m = modeloGrafica({ puntos: anclas })
  assert.equal(m.tramos.at(-1).provisional, true)
  assert.equal(m.tramos.at(-1).color, COLOR_IGUAL)
  assert.equal(m.tramos.at(-2).provisional, false)
  assert.equal(m.tramos.at(-2).color, COLOR_EMPEORA)
})

test('escalas inválidas, constantes, ceros y negativos producen coordenadas finitas y ticks exactos', () => {
  for (const valores of [[0,0], [7,7], [-4,-4], [-5,0,2], [125,132]]) {
    for (const escala of [null, {}, { min: '', max: 10 }, { min: 10, max: 10 }, { min: 5, max: 2 }]) {
      const m = modeloGrafica({ puntos: puntos(valores), escala })
      assert.ok(m.max > m.min)
      assert.ok(m.puntos.every(p => Number.isFinite(p.y)))
      assert.ok(m.ticks.every(t => Number.isInteger(t.valor)))
      assert.equal(new Set(m.ticks.map(t => t.valor)).size, m.ticks.length)
    }
  }
})

test('una escala común permite comparar variaciones sin reajustar el ángulo', () => {
  const escala = { min: 90, max: 230 }
  const menor = modeloGrafica({ puntos: puntos([100,104,108,112]), escala })
  const mayor = modeloGrafica({ puntos: puntos([100,140,180,220]), escala })
  assert.ok(Math.abs(menor.puntos[0].y-menor.puntos[3].y) < Math.abs(mayor.puntos[0].y-mayor.puntos[3].y)/3)
})
