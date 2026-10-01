import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ESTADISTICAS_CENTRO, estadistica } from '../lib/estadisticas-semana/catalogo.mjs'
import { poblacionAlCorte, ventasSemana, retirosSemana, cobranzaAlCorte, cpAsistidasSemana } from '../lib/estadisticas-semana/calculo.mjs'

const grupos = [{ id: 10, estado: 'activo', fecha_inicio_clases: '2026-08-01', itinerario_clases: null }]
const estudiantes = [
  { id: 1, grupo_id: 10, estado: 'activo', fecha_inscripcion: '2026-09-02' },
  { id: 2, grupo_id: 10, estado: 'activo', fecha_inscripcion: '2026-09-24' },
  { id: 3, grupo_id: 10, estado: 'retirado', fecha_inscripcion: '2026-09-03' },
]
const eventos = [
  { id: 1, estudiante_id: 1, tipo: 'inscripcion', fecha: '2026-09-02', year: 2026, month: 9, origen: 'venta', a_grupo_id: 10 },
  { id: 2, estudiante_id: 2, tipo: 'inscripcion', fecha: '2026-09-24', year: 2026, month: 9, origen: 'venta', a_grupo_id: 10 },
  { id: 3, estudiante_id: 3, tipo: 'inscripcion', fecha: '2026-09-03', year: 2026, month: 9, origen: 'traslado', a_grupo_id: 10 },
  { id: 4, estudiante_id: 3, tipo: 'retiro', fecha: '2026-09-23', year: 2026, month: 9, motivo: 'ECONOMICO' },
]

test('catálogo fijo de cinco estadísticas', () => {
  assert.deepEqual(ESTADISTICAS_CENTRO.map((e) => e.codigo), ['ninos_activos', 'nuevos_inscritos', 'retiros', 'facturas_vencidas', 'cp_asistidas'])
  assert.equal(estadistica('retiros').inversa, true)
  assert.throws(() => estadistica('otro'), /desconocida/)
})

test('población al corte reutiliza inicios y retiros del balance mensual', () => {
  const r = poblacionAlCorte({ inicioMes: 100, estudiantes, grupos, eventos, corte: '2026-09-24' })
  assert.deepEqual(r, { valor: 102, detalle: { inicioMes: 100, nuevos: 3, reincorporados: 0, retirados: 1 } })
  assert.equal(poblacionAlCorte({ inicioMes: 100, estudiantes, grupos, eventos, corte: '2026-09-17' }).valor, 102)
  assert.equal(poblacionAlCorte({ inicioMes: null, estudiantes, grupos, eventos, corte: '2026-09-24' }).valor, null)
})

test('reincorporación suma y retiro sin fecha cae al fin de mes', () => {
  const extra = [
    { id: 5, estudiante_id: 1, tipo: 'reincorporacion', fecha: '2026-09-22', year: 2026, month: 9 },
    { id: 6, estudiante_id: 2, tipo: 'retiro', fecha: null, year: 2026, month: 9, motivo: 'ECONOMICO' },
  ]
  assert.equal(poblacionAlCorte({ inicioMes: 100, estudiantes, grupos, eventos: [...eventos, ...extra], corte: '2026-09-24' }).valor, 103)
  assert.equal(poblacionAlCorte({ inicioMes: 100, estudiantes, grupos, eventos: [...eventos, ...extra], corte: '2026-09-30' }).valor, 102)
  assert.equal(retirosSemana({ estudiantes, grupos, eventos: [...eventos, ...extra], desde: '2026-09-18', hasta: '2026-09-24' }).valor, 1)
  assert.equal(retirosSemana({ estudiantes, grupos, eventos: [...eventos, ...extra], desde: '2026-09-25', hasta: '2026-10-01' }).valor, 1)
})

test('ventas canónicas excluyen traslado y matrícula anulada', () => {
  assert.equal(ventasSemana({ estudiantes, eventos, desde: '2026-09-18', hasta: '2026-09-24' }).valor, 1)
  assert.equal(ventasSemana({ estudiantes, eventos, desde: '2026-08-28', hasta: '2026-09-03' }).valor, 1)
  const anulados = estudiantes.map((e) => e.id === 1 ? { ...e, estado: 'matricula_anulada' } : e)
  assert.equal(ventasSemana({ estudiantes: anulados, eventos, desde: '2026-08-28', hasta: '2026-09-03' }).valor, 0)
})

test('retiros semanales excluyen graduados', () => {
  const graduado = { id: 5, estudiante_id: 1, tipo: 'retiro', fecha: '2026-09-22', year: 2026, month: 9, motivo: 'GRADUADO' }
  assert.equal(retirosSemana({ estudiantes, grupos, eventos: [...eventos, graduado], desde: '2026-09-18', hasta: '2026-09-24' }).valor, 1)
})

test('cobranza usa último dato no futuro; sin datos conserva null', () => {
  const diaria = [{ fecha: '2026-09-23', vencidas: 7 }, { fecha: '2026-09-24', vencidas: 5 }]
  assert.equal(cobranzaAlCorte({ diaria, desde: '2026-09-18', hasta: '2026-09-24', hoy: '2026-09-30' }).valor, 5)
  assert.equal(cobranzaAlCorte({ diaria, desde: '2026-09-18', hasta: '2026-09-24', hoy: '2026-09-23' }).valor, 7)
  assert.equal(cobranzaAlCorte({ diaria: [], filasKpi: [], desde: '2026-09-18', hasta: '2026-09-24', hoy: '2026-09-30' }).valor, null)
})

test('clases realizadas se cortan por fecha civil del centro', () => {
  const stats = (attended) => ({ total: attended, attended, not_attended: 0, pending: 0, paid: 0, won: 0, total_revenue: 0 })
  const clases = [
    { start_date: '2026-09-20T15:00:00Z', status: 'completed', stats: stats(3) },
    { start_date: '2026-09-25T02:00:00Z', status: 'completed', stats: stats(2) },
  ]
  assert.equal(cpAsistidasSemana({ clases, desde: '2026-09-18', hasta: '2026-09-24', timeZone: 'America/Panama', now: new Date('2026-09-30T12:00:00Z') }).valor, 5)
})

test('fechas civiles rotas no producen cifras semanales aparentes', () => {
  const ventaRota = { id: 20, estudiante_id: 4, tipo: 'inscripcion', fecha: '2026-09-31', year: 2026, month: 9, origen: 'venta', a_grupo_id: 10 }
  assert.throws(() => ventasSemana({ estudiantes: [{ id: 4, estado: 'activo' }], eventos: [ventaRota], desde: '2026-09-25', hasta: '2026-10-01' }), /Fecha inválida/)
  const retiroRoto = { id: 21, estudiante_id: 1, tipo: 'retiro', fecha: '2026-09-31', year: 2026, month: 9, motivo: 'ECONOMICO' }
  assert.throws(() => retirosSemana({ estudiantes, grupos, eventos: [...eventos, retiroRoto], desde: '2026-09-25', hasta: '2026-10-01' }), /Fecha inválida/)
})
