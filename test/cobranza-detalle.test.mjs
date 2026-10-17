import test from 'node:test'
import assert from 'node:assert/strict'
import { leerDetalleCobranza } from '../lib/cobranza-detalle.mjs'
import { clasificarFactura, ORGS_ZOHO } from '../lib/zoho-cobranza.mjs'

const consulta = { centroId: 1, fecha: '2026-10-17', registradoAt: '2026-10-17T19:34:12.177Z', total: 2 }
const factura = (extra = {}) => ({ orgId: 'org', facturaId: '1', estado: 'incluida', centroId: 1,
  numero: 'INV-1', cliente: 'Cliente de prueba', saldo: 70.5, moneda: 'USD', vencimiento: '2026-10-10', ...extra })
const informe = (extra = {}) => ({ guardado: true, completo: true, porCentro: { 1: 2, 2: 1 }, organizaciones: [
  { facturas: [factura(), factura({ facturaId: '2', numero: 'INV-2', moneda: 'REF', vencimiento: '2026-10-02' }),
    factura({ facturaId: '3', centroId: 2, cliente: 'Otro centro' }), factura({ facturaId: '4', estado: 'excluida' })] },
], ...extra })
const opciones = data => ({ autorizar: async () => {}, query: async () => [{ informe: data ?? informe() }] })

test('cliente, moneda y saldo parcial vienen del detalle real de Zoho', () => {
  const r = clasificarFactura(ORGS_ZOHO[1], {
    invoice_id: '1', invoice_number: 'INV-1', customer_name: ' Cliente prueba ', currency_code: 'USD',
    balance: 25.75, total: 120, status: 'partially_paid', due_date: '2026-10-16',
    line_items: [{ name: 'Mensualidad Brisas del Golf' }],
  }, '2026-10-17')
  assert.equal(r.estado, 'incluida'); assert.equal(r.cliente, 'Cliente prueba')
  assert.equal(r.moneda, 'USD'); assert.equal(r.saldo, 25.75)
})

test('devuelve solo las incluidas del centro autorizado y los campos necesarios, ordenadas por vencimiento', async () => {
  const r = await leerDetalleCobranza(consulta, opciones())
  assert.equal(r.total, 2)
  assert.deepEqual(r.facturas.map(f => f.numero), ['INV-2', 'INV-1'])
  assert.deepEqual(Object.keys(r.facturas[0]).sort(), ['cliente', 'id', 'moneda', 'numero', 'saldo', 'vencimiento'])
  assert.equal(r.facturas[0].moneda, 'REF')
  assert.equal(r.facturas[1].saldo, 70.5)
  assert.ok(r.facturas.every(f => f.cliente !== 'Otro centro'))
})

test('autoriza el centro antes de leer cualquier informe', async () => {
  let queries = 0
  await assert.rejects(leerDetalleCobranza(consulta, { autorizar: async id => {
    assert.equal(id, 1); throw new Error('No autorizado')
  }, query: async () => { queries++; return [] } }), /No autorizado/)
  assert.equal(queries, 0)
})

test('fija el informe por fecha e instante: una nueva sincronización no sustituye el detalle abierto', async () => {
  const r = await leerDetalleCobranza({ ...consulta, registradoAt: new Date(consulta.registradoAt) }, {
    autorizar: async () => {}, query: async (strings, ...values) => {
      assert.match(strings.join('?'), /guardado = true.*fecha = \?::date AND terminado_at = \?::timestamptz/s)
      assert.deepEqual(values, [consulta.fecha, consulta.registradoAt]); return [{ informe: informe() }]
    },
  })
  assert.equal(r.total, 2)
})

test('cero confirmado muestra lista vacía; centro sin cobertura no se transforma en cero', async () => {
  const data = informe({ porCentro: { 1: 0 }, organizaciones: [] })
  assert.deepEqual((await leerDetalleCobranza({ ...consulta, total: 0 }, opciones(data))).facturas, [])
  assert.ok((await leerDetalleCobranza({ ...consulta, centroId: 11, total: 0 }, opciones(data))).error)
})

test('rechaza discrepancias, duplicados, informes incompletos y metadatos antiguos', async () => {
  const casos = [informe({ guardado: false }), informe({ completo: false }), informe({ porCentro: { 1: 3 } }),
    informe({ organizaciones: [{ facturas: [factura(), factura()] }] }),
    informe({ organizaciones: [{ facturas: [factura({ cliente: null }), factura({ facturaId: '2' })] }] }),
    informe({ organizaciones: [{ facturas: [factura({ moneda: null }), factura({ facturaId: '2' })] }] })]
  for (const caso of casos) assert.ok((await leerDetalleCobranza(consulta, opciones(caso))).error)
  assert.ok((await leerDetalleCobranza({ ...consulta, total: 1 }, opciones())).error)
  assert.ok((await leerDetalleCobranza(consulta, { ...opciones(), query: async () => [] })).error)
})

test('un conteo manual o fechas inválidas no consultan ni inventan detalles', async () => {
  for (const extra of [{ registradoAt: null }, { fecha: '2026-02-30' }, { fecha: 'incorrecta' }, { registradoAt: '2026-10-17' }]) {
    let queries = 0
    const r = await leerDetalleCobranza({ ...consulta, ...extra }, { autorizar: async () => {}, query: async () => { queries++; return [] } })
    assert.ok(r.error); assert.equal(queries, 0)
  }
})
