import { test } from 'node:test'
import assert from 'node:assert/strict'
import { puntosMensuales, escalaSugerida, escalaValida, modeloMensual } from '../lib/grafica-mensual-hca.mjs'
import { COLOR_MEJORA, COLOR_EMPEORA } from '../lib/grafica-semanal.mjs'
const puntos = values => values.map(valor => ({ valor, abierto: false }))
const row = (month, valor, extra = {}) => ({ year: 2026, month, valor, estado: 'cerrado', ...extra })

test('meses ordenados, cambio de año y huecos conservan tiempo y cero real', () => {
  const p = puntosMensuales([row(2, 0), row(12, 10, { year: 2025 })], 'valor')
  assert.deepEqual(p.map(p => [p.periodo, p.valor]), [['2025-12',10],['2026-01',null],['2026-02',0]])
  const m = modeloMensual({ puntos: p })
  assert.equal(m.tramos.length, 0)
  assert.equal(m.puntos[1].y, null)
  assert.ok(Number.isFinite(m.puntos[2].y))
  assert.equal(m.puntos[1].x - m.puntos[0].x, m.puntos[2].x - m.puntos[1].x)
})

test('vacíos y valores inválidos no se convierten en ceros', () => {
  const p = puntosMensuales([row(1, null),row(2, ''),row(3, 'malo'),row(4, '0')], 'valor')
  assert.deepEqual(p.map(p => p.valor), [null,null,null,0])
  assert.deepEqual(puntosMensuales([], 'valor'), [])
})

test('metas por mes o constantes preservan un cero válido', () => {
  assert.deepEqual(puntosMensuales([row(1,5,{meta:0}),row(2,6,{meta:20})], 'valor', 'meta').map(p=>p.cuota), [0,20])
  assert.equal(puntosMensuales([row(1,5)], 'valor', 8)[0].cuota, 8)
})

test('normal: subida azul, caída roja, horizontal neutra', () => {
  const m = modeloMensual({ puntos: puntos([10,12,9,9]) })
  assert.deepEqual(m.tramos.map(t=>t.sentido), ['mejora','empeora','igual'])
  assert.equal(m.tramos[0].color, COLOR_MEJORA)
  assert.equal(m.tramos[1].color, COLOR_EMPEORA)
  assert.ok(m.puntos[1].y < m.puntos[0].y)
  assert.equal(m.puntos[2].y, m.puntos[3].y)
})

test('inversa: disminuir mejora y sube visualmente; aumentar empeora y baja', () => {
  const m = modeloMensual({ puntos: puntos([45,30,40]), inversa: true })
  assert.deepEqual(m.tramos.map(t=>t.color), [COLOR_MEJORA,COLOR_EMPEORA])
  assert.ok(m.puntos[1].y < m.puntos[0].y)
  assert.ok(m.puntos[2].y > m.puntos[1].y)
  assert.ok(m.ticks[0].y < m.ticks.at(-1).y)
})

test('mes abierto no recibe color de caída/mejora definitiva', () => {
  const p = puntosMensuales([row(1,50),row(2,10,{estado:'abierto'}),row(3,80)], 'valor')
  const m = modeloMensual({ puntos:p })
  assert.ok(m.tramos.every(t=>t.provisional))
  assert.ok(m.tramos.every(t=>t.color !== COLOR_EMPEORA && t.color !== COLOR_MEJORA))
})

test('negativos atraviesan cero con coordenadas finitas y proporcionales', () => {
  const m = modeloMensual({ puntos:puntos([-20,-10,0,10]), escala:{min:-30,max:20} })
  assert.ok(m.puntos.every(p=>Number.isFinite(p.y)))
  assert.ok(Math.abs((m.puntos[0].y-m.puntos[1].y)-(m.puntos[1].y-m.puntos[2].y)) < 1e-9)
  assert.ok(m.tramos.every(t=>t.color===COLOR_MEJORA))
})

test('la sugerencia incluye metas y no fuerza todas las estadísticas a partir de cero', () => {
  const s = escalaSugerida([{valor:100},{valor:104,cuota:120}])
  assert.ok(s.min > 0 && s.min <= 100)
  assert.ok(s.max >= 120)
})

test('escala manual conserva límites con rangos distintos cuando los datos caben', () => {
  const escala = {min:50,max:200}
  const a = modeloMensual({ puntos:puntos([100,110,120,130]),escala })
  const b = modeloMensual({ puntos:puntos([120,130]),escala })
  assert.deepEqual([a.min,a.max],[b.min,b.max])
  assert.equal(a.puntos.at(-1).y,b.puntos.at(-1).y)
  assert.equal(a.expandida,false)
})

test('escala manual se amplía si recortaría un dato o una meta', () => {
  const m = modeloMensual({ puntos:[{valor:-5},{valor:10,cuota:30}],escala:{min:0,max:20} })
  assert.deepEqual([m.min,m.max,m.expandida],[-5,30,true])
  assert.ok(m.puntos.every(p=>p.y>=m.margen.arriba && p.y<=m.alto-m.margen.abajo))
})

test('escala inválida se rechaza y el modelo usa una sugerencia segura', () => {
  for (const escala of [null,{}, {min:'',max:10},{min:5,max:5},{min:10,max:5},{min:0,max:Infinity}]) {
    assert.equal(escalaValida(escala),false)
    const m=modeloMensual({puntos:puntos([5,6]),escala})
    assert.ok(m.max>m.min && m.puntos.every(p=>Number.isFinite(p.y)))
  }
  assert.equal(escalaValida({min:'-10',max:'0'}),true)
})

test('sin datos, un punto, valores constantes y decimales diminutos no dividen entre cero', () => {
  for (const values of [[],[null],[0],[7,7],[.00000001,.00000002]]) {
    const m=modeloMensual({puntos:puntos(values)})
    assert.ok(m.max>m.min)
    assert.ok(m.puntos.every(p=>p.y===null || Number.isFinite(p.y)))
    assert.equal(m.ticks.length,11)
    assert.ok(m.ticks.every(t=>Number.isFinite(t.y)))
  }
})
