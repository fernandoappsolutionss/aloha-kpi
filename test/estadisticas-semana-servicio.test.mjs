import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { calcularSemanaCentro, guardarSemanaCentro, recalcularSemanas, leerSerieCentros } from '../lib/estadisticas-semana/servicio.js'
import { cargarClasesCrm } from '../lib/kpi-auto-server.js'
import { crmAccountForCentro } from '../lib/crm.js'

const consulta = (resolver) => async (strings, ...values) => resolver(strings.join('?'), values)
const filasBase = (sql) => {
  if (sql.includes('FROM centros')) return [{ id: 7, nombre: 'Centro', pais: 'PA' }]
  if (sql.includes('FROM estudiantes')) return []
  if (sql.includes('FROM grupos')) return []
  if (sql.includes('FROM estudiante_eventos')) return []
  if (sql.includes('FROM resumen_mes')) return [{ ninos_final_mes: 100 }]
  if (sql.includes('FROM kpi_semanas')) return []
  if (sql.includes('FROM centro_eventos')) return []
  return []
}

test('un fallo de Zoho deja esa estadística sin dato y conserva las demás', async () => {
  const query = consulta((sql) => {
    if (sql.includes('FROM cobranza_diaria')) throw new Error('Zoho no disponible')
    return filasBase(sql)
  })
  const result = await calcularSemanaCentro(7, '2026-10-01', { query, now: new Date('2026-10-02T12:00:00Z') })
  assert.equal(result.ninos_activos.valor, 100)
  assert.equal(result.nuevos_inscritos.valor, 0)
  assert.equal(result.facturas_vencidas.valor, null)
  assert.match(result.facturas_vencidas.detalle.error, /Zoho no disponible/)
  assert.equal(result.cp_asistidas.valor, 0)
})

test('carga CRM devuelve eventos completos con status y stats', async () => {
  const evento = { id: 'abc', account_id: crmAccountForCentro(1), start_date: '2026-09-20T12:00:00Z', status: 'completed', stats: { attended: 3 } }
  const query = consulta((sql) => sql.includes('FROM centro_eventos') ? [{ id: 'abc', start_date: evento.start_date }] : [])
  const result = await cargarClasesCrm(1, { query, crm: async () => ({ events: [evento] }) })
  assert.equal(result.complete, true)
  assert.deepEqual(result.clases, [evento])
})

test('guardar nunca pisa una foto cerrada sin forzar', async () => {
  const llamadas = []
  const query = consulta((sql, values) => { llamadas.push({ sql, values }); return [] })
  const resultados = { ninos_activos: { valor: 100, detalle: {} } }
  await guardarSemanaCentro(7, '2026-10-01', resultados, { query })
  assert.match(llamadas[0].sql, /WHERE estadisticas_semana\.estado <> 'cerrada'/)
  assert.equal(llamadas[0].values.at(-1), false)
  await guardarSemanaCentro(7, '2026-10-01', resultados, { query, forzar: true })
  assert.equal(llamadas.at(-1).values.at(-1), true)
})

test('las cinco filas de la foto se guardan juntas en producción', () => {
  const source = readFileSync(new URL('../lib/estadisticas-semana/servicio.js', import.meta.url), 'utf8')
  assert.match(source, /withTransaction\(/)
})

test('cron cierra la semana pasada y deja abierta la actual', async () => {
  const guardadas = []
  const query = consulta((sql, values) => {
    if (sql.includes('SELECT DISTINCT semana_fin')) return [{ semana_fin: '2026-10-01' }]
    if (sql.includes('INSERT INTO estadisticas_semana')) { guardadas.push(values); return [] }
    return filasBase(sql)
  })
  const result = await recalcularSemanas({ now: new Date('2026-10-02T12:00:00Z'), query })
  assert.equal(result.abiertas, 1)
  assert.equal(result.cerradas, 1)
  assert.equal(result.errores.length, 0)
  assert.ok(guardadas.some((v) => v.includes('2026-10-08') && v.includes('abierta')))
  assert.ok(guardadas.some((v) => v.includes('2026-10-01') && v.includes('cerrada')))
})

test('lectura de series usa una consulta para todos los centros', async () => {
  let n = 0
  const query = consulta((sql) => { n++; assert.match(sql, /FROM estadisticas_semana/); return [{ centro_id: 7, semana_fin: '2026-10-01', codigo: 'ninos_activos', valor: 100 }] })
  assert.equal((await leerSerieCentros([7], ['2026-10-01'], { query })).length, 1)
  assert.equal(n, 1)
})
