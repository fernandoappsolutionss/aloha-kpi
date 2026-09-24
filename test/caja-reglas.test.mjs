import test from 'node:test'
import assert from 'node:assert/strict'
import { clasificar, REGLAS_SEMILLA, CLASES, normalizarTexto } from '../lib/caja/reglas.mjs'

const reglas = REGLAS_SEMILLA.map((r, i) => ({ ...r, id: i + 1 }))
const c = (memo, monto, empresa = 'altavia') => clasificar({ memo, monto }, reglas, empresa).clase

test('normaliza acentos, &amp; y espacios', () => {
  assert.equal(normalizarTexto('  Remisión  C&amp;C '), 'REMISION C&C')
})

test('clasifica los movimientos reales de Altavia', () => {
  assert.equal(c('BANCA EN LINEA TRANSFERENCIA A 0418000001270 MOVEMEDIA, S.A. (MOVEMEDIA) PAGO', -1500), 'planilla')
  assert.equal(c('BANCA EN LINEA TRANSFERENCIA A 0318011050715 C&amp;C SOLUCIONES INTEGRALES, S.A. FEE ANCLAS ME', -2808), 'regalia')
  assert.equal(c('BANCA EN LINEA TRANSFERENCIA A 0318011050715 C&amp;C SOLUCIONES INTEGRALES, S.A. OC 1015 BRISA', -3393.5), 'kits')
  assert.equal(c('BANCA MOVIL TRANSFERENCIA DE ELODIA MENDOZA Inscripcion Campeonato Internaci', 98), 'resguardo_cc')
  assert.equal(c('BANCA EN LINEA TRANSFERENCIA A 0351011219550 F&amp;F SOLUCIONES INTEGRALES, S.A.', -4000), 'intercompania')
  assert.equal(c('ACH XPRESS - ALOHA', 5000), 'traspaso_propio')
  assert.equal(c('ACH XPRESS A FAVOR DE ALOHA', -5000), 'traspaso_propio')
  assert.equal(c('BANCA EN LINEA TRANSFERENCIA A 0306010947940 INVERSIONES BRISAS CENTER, S.A.', -2400), 'alquiler')
  assert.equal(c('BANCA EN LINEA ANIP - PAGOS DE IMPUESTOS 01557682610002002025', -963.77), 'impuesto')
  assert.equal(c('COMISION TRANSACCIONES YAPPY ALOHAMentalArithmetic', -14.77), 'servicios')
  assert.equal(c('DEPOSITO YAPPY - ALOHAMentalArithmetic (16 TRANSACCIONES)', 1378.08), 'ingreso')
  assert.equal(c('REMISIÓN V/MC 016030671 LIQ. NO. 3771441', 1429.3), 'ingreso')
  assert.equal(c('BANCA EN LINEA TRANSFERENCIA A 0472 ALGUIEN NUEVO', -80), 'por_clasificar')
})

test('una regla de empresa no aplica a la otra y el signo se respeta', () => {
  const r = [{ id: 1, patron: 'ALGO RARO', empresa: 'ff', signo: -1, clase: 'kits', categoria: 'X', prioridad: 1 }]
  assert.equal(clasificar({ memo: 'algo raro', monto: -1 }, r, 'altavia').clase, 'por_clasificar')
  assert.equal(clasificar({ memo: 'algo raro', monto: 1 }, r, 'ff').clase, 'por_clasificar')
  assert.deepEqual(clasificar({ memo: 'algo raro', monto: -1 }, r, 'ff'), { clase: 'kits', categoria: 'X', regla_id: 1 })
})

test('toda regla semilla usa una clase conocida', () => {
  for (const r of REGLAS_SEMILLA) assert.ok(CLASES[r.clase], r.patron)
})

// Ajustes tras correr la semilla contra los extractos reales de Altavia (feb–sep 2026).
test('ACH XPRESS de St. Georges a una persona NO es traspaso propio', () => {
  // 5-abr-2026: 15.000 salieron a personas, no a Banco General de Altavia (no hay entrada pareja).
  assert.equal(c('ACH XPRESS A FAVOR DE FERNANDO PEREZ', -5000), 'por_clasificar')
  assert.equal(c('ACH XPRESS A FAVOR DE JUAN DIEGO CEDENO', -3750), 'por_clasificar')
  assert.equal(c('ACH XPRESS A FAVOR DE ALTAVIA GROUP S A', -5000), 'traspaso_propio')
})

test('C Y C escrito sin & es el mismo proveedor C&C', () => {
  assert.equal(c('ACH A FAVOR DE C Y C SOLUCIONES INTEGRAL', -10000), 'kits')
})

test('el pago de la Visa gana aunque el titular sea Movemedia', () => {
  assert.equal(c('BANCA EN LINEA PAGO VISA 4941-62XX-XXXX-0865 MOVEMEDIA, S.A.', -116.46), 'operativo_otro')
})
