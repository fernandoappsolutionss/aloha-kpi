import test from 'node:test'
import assert from 'node:assert/strict'
import { sumarSaldosVencidos } from '../lib/cobranza-saldos.mjs'
import { superponerCobranzaTablero } from '../lib/estadisticas-semana/cobranza-tablero.js'
import { leerDetalleCobranza } from '../lib/cobranza-detalle.mjs'

const instante = '2026-10-17T20:32:39.556Z'
const factura = (extra = {}) => ({ estado: 'incluida', centroId: 1, orgId: 'org', facturaId: '1',
  cliente: 'Cliente prueba', numero: 'INV-1', vencimiento: '2026-10-15', saldo: 0.1, moneda: 'USD', ...extra })
const informe = (extra = {}) => ({ guardado: true, completo: true, porCentro: { 1: 2, 2: 1 },
  organizaciones: [{ facturas: [factura(), factura({ facturaId: '2', saldo: 0.2 }),
    factura({ facturaId: '3', centroId: 2, saldo: 999 }), factura({ facturaId: '4', estado: 'excluida', saldo: 888 })] }], ...extra })
const centros = [{ id: 1, nombre: 'Brisas' }, { id: 11, nombre: 'Viñedo' }]
const periodos = Object.fromEntries(centros.map(c => [c.id, { semanaAbierta: '2026-10-22', hoy: '2026-10-17' }]))
const diario = (vencidas = 2) => [{ centro_id: 1, fecha: '2026-10-17', registrado_at: new Date(instante), vencidas }]
const queryCon = (data = informe(), vencidas = 2) => async strings => {
  const sql = strings.join('?')
  if (sql.includes('FROM cobranza_diaria')) return diario(vencidas)
  if (sql.includes('FROM cobranza_conciliaciones')) return [{ fecha: new Date('2026-10-17'), terminado_at: new Date(instante), informe: data }]
  return []
}

test('suma saldos pendientes en centavos sin residuos y mantiene separadas las monedas', () => {
  assert.deepEqual(sumarSaldosVencidos([{ saldo: 0.1, moneda: 'USD' }, { saldo: 0.2, moneda: 'USD' },
    { saldo: 25.75, total: 120, moneda: 'USD' }, { saldo: 95, moneda: 'EUR' }]),
  [{ moneda: 'EUR', saldo: 95 }, { moneda: 'USD', saldo: 26.05 }])
})

test('cero confirmado es vacío; falta de saldo/moneda, negativos y desbordamiento no son cero', () => {
  assert.deepEqual(sumarSaldosVencidos([]), [])
  assert.equal(sumarSaldosVencidos(null), null)
  for (const item of [{ saldo: null, moneda: 'USD' }, { saldo: NaN, moneda: 'USD' }, { saldo: -1, moneda: 'USD' },
    { saldo: 5, moneda: null }, { saldo: 5, moneda: ' ' }, { saldo: Number.MAX_SAFE_INTEGER, moneda: 'USD' }])
    assert.equal(sumarSaldosVencidos([item]), null)
})

test('panel y detalle comparten el mismo saldo, omiten otros centros y facturas excluidas', async () => {
  const query = queryCon()
  const filas = await superponerCobranzaTablero(centros, periodos, [], { query })
  const detalle = await leerDetalleCobranza({ centroId: 1, fecha: '2026-10-17', registradoAt: instante, total: 2 },
    { autorizar: async () => {}, query })
  assert.deepEqual(filas[0].detalle.saldos, [{ moneda: 'USD', saldo: 0.3 }])
  assert.deepEqual(filas[0].detalle.saldos, detalle.saldos)
  assert.equal(filas[1].detalle.saldos, null)
  assert.equal(filas[1].valor, null)
  assert.ok(!JSON.stringify(filas).includes('Cliente prueba'))
})

test('no mezcla saldos de otra fecha/instante, ni otra conciliación con el mismo total', async () => {
  const params = []
  const filas = await superponerCobranzaTablero(centros, periodos, [], { query: async (strings, ...values) => {
    const sql = strings.join('?')
    if (sql.includes('FROM cobranza_diaria')) return diario()
    if (!sql.includes('FROM cobranza_conciliaciones')) return []
    params.push(values)
    return [{ fecha: '2026-10-17', terminado_at: '2026-10-17T21:00:00Z', informe: informe() },
      { fecha: '2026-10-16', terminado_at: instante, informe: informe() }]
  } })
  assert.deepEqual(params, [[[instante]]])
  assert.equal(filas[0].valor, 2); assert.equal(filas[0].detalle.saldos, null)
})

test('rechaza suma de informe incompleto, duplicado, discrepante o sin moneda', async () => {
  for (const data of [informe({ guardado: false }), informe({ completo: false }), informe({ porCentro: { 1: 3 } }),
    informe({ organizaciones: [{ facturas: [factura(), factura()] }] }),
    informe({ organizaciones: [{ facturas: [factura(), factura({ facturaId: '2', moneda: null })] }] })]) {
    const filas = await superponerCobranzaTablero(centros, periodos, [], { query: queryCon(data) })
    assert.equal(filas[0].detalle.saldos, null)
    assert.equal(filas[0].valor, 2)
  }
})

test('cero conciliado tiene saldo cero; error al leer saldos conserva el conteo y no inventa cero', async () => {
  const cero = informe({ porCentro: { 1: 0 }, organizaciones: [] })
  const filas = await superponerCobranzaTablero(centros, periodos, [], { query: queryCon(cero, 0) })
  assert.deepEqual(filas[0].detalle.saldos, [])
  const error = await superponerCobranzaTablero(centros, periodos, [], { query: async strings => {
    const sql = strings.join('?')
    if (sql.includes('FROM cobranza_conciliaciones')) throw new Error('Fallo de consulta')
    return sql.includes('FROM cobranza_diaria') ? diario() : []
  } })
  assert.equal(error[0].valor, 2); assert.equal(error[0].detalle.saldos, null)
})
