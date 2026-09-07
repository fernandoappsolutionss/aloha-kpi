import test from 'node:test'
import assert from 'node:assert/strict'

import { estadoCasilla, progresoPlan } from '../lib/plan-nino-vista.mjs'
import { planNino, posicionPlanNino } from '../lib/plan-nino.mjs'
import { semanaEnCurso } from '../lib/itinerario.js'

// Lunes 2026-01-12, clases lunes(1) y miércoles(3): el mismo calendario que
// usan los tests del motor (test/plan-nino.test.mjs).
const CAL = [{ vigente_desde: null, dias: [1, 3] }]
const planDe = (ancla, nivel = 1) => planNino({ ancla, nivel, pais: 'PA', calendarioVersionado: CAL })

// ── El aula usa el mismo motor que el niño ──────────────────────────────────
// Antes el grupo entraba por el índice de semanaEnCurso, que devuelve "la
// primera semana que todavía no pasó": en un grupo que aún no arranca eso es la
// semana 1, y el aula la marcaba como la de HOY. El niño nunca tuvo el fallo
// porque posicionPlanNino compara contra la primera fecha.

test('grupo que aún no arranca: por_iniciar, sin casilla de hoy y 0%', () => {
  const plan = planDe('2026-09-26')
  const pos = posicionPlanNino(plan, '2026-09-06') // 20 días antes de la primera clase
  assert.equal(pos.estado, 'por_iniciar')
  assert.equal(plan.semanas.some((_, i) => estadoCasilla(i, pos).hoy), false)
  const barra = progresoPlan({ total: plan.semanas.length, ...pos, etiqueta: plan.semanas[0].etiqueta })
  assert.equal(barra.pct, 0)
  assert.equal(barra.hechas, 0)
  assert.match(barra.texto, /Aún no arranca/)
})

test('el índice crudo de semanaEnCurso apuntaría a la semana 1: por eso no se usa', () => {
  const plan = planDe('2026-09-26')
  assert.equal(semanaEnCurso(plan, '2026-09-06'), 0) // "la primera que no ha pasado"
  assert.equal(posicionPlanNino(plan, '2026-09-06').estado, 'por_iniciar')
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

test('nivel ya terminado: cerrado, última semana y 100%', () => {
  const plan = planDe('2026-01-12')
  const pos = posicionPlanNino(plan, '2027-01-01') // muy pasado el cierre
  assert.equal(pos.estado, 'cerrado')
  assert.equal(pos.indice, plan.semanas.length - 1)
  assert.equal(progresoPlan({ total: plan.semanas.length, ...pos }).pct, 100)
})

test('niño con ancla futura: por iniciar, 0% y ninguna casilla marcada', () => {
  const plan = planDe('2026-06-01')
  const pos = posicionPlanNino(plan, '2026-05-01')
  assert.equal(pos.estado, 'por_iniciar')
  assert.equal(plan.semanas.some((_, i) => estadoCasilla(i, pos).hoy || estadoCasilla(i, pos).pasada), false)
  assert.equal(progresoPlan({ total: plan.semanas.length, ...pos, etiqueta: pos.semana.etiqueta }).pct, 0)
})
