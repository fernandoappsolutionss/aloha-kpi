import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRevisionDatos, kpiHref } from '../lib/revision-datos.mjs'
import { buildGrowthHistory } from '../lib/growth/source.mjs'
import { higieneDeDatos } from '../lib/higiene-datos.mjs'

const input = () => ({
  today: '2026-11-04', center: { id: 2, nombre: 'Centro de prueba' },
  summaries: [{ year: 2026, month: 9, ninos_inicio_mes: 2, ninos_final_mes: 2 }, { year: 2026, month: 10, ninos_inicio_mes: 2, ninos_final_mes: 4 }],
  states: [{ year: 2026, month: 9, estado: 'cerrado' }],
  weekly: [{ year: 2026, month: 9, nuevos_ingresos_venta: 1 }],
  students: [{ id: 1, nombre: 'Alumno A', estado: 'activo', grupo_id: 10, fecha_inscripcion: '2026-09-01', created_at: '2026-08-01' },
    { id: 2, nombre: 'Alumno B', estado: 'matricula_anulada', grupo_id: 10, fecha_inscripcion: '2026-09-02', created_at: '2026-08-01' }],
  groups: [{ id: 10, numero: '15', estado: 'activo', fecha_inicio_clases: '2026-09-01' }],
  events: [{ id: 11, estudiante_id: 1, tipo: 'inscripcion', a_grupo_id: 10, origen: 'clase_prueba', fecha: '2026-09-01', year: 2026, month: 9 },
    { id: 12, estudiante_id: 2, tipo: 'inscripcion', a_grupo_id: 10, origen: 'directo', fecha: '2026-09-02', year: 2026, month: 9 },
    { id: 13, estudiante_id: 2, tipo: 'anulacion_matricula', fecha: '2026-10-02', year: 2026, month: 10 }],
})

test('la lista conserva ventas de un cierre anterior a la anulación y distingue diferencia de falta de clasificación', () => {
  const source = input()
  const before = structuredClone(source)
  const report = buildRevisionDatos(source, { problema: 'cp_classification_incomplete', periodo: '2026-09' })
  assert.equal(report.expected, 1)
  assert.equal(report.totalSales, 2)
  assert.equal(report.unknownSales, 0)
  assert.deepEqual(report.rows.map(row => row.nombre), ['Alumno A', 'Alumno B'])
  assert.equal(report.rows[0].href, '/centro/2/grupos?ficha=1&accion=editar')
  assert.equal(report.rows[1].anuladaDespues, true)
  assert.equal(report.rows[1].href, null)
  assert.equal(report.kpiHref, '/centro/2/kpi?year=2026&month=9&revision=ventas#kpi-ventas')
  const issue = buildGrowthHistory(source)[0].issues[0]
  assert.match(issue.message, /2 inscripciones identificadas frente a 1 ventas/)
  assert.equal(issue.unknownSales, 0)
  assert.deepEqual(source, before, 'la revisión no muta sus fuentes')
})

test('el origen faltante se señala en la ficha correcta y no se inventa una clasificación', () => {
  const source = input()
  source.events[0].origen = null
  const report = buildRevisionDatos(source, { problema: 'cp_classification_incomplete', periodo: '2026-09' })
  assert.equal(report.unknownSales, 1)
  assert.equal(report.rows[0].origen, 'Sin clasificar')
  assert.equal(report.rows[1].origen, 'Directa')
})

test('el saldo y el padrón mantienen sus bases, sin fabricar una lista de niños culpables', () => {
  const report = buildRevisionDatos(input(), { problema: 'population_mismatch' })
  assert.equal(report.population.expectedMonthEndChildren, 4)
  assert.equal(report.population.operationalMonthEndChildren, 1)
  assert.equal(report.population.difference, 3)
  assert.equal(report.base.periodo, '2026-10')
  assert.equal(report.roster.length, 1)
  assert.equal(report.blocked.length, 0)
  assert.equal(report.undated.length, 0)
  assert.equal(report.movements.length, 0)
})

test('enlaces conservan centro/periodo y cada niño sin inicio abre su itinerario', () => {
  const result = higieneDeDatos({ centroId: 8, alumnosSinInicio: [{ id: 15, nombre: 'Alumno C' }] })
  assert.equal(result.puntos.find(p => p.clave === 'alumnos-sin-inicio').enlaces[0].href, '/centro/8/grupos?ficha=15&accion=plan')
  assert.equal(kpiHref(8, '2026-13'), '/centro/8/kpi')
  const month = buildRevisionDatos(input(), { problema: 'cp_classification_incomplete' })
  assert.equal(month.periodo, '2026-09', 'sin periodo explícito abre la discrepancia real')
})

test('sin datos semanales no declara conciliado un cero y no usa un cierre no consecutivo como base', () => {
  const source = input()
  source.weekly = []
  assert.equal(buildRevisionDatos(source, { problema: 'cp_classification_incomplete', periodo: '2026-09' }).available, false)
  source.summaries = source.summaries.filter(row => row.month !== 10)
  assert.equal(buildRevisionDatos(source, { problema: 'population_mismatch' }).base, null)
})
