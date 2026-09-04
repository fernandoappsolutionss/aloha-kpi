import test from 'node:test'
import assert from 'node:assert/strict'
import { buildGrowthPayload } from '../lib/growth/engine.mjs'
import * as engine from '../lib/growth/engine.mjs'

const input = () => ({
  today: '2026-09-03', center: { id: 5, nombre: 'Centro de prueba' },
  metas: { meta_nuevos_ingresos_mes: 20, cp_conversion: 50, cupo_max_grupo: 15 },
  summaries: Array.from({ length: 6 }, (_, index) => ({
    year: 2026, month: index + 3, ninos_inicio_mes: 100, ninos_final_mes: 100,
    nuevos_activos_mes: 10, grupos_activos: 10, cp_invitados: 40,
    cp_asistieron: 20, cp_matriculados: 8, mot_graduado: 2,
    mot_tecnica: 1, mot_perdida_clase: 1, mot_horario: 2, mot_economico: 4,
    orig_referido: 2, orig_centro: 2, orig_marketing: 6, orig_activaciones: 0, orig_medios: 0,
  })),
  states: Array.from({ length: 6 }, (_, index) => ({ year: 2026, month: index + 3, estado: 'cerrado' })),
  weekly: Array.from({ length: 6 }, (_, index) => ({ year: 2026, month: index + 3, ventas: 10, retiros: 10 })),
  reincorporations: [], events: [], salons: [{ id: 1, activo: true }],
  groups: [
    { id: 1, estado: 'activo', fecha_inicio_clases: '2026-01-01' },
    { id: 2, estado: 'llenado', fecha_inicio_clases: '2026-09-15' },
  ],
  students: Array.from({ length: 108 }, (_, index) => ({
    id: index + 1, estado: 'activo', grupo_id: index < 100 ? 1 : 2,
    fecha_inscripcion: index < 100 ? '2026-01-01' : '2026-09-01',
    created_at: index < 100 ? '2026-01-01' : '2026-09-01',
  })),
})

test('separa la población iniciada hoy del cierre previsto y de los inicios pendientes', () => {
  const payload = buildGrowthPayload(input())
  assert.equal(payload.population.todayChildren, 100)
  assert.equal(payload.population.expectedMonthEndChildren, 108)
  assert.equal(payload.operational.remainingMonthStarts, 8)
  assert.equal(payload.projection.currentChildren, 108)
  assert.equal(payload.projection.requirements.commercial.monthlySalesTarget, 20)
  assert.equal(payload.metrics.monthsUsed, 6)
})

test('una diferencia de padrón bloquea la fecha aunque las columnas históricas estén completas', () => {
  const value = input()
  value.groups.push({ id: 3, estado: 'fusionado', fecha_inicio_clases: '2026-01-01' })
  value.students[0].grupo_id = 3
  const payload = buildGrowthPayload(value)
  assert.equal(payload.metrics.confidence.level, 'low')
  assert.ok(payload.metrics.issues.some(item => item.code === 'population_mismatch'))
  assert.equal(payload.projection.scenarios.action.targetMonth, null)
})

test('un retiro programado vencido afecta el cierre previsto y no borra el alumno activo de hoy', () => {
  const value = input()
  value.students[0].retiro_programado = true
  value.students[0].retiro_programado_para = '2026-09-01'
  const payload = buildGrowthPayload(value)
  assert.equal(payload.population.todayChildren, 100)
  assert.equal(payload.population.expectedMonthEndChildren, 107)
  assert.equal(payload.population.operationalMonthEndChildren, 107)
  assert.equal(payload.population.difference, 0)
})

test('descartar todas las acciones elimina su mejora del escenario sin sumar alumnos reales', () => {
  const initial = buildGrowthPayload(input())
  const recommendationStates = initial.recommendations.map(item => ({
    kind: item.kind, status: 'dismissed', generated_for: '2026-08-31',
  }))
  const result = buildGrowthPayload(input(), { recommendationStates })
  assert.ok(result.recommendations.every(item => item.status === 'dismissed'))
  assert.deepEqual(result.projection.scenarios.action.series, result.projection.scenarios.base.series)
  assert.equal(result.population.todayChildren, initial.population.todayChildren)
})

test('un recordatorio vencido vuelve a pendiente pero respeta una acción pospuesta vigente', () => {
  const initial = buildGrowthPayload(input())
  const [first, second] = initial.recommendations
  const result = buildGrowthPayload(input(), { recommendationStates: [
    { kind: first.kind, status: 'postponed', generated_for: '2026-08-31', due_date: '2026-09-02' },
    { kind: second.kind, status: 'postponed', generated_for: '2026-08-24', due_date: '2026-09-08' },
  ] })
  assert.equal(result.recommendations.find(item => item.kind === first.kind).status, 'pending')
  assert.equal(result.recommendations.find(item => item.kind === second.kind).status, 'postponed')
})

test('una decisión guardada se confirma aunque falle el recálculo posterior', async () => {
  assert.equal(typeof engine.refreshAfterRecommendationUpdate, 'function')
  const updated = { id: 1, status: 'completed' }
  const result = await engine.refreshAfterRecommendationUpdate(updated, async () => { throw new Error('database unavailable') })
  assert.equal(result.status, 'completed')
  assert.equal(result.growth, null)
  assert.match(result.refreshError, /guardó/)
})
