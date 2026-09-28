import test from 'node:test'
import assert from 'node:assert/strict'
import { leerExtracto } from '../lib/caja/extracto.mjs'

const XLS = `﻿<table><tr><td>Cuenta:</td><td>20000000678094</td></tr></table>
<table><tr><td>Fecha</td><td>Descripción</td><td>Débitos(-)</td><td>Créditos(+)</td><td>Balance</td></tr>
<td>24-Sep-2026</td><td> Remisión Clave 1</td><td></td><td>140.00</td><td>1,140.00</td></tr></table>`
const bytes = (s) => new Uint8Array(Buffer.from(s, 'utf8'))

test('el Excel de St. Georges (.xls o .html) se lee como xls_stgeorges en UTF-8', async () => {
  for (const nombre of ['descarga - 2026-09-24T161625.553.xls', 'movimientos.HTML', 'x.XLS']) {
    const r = await leerExtracto(nombre, bytes(XLS))
    assert.equal(r.formato, 'xls_stgeorges', nombre)
    assert.equal(r.cuenta, '20000000678094')
    assert.deepEqual(r.saldo, { monto: 1140, fecha: '2026-09-24' })
    assert.equal(r.descuadre, null)
    assert.equal(r.movimientos[0].memo, 'REMISIÓN CLAVE 1')
  }
})

test('un .xls que no es la exportación de St. Georges se rechaza', async () => {
  await assert.rejects(leerExtracto('otro.xls', bytes('<table><tr><td>x</td></tr></table>')), /St. Georges/)
})

test('una extensión desconocida pide los formatos aceptados, incluido el Excel', async () => {
  await assert.rejects(leerExtracto('x.csv', bytes('a,b')), /Excel de St. Georges/)
})
