import test from 'node:test'
import assert from 'node:assert/strict'
import { buildGrowthRoster } from '../lib/growth/roster.mjs'
import { buildOperationalGrowth, buildGrowthHistory } from '../lib/growth/source.mjs'
import { higieneDeDatos } from '../lib/higiene-datos.mjs'

const group = { id: 1, estado: 'activo', fecha_inicio_clases: null }
const student = { id: 1, grupo_id: 1, estado: 'activo', fecha_inscripcion: null, created_at: '2026-10-16' }
const rejoin = { id: 1, estudiante_id: 1, tipo: 'reincorporacion', fecha: '2026-09-19', year: 2026, month: 9, a_grupo_id: 1 }

test('reincorporación confirmada cuenta en padrón sin duplicar primeros inicios ni ventas', () => {
  const input = { today: '2026-10-17', students: [student], groups: [group], events: [rejoin] }
  assert.equal(buildGrowthRoster(input).undatedStudents.length, 0)
  const result = buildOperationalGrowth(input)
  assert.equal(result.currentChildren, 1)
  assert.equal(result.todayChildren, 1)
  assert.equal(result.currentMonthStarts, 0)
  assert.equal(result.currentMonthReincorporations, 0)
  assert.equal(result.undatedStarts, 0)
  const september = buildOperationalGrowth({ ...input, today: '2026-09-18' })
  assert.equal(september.todayChildren, 0)
  assert.equal(september.expectedMonthEndChildren, 1)
  assert.equal(september.currentMonthStarts, 0)
  assert.equal(september.currentMonthReincorporations, 1)
  assert.equal(september.currentMonthReincorporationsToDate, 0)
})

test('reservas de grupo pendiente no son alumnos sin fecha ni población operativa', () => {
  const input = { today: '2026-10-17', students: [{ ...student, created_at: '2026-07-01', fecha_inscripcion: '2026-09-19' }], groups: [{ ...group, inicio_pendiente: true }], events: [] }
  const roster = buildGrowthRoster(input)
  assert.equal(roster.pendingStudents.length, 1)
  assert.equal(roster.undatedStudents.length, 0)
  const result = buildOperationalGrowth(input)
  assert.equal(result.currentChildren, 0)
  assert.equal(result.pipelineTotalWithUndated, 0)
  assert.equal(result.currentMonthStarts, 0)
})

test('no inventa primera clase con inicio de nivel ni reincorporación sin fecha válida', () => {
  for (const fecha of [null, '2026-09-31']) {
    const input = { students: [{ ...student, fecha_inicio_nivel: '2026-10-01' }], groups: [group], events: [{ ...rejoin, fecha }] }
    assert.equal(buildGrowthRoster(input).undatedStudents.length, 1)
  }
  for (const estado of ['cerrado', 'fusionado']) {
    const roster = buildGrowthRoster({ students: [student], groups: [{ ...group, estado }], events: [rejoin] })
    assert.equal(roster.eligible.length, 0)
    assert.equal(roster.blockedStudents.length, 1)
  }
})

test('varios retornos acreditan una sola ficha con el último regreso y sin pipeline duplicado', () => {
  const result = buildOperationalGrowth({ today: '2026-10-17', students: [student], groups: [group], events: [rejoin, { ...rejoin, id: 2, fecha: '2026-11-01', month: 11 }] })
  assert.equal(result.todayChildren, 0)
  assert.equal(result.currentChildren, 0)
  assert.equal(result.nextMonthOperational.reincorporations, 1)
  assert.equal(result.nextMonthOperational.scheduledStarts, 0)
})

const history = (estado, fecha) => buildGrowthHistory({
  students: [{ ...student, estado: 'matricula_anulada' }],
  events: [{ ...rejoin, tipo: 'inscripcion', fecha: '2026-09-05', origen: 'clase_prueba' }, ...(fecha === undefined ? [] : [{ ...rejoin, id: 2, tipo: 'anulacion_matricula', fecha }])],
  summaries: [{ year: 2026, month: 9, cp_matriculados: 1 }],
  states: [{ year: 2026, month: 9, estado }],
  weekly: [{ year: 2026, month: 9, nuevos_ingresos_venta: 1 }],
})[0]

test('anulación de octubre no produce falsa falta de vínculo en un cierre de septiembre', () => {
  const row = history('cerrado', '2026-10-02')
  assert.equal(row.trialFunnel.reliable, true)
  assert.equal(row.trialFunnel.totalSales, 1)
  assert.deepEqual(row.issues, [])
  assert.equal(row.ventas, 1)
  for (const [estado, fecha] of [['abierto', '2026-10-02'], ['cerrado', '2026-09-30'], ['cerrado', undefined], ['cerrado', null]]) {
    const row = history(estado, fecha)
    assert.equal(row.trialFunnel.totalSales, 0)
    assert.equal(row.issues[0].code, 'cp_classification_incomplete')
  }
})

test('aperturas antiguas sin fecha son antecedentes consultables, no pendientes del cálculo', () => {
  const result = higieneDeDatos({ centroId: 5, gruposSinFecha: [{ id: 47, numero: '47' }], growth: { metrics: { confidence: { level: 'medium', months: 6, completeness: 1, pipelineCoverage: 1 }, issues: [] } } })
  assert.equal(result.hay, false)
  assert.equal(result.total, 0)
  assert.equal(result.antecedentes.length, 1)
  assert.deepEqual(result.antecedentes[0].items, ['#47'])
  assert.match(result.antecedentes[0].gananciaTexto, /No afecta/)
  assert.doesNotMatch(result.porQue, /no puede proyectar/)
})
