import test from 'node:test'
import assert from 'node:assert/strict'
import { resumenCpSemana, cpAsistidasSemana } from '../lib/estadisticas-semana/calculo.mjs'
import { cargarClasesPruebaTablero } from '../lib/estadisticas-semana/clases-prueba-tablero.js'
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
  assert.deepEqual(datos[1], { invitados: 10, asistentes: 5, porcentaje: 50, clases: 1 })
  assert.deepEqual(datos[2], { invitados: 8, asistentes: 6, porcentaje: 75, clases: 1 })
  assert.deepEqual(consultados.sort(), [1, 2]); assert.equal(llamadas, 1)
})

test('un centro sin clases tiene cero, un fallo conserva ausencia y otro centro puede seguir visible', async () => {
  const query = async (strings, id) => id === 1 ? [] : [{ id: 'b' }]
  const crm = async () => ({ error: 'fallo' })
  const datos = await cargarClasesPruebaTablero([{ id: 1, pais: 'PA' }, { id: 2, pais: 'PA' }], periodos, { query, crm, now })
  assert.equal(datos[1].invitados, 0)
  assert.equal(datos[2].invitados, null); assert.equal(datos[2].asistentes, null); assert.equal(datos[2].porcentaje, null)
  assert.deepEqual(await cargarClasesPruebaTablero([], {}, { query: () => assert.fail('sin alcance no consulta'), crm }), {})
})
