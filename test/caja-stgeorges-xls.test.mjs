import test from 'node:test'
import assert from 'node:assert/strict'
import { parseStGeorgesXls } from '../lib/caja/stgeorges-xls.mjs'
import { parseStGeorgesTexto } from '../lib/caja/stgeorges.mjs'

// Recorte del formato real de la exportación "Excel" de St. Georges (24-sep-2026):
// HTML con BOM, filas SIN <tr> de apertura, las más nuevas primero, y el balance
// dentro de un <font> cuyo atributo color trae saltos de línea.
const fila = (fecha, desc, deb, cred, bal) => `               <td style="background-color:#e3f9f0;" align="center">${fecha}</td>
               <td style="background-color:#e3f9f0;"> 
${desc}</td>
<td style="background-color:#e3f9f0;" align="right"><font color="#000000">${deb}</font></td>
<td style="background-color:#e3f9f0;" align="right"><font color="#000000">${cred}</font></td>
<td style="background-color:#e3f9f0;" align="right"><font color="#
000000
">${bal}</font></td>
                     </tr>
`
const cabecera = `﻿<table border='2px'><tr >
                              <td height="14" colspan="5" style=" padding-left:5px; color:#FFF; font-size:14px; ">
                              </td>
                              </tr>
                              <td width="16%" height="26" style=" background-color:#f6fef4;"><div align="left">Cuenta:</div></td>
                              <td width="44%" style=" border-bottom:1px solid #dff1d1; color:#979796; font-weight:bold;">20000000678094</td>
                              <td width="0%">&nbsp;</td>
                              <td width="19%" style=" background-color:#f6fef4;"><div align="rileftght">
                              <div align="left">Titular:</div>
                              </div></td>
                              <td width="21%" style=" border-bottom:1px solid #dff1d1; color:#979796; font-weight:bold;">F &amp; F Soluciones Integrales, S.A.</td>
                              </tr>
                              <td height="26" style=" background-color:#f6fef4;"><div align="left">Fecha Apertura:</div></td>
                              <td style=" border-bottom:1px solid #dff1d1; color:#979796; font-weight:bold;">06-Mar-2020</td>
                              </tr></table><br><table border='2px'><tr >
      <td width="12%" height="26"><div align="center"><strong>Fecha</strong></div></td>
      <td width="54%"><div align="center"><strong>Descripción</strong></div></td>
      <td width="12%"><div align="center"><strong>Débitos(-)</strong></div></td>
      <td width="10%"><div align="center"><strong>Créditos(+)</strong></div></td>
      <td width="12%"><div align="center"><strong>Balance</strong></div></td>
   </tr>
`
const FILAS = [
  ['24-Sep-2026', 'Ach Xpress A Favor De Fyf Soluciones Integrales', '5,000.00', '', '3,372.75'],
  ['24-Sep-2026', 'Itbms Clave 016027875', '0.19', '', '8,372.75'],
  ['24-Sep-2026', 'Comision Clave 016027875', '2.80', '', '8,372.94'],
  ['24-Sep-2026', 'Remision Clave 016027875', '', '140.00', '8,375.74'],
  ['23-Sep-2026', 'Pago &amp; Otros   Cargos', '', '1,235.74', '8,235.74'],
]
const armar = (filas) => `${cabecera}${filas.map((f) => fila(...f)).join('')}</table>`
const XLS = armar(FILAS)

test('lee cuenta, saldo (fila más nueva) y movimientos del más viejo al más nuevo', () => {
  const r = parseStGeorgesXls(XLS)
  assert.equal(r.cuenta, '20000000678094')
  assert.deepEqual(r.saldo, { monto: 3372.75, fecha: '2026-09-24' })
  assert.equal(r.descuadre, null)
  assert.deepEqual(r.movimientos.map((m) => m.fecha), ['2026-09-23', '2026-09-24', '2026-09-24', '2026-09-24', '2026-09-24'])
  assert.deepEqual(r.movimientos[0], { fecha: '2026-09-23', monto: 1235.74, memo: 'PAGO & OTROS CARGOS', fitid: '2026-09-23|8235.74|1235.74' })
  assert.deepEqual(r.movimientos.at(-1), {
    fecha: '2026-09-24', monto: -5000, memo: 'ACH XPRESS A FAVOR DE FYF SOLUCIONES INTEGRALES', fitid: '2026-09-24|3372.75|-5000.00',
  })
  assert.equal(r.movimientos[1].monto, 140)
  assert.equal(r.movimientos[2].monto, -2.8)
})

