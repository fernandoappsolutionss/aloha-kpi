import test from 'node:test'
import assert from 'node:assert/strict'
import { COMPROMISOS, CUENTAS } from '../lib/caja/semilla-datos.mjs'
import { CLASES } from '../lib/caja/reglas.mjs'

const mensual = (c) => (c.frecuencia === 'quincenal' ? 2 * c.monto : c.frecuencia === 'mensual' ? c.monto : 0)

test('los pagos programados de F&F salen de sus extractos (jun–ago 2026), no de estimaciones de Zoho', () => {
  const ff = COMPROMISOS.filter((c) => c.empresa === 'ff')
  assert.deepEqual(ff.filter((c) => /estimad/i.test(c.concepto)).map((c) => c.concepto), [])
  // Egreso mensual medido en Banco General + St. Georges: 30.538,88 (Zoho estimaba 32.185,93).
  const total = ff.reduce((s, c) => s + mensual(c), 0)
  assert.equal(Math.round(total * 100) / 100, 30538.88)
})

test('todo pago programado usa una clase de egreso y su día o fecha', () => {
  const noCompromiso = ['ingreso', 'por_clasificar', 'traspaso_propio', 'resguardo_cc', 'intercompania', 'dueno']
  for (const c of COMPROMISOS) {
    assert.ok(CLASES[c.clase] && !noCompromiso.includes(c.clase), c.concepto)
    assert.ok(c.monto > 0, c.concepto)
    if (c.frecuencia === 'mensual') assert.ok(c.dia >= 1 && c.dia <= 31, c.concepto)
    if (c.frecuencia === 'unico') assert.match(c.fecha, /^\d{4}-\d{2}-\d{2}$/, c.concepto)
  }
})

test('Inversiones y Desarrollo Educativo es marketing en Altavia (Fernando, 24-sep)', () => {
  const ide = COMPROMISOS.find((c) => c.empresa === 'altavia' && /Inversiones y Desarrollo/.test(c.concepto))
  assert.equal(ide.categoria, 'Marketing')
  assert.doesNotMatch(ide.concepto, /por confirmar/)
})

test('el ancla de F&F Banco General es el saldo del OFX real, no el de Zoho', () => {
  const bg = CUENTAS.find((c) => c.numero === '03-51-01-121955-0')
  assert.deepEqual([bg.saldo_ancla, bg.saldo_ancla_fecha], [6238.55, '2026-09-24'])
})
