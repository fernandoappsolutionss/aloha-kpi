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
  assert.equal(c('ACH XPRESS A FAVOR DE MARIA LOPEZ', -800), 'por_clasificar')
  assert.equal(c('ACH XPRESS A FAVOR DE ALTAVIA GROUP S A', -5000), 'traspaso_propio')
})

test('Altavia: los ACH XPRESS del 5-abr a los socios son reparto al dueño (Fernando)', () => {
  const r = (memo) => clasificar({ memo, monto: -3750 }, reglas, 'altavia')
  for (const socio of ['FERNANDO PEREZ', 'FREDERICK ROBERTS', 'JUAN DIEGO CEDENO']) {
    assert.deepEqual([r(`ACH XPRESS A FAVOR DE ${socio}`).clase, r(`ACH XPRESS A FAVOR DE ${socio}`).categoria], ['dueno', 'Reparto a socios'], socio)
  }
  // Solo Altavia y solo salidas: en F&F no se decidió todavía.
  assert.equal(c('ACH XPRESS A FAVOR DE FERNANDO PEREZ', -5000, 'ff'), 'por_clasificar')
  // Los honorarios de Frederick por Banco General siguen siendo planilla.
  assert.equal(c('BANCA EN LINEA TRANSFERENCIA A 0438990470387 FREDERICK MOISES ROBERTS VENCE CEO', -244.91), 'planilla')
  assert.equal(c('BANCA EN LINEA TRANSFERENCIA A 0438990470387 FREDERICK MOISES ROBERTS VENCE CEO', -244.91, 'ff'), 'planilla')
})

// F&F: extractos reales Banco General …9550 (OFX) y St. Georges …8094 (Excel), ene–24 sep 2026.
const ff = (memo, monto) => clasificar({ memo, monto }, reglas, 'ff')

test('F&F: St. Georges barre a Banco General y la entrada pareja también es traspaso propio', () => {
  // 26 pares mismo día y mismo monto (116.300 en el año), p. ej. 5.000 el 24-sep.
  assert.equal(ff('ACH XPRESS A FAVOR DE FYF SOLUCIONES INTEGRALES', -5000).clase, 'traspaso_propio')
  assert.equal(ff('ACH A FAVOR DE F Y F SOLUCIONES INTEGRAL', -5000).clase, 'traspaso_propio')
  assert.equal(ff('ACH XPRESS - ALOHA PANAMA', 5000).clase, 'traspaso_propio')
  assert.equal(ff('ACH - F Y F SOLUCIONES', 10000).clase, 'traspaso_propio')
  // En Altavia un ACH de F&F sigue siendo intercompañía.
  assert.equal(c('ACH A FAVOR DE F Y F SOLUCIONES INTEGRAL', -5000), 'intercompania')
})

test('V & A (Condado del Rey) es intercompañía en las dos empresas y en los dos sentidos', () => {
  const memo = 'BANCA EN LINEA TRANSFERENCIA A 0349000000087 V & A SOLUCIONES INTEGRALES S.A. (ALOHA MENTAL'
  assert.equal(ff(memo, -2500).clase, 'intercompania')
  assert.equal(ff('BANCA EN LINEA TRANSFERENCIA DE V & A SOLUCIONES INTEGRALES S.A. (ALOHA MENTAL ARITHMETIC', 108).clase, 'intercompania')
  assert.equal(c(memo, -2500), 'intercompania')
})

