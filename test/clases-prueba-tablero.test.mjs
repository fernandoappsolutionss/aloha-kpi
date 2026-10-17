import test from 'node:test'
import assert from 'node:assert/strict'
import { resumenCpSemana, cpAsistidasSemana } from '../lib/estadisticas-semana/calculo.mjs'
import { cargarClasesPruebaTablero } from '../lib/estadisticas-semana/clases-prueba-tablero.js'
import { resumenClasesPrueba } from '../lib/estadisticas-semana/resumen-clases-prueba.mjs'
import { crmAccountForCentro } from '../lib/crm.js'

const now = new Date('2026-10-17T18:00:00Z')
const rango = { desde: '2026-10-16', hasta: '2026-10-22', now }
const clase = (id, total, attended, overrides = {}) => ({ id, account_id: crmAccountForCentro(1),
  start_date: '2026-10-17T16:00:00Z', status: 'completed',
  stats: { total, attended, not_attended: total - attended, pending: 0, paid: 0, won: 0, total_revenue: 0 }, ...overrides })

test('invitados y asistentes usan las mismas clases y porcentaje ponderado por personas', () => {
  const clases = [clase('a', 10, 5), clase('b', 30, 25),
    clase('futura', 100, 0, { start_date: '2026-10-20T16:00:00Z', status: 'published' }),
    clase('pasada', 100, 100, { start_date: '2026-10-15T16:00:00Z' }),
    clase('cancelada', 100, 100, { status: 'cancelled' }), clase('borrador', 100, 100, { status: 'draft' })]
  assert.deepEqual(resumenCpSemana({ ...rango, clases }), { invitados: 40, asistentes: 30, porcentaje: 75, clases: 2 })
  assert.equal(cpAsistidasSemana({ ...rango, clases }).valor, 30)
})

test('cero invitados no inventa 0% y cero asistentes con invitados sí vale 0%', () => {
  assert.deepEqual(resumenCpSemana(rango), { invitados: 0, asistentes: 0, porcentaje: null, clases: 0 })
  assert.equal(resumenCpSemana({ ...rango, clases: [clase('a', 5, 0)] }).porcentaje, 0)
})

test('la semana respeta el cierre local de Panamá y Caracas', () => {
  const datos = { ...rango, clases: [clase('limite', 2, 1, { start_date: '2026-10-16T04:30:00Z' })] }
  assert.equal(resumenCpSemana({ ...datos, timeZone: 'America/Panama' }).invitados, 0)
  assert.equal(resumenCpSemana({ ...datos, timeZone: 'America/Caracas' }).invitados, 2)
})

test('totales CRM incompletos no se convierten en ceros o porcentajes aparentes', () => {
  assert.throws(() => resumenCpSemana({ ...rango, clases: [clase('a', 2, 3)] }), /verificar los totales/)
  assert.throws(() => resumenCpSemana({ ...rango, clases: [clase('a', 2, 1, { stats: null })] }), /verificar los totales/)
})

const periodos = { 1: { semanaAbierta: '2026-10-22' }, 2: { semanaAbierta: '2026-10-22' } }
test('el tablero restringe eventos al centro y comparte la lectura de la cuenta sin mezclar cifras', async () => {
  const eventos = [clase('a', 10, 5), clase('b', 8, 6), clase('ajena', 99, 99)]
  const consultados = []; let llamadas = 0
  const query = async (strings, id) => { assert.match(strings.join('?'), /WHERE centro_id = \?/); consultados.push(id); return [{ id: id === 1 ? 'a' : 'b' }] }
  const crm = async () => { llamadas++; return { events: eventos } }
  const datos = await cargarClasesPruebaTablero([{ id: 1, pais: 'PA' }, { id: 2, pais: 'PA' }], periodos, { query, crm, now })
  assert.equal(datos[1].actual.invitados, 10); assert.equal(datos[1].actual.asistentes, 5); assert.equal(datos[1].actual.porcentaje, 50)
  assert.equal(datos[2].actual.invitados, 8); assert.equal(datos[2].actual.asistentes, 6); assert.equal(datos[2].actual.porcentaje, 75)
  assert.deepEqual(consultados.sort(), [1, 2]); assert.equal(llamadas, 1)
})

test('un centro sin clases tiene cero, un fallo conserva ausencia y otro centro puede seguir visible', async () => {
  const query = async (strings, id) => id === 1 ? [] : [{ id: 'b' }]
  const crm = async () => ({ error: 'fallo' })
  const datos = await cargarClasesPruebaTablero([{ id: 1, pais: 'PA' }, { id: 2, pais: 'PA' }], periodos, { query, crm, now })
  assert.equal(datos[1].actual.invitados, 0); assert.equal(datos[1].proximas.invitados, 0)
  assert.equal(datos[2].actual, undefined); assert.match(datos[2].error, /CRM/)
  assert.deepEqual(await cargarClasesPruebaTablero([], {}, { query: () => assert.fail('sin alcance no consulta'), crm }), {})
})

