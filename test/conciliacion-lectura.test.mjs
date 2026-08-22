import test from 'node:test'
import assert from 'node:assert/strict'

import { parsearCSV, detectarSeparador } from '../lib/conciliacion/csv.mjs'
import {
  detectarColumnas,
  normalizarFilas,
  parsearMonto,
  parsearFecha,
  detectarOrdenFecha,
  mapearEncabezados,
} from '../lib/conciliacion/columnas.mjs'

// ── CSV ──────────────────────────────────────────────────────────────────────

test('detecta el separador aunque una línea suelta traiga comas', () => {
  const texto = 'Estado de cuenta, agosto, 2026\nFecha;Descripcion;Monto\n01/08/2026;PAGO;-10.00\n02/08/2026;OTRO;-20.00\n'
  assert.equal(detectarSeparador(texto), ';')
})

test('respeta comillas, comas internas y comillas escapadas', () => {
  const { filas } = parsearCSV('Fecha,Descripcion,Monto\n01/08/2026,"PAGO, ACH ""NOMINA""",-125.50\n')
  assert.deepEqual(filas[1], ['01/08/2026', 'PAGO, ACH "NOMINA"', '-125.50'])
})

test('un salto de línea dentro de comillas no parte la fila', () => {
  const { filas } = parsearCSV('Fecha,Concepto,Monto\n01/08/2026,"TRANSFERENCIA\nBANCA EN LINEA",50.00\n')
  assert.equal(filas.length, 2)
  assert.equal(filas[1][1], 'TRANSFERENCIA\nBANCA EN LINEA')
})

test('quita el BOM y tolera CRLF', () => {
  const { filas } = parsearCSV('﻿Fecha,Monto\r\n01/08/2026,10.00\r\n')
  assert.deepEqual(filas[0], ['Fecha', 'Monto'])
})

// ── Montos ───────────────────────────────────────────────────────────────────

test('montos en los formatos que mandan los bancos', () => {
  assert.equal(parsearMonto('1,234.56'), 1234.56)   // miles con coma
  assert.equal(parsearMonto('1.234,56'), 1234.56)   // miles con punto
  assert.equal(parsearMonto('(125.40)'), -125.4)    // negativo entre paréntesis
  assert.equal(parsearMonto('125.40-'), -125.4)     // signo al final
  assert.equal(parsearMonto('-125.40'), -125.4)
  assert.equal(parsearMonto('B/. 80.00'), 80)       // símbolo panameño
  assert.equal(parsearMonto('$1,234'), 1234)
  assert.equal(parsearMonto('1.234.567'), 1234567)  // solo miles
  assert.equal(parsearMonto(''), null)
  assert.equal(parsearMonto('   '), null)
  assert.equal(parsearMonto('SALDO'), null)
})

// El caso que rompía: "B/." limpiado a lo bruto deja ".80.00", que leído como
// miles da 8000 — cien veces el monto real.
test('el prefijo de moneda no multiplica el monto por cien', () => {
  assert.equal(parsearMonto('B/. 80.00'), 80)
  assert.equal(parsearMonto('USD 1.234,56'), 1234.56)
})

// ── Fechas ───────────────────────────────────────────────────────────────────

test('fechas en los formatos usuales', () => {
  assert.equal(parsearFecha('01/08/2026'), '2026-08-01')
  assert.equal(parsearFecha('2026-08-01'), '2026-08-01')
  assert.equal(parsearFecha('01-ago-2026'), '2026-08-01')
  assert.equal(parsearFecha('1-8-26'), '2026-08-01')
  assert.equal(parsearFecha('20260801'), '2026-08-01')
  assert.equal(parsearFecha('31/02/2026'), null) // no existe
  assert.equal(parsearFecha('no es fecha'), null)
})

test('el orden día/mes se decide con todo el archivo, no fila por fila', () => {
  assert.equal(detectarOrdenFecha(['01/08/2026', '25/08/2026']), 'dma')
  assert.equal(detectarOrdenFecha(['08/25/2026', '08/01/2026']), 'mda')
  assert.equal(detectarOrdenFecha(['05/06/2026']), 'dma') // sin evidencia: uso local
  assert.equal(parsearFecha('08/25/2026', 'mda'), '2026-08-25')
})

