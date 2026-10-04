import { test } from 'node:test'
import assert from 'node:assert/strict'
import { guardarCuotasEn, agregarOrdenEn } from '../lib/cuotas-semana-servicio.js'

const now = new Date('2026-09-27T12:00:00Z')

function queryFalso() {
  const calls = []
  const query = async (strings, ...values) => {
    const statement = strings.join('?')
    calls.push({ statement, values })
    if (statement.includes('FROM centros')) return [{ id: 7, pais: 'PA' }]
    if (statement.includes('FROM estadisticas_semana')) return [{ codigo: 'ninos_activos', valor: 200, semana_fin:'2026-09-24', estado:'cerrada' }, { codigo: 'nuevos_inscritos', valor: 3, semana_fin:'2026-09-24', estado:'cerrada' }]
    if (statement.includes('FROM ruta_compromisos_mes')) return []
    if (statement.includes('FROM metas')) return [{ meta_nuevos_ingresos_mes: 20, meta_desercion_mes: 8, meta_cobranza_max: 1 }]
    if (statement.includes('INSERT INTO semana_cuotas')) return [{ codigo: values[2], cuota: values[3], estado: 'propuesta' }]
    if (statement.includes('INSERT INTO semana_objetivos')) return [{ id: 9, texto: values[1], seccion: 'orden' }]
    throw new Error(`Consulta inesperada: ${statement}`)
  }
  return { query, calls }
}

test('guardar cuota abierta persiste la propuesta y revoca aprobación si cambia', async () => {
  const { query, calls } = queryFalso()
  await guardarCuotasEn(7, '2026-10-01', { nuevos_inscritos: 7 }, { query, transaction: (work) => work(query), actorId: 4, now })
  const upsert = calls.find((call) => call.statement.includes('INSERT INTO semana_cuotas'))
  assert.deepEqual(upsert.values.slice(0, 6), [7, '2026-10-01', 'nuevos_inscritos', 7, 5, 4])
  assert.match(upsert.statement, /semana_cuotas\.cuota = EXCLUDED\.cuota[\s\S]*semana_cuotas\.estado[\s\S]*'propuesta'/)
  assert.match(upsert.statement, /aprobada_por = CASE[\s\S]*NULL/)
})

test('no permite guardar cuotas en semana cerrada ni valores inválidos', async () => {
  const { query, calls } = queryFalso()
  await assert.rejects(guardarCuotasEn(7, '2026-09-24', { nuevos_inscritos: 7 }, { query, now }), /semana abierta/)
  await assert.rejects(guardarCuotasEn(7, '2026-10-01', { nuevos_inscritos: -1 }, { query, now }), /Cuota inválida/)
  await assert.rejects(guardarCuotasEn(7, '2026-10-01', { desconocida: 3 }, { query, now }), /Estadística desconocida/)
  assert.equal(calls.some((call) => call.statement.includes('INSERT INTO semana_cuotas')), false)
})

test('coordinación deja una orden en el plan de la última semana cerrada', async () => {
  const { query, calls } = queryFalso()
  const cargar = async (centroId, semanaFin) => ({ plan: { id: 21, centro_id: centroId, semana_fin: semanaFin } })
  await agregarOrdenEn(7, '2026-09-24', { texto: 'Llamar a las familias', fecha: '2026-10-03' }, { query, cargar, actorId: 4, now })
  const insert = calls.find((call) => call.statement.includes('INSERT INTO semana_objetivos'))
  assert.equal(insert.values[0], 21)
  assert.equal(insert.values[1], 'Llamar a las familias')
  await assert.rejects(agregarOrdenEn(7, '2026-10-01', { texto: 'Futura' }, { query, cargar, actorId: 4, now }), /última semana cerrada/)
})