test('el fitid es el mismo que el del PDF de St. Georges para la misma fila', () => {
  const pdf = parseStGeorgesTexto(`ESTADO DE CUENTA
Número:
20000000678094
Fecha : Sep. 24, 2026
DETALLE DE TRANSACCIONES
23-SEP-26 PAGO Y OTROS CARGOS 1,235.74 8,235.74
24-SEP-26 REMISION CLAVE 016027875 140.00 8,375.74
24-SEP-26 COMISION CLAVE 016027875 -2.80 8,372.94
24-SEP-26 ITBMS CLAVE 016027875 -0.19 8,372.75
24-SEP-26 ACH XPRESS A FAVOR DE FYF SOLUCIONES INTEGRALES -5,000.00 3,372.75`)
  assert.deepEqual(parseStGeorgesXls(XLS).movimientos.map((m) => m.fitid), pdf.movimientos.map((m) => m.fitid))
})

test('repeticiones en el archivo llevan |2 contando del más viejo al más nuevo, como el PDF', () => {
  const r = parseStGeorgesXls(armar([
    ['03-Feb-2026', 'Remision Clave 1', '', '50.00', '150.00'],
    ['03-Feb-2026', 'Reverso Clave 1', '50.00', '', '100.00'],
    ['03-Feb-2026', 'Remision Clave 1', '', '50.00', '150.00'],
  ]))
  assert.deepEqual(r.movimientos.map((m) => m.fitid), ['2026-02-03|150.00|50.00', '2026-02-03|100.00|-50.00', '2026-02-03|150.00|50.00|2'])
})

test('descarta filas en 0.00 después de verificar el saldo corrido', () => {
  const r = parseStGeorgesXls(armar([
    FILAS[0], FILAS[1],
    ['24-Sep-2026', 'Itbms Clave 0', '0.00', '', '8,372.94'],
    ...FILAS.slice(2),
  ]))
  assert.equal(r.movimientos.length, 5)
  assert.ok(r.movimientos.every((m) => m.monto !== 0))
})

test('aborta si el saldo corrido no cuadra, nombrando la fila', () => {
  const malo = FILAS.map((f) => (f[1].startsWith('Comision') ? [f[0], f[1], f[2], f[3], '8,999.99'] : f))
  assert.throws(() => parseStGeorgesXls(armar(malo)), /no cuadra.*2026-09-24.*COMISION CLAVE 016027875/)
})

test('rechaza fechas imposibles o meses desconocidos nombrando el valor', () => {
  assert.throws(() => parseStGeorgesXls(armar([['31-Feb-2026', 'X', '1.00', '', '10.00']])), /Fecha inválida.*31-Feb-2026/)
  assert.throws(() => parseStGeorgesXls(armar([['01-Foo-2026', 'X', '1.00', '', '10.00']])), /Fecha inválida.*01-Foo-2026/)
  assert.throws(() => parseStGeorgesXls(armar([['2026-02-01', 'X', '1.00', '', '10.00']])), /Fecha inválida.*2026-02-01/)
})

test('rechaza montos ilegibles', () => {
  assert.throws(() => parseStGeorgesXls(armar([['01-Feb-2026', 'X', 'abc', '', '10.00']])), /Monto inválido/)
})

test('rechaza filas fuera de orden (la exportación viene de la más nueva a la más vieja)', () => {
  assert.throws(() => parseStGeorgesXls(armar([FILAS[4], ...FILAS.slice(0, 4)])), /orden/)
})

test('rechaza un archivo que no es la exportación de St. Georges', () => {
  assert.throws(() => parseStGeorgesXls('<table><tr><td>hola</td></tr></table>'), /St. Georges/)
  assert.throws(() => parseStGeorgesXls('OFXHEADER:100\n<OFX><ACCTID>123'), /St. Georges/)
  // Filas incompletas: la tabla no trae múltiplos de 5 celdas.
  assert.throws(() => parseStGeorgesXls(XLS.replace(/<\/table>$/, '<td>suelta</td></table>')), /incompleta/)
})

test('sin movimientos: sin saldo y lista vacía', () => {
  const r = parseStGeorgesXls(armar([]))
  assert.equal(r.cuenta, '20000000678094')
  assert.equal(r.saldo, null)
  assert.deepEqual(r.movimientos, [])
})