// ── Encabezados ──────────────────────────────────────────────────────────────

test('mapea encabezados con tildes, mayúsculas y sufijos', () => {
  const mapa = mapearEncabezados(['Fecha de Transacción', 'Descripción', 'Referencia', 'Débito (B/.)', 'Crédito (B/.)', 'Saldo Total'])
  assert.deepEqual(mapa, { fecha: 0, descripcion: 1, referencia: 2, debito: 3, credito: 4, saldo: 5 })
})

test('"monto debito" cae en débito y no en el monto único', () => {
  const mapa = mapearEncabezados(['Fecha', 'Concepto', 'Monto Debito', 'Monto Credito'])
  assert.equal(mapa.debito, 2)
  assert.equal(mapa.credito, 3)
  assert.equal(mapa.monto, undefined)
})

test('salta las líneas de cabecera del banco hasta la tabla real', () => {
  const { filas } = parsearCSV([
    'BANCO GENERAL S.A.',
    'Cuenta: xxxx9550',
    '',
    'Fecha,Descripcion,Debito,Credito,Saldo',
    '01/08/2026,DEPOSITO,,500.00,500.00',
  ].join('\n'))
  const { filaEncabezado, mapa } = detectarColumnas(filas)
  assert.equal(filaEncabezado, 3)
  assert.equal(mapa.credito, 3)
})

// ── Filas → movimientos ──────────────────────────────────────────────────────

test('débito/crédito definen la dirección y el monto queda positivo', () => {
  const { filas } = parsearCSV([
    'Fecha,Descripcion,Referencia,Debito,Credito,Saldo',
    '01/08/2026,DEPOSITO CLIENTE,000123,,500.00,500.00',
    '02/08/2026,PAGO ACH NOMINA,000124,125.50,,374.50',
  ].join('\n'))
  const { mapa } = detectarColumnas(filas)
  const { movimientos } = normalizarFilas(filas.slice(1), mapa)
  assert.equal(movimientos.length, 2)
  assert.deepEqual(
    movimientos.map((m) => [m.fecha, m.direccion, m.monto, m.referencia]),
    [['2026-08-01', 'entrada', 500, '000123'], ['2026-08-02', 'salida', 125.5, '000124']],
  )
})

test('con una sola columna de monto manda el signo', () => {
  const { filas } = parsearCSV('Fecha,Concepto,Monto\n01/08/2026,COMPRA,-45.20\n02/08/2026,ABONO,90.00\n')
  const { mapa } = detectarColumnas(filas)
  const { movimientos } = normalizarFilas(filas.slice(1), mapa)
  assert.deepEqual(movimientos.map((m) => [m.direccion, m.monto]), [['salida', 45.2], ['entrada', 90]])
})

test('una columna "tipo" D/C manda sobre el signo ausente', () => {
  const { filas } = parsearCSV('Fecha,Concepto,Tipo,Monto\n01/08/2026,COMPRA,D,45.20\n02/08/2026,ABONO,C,90.00\n')
  const { mapa } = detectarColumnas(filas)
  const { movimientos } = normalizarFilas(filas.slice(1), mapa)
  assert.deepEqual(movimientos.map((m) => m.direccion), ['salida', 'entrada'])
})

test('las filas de totales al pie se descartan con motivo, no en silencio', () => {
  const { filas } = parsearCSV([
    'Fecha,Descripcion,Debito,Credito',
    '01/08/2026,DEPOSITO,,500.00',
    ',SALDO FINAL,,500.00',
  ].join('\n'))
  const { mapa } = detectarColumnas(filas)
  const { movimientos, descartadas } = normalizarFilas(filas.slice(1), mapa)
  assert.equal(movimientos.length, 1)
  assert.equal(descartadas.length, 1)
  assert.match(descartadas[0].motivo, /fecha/)
})
