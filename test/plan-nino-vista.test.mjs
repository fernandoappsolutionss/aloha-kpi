import test from 'node:test'
import assert from 'node:assert/strict'

import { posicionDeIndice, estadoCasilla, progresoPlan } from '../lib/plan-nino-vista.mjs'
import { planNino, posicionPlanNino } from '../lib/plan-nino.mjs'
import { semanaEnCurso } from '../lib/itinerario.js'

// Lunes 2026-01-12, clases lunes(1) y miércoles(3): el mismo calendario que
// usan los tests del motor (test/plan-nino.test.mjs).
const CAL = [{ vigente_desde: null, dias: [1, 3] }]
const planDe = (ancla, nivel = 1) => planNino({ ancla, nivel, pais: 'PA', calendarioVersionado: CAL })

// ── posicionDeIndice: la traducción del índice legacy del grupo ──────────────

test('índice legacy: -1 es nivel terminado y apunta a la última semana', () => {
  assert.deepEqual(posicionDeIndice(-1, 20), { estado: 'cerrado', indice: 19 })
})

test('índice legacy: 0..n es la semana en curso', () => {
  assert.deepEqual(posicionDeIndice(0, 20), { estado: 'en_curso', indice: 0 })
  assert.deepEqual(posicionDeIndice(7, 20), { estado: 'en_curso', indice: 7 })
})

test('índice legacy: sin semanas no hay posición (nunca se inventa una)', () => {
  assert.deepEqual(posicionDeIndice(3, 0), { estado: 'sin_plan', indice: null })
  assert.deepEqual(posicionDeIndice(-1, 0), { estado: 'sin_plan', indice: null })
})

test('índice legacy fuera de rango: se acota a la última semana', () => {
  assert.deepEqual(posicionDeIndice(99, 20), { estado: 'en_curso', indice: 19 })
})

// ── estadoCasilla: qué semana se ve hecha y cuál es la de hoy ────────────────

test('en curso: las anteriores hechas, la del índice es hoy, las siguientes intactas', () => {
  const pos = { estado: 'en_curso', indice: 3 }
  assert.deepEqual(estadoCasilla(2, pos), { hoy: false, pasada: true })
  assert.deepEqual(estadoCasilla(3, pos), { hoy: true, pasada: false })
  assert.deepEqual(estadoCasilla(4, pos), { hoy: false, pasada: false })
})

test('cerrado: todas hechas y ninguna es hoy', () => {
  const pos = { estado: 'cerrado', indice: 19 }
  assert.deepEqual(estadoCasilla(0, pos), { hoy: false, pasada: true })
  assert.deepEqual(estadoCasilla(19, pos), { hoy: false, pasada: true })
})

test('por iniciar y sin plan: nada hecho y nada de hoy (no se atenúa lo que no vio)', () => {
  for (const estado of ['por_iniciar', 'sin_plan']) {
    assert.deepEqual(estadoCasilla(0, { estado, indice: 0 }), { hoy: false, pasada: false })
    assert.deepEqual(estadoCasilla(5, { estado, indice: 0 }), { hoy: false, pasada: false })
  }
  assert.deepEqual(estadoCasilla(0, {}), { hoy: false, pasada: false })
})

// ── progresoPlan: la barra y su texto ───────────────────────────────────────

test('progreso en curso: hechas = índice y el texto conserva la forma del grupo', () => {
  assert.deepEqual(progresoPlan({ total: 20, estado: 'en_curso', indice: 5, etiqueta: 'S5' }), {
    hechas: 5,
    pct: 25,
    texto: 'En curso: S5 (6 de 20)',
  })
})

test('progreso en curso sin etiqueta: cae al número de semana', () => {
  assert.equal(progresoPlan({ total: 20, estado: 'en_curso', indice: 0 }).texto, 'En curso: semana 1 de 20')
})

test('progreso cerrado: 100% y nivel terminado', () => {
  assert.deepEqual(progresoPlan({ total: 20, estado: 'cerrado', indice: 19 }), {
    hechas: 20,
    pct: 100,
    texto: 'Nivel terminado',
  })
})

test('progreso por iniciar: 0% y dice por dónde empieza', () => {
  assert.deepEqual(progresoPlan({ total: 20, estado: 'por_iniciar', indice: 0, etiqueta: 'Inducción' }), {
    hechas: 0,
    pct: 0,
    texto: 'Aún no arranca (empieza por Inducción)',
  })
})

test('progreso sin plan (o sin semanas): 0% y lo dice', () => {
  assert.deepEqual(progresoPlan({ total: 0, estado: 'en_curso', indice: 3 }), { hechas: 0, pct: 0, texto: 'Sin plan derivable' })
  assert.deepEqual(progresoPlan({ total: 20, estado: 'sin_plan', indice: null }), { hechas: 0, pct: 0, texto: 'Sin plan derivable' })
  assert.deepEqual(progresoPlan(), { hechas: 0, pct: 0, texto: 'Sin plan derivable' })
})

// ── Con el motor real: grupo y niño pintan lo mismo con la misma posición ────

test('el plan de un niño en curso marca UNA sola casilla de hoy', () => {
  const plan = planDe('2026-01-12')
  const pos = posicionPlanNino(plan, '2026-02-04')
  assert.equal(pos.estado, 'en_curso')
  const hoys = plan.semanas.filter((_, i) => estadoCasilla(i, pos).hoy)
  assert.equal(hoys.length, 1)
  assert.equal(hoys[0].etiqueta, pos.semana.etiqueta)
})

test('la traducción del índice del grupo coincide con la posición del niño', () => {
  const plan = planDe('2026-01-12')
  const hoy = '2026-02-04'
  const delGrupo = posicionDeIndice(semanaEnCurso(plan, hoy), plan.semanas.length)
  const delNino = posicionPlanNino(plan, hoy)
  assert.equal(delGrupo.estado, delNino.estado)
  assert.equal(delGrupo.indice, delNino.indice)
})

test('nivel ya terminado: grupo y niño coinciden en cerrado y en la última semana', () => {
  const plan = planDe('2026-01-12')
  const hoy = '2027-01-01' // muy pasado el cierre
  const delGrupo = posicionDeIndice(semanaEnCurso(plan, hoy), plan.semanas.length)
  const delNino = posicionPlanNino(plan, hoy)
  assert.deepEqual(delGrupo, { estado: 'cerrado', indice: plan.semanas.length - 1 })
  assert.equal(delNino.estado, 'cerrado')
  assert.equal(delNino.indice, delGrupo.indice)
  assert.equal(progresoPlan({ total: plan.semanas.length, ...delNino }).pct, 100)
})

test('niño con ancla futura: por iniciar, 0% y ninguna casilla marcada', () => {
  const plan = planDe('2026-06-01')
  const pos = posicionPlanNino(plan, '2026-05-01')
  assert.equal(pos.estado, 'por_iniciar')
  assert.equal(plan.semanas.some((_, i) => estadoCasilla(i, pos).hoy || estadoCasilla(i, pos).pasada), false)
  assert.equal(progresoPlan({ total: plan.semanas.length, ...pos, etiqueta: pos.semana.etiqueta }).pct, 0)
})