test('F&F: servicios, CSS, municipio, seguros, préstamos y tarjeta', () => {
  const cat = (memo, monto) => { const r = ff(memo, monto); return `${r.clase}/${r.categoria}` }
  assert.equal(cat('BANCA EN LÍNEA NATURGY (EDEMET-EDECHI) (6112866)', -458.12), 'servicios/Luz')
  assert.equal(cat('PAGO CSS (CAJA DE SEGURO SOCIAL) - (28627924)', -468.41), 'planilla/CSS')
  // La comisión de pagar la CSS es del banco, no de la planilla.
  assert.equal(cat('COMISION IMPUESTO CSS (CAJA DE SEGURO SOCIAL)', -3.21), 'servicios/Comisiones bancarias')
  assert.equal(cat('BANCA EN LINEA BANCO NACIONAL 10000042761 TESORO MUNICIPAL DE DAVID', -1263.6), 'impuesto/Municipio')
  assert.equal(cat('BANCA EN LINEA TRANSFERENCIA A 0310010017442 ASEGURADORA ANCON, S.A. SEGURO DE ACCIDENTE', -192.5), 'servicios/Seguros')
  assert.equal(cat('BANCA EN LINEA ASEGURADORA ANCON (04230008001)', -217), 'servicios/Seguros')
  assert.equal(cat('PAGOS PR. 0792090593109', -2503.82), 'operativo_otro/Préstamos BG')
  assert.equal(cat('PAGO A PRESTAMO 0792090598485', -77.04), 'operativo_otro/Préstamos BG')
  assert.equal(cat('CANCELACION PR. 0792090598485', -1963.33), 'operativo_otro/Préstamos BG')
  // MASTER, S.A. es el titular de la Visa …9250 que ambas empresas pagan con "PAGO VISA".
  assert.equal(cat('BANCA EN LINEA PAGO VISA 4931-22XX-XXXX-9250 MASTER, S.A.', -791.59), 'operativo_otro/Tarjeta Visa')
  assert.equal(cat('BANCA EN LINEA TRANSFERENCIA A 0303010025244 MASTER, S.A. (MASTER SERVICES) FACEBOOK', -938.47), 'operativo_otro/Tarjeta Visa')
})

test('F&F: alquileres Indaluz y fideicomiso BG Trust, seguro Grupo Vive (Fernando, 24-sep)', () => {
  const cat = (memo, monto) => { const r = ff(memo, monto); return `${r.clase}/${r.categoria}` }
  assert.equal(cat('BANCA EN LINEA BANISTMO S.A. 100010496 INDALUZ', -1322.52), 'alquiler/Alquiler (Indaluz)')
  assert.equal(cat('BANCA EN LINEA TRANSFERENCIA A 0472994536330 BG TRUST INC. FID (0115-GTIA-15) (DESAROLLOS', -1331.29), 'alquiler/Alquiler (fideicomiso BG Trust)')
  assert.equal(cat('BANCA EN LINEA METROBANK 101046654 Grupo Vive', -187.25), 'servicios/Seguros')
})

test('Inversiones y Desarrollo Educativo es marketing en las dos empresas; lo que devuelven sigue como cobro', () => {
  const memo = 'BANCA EN LINEA TRANSFERENCIA A 0418963165770 INVERSIONES Y DESARROLLO EDUCATIVO, S.A. PLAT'
  assert.deepEqual(clasificar({ memo, monto: -775.38 }, reglas, 'altavia').categoria, 'Marketing')
  assert.deepEqual(ff(memo, -780.37).clase, 'operativo_otro')
  assert.equal(c('BANCA EN LINEA TRANSFERENCIA DE INVERSIONES Y DESARROLLO EDUCATIVO, S.A. INGRESO NO GANADO', 120), 'ingreso')
})

test('C Y C escrito sin & es el mismo proveedor C&C', () => {
  assert.equal(c('ACH A FAVOR DE C Y C SOLUCIONES INTEGRAL', -10000), 'kits')
})

test('el pago de la Visa gana aunque el titular sea Movemedia', () => {
  assert.equal(c('BANCA EN LINEA PAGO VISA 4941-62XX-XXXX-0865 MOVEMEDIA, S.A.', -116.46), 'operativo_otro')
})

test('F&F: la afiliación POS de Banco General es comisión y el "PAGO FEE" a C&C es regalía', () => {
  assert.equal(ff('COBRO AFILIAC001 908351310', -25).categoria, 'Comisiones bancarias')
  // 30-may-2026: la regalía de mayo salió como "PAGO FEE CALL…" y caía en kits.
  assert.equal(ff('BANCA EN LINEA TRANSFERENCIA A 0318011050715 C&C SOLUCIONES INTEGRALES, S.A. PAGO FEE CALL', -4230.9).clase, 'regalia')
  assert.equal(ff('BANCA EN LINEA TRANSFERENCIA A 0318011050715 C&C SOLUCIONES INTEGRALES, S.A. PAGO OC 1028', -3542).clase, 'kits')
})
