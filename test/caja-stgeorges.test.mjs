import test from 'node:test'
import assert from 'node:assert/strict'
import { parseStGeorgesTexto } from '../lib/caja/stgeorges.mjs'

const TEXTO = `ESTADO DE CUENTA
ALTAVIA GROUP, S.A. Cuenta
Número:
20000001096460
Moneda: US DOLLARS
Fecha : Feb. 28, 2026
Saldo
Disponible:
22,194.84
RESUMEN DE MOVIMIENTOS DE LA CUENTA: Cuenta Corriente Empresarial
Saldo Anterior Total Créditos Total Débitos Saldo Actual
6,721.58 15,839.11 365.85 8,143.03
DETALLE DE TRANSACCIONES
FECHA DESCRIPCIÓN MONTO SALDO ACTUAL
02-FEB-26 COMISION CLAVE 016030673 -5.85 6,715.73
Chat
24/9/26, 10:57 a.m. St. Georges Bank
https://www.stgeorgesbank.com.pa/blinea/bca.ESTADO_CUENTA_CC.ESTADO#, 1/6
02-FEB-26 V/MC 016030671 LIQ. NO. 3771441 CARGO POR ITMBS
SOBRE COMISI
-2.00 6,713.73
02-FEB-26 REMISIÓN V/MC 016030671 LIQ. NO. 3771441 1,429.30 8,143.03`

test('lee cuenta, fecha, saldo final y filas de una o varias líneas', () => {
  const r = parseStGeorgesTexto(TEXTO)
  assert.equal(r.cuenta, '20000001096460')
  assert.deepEqual(r.saldo, { monto: 8143.03, fecha: '2026-02-28' })
  assert.equal(r.movimientos.length, 3)
  assert.deepEqual(r.movimientos[0], { fecha: '2026-02-02', monto: -5.85, memo: 'COMISION CLAVE 016030673', fitid: '2026-02-02|6715.73|-5.85' })
  assert.equal(r.movimientos[1].memo, 'V/MC 016030671 LIQ. NO. 3771441 CARGO POR ITMBS SOBRE COMISI')
  assert.equal(r.movimientos[2].monto, 1429.3)
  assert.equal(r.descuadre, null)
})

test('el saldo sale del resumen del banco y reporta descuadre si las filas no llegan a él', () => {
  // Caso real abril 2026: el detalle web omite un débito de 5.000 que sí está en el resumen.
  const r = parseStGeorgesTexto(TEXTO.replace('365.85 8,143.03', '365.85 3,143.03'))
  assert.equal(r.saldo.monto, 3143.03)
  assert.equal(r.saldo.fecha, '2026-02-28')
  assert.deepEqual(r.descuadre, { monto: -5000, fecha: '2026-02-28' })
  assert.equal(r.movimientos.length, 3)
})

test('sin bloque de resumen: saldo de la última fila y sin descuadre', () => {
  const sinResumen = TEXTO.replace(/Saldo Anterior[^\n]*\n[^\n]*\n/, '')
  assert.doesNotMatch(sinResumen, /Saldo Anterior/)
  const r = parseStGeorgesTexto(sinResumen)
  assert.deepEqual(r.saldo, { monto: 8143.03, fecha: '2026-02-28' })
  assert.equal(r.descuadre, null)
})

test('aborta si el saldo corrido no cuadra (fila mal leída)', () => {
  assert.throws(() => parseStGeorgesTexto(TEXTO.replace('-2.00 6,713.73', '-2.00 6,999.99')), /no cuadra/)
})

test('rechaza un texto que no es estado de St. Georges', () => {
  assert.throws(() => parseStGeorgesTexto('otra cosa'), /St. Georges/)
})
