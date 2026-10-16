import test from 'node:test'
import assert from 'node:assert/strict'
import { poblacionDesdeRegistros } from '../lib/estadisticas-semana/calculo.mjs'
import { calcularSemanaCentro, completarSerieCentro } from '../lib/estadisticas-semana/servicio.js'
import { crmAccountForCentro } from '../lib/crm.js'
import { revelarDestino } from '../lib/revelar-destino.mjs'

const grupos = [{ id: 1, estado: 'activo', fecha_inicio_clases: '2026-08-01' }]
const estudiantes = [1, 2, 3].map(id => ({ id, grupo_id: 1, estado: 'activo', fecha_inscripcion: ['2026-09-30', '2026-10-02', '2026-10-20'][id - 1] }))
const eventos = estudiantes.map(e => ({ id: e.id, estudiante_id: e.id, tipo: 'inscripcion', a_grupo_id: 1,
  fecha: e.fecha_inscripcion, year: 2026, month: Number(e.fecha_inscripcion.slice(5, 7)), origen: 'venta' }))
const resumenes = [{ year: 2026, month: 8, ninos_final_mes: 78 }]
const now = new Date('2026-10-15T16:00:00Z')
const datos = { grupos, estudiantes, eventos, resumenes, corte: '2026-10-15' }

test('recupera mes sin resumen con movimientos fechados y excluye futuros', () => {
  const r = poblacionDesdeRegistros(datos)
  assert.equal(r.valor, 80)
  assert.equal(r.detalle.basePeriodo, '2026-08')
  assert.deepEqual(r.detalle.mesesReconstruidos, ['2026-09'])
  assert.equal(r.detalle.provisional, true)
  assert.equal(poblacionDesdeRegistros({ ...datos, corte: '2026-10-01' }).valor, 79)
})

test('un resumen registrado posterior es el ancla y no se vuelve a sumar septiembre', () => {
  const r = poblacionDesdeRegistros({ ...datos, resumenes: [...resumenes, { year: 2026, month: 9, ninos_final_mes: 95 }] })
  assert.equal(r.valor, 96)
  assert.deepEqual(r.detalle.mesesReconstruidos, [])
})

test('sin saldo anterior no inventa cero ni usa resúmenes futuros', () => {
  assert.equal(poblacionDesdeRegistros({ ...datos, resumenes: [] }).valor, null)
  assert.equal(poblacionDesdeRegistros({ ...datos, resumenes: [{ year: 2026, month: 11, ninos_final_mes: 200 }] }).valor, null)
  assert.equal(poblacionDesdeRegistros({ ...datos, resumenes: [{ year: 2026, month: 9, ninos_final_mes: 0 }] }).valor, 1)
})

test('reconstrucción atraviesa diciembre sin perder el mes de enero', () => {
  const r = poblacionDesdeRegistros({ resumenes: [{ year: 2025, month: 11, ninos_final_mes: 50 }], corte: '2026-01-15' })
  assert.equal(r.valor, 50)
  assert.deepEqual(r.detalle.mesesReconstruidos, ['2025-12'])
})

function fuente({ fallo = false } = {}) {
  const llamadas = []
  const query = async (strings, ...values) => {
    const sql = strings.join('?'); llamadas.push(sql)
    assert.doesNotMatch(sql, /INSERT|UPDATE|DELETE/)
    if (sql.includes('FROM centros')) return [{ id: 10, nombre: 'Demo', pais: 'VE' }]
    if (sql.includes('FROM estudiantes')) return estudiantes
    if (sql.includes('FROM grupos')) return grupos
    if (sql.includes('FROM estudiante_eventos')) return eventos
    if (sql.includes('SELECT ninos_final_mes FROM resumen_mes')) return []
    if (sql.includes('FROM resumen_mes')) return resumenes
    if (sql.includes('FROM cobranza_diaria')) {
      if (fallo) throw new Error('Fuente temporalmente indisponible')
      return [{ fecha: '2026-10-15', vencidas: 23 }]
    }
    return []
  }
  return { query, llamadas }
}

