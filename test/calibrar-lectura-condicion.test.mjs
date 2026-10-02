import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calibrarLectura } from '../scripts/calibrar-lectura-condicion.mjs'

test('calibración usa solo lecturas y resume por centro y condición', async () => {
  const consultas = []
  const mensajes = []
  async function query(strings) {
    const sql = strings.join('?')
    consultas.push(sql)
    if (sql.includes('FROM centros')) return [{ id: 7, nombre: 'Centro' }]
    if (sql.includes('FROM estadisticas_semana')) return [100, 101, 102, 103, 103].map((valor, i) => ({ semana_fin: ['2026-08-27', '2026-09-03', '2026-09-10', '2026-09-17', '2026-09-24'][i], valor }))
    throw new Error('Consulta inesperada')
  }
  const r = await calibrarLectura({ query, log: (line) => mensajes.push(line) })
  assert.equal(r.porCondicion.normal, 1)
  assert.equal(r.porCondicion.emergencia, 1)
  assert.equal(r.porCentro[7].normal, 1)
  assert.ok(consultas.every((sql) => /^\s*SELECT/i.test(sql)))
  assert.ok(mensajes.some((line) => line.includes('Distribución')))
})
