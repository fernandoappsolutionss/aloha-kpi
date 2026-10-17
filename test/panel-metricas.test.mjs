import test from 'node:test'
import assert from 'node:assert/strict'
import { resolvePanelRange } from '../lib/period.js'
import { disciplinaPct, DISCIPLINA_KEYS } from '../lib/checklist.js'
import { promedioDisciplina, porcentajeDisciplina, variacionDisciplina, tendenciaIngresos, coberturaIngresos } from '../lib/panel-metricas.mjs'

test('Q3 compara con Q2 y Q1 cruza al Q4 del año anterior', () => {
  const q3 = resolvePanelRange({ mode: 'trimestre', year: 2026, quarter: 3 })
  assert.deepEqual(q3.prev, { fromY: 2026, fromM: 4, toY: 2026, toM: 6 })
  assert.equal(q3.prevLabel, 'Q2 2026')
  const q1 = resolvePanelRange({ mode: 'trimestre', year: 2026, quarter: 1 })
  assert.deepEqual(q1.prev, { fromY: 2025, fromM: 10, toY: 2025, toM: 12 })
  assert.equal(q1.prevLabel, 'Q4 2025')
})

test('septiembre compara con agosto y un rango mantiene su duración al cruzar año', () => {
  const septiembre = resolvePanelRange({ mode: 'mensual', preset: 'custom', from: '2026-09', to: '2026-09' })
  assert.deepEqual(septiembre.prev, { fromY: 2026, fromM: 8, toY: 2026, toM: 8 })
  assert.equal(septiembre.prevLabel, 'Ago 2026')
  const rango = resolvePanelRange({ mode: 'mensual', preset: 'custom', from: '2026-01', to: '2026-02' })
  assert.deepEqual(rango.prev, { fromY: 2025, fromM: 11, toY: 2025, toM: 12 })
})

const centro = (nuevos, meta = 60) => ({ nuevos, meta, nuevosDisponible: true })
test('crecer bajo la meta es al alza; caer sobre la meta es a la baja; igualdad es estable', () => {
  assert.equal(tendenciaIngresos(centro(38), centro(30)).label, 'Al alza')
  assert.equal(tendenciaIngresos(centro(70), centro(90)).label, 'A la baja')
  assert.equal(tendenciaIngresos(centro(0), centro(0)).label, 'Estable')
  assert.equal(tendenciaIngresos(centro(8), centro(0)).label, 'Al alza')
  assert.equal(tendenciaIngresos(centro(8), centro(0)).porcentaje, null)
  assert.equal(tendenciaIngresos(centro(0), centro(8)).diferencia, -8)
})

test('la falta de centro, datos o cobertura nunca se presenta como caída ni estabilidad', () => {
  for (const [a, b] of [[centro(4), undefined], [{ ...centro(0), nuevosDisponible: false }, centro(4)], [centro(4), { ...centro(0), nuevosDisponible: false }]]) {
    const resultado = tendenciaIngresos(a, b)
    assert.equal(resultado.label, 'Sin datos comparables')
    assert.equal(resultado.diferencia, null)
  }
})

test('disciplina excluye ausencia, conserva cero declarado y muestra cobertura', () => {
  const perfecto = Object.fromEntries(DISCIPLINA_KEYS.map(k => [k, 'si']))
  const incumplido = Object.fromEntries(DISCIPLINA_KEYS.map(k => [k, 'no']))
  const filas = [[], [perfecto], [incumplido]].map((rows, id) => ({ id, cumpl: disciplinaPct(rows).pct }))
  assert.deepEqual(promedioDisciplina(filas), { valor: 50, conDatos: 2, total: 3 })
  assert.equal(porcentajeDisciplina(filas[0].cumpl), 'Sin dato')
  assert.equal(porcentajeDisciplina(filas[2].cumpl), '0%')
  assert.deepEqual(promedioDisciplina([{ cumpl: null }]), { valor: null, conDatos: 0, total: 1 })
  assert.deepEqual(promedioDisciplina([]), { valor: null, conDatos: 0, total: 0 })
})

test('caso Q3: seis centros con disciplina y uno ausente dan 98%, no 84%', () => {
  const centros = [100, 91, 100, null, 99, 97, 100].map((cumpl, id) => ({ id, cumpl }))
  assert.deepEqual(promedioDisciplina(centros), { valor: 98, conDatos: 6, total: 7 })
  assert.equal(variacionDisciplina(centros, centros), 0)
  assert.equal(variacionDisciplina(centros, centros.map(c => c.id === 3 ? { ...c, cumpl: 80 } : c)), null)
  assert.equal(variacionDisciplina(centros, []), null)
})

const entrada = {
  centroId: 1, meses: [{ year: 2026, month: 8 }, { year: 2026, month: 9 }],
  resumenes: [], semanas: [], autos: {}, inicioAnterior: null, periodoActual: 202610,
}
test('cobertura: cero capturado es válido, filas futuras y meses ausentes no completan el rango', () => {
  const semanas = [{ year: 2026, month: 8, ing_d1: 0 }, { year: 2026, month: 9, ing_d1: 0 }]
  assert.equal(coberturaIngresos({ ...entrada, semanas }).disponible, true)
  assert.equal(coberturaIngresos({ ...entrada, semanas: semanas.slice(1) }).disponible, false)
  assert.equal(coberturaIngresos({ ...entrada, semanas, periodoActual: 202608 }).disponible, false)
  assert.equal(coberturaIngresos({ ...entrada, semanas: [{ year: 2026, month: 8, ing_d1: null }] }).registrados, 0)
})

test('ceros automáticos sin base no inventan un historial para El Viñedo', () => {
  const autos = { '1:202608': { estado: 'auto', ingTotal: 0 }, '1:202609': { estado: 'auto', ingTotal: 0 } }
  assert.equal(coberturaIngresos({ ...entrada, autos }).disponible, false)
  assert.equal(coberturaIngresos({ ...entrada, autos, inicioAnterior: 0 }).disponible, true)
  assert.equal(coberturaIngresos({ ...entrada, autos: { ...autos, '1:202608': { estado: 'fallo' } }, inicioAnterior: 100 }).disponible, false)
})