test('lectura completa cifras nulas, actualiza semana abierta y conserva cada cierre numérico', async () => {
  const { query, llamadas } = fuente()
  const filas = [
    { codigo: 'ninos_activos', semana_fin: '2026-10-01', valor: 0, estado: 'cerrada' },
    { codigo: 'ninos_activos', semana_fin: '2026-10-08', valor: null, estado: 'cerrada' },
    { codigo: 'ninos_activos', semana_fin: '2026-10-15', valor: 99, estado: 'abierta' },
    { codigo: 'cp_asistidas', semana_fin: '2026-10-08', valor: 4, estado: 'cerrada' },
  ]
  const original = structuredClone(filas)
  const result = await completarSerieCentro(10, ['2026-10-01', '2026-10-08', '2026-10-15'], filas, { query, now })
  const ninos = result.filas.filter(f => f.codigo === 'ninos_activos')
  assert.deepEqual(ninos.map(f => f.valor), [0, 80, 80])
  assert.equal(ninos[1].detalle.reconstruida, true)
  assert.equal(result.filas.find(f => f.codigo === 'cp_asistidas' && f.estado === 'cerrada').valor, 4)
  assert.deepEqual(filas, original)
  assert.equal(llamadas.filter(s => s.includes('FROM estudiantes')).length, 1)
  assert.equal(llamadas.filter(s => s.includes('FROM grupos')).length, 1)
})

test('el resumen del mes usa el calendario, no semanas que cruzan septiembre', async () => {
  const { query } = fuente()
  const result = await completarSerieCentro(10, ['2026-10-01', '2026-10-08', '2026-10-15'], [], { query, now })
  assert.equal(result.resultadosMes.nuevos_inscritos.valor, 1)
  assert.equal(result.resultadosMes.ninos_activos.valor, 80)
  assert.equal(result.filas.find(f => f.codigo === 'nuevos_inscritos').valor, 0)
  assert.equal(result.resultadosMes.facturas_vencidas.valor, 23)
})

test('un cierre sin fecha confirmada conserva su rango y no se rellena como un hueco', async () => {
  const { query } = fuente()
  const pendiente = { codigo: 'ninos_activos', semana_fin: '2026-10-01', valor: null, estado: 'cerrada',
    detalle: { conciliacionPendiente: { referencia: 'revision-documental' }, rango: { minimo: 78, maximo: 79 } } }
  const result = await completarSerieCentro(10, ['2026-10-01', '2026-10-08', '2026-10-15'], [pendiente], { query, now })
  assert.deepEqual(result.filas.find(f => f.semana_fin === '2026-10-01'), pendiente)
  assert.equal(result.filas.find(f => f.semana_fin === '2026-10-08' && f.codigo === 'ninos_activos').valor, 80)
  assert.equal(result.filas.find(f => f.semana_fin === '2026-10-15' && f.codigo === 'ninos_activos').valor, 80)
})

test('la falta de Zoho no borra población ni transforma un fallo en cero', async () => {
  const { query } = fuente({ fallo: true })
  const r = await calcularSemanaCentro(10, '2026-10-15', { query, now })
  assert.equal(r.ninos_activos.valor, 80)
  assert.equal(r.facturas_vencidas.valor, null)
  assert.match(r.facturas_vencidas.detalle.error, /indisponible/)
})

test('mes en el último viernes mantiene octubre aunque el próximo cierre sea noviembre', async () => {
  const { query } = fuente()
  const r = await calcularSemanaCentro(10, '2026-11-05', { query, now: new Date('2026-10-30T16:00:00Z'), mensual: true })
  assert.equal(r.nuevos_inscritos.valor, 2)
  assert.equal(r.ninos_activos.valor, 81)
})

test('mes y semana comparten una sola lectura CRM y respetan clases realizadas', async () => {
  const base = fuente()
  const fechas = ['2026-09-30', '2026-10-02', '2026-10-15', '2026-10-21']
  const clases = fechas.map((fecha, i) => ({ id: String(i + 1), account_id: crmAccountForCentro(10), start_date: `${fecha}T12:00:00Z`,
    status: 'published', stats: { total: 5, attended: 5, not_attended: 0, pending: 0, paid: 0, won: 0, total_revenue: 0 } }))
  let lecturas = 0
  const query = async (parts, ...values) => parts.join('?').includes('FROM centro_eventos') ? clases : base.query(parts, ...values)
  const crm = async () => { lecturas++; return { events: clases } }
  const r = await completarSerieCentro(10, ['2026-10-08', '2026-10-15'], [], { query, crm, now })
  assert.equal(lecturas, 1)
  assert.equal(r.resultadosMes.cp_asistidas.valor, 10)
  assert.equal(r.filas.find(f => f.codigo === 'cp_asistidas').valor, 5)
})

test('revelar destino abre todos los desplegables ancestros sin exigir que exista', () => {
  const exterior = { tagName: 'DETAILS', open: false }
  const interior = { tagName: 'DETAILS', open: false, parentElement: exterior }
  revelarDestino({ parentElement: interior })
  assert.equal(exterior.open, true)
  assert.equal(interior.open, true)
  assert.doesNotThrow(() => revelarDestino(null))
})