const tablero = clases => resumenClasesPrueba({ clases, semanaAbierta: '2026-10-22', now })
const enFecha = (id, total, attended, start_date, status = 'published') => clase(id, total, attended, { start_date, status })

test('agenda futura distingue semana, mes y todas las fechas sin entrar en asistencia', () => {
  const datos = tablero([
    enFecha('esta', 12, 0, '2026-10-17T22:30:00Z'),
    enFecha('otra', 4, 0, '2026-10-24T22:30:00Z'),
    enFecha('nov', 7, 0, '2026-11-01T22:30:00Z'),
    enFecha('cancelada', 99, 0, '2026-10-20T22:30:00Z', 'cancelled'),
    enFecha('borrador', 99, 0, '2026-10-20T22:30:00Z', 'draft'),
  ])
  assert.equal(datos.proximas.invitados, 23)
  assert.equal(datos.proximas.estaSemana, 12)
  assert.equal(datos.proximas.esteMes, 16)
  assert.equal(datos.actual.invitados, 0)
  assert.equal(datos.mes.invitados, 0)
  assert.equal(datos.seisSemanas.porcentaje, null)
  assert.equal(datos.proximas.fechas.length, 3)
})

test('actividad mensual no desaparece cuando la semana actual todavía está en cero', () => {
  const datos = tablero([
    enFecha('1oct', 6, 2, '2026-10-01T23:00:00Z', 'completed'),
    enFecha('8oct', 17, 4, '2026-10-09T00:30:00Z', 'completed'),
    enFecha('15oct', 1, 0, '2026-10-16T00:30:00Z', 'completed'),
    enFecha('futura', 2, 0, '2026-10-23T00:30:00Z'),
  ])
  assert.equal(datos.actual.invitados, 0)
  assert.equal(datos.ultimoCierre.invitados, 1)
  assert.equal(datos.mes.invitados, 24); assert.equal(datos.mes.asistentes, 6); assert.equal(datos.mes.porcentaje, 25)
  assert.equal(datos.proximas.invitados, 2); assert.equal(datos.proximas.estaSemana, 2)
})

test('seis ventanas viernes-jueves suman exactamente el acumulado con tasa ponderada', () => {
  const datos = tablero([
    enFecha('antes', 100, 100, '2026-09-11T04:59:59Z'),
    enFecha('inicio', 10, 5, '2026-09-11T05:00:00Z'),
    enFecha('sep', 30, 25, '2026-09-24T18:00:00Z'),
    clase('hoy', 10, 0),
  ])
  assert.deepEqual(datos.semanas.map(s => s.hasta), ['2026-09-17', '2026-09-24', '2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22'])
  assert.equal(datos.seisSemanas.invitados, 50); assert.equal(datos.seisSemanas.asistentes, 30)
  assert.equal(datos.seisSemanas.porcentaje, 60)
  assert.equal(datos.semanas.reduce((n, s) => n + s.invitados, 0), datos.seisSemanas.invitados)
  assert.equal(datos.semanas.reduce((n, s) => n + s.asistentes, 0), datos.seisSemanas.asistentes)
  assert.equal(datos.mes.invitados, 10)
})

test('al comenzar una clase pasa de agenda a realizadas una sola vez', () => {
  const clases = [enFecha('hoy', 12, 3, '2026-10-17T22:30:00Z')]
  const antes = tablero(clases)
  const despues = resumenClasesPrueba({ clases, semanaAbierta: '2026-10-22', now: new Date('2026-10-17T22:30:00Z') })
  assert.equal(antes.proximas.invitados, 12); assert.equal(antes.actual.invitados, 0)
  assert.equal(despues.proximas.invitados, 0); assert.equal(despues.actual.invitados, 12)
  assert.equal(despues.actual.porcentaje, 25)
  assert.equal(despues.semanas.reduce((n, s) => n + s.invitados, 0), 12)
})

test('mes local y último cierre funcionan al cambiar de año', () => {
  const datos = resumenClasesPrueba({ semanaAbierta: '2027-01-07', now: new Date('2027-01-01T04:30:00Z'), clases: [], timeZone: 'America/Panama' })
  assert.equal(datos.mes.desde, '2026-12-01'); assert.equal(datos.mes.hasta, '2026-12-31')
  assert.equal(datos.ultimoCierre.hasta, '2026-12-31')
  assert.equal(datos.semanas.length, 6)
})

test('fechas de agenda agrupan registros por día local y conservan el total', () => {
  const datos = tablero([enFecha('tarde', 2, 0, '2026-10-23T01:00:00Z'), enFecha('antes', 3, 0, '2026-10-22T19:00:00Z')])
  assert.deepEqual(datos.proximas.fechas, [{ fecha: '2026-10-22', invitados: 5 }])
  assert.equal(datos.proximas.estaSemana, 5)
})

test('datos inválidos de agenda y de historia nunca se presentan como cero', () => {
  assert.throws(() => tablero([enFecha('futura', 1, 2, '2026-10-22T19:00:00Z')]), /verificar los totales/)
  assert.throws(() => tablero([enFecha('pasada', 1, 2, '2026-09-20T19:00:00Z')]), /verificar los totales/)
})
