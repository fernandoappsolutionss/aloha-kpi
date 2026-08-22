import test from 'node:test'
import assert from 'node:assert/strict'

import { conciliar, resumenLote, direccionZoho, normalizarTransaccionZoho } from '../lib/conciliacion/conciliar.mjs'
import { asignarHuellas } from '../lib/conciliacion/huella.mjs'
import { analizarExtracto } from '../lib/conciliacion/index.mjs'

const mov = (over = {}) => ({
  fecha: '2026-08-01',
  descripcion: 'PAGO ACH NOMINA',
  referencia: '000123',
  monto: 125.5,
  direccion: 'salida',
  estado: 'nuevo',
  ...over,
})

const zohoTxn = (over = {}) => ({
  transaction_id: 'Z1',
  date: '2026-08-01',
  amount: 125.5,
  transaction_type: 'expense',
  reference_number: '000123',
  description: 'Pago nómina',
  ...over,
})

test('la dirección de una transacción de Zoho sale del tipo y, si falta, del debe/haber', () => {
  assert.equal(direccionZoho({ transaction_type: 'deposit' }), 'entrada')
  assert.equal(direccionZoho({ transaction_type: 'expense' }), 'salida')
  assert.equal(direccionZoho({ debit_or_credit: 'credit' }), 'entrada')
  assert.equal(direccionZoho({ debit_or_credit: 'debit' }), 'salida')
  assert.equal(direccionZoho({}), null)
})

test('normalizar una transacción de Zoho tolera el id alterno y el monto negativo', () => {
  const t = normalizarTransaccionZoho({ banktransaction_id: 'Z9', amount: -50, date: '2026-08-01T00:00:00-0500' })
  assert.equal(t.transaction_id, 'Z9')
  assert.equal(t.monto, 50)
  assert.equal(t.fecha, '2026-08-01')
})

test('lo que ya está en Zoho no se vuelve a registrar', () => {
  const [m] = conciliar([mov()], [zohoTxn()])
  assert.equal(m.estado, 'ya_en_zoho')
  assert.equal(m.zoho_transaction_id, 'Z1')
})

// El banco fecha el movimiento cuando compensa; Zoho lo tiene con la fecha del
// documento. Sin tolerancia, todo se registraría dos veces.
test('concilia con desfase de fecha dentro de la tolerancia y no fuera', () => {
  assert.equal(conciliar([mov()], [zohoTxn({ date: '2026-08-03' })])[0].estado, 'ya_en_zoho')
  assert.equal(conciliar([mov()], [zohoTxn({ date: '2026-08-06' })])[0].estado, 'nuevo')
})

test('un monto distinto no concilia', () => {
  assert.equal(conciliar([mov()], [zohoTxn({ amount: 125.51 })])[0].estado, 'nuevo')
})

test('una entrada no concilia contra un gasto del mismo monto', () => {
  const [m] = conciliar([mov({ direccion: 'entrada' })], [zohoTxn()])
  assert.equal(m.estado, 'nuevo')
})

// Dos pagos iguales el mismo día contra UN solo asiento en Zoho: uno concilia
// y el otro queda pendiente. Consumir el asiento dos veces perdería un pago.
test('cada transacción de Zoho se consume una sola vez', () => {
  const estados = conciliar([mov(), mov()], [zohoTxn()]).map((m) => m.estado)
  assert.deepEqual(estados, ['ya_en_zoho', 'nuevo'])
})

test('con varios candidatos gana el de la misma referencia', () => {
  const [m] = conciliar([mov()], [
    zohoTxn({ transaction_id: 'ZA', reference_number: '999', date: '2026-08-01' }),
    zohoTxn({ transaction_id: 'ZB', reference_number: '000123', date: '2026-08-02' }),
  ])
  assert.equal(m.zoho_transaction_id, 'ZB')
})

test('una huella ya importada se marca duplicado sin tocar Zoho', () => {
  const [conHuella] = asignarHuellas([mov()])
  const [m] = conciliar([conHuella], [], { huellasPrevias: new Set([conHuella.huella]) })
  assert.equal(m.estado, 'duplicado')
})

test('un movimiento ya publicado o ignorado no se reevalúa', () => {
  const publicado = mov({ estado: 'publicado', zoho_transaction_id: 'ZX' })
  assert.equal(conciliar([publicado], [zohoTxn()])[0].estado, 'publicado')
  assert.equal(conciliar([mov({ estado: 'ignorado' })], [zohoTxn()])[0].estado, 'ignorado')
})

test('el resumen cuadra estados y totales', () => {
  const r = resumenLote([
    mov({ estado: 'nuevo', direccion: 'entrada', monto: 100 }),
    mov({ estado: 'sin_clasificar' }),
    mov({ estado: 'ya_en_zoho' }),
    mov({ estado: 'duplicado' }),
  ])
  assert.equal(r.total, 4)
  assert.equal(r.nuevos, 1)
  assert.equal(r.sin_clasificar, 1)
  assert.equal(r.ya_en_zoho, 1)
  assert.equal(r.duplicados, 1)
  assert.equal(r.entradas, 100)
  assert.equal(r.salidas, 376.5)
})

// ── Extremo a extremo del núcleo ─────────────────────────────────────────────

