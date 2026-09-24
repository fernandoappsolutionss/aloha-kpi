import test from 'node:test'
import assert from 'node:assert/strict'
import { parseOfx } from '../lib/caja/ofx.mjs'

const OFX = `OFXHEADER:100
DATA:OFXSGML
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>USD
<BANKACCTFROM><BANKID>BG
<ACCTID>04-49-00-002283-8
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>OTHER
<DTPOSTED>20260301154528.000
<TRNAMT>1378.08
<FITID>694
<MEMO>DEPOSITO YAPPY - ALOHAMentalArithmetic (16 TRANSACCIONES)
</STMTTRN>
<STMTTRN>
<TRNTYPE>OTHER
<DTPOSTED>20260311154528.000
<TRNAMT>-2808.00
<FITID>720
<MEMO>BANCA EN LINEA TRANSFERENCIA A 0318011050715 C&amp;C SOLUCIONES INTEGRALES, S.A. FEE ANCLAS ME
</STMTTRN>
<STMTTRN>
<DTPOSTED>20260312154528.000
<TRNAMT>0.00
<FITID>721
<MEMO>CERO
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL><BALAMT>8807.45
<DTASOF>20260924154532.359
</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`

test('lee cuenta, saldo y movimientos; decodifica &amp; y descarta montos cero', () => {
  const r = parseOfx(OFX)
  assert.equal(r.cuenta, '04-49-00-002283-8')
  assert.deepEqual(r.saldo, { monto: 8807.45, fecha: '2026-09-24' })
  assert.equal(r.movimientos.length, 2)
  assert.deepEqual(r.movimientos[0], { fecha: '2026-03-01', monto: 1378.08, memo: 'DEPOSITO YAPPY - ALOHAMentalArithmetic (16 TRANSACCIONES)', fitid: '694' })
  assert.equal(r.movimientos[1].monto, -2808)
  assert.match(r.movimientos[1].memo, /C&C SOLUCIONES/)
})

test('rechaza un archivo que no es OFX de cuenta', () => {
  assert.throws(() => parseOfx('hola'), /no es un OFX/)
})

test('rechaza un movimiento sin FITID', () => {
  assert.throws(() => parseOfx(OFX.replace('<FITID>694\n', '')), /FITID/)
})
