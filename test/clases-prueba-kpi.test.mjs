import test from 'node:test'
import assert from 'node:assert/strict'
import { fuenteKpiAutomatica, aplicarAjustes, crearAjustes } from '../lib/kpi-auto.mjs'
import { cargarFuenteKpi } from '../lib/kpi-auto-server.js'
import { filtrarClasesPorMes, mesAnterior, mesClase, resumirClases, filtrarClasesPorMomento } from '../lib/clases-prueba.mjs'

const now = new Date('2026-09-07T14:00:00Z')
const account = 'c0c81438-bb54-4ae0-a019-b54e0bfcf870'
const clase = (id, start_date, total, attended, timezone = 'America/Panama') => ({
  id, account_id: account, start_date, timezone, status: 'completed',
  stats: { total, attended, not_attended: total - attended, pending: 0, paid: 0, total_revenue: 0 },
})
const clases = [
  clase('agosto', '2026-08-31T23:00:00Z', 23, 15),
  clase('septiembre', '2026-09-03T23:30:00Z', 28, 10),
  clase('futuras', '2026-09-24T23:30:00Z', 34, 0),
]

test('Anclas: KPI cuenta 28 invitados y 10 asistentes, excluyendo 34 registros futuros', () => {
  const source = fuenteKpiAutomatica({ year: 2026, month: 9, now, clases })
  assert.equal(source.cp_invitados, 28)
  assert.equal(source.cp_asistieron, 10)
})

test('un ajuste antiguo no infla la fuente viva, ni convierte un cero real en asistencia', () => {
  for (const events of [clases, []]) {
    const source = fuenteKpiAutomatica({ year: 2026, month: 9, now, clases: events })
    const data = aplicarAjustes(source, { ...crearAjustes({}, source), cp_invitados: 100, cp_asistieron: 15 })
    assert.equal(data.cp_invitados, events.length ? 28 : 0)
    assert.equal(data.cp_asistieron, events.length ? 10 : 0)
  }
})

test('la fuente usa fecha y totales vivos, limita al centro y no consulta el lote que excluye cancelados', async () => {
  const query = async strings => {
    if (strings.join('').includes('FROM centro_eventos')) return [{ id: 'septiembre', start_date: '2026-08-01T23:30:00Z' }]
    return []
  }
  const crm = async action => action === 'list_events'
    ? { events: [clases[1], clase('otro-centro', '2026-09-01T23:30:00Z', 999, 999)] }
    : { error: 'El lote omite cancelados y no es la fuente del tablero' }
  const result = await cargarFuenteKpi(2, 2026, 9, { query, crm, now })
  assert.equal(result.complete, true, result.error)
  assert.equal(result.source.cp_invitados, 28)
  assert.equal(result.source.cp_asistieron, 10)
})

test('una clase con estadísticas o fecha inválidas falla sin inventar ceros', () => {
  for (const event of [
    { ...clases[1], stats: undefined },
    { ...clases[1], start_date: 'fecha rota' },
    { ...clases[1], stats: { ...clases[1].stats, attended: 100 } },
  ]) assert.throws(() => fuenteKpiAutomatica({ year: 2026, month: 9, now, clases: [event] }))
})

test('mes pasado y mes elegido filtran clases y tarjetas sin mezclar otros meses', () => {
  const prev = mesAnterior('2026-09')
  assert.equal(prev, '2026-08')
  assert.equal(mesAnterior('2026-01'), '2025-12')
  const selected = filtrarClasesPorMes(clases, prev)
  assert.deepEqual(selected.map(e => e.id), ['agosto'])
  assert.equal(resumirClases(selected).total, 23)
  assert.equal(resumirClases(selected).attended, 15)
  assert.equal(resumirClases(filtrarClasesPorMes(clases, '2026-07')).total, 0)
  assert.equal(resumirClases(filtrarClasesPorMes(clases, 'todos')).total, 85)
})

test('el limite mensual respeta Panamá y Caracas aunque UTC ya sea otro mes', () => {
  const boundary = '2026-09-01T04:30:00Z'
  assert.equal(mesClase(boundary, 'America/Panama'), '2026-08')
  assert.equal(mesClase(boundary, 'America/Caracas'), '2026-09')
  const source = fuenteKpiAutomatica({ year: 2026, month: 9, now, clases: [
    clase('panama', boundary, 20, 10),
    clase('caracas', boundary, 3, 2, 'America/Caracas'),
  ] })
  assert.equal(source.cp_invitados, 3)
  assert.equal(source.cp_asistieron, 2)
})

test('CRM caído conserva el fallo explícito; una cuenta ajena nunca aporta totales', async () => {
  const query = async strings => strings.join('').includes('FROM centro_eventos') ? [{id:'septiembre'}] : []
  for (const response of [{error:'CRM no disponible'}, {events:[{...clases[1],account_id:'ajena'}]}, {events:[clases[1],clases[1]]}]) {
    const result = await cargarFuenteKpi(2,2026,9,{query,crm:async()=>response})
    assert.equal(result.complete,false)
    assert.equal(result.source,undefined)
  }
})


test('Calle 50: 5 + 6 = 11 invitados; los 2 del 10 de septiembre aún no cuentan', () => {
  const events = [
    clase('184', '2026-09-03T19:45:00-05:00', 5, 3),
    clase('185', '2026-09-05T17:15:00-05:00', 6, 3),
    clase('186', '2026-09-10T19:23:00-05:00', 2, 0),
  ]
  const source = fuenteKpiAutomatica({ year: 2026, month: 9, now, clases: events })
  assert.equal(source.cp_invitados, 11)
  assert.equal(source.cp_asistieron, 6)
  assert.equal(resumirClases(filtrarClasesPorMomento(events, 'realizadas', now)).total, 11)
  assert.equal(resumirClases(filtrarClasesPorMomento(events, 'proximas', now)).total, 2)
  assert.equal(resumirClases(filtrarClasesPorMomento(events, 'todas', now)).total, 13)
})

test('una clase publicada entra al comenzar, pero borradores y clases canceladas no entran al KPI', () => {
  const events = [
    {...clase('iniciando', now.toISOString(), 5, 2), status: 'published'},
    {...clase('cancelada', '2026-09-03T18:00:00-05:00', 30, 0), status: 'cancelled'},
    {...clase('borrador', '2026-09-02T18:00:00-05:00', 20, 0), status: 'draft'},
  ]
  assert.equal(fuenteKpiAutomatica({year:2026, month:9, now, clases:events}).cp_invitados, 5)
  assert.equal(fuenteKpiAutomatica({year:2026, month:9, now:new Date(now.getTime()-1), clases:events}).cp_invitados, 0)
})
