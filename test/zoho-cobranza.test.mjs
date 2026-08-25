import test from 'node:test'
import assert from 'node:assert/strict'
import { ORGS_ZOHO, clasificarCentro, semanaDiaKpi, vencidaElDia } from '../lib/zoho-cobranza.mjs'

const ORG_FF = ORGS_ZOHO.find((o) => o.orgId === '667522360')
const ORG_ALTAVIA = ORGS_ZOHO.find((o) => o.orgId === '903355420')
const ORG_VA = ORGS_ZOHO.find((o) => o.orgId === '886209250')

test('semanaDiaKpi — agosto 2026 (empieza sábado)', () => {
  assert.equal(semanaDiaKpi('2026-08-01'), null) // sábado
  assert.equal(semanaDiaKpi('2026-08-02'), null) // domingo
  assert.deepEqual(semanaDiaKpi('2026-08-03'), { semana: 1, dia: 1 })
  assert.deepEqual(semanaDiaKpi('2026-08-07'), { semana: 1, dia: 5 })
  assert.deepEqual(semanaDiaKpi('2026-08-14'), { semana: 2, dia: 5 })
  assert.deepEqual(semanaDiaKpi('2026-08-24'), { semana: 4, dia: 1 })
  assert.deepEqual(semanaDiaKpi('2026-08-31'), { semana: 5, dia: 1 })
})

test('semanaDiaKpi — mes que empieza entre martes y viernes abre semana 1', () => {
  // septiembre 2026 empieza martes: el fragmento mar-vie es la semana 1.
  assert.deepEqual(semanaDiaKpi('2026-09-01'), { semana: 1, dia: 2 })
  assert.deepEqual(semanaDiaKpi('2026-09-04'), { semana: 1, dia: 5 })
  assert.deepEqual(semanaDiaKpi('2026-09-07'), { semana: 2, dia: 1 })
})

test('semanaDiaKpi — mes que empieza lunes o viernes', () => {
  // junio 2026 empieza lunes.
  assert.deepEqual(semanaDiaKpi('2026-06-01'), { semana: 1, dia: 1 })
  // mayo 2026 empieza viernes: ese único día es la semana 1.
  assert.deepEqual(semanaDiaKpi('2026-05-01'), { semana: 1, dia: 5 })
  assert.deepEqual(semanaDiaKpi('2026-05-04'), { semana: 2, dia: 1 })
  assert.deepEqual(semanaDiaKpi('2026-05-29'), { semana: 5, dia: 5 })
})

test('clasificarCentro — F&F por prefijo de referencia', () => {
  assert.equal(clasificarCentro(ORG_FF, { reference_number: 'Calle50-Kids-01' }), 3)
  assert.equal(clasificarCentro(ORG_FF, { reference_number: 'David-1Tiny' }), 5)
  // factura entre empresas: no clasifica y NO cuenta para ningún centro
  assert.equal(clasificarCentro(ORG_FF, { reference_number: 'ALTAVIA Br. An.Corte 35' }), null)
})

test('clasificarCentro — Altavia por referencia, vendedor o dirección', () => {
  assert.equal(clasificarCentro(ORG_ALTAVIA, { reference_number: 'Mensualidad Kids Anclas ' }), 2)
  assert.equal(clasificarCentro(ORG_ALTAVIA, { reference_number: 'Matrícula', salesperson_name: 'Centro de Brisas' }), 1)
  assert.equal(clasificarCentro(ORG_ALTAVIA, {
    reference_number: 'Matrícula 3er Ciclo Kids',
    salesperson_name: 'Otros',
    billing_address: { address: 'Brisas del Golf San Miguelito' },
  }), 1)
  // "ancla" en la referencia gana aunque la dirección diga Brisas
  assert.equal(clasificarCentro(ORG_ALTAVIA, {
    reference_number: 'Mensualidad Anclas',
    billing_address: { address: 'Brisas del Golf' },
  }), 2)
})

test('clasificarCentro — org de un solo centro recibe todo', () => {
  assert.equal(clasificarCentro(ORG_VA, { reference_number: 'lo que sea' }), 6)
})

test('vencidaElDia — reglas de vencimiento', () => {
  const base = { status: 'overdue', due_date: '2026-08-10' }
  assert.equal(vencidaElDia(base, '2026-08-10'), false) // el mismo día aún no
  assert.equal(vencidaElDia(base, '2026-08-11'), true)
  assert.equal(vencidaElDia({ ...base, status: 'paid', last_payment_date: '2026-08-15' }, '2026-08-14'), true)
  assert.equal(vencidaElDia({ ...base, status: 'paid', last_payment_date: '2026-08-15' }, '2026-08-16'), false)
  assert.equal(vencidaElDia({ ...base, status: 'paid', last_payment_date: '' }, '2026-08-14'), false)
  assert.equal(vencidaElDia({ ...base, status: 'void' }, '2026-08-14'), false)
  assert.equal(vencidaElDia({ status: 'sent', due_date: '2026-08-30' }, '2026-08-14'), false)
})
