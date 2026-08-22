import test from 'node:test'
import assert from 'node:assert/strict'

import { asignarHuellas, huellaDe, normalizarDescripcion } from '../lib/conciliacion/huella.mjs'
import { clasificar, clasificarLote, coincide, reglaValida, ordenarReglas } from '../lib/conciliacion/reglas.mjs'
import { payloadBancario } from '../lib/conciliacion/zoho-payload.mjs'

const mov = (over = {}) => ({
  fecha: '2026-08-01',
  descripcion: 'PAGO ACH NOMINA QUINCENA',
  referencia: '000123',
  monto: 125.5,
  direccion: 'salida',
  ...over,
})

// ── Huella ───────────────────────────────────────────────────────────────────

test('la huella ignora tildes, mayúsculas y espacios de más', () => {
  const a = huellaDe(mov({ descripcion: 'Depósito  CLIENTE' }))
  const b = huellaDe(mov({ descripcion: 'deposito cliente' }))
  assert.equal(a, b)
})

test('la huella distingue fecha, monto y dirección', () => {
  const base = huellaDe(mov())
  assert.notEqual(base, huellaDe(mov({ fecha: '2026-08-02' })))
  assert.notEqual(base, huellaDe(mov({ monto: 125.51 })))
  assert.notEqual(base, huellaDe(mov({ direccion: 'entrada' })))
})

// Dos pagos idénticos el mismo día son movimientos distintos, no un duplicado.
test('líneas idénticas del extracto reciben huellas distintas por ocurrencia', () => {
  const [a, b] = asignarHuellas([mov(), mov()])
  assert.notEqual(a.huella, b.huella)
  assert.equal(a.ocurrencia, 1)
  assert.equal(b.ocurrencia, 2)
})

test('resubir el mismo archivo reproduce exactamente las mismas huellas', () => {
  const primera = asignarHuellas([mov(), mov(), mov({ monto: 80 })])
  const segunda = asignarHuellas([mov(), mov(), mov({ monto: 80 })])
  assert.deepEqual(primera.map((m) => m.huella), segunda.map((m) => m.huella))
})

test('normalizarDescripcion aguanta nulos', () => {
  assert.equal(normalizarDescripcion(null), '')
  assert.equal(normalizarDescripcion(undefined), '')
})

// ── Reglas ───────────────────────────────────────────────────────────────────

test('los cuatro modos de coincidencia', () => {
  const m = mov()
  assert.ok(coincide({ patron: 'ACH NOMINA', modo: 'contiene' }, m))
  assert.ok(coincide({ patron: 'PAGO', modo: 'empieza' }, m))
  assert.ok(coincide({ patron: 'QUINCENA', modo: 'termina' }, m))
  assert.ok(coincide({ patron: 'nomina pago', modo: 'palabras' }, m))
  assert.ok(!coincide({ patron: 'ALQUILER', modo: 'contiene' }, m))
})

test('"contiene" también mira la referencia; "termina" solo la descripción', () => {
  assert.ok(coincide({ patron: '000123', modo: 'contiene' }, mov()))
  // Si "termina" concatenara la referencia, el patrón real nunca calzaría
  // porque la línea acabaría en el número de documento.
  assert.ok(coincide({ patron: 'QUINCENA', modo: 'termina' }, mov()))
  assert.ok(!coincide({ patron: '000123', modo: 'termina' }, mov()))
})

test('una regla de entrada no clasifica una salida', () => {
  assert.ok(!coincide({ patron: 'ACH', modo: 'contiene', direccion: 'entrada' }, mov()))
  assert.ok(coincide({ patron: 'ACH', modo: 'contiene', direccion: 'salida' }, mov()))
  assert.ok(coincide({ patron: 'ACH', modo: 'contiene', direccion: 'ambas' }, mov()))
})

test('la regla más específica gana a la genérica con igual prioridad', () => {
  const reglas = [
    { id: 1, patron: 'ACH', modo: 'contiene', zoho_account_id: '10', zoho_account_name: 'Otros gastos' },
    { id: 2, patron: 'ACH NOMINA', modo: 'contiene', zoho_account_id: '20', zoho_account_name: 'Sueldos' },
  ]
  assert.equal(clasificar(mov(), reglas).zoho_account_id, '20')
})

