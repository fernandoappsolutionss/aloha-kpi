import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRepairPlan, buildOpenBalanceRepair } from '../scripts/repair-growth-david-2026-09-03.mjs'

const evidence = () => ({
  students: [198, 235, 305].map(id => ({ id, centro_id: 5, grupo_id: 33, estado: 'activo', itinerario: 'TINY', nivel: 5, fecha_inscripcion: '2026-07-01', fecha_inicio_nivel: null })),
  groups: [
    { id: 33, centro_id: 5, estado: 'fusionado', fusionado_en: 34, itinerario: 'TINY', itinerario_clases: null },
    { id: 34, centro_id: 5, estado: 'activo', itinerario: 'TINY', itinerario_clases: null, inscripcion_abierta: true },
  ],
  events: [198, 235, 305].map(id => ({ id, estudiante_id: id, centro_id: 5, tipo: 'inscripcion', fecha: '2026-06-01', a_grupo_id: 34 })),
})

test('restores only the three students whose original inscription already names the destination', () => {
  assert.deepEqual(buildRepairPlan(evidence()).pendingIds, [198, 235, 305])
})

test('an already restored group is an idempotent no-op', () => {
  const input = evidence()
  input.students.forEach(student => { student.grupo_id = 34 })
  assert.deepEqual(buildRepairPlan(input).pendingIds, [])
  assert.deepEqual(buildRepairPlan(input).alreadyAppliedIds, [198, 235, 305])
})

test('a changed student group, date, itinerary or destination aborts the whole proposal', () => {
  for (const edit of [
    input => { input.students[0].grupo_id = 41 },
    input => { input.students[0].fecha_inscripcion = '2026-08-01' },
    input => { input.students[0].itinerario = 'KIDS' },
    input => { input.students[0].fecha_inicio_nivel = '2026-09-01' },
    input => { input.groups[1].estado = 'cerrado' },
    input => { input.groups[1].centro_id = 2 },
    input => { input.events[0].a_grupo_id = 41 },
    input => { input.events.push({ id: 999, estudiante_id: 198, centro_id: 5, tipo: 'cambio_grupo', fecha: '2026-09-01', a_grupo_id: 33 }) },
  ]) {
    const input = evidence()
    edit(input)
    assert.throws(() => buildRepairPlan(input), /guardia/i)
  }
})

const monthlyEvidence = () => ({
  months: [
    { year: 2026, month: 4, ninos_final_mes: 173 },
    { year: 2026, month: 5, ninos_inicio_mes: 173, ninos_final_mes: 150, nuevos_activos_mes: 2 },
    { year: 2026, month: 6, ninos_inicio_mes: 163 },
  ],
  states: [{ year: 2026, month: 5, estado: 'abierto' }, { year: 2026, month: 6, estado: 'cerrado' }],
  withdrawals: 12,
  reincorporations: 0,
})

test('the open May balance can be restored from declared movements without closing the month', () => {
  const result = buildOpenBalanceRepair(monthlyEvidence())
  assert.equal(result.before, 150)
  assert.equal(result.after, 163)
  assert.equal(result.pending, true)
  const applied = monthlyEvidence()
  applied.months[1].ninos_final_mes = 163
  assert.equal(buildOpenBalanceRepair(applied).pending, false)
})

test('open balance repair fails closed when any corroborating total or month state changes', () => {
  for (const edit of [
    input => { input.months[0].ninos_final_mes = 172 },
    input => { input.months[1].ninos_inicio_mes = 172 },
    input => { input.months[1].nuevos_activos_mes = 3 },
    input => { input.months[1].ninos_final_mes = 155 },
    input => { input.months[2].ninos_inicio_mes = 162 },
    input => { input.states[0].estado = 'cerrado' },
    input => { input.states[1].estado = 'abierto' },
    input => { input.withdrawals = 13 },
    input => { input.reincorporations = 1 },
  ]) {
    const input = monthlyEvidence()
    edit(input)
    assert.throws(() => buildOpenBalanceRepair(input), /guardia/i)
  }
})