const EXTRACTO = [
  'BANCO GENERAL, S.A.',
  'Cuenta corriente: xxxx9550',
  '',
  'Fecha,Descripción,Referencia,Débito,Crédito,Saldo Total',
  '01/08/2026,DEPOSITO ACH COLEGIATURA,000900,,"1,250.00","1,250.00"',
  '02/08/2026,PAGO ACH NOMINA QUINCENA,000901,"1,000.00",,250.00',
  '03/08/2026,COMISION MANEJO DE CUENTA,,15.00,,235.00',
  '05/08/2026,PAGO ACH NOMINA QUINCENA,000902,"1,000.00",,-765.00',
  ',TOTALES,,"2,015.00","1,250.00",',
].join('\n')

const REGLAS = [
  { id: 1, patron: 'ACH NOMINA', modo: 'contiene', direccion: 'salida', zoho_account_id: 'GASTO-NOMINA', zoho_account_name: 'Sueldos', prioridad: 0 },
  { id: 2, patron: 'COLEGIATURA', modo: 'contiene', direccion: 'entrada', zoho_account_id: 'ING-COLEG', zoho_account_name: 'Ingresos por colegiatura', prioridad: 0 },
]

test('extracto completo: clasifica, concilia y descarta el pie de totales', () => {
  const res = analizarExtracto(EXTRACTO, {
    reglas: REGLAS,
    defaults: { cuenta_gasto_id: 'GASTO-PUENTE', cuenta_gasto_nombre: 'Gastos por clasificar' },
    // Zoho ya tiene el depósito del día 1 (lo trajo el feed del banco).
    transaccionesZoho: [{ transaction_id: 'Z1', date: '2026-08-01', amount: 1250, transaction_type: 'deposit', reference_number: '000900' }],
  })
  assert.equal(res.error, undefined)
  assert.equal(res.movimientos.length, 4)
  assert.equal(res.descartadas.length, 1) // el pie "TOTALES"
  assert.deepEqual(res.periodo, { desde: '2026-08-01', hasta: '2026-08-05' })

  const [deposito, nomina1, comision, nomina2] = res.movimientos
  assert.equal(deposito.estado, 'ya_en_zoho')
  assert.equal(deposito.zoho_transaction_id, 'Z1')
  assert.equal(nomina1.estado, 'nuevo')
  assert.equal(nomina1.zoho_account_id, 'GASTO-NOMINA')
  assert.equal(comision.zoho_account_id, 'GASTO-PUENTE') // sin regla: cuenta puente
  assert.equal(nomina2.monto, 1000)
  // Dos nóminas iguales pero de días distintos: huellas distintas, ambas van.
  assert.notEqual(nomina1.huella, nomina2.huella)

  assert.equal(res.resumen.nuevos, 3)
  assert.equal(res.resumen.ya_en_zoho, 1)
  assert.equal(res.resumen.entradas, 1250)
  assert.equal(res.resumen.salidas, 2015)
})

test('resubir el mismo extracto no propone nada nuevo', () => {
  const primera = analizarExtracto(EXTRACTO, { reglas: REGLAS, defaults: { cuenta_gasto_id: 'GASTO-PUENTE' } })
  const huellas = new Set(primera.movimientos.map((m) => m.huella))
  const segunda = analizarExtracto(EXTRACTO, { reglas: REGLAS, defaults: { cuenta_gasto_id: 'GASTO-PUENTE' }, huellasPrevias: huellas })
  assert.equal(segunda.resumen.nuevos, 0)
  assert.equal(segunda.resumen.duplicados, 4)
})

test('un archivo sin columnas reconocibles explica qué se leyó', () => {
  const res = analizarExtracto('hola,mundo\n1,2\n')
  assert.match(res.error, /No se reconocieron las columnas/)
  assert.match(res.error, /hola \| mundo/)
})

test('un archivo vacío no revienta', () => {
  assert.match(analizarExtracto('').error, /vac/)
})

// ── Fechas que vienen de la base ─────────────────────────────────────────────

// El driver de Postgres entrega una columna DATE como objeto Date. Recortar su
// String() da "Fri Aug 01", que no pasa la validación del payload de Zoho: sin
// esta normalización, TODOS los movimientos fallarían al publicarse.
test('una columna DATE llega como Date y se normaliza a ISO', async () => {
  const { fechaISO } = await import('../lib/conciliacion/fecha-db.mjs')
  assert.equal(fechaISO(new Date(2026, 7, 1)), '2026-08-01')
  assert.equal(fechaISO('2026-08-01'), '2026-08-01')
  assert.equal(fechaISO('2026-08-01T00:00:00.000Z'), '2026-08-01')
  assert.equal(fechaISO(null), null)
  assert.equal(fechaISO(''), null)
  assert.equal(fechaISO(new Date('no es fecha')), null)
  assert.equal(fechaISO('01/08/2026'), null)
})

test('el payload de Zoho acepta la fecha ya normalizada y rechaza la cruda', async () => {
  const { fechaISO } = await import('../lib/conciliacion/fecha-db.mjs')
  const { payloadBancario } = await import('../lib/conciliacion/zoho-payload.mjs')
  const crudo = new Date(2026, 7, 1)
  assert.throws(() => payloadBancario({ ...mov(), fecha: String(crudo).slice(0, 10), zoho_account_id: '9' }, 'B1'), /fecha/)
  assert.equal(payloadBancario({ ...mov(), fecha: fechaISO(crudo), zoho_account_id: '9' }, 'B1').date, '2026-08-01')
})