test('la prioridad manda sobre la especificidad', () => {
  const reglas = [
    { id: 1, patron: 'ACH', modo: 'contiene', zoho_account_id: '10', prioridad: 5 },
    { id: 2, patron: 'ACH NOMINA', modo: 'contiene', zoho_account_id: '20', prioridad: 0 },
  ]
  assert.equal(clasificar(mov(), reglas).zoho_account_id, '10')
})

test('una regla inactiva no clasifica', () => {
  const reglas = [{ id: 1, patron: 'ACH', modo: 'contiene', zoho_account_id: '10', activa: false }]
  assert.equal(ordenarReglas(reglas).length, 0)
  assert.equal(clasificar(mov(), reglas).origen, 'ninguno')
})

test('sin regla cae en la cuenta puente según la dirección', () => {
  const defaults = { cuenta_gasto_id: '55', cuenta_gasto_nombre: 'Gastos por clasificar', cuenta_ingreso_id: '66', cuenta_ingreso_nombre: 'Ingresos por clasificar' }
  assert.equal(clasificar(mov({ descripcion: 'ALGO RARO' }), [], defaults).zoho_account_id, '55')
  assert.equal(clasificar(mov({ descripcion: 'ALGO RARO', direccion: 'entrada' }), [], defaults).zoho_account_id, '66')
})

// Sin regla y sin puente nunca se inventa una cuenta: el movimiento se queda
// esperando decisión humana en vez de ensuciar el libro mayor.
test('sin regla ni puente el movimiento queda sin_clasificar', () => {
  const [m] = clasificarLote([mov({ descripcion: 'ALGO RARO' })], [], {})
  assert.equal(m.estado, 'sin_clasificar')
  assert.equal(m.zoho_account_id, null)
})

test('reglaValida exige patrón, modo y cuenta', () => {
  assert.ok(reglaValida({ patron: 'ACH', modo: 'contiene', zoho_account_id: '1' }))
  assert.ok(!reglaValida({ patron: '  ', modo: 'contiene', zoho_account_id: '1' }))
  assert.ok(!reglaValida({ patron: 'ACH', modo: 'regex', zoho_account_id: '1' }))
  assert.ok(!reglaValida({ patron: 'ACH', modo: 'contiene', zoho_account_id: '' }))
})

// ── Payload de Zoho ──────────────────────────────────────────────────────────

// Invertir from/to registra el asiento al revés; por eso va explícito.
test('una salida sale del banco hacia la cuenta de gasto', () => {
  const p = payloadBancario({ ...mov(), zoho_account_id: '20' }, 'BANCO1')
  assert.equal(p.transaction_type, 'expense')
  assert.equal(p.from_account_id, 'BANCO1')
  assert.equal(p.to_account_id, '20')
  assert.equal(p.amount, 125.5)
  assert.equal(p.date, '2026-08-01')
})

test('una entrada sale de la cuenta de ingreso hacia el banco', () => {
  const p = payloadBancario({ ...mov({ direccion: 'entrada' }), zoho_account_id: '66' }, 'BANCO1')
  assert.equal(p.transaction_type, 'deposit')
  assert.equal(p.from_account_id, '66')
  assert.equal(p.to_account_id, 'BANCO1')
})

test('el tipo de la regla manda sobre el derivado de la dirección', () => {
  const p = payloadBancario({ ...mov(), zoho_account_id: '20', transaction_type: 'card_payment' }, 'BANCO1')
  assert.equal(p.transaction_type, 'card_payment')
})

test('el payload se niega a armarse incompleto', () => {
  assert.throws(() => payloadBancario({ ...mov(), zoho_account_id: '20' }, ''), /cuenta bancaria/)
  assert.throws(() => payloadBancario({ ...mov() }, 'BANCO1'), /cuenta contable/)
  assert.throws(() => payloadBancario({ ...mov(), zoho_account_id: '20', monto: 0 }, 'BANCO1'), /monto/)
  assert.throws(() => payloadBancario({ ...mov(), zoho_account_id: '20', fecha: '01/08/2026' }, 'BANCO1'), /fecha/)
})
