import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_COTIZACIONES,
  MAX_UPLOAD_ATTEMPTS,
  normalizeSupplierName,
  normalizeFiscalId,
  validateSupplier,
  supplierIdentityKey,
  validateSubmission,
  submissionErrorMessage,
  canAddQuote,
} from '../lib/peticiones-domain.mjs'

const quote = (id, extra = {}) => ({
  proveedor_razon_social: `Proveedor ${id}`,
  proveedor_pais: 'PA',
  proveedor_id_fiscal: id,
  empresa_constituida: true,
  emite_factura_fiscal: true,
  upload_status: 'valid',
  archivo_sha256: `hash-${id}`,
  ...extra,
})

test('normaliza variantes triviales de razón social e identificación fiscal', () => {
  assert.equal(normalizeSupplierName('  Reparación Ágil, S.A. '), 'reparacion agil s a')
  assert.equal(normalizeFiscalId(' ruc-155-123 '), 'RUC155123')
  assert.equal(supplierIdentityKey(quote(' RUC-1 ')), 'PA:RUC1')
})

test('acepta códigos ISO reales y rechaza países ficticios', () => {
  assert.equal(validateSupplier(quote('1', { proveedor_pais: 'PA' })), true)
  assert.equal(validateSupplier(quote('2', { proveedor_pais: 'VE' })), true)
  assert.equal(validateSupplier(quote('3', { proveedor_pais: 'ZZ' })), false)
  const variants = validateSubmission({
    texto: 'Reparar', categoria: 'reparacion', cotizaciones: [
      quote('1', { proveedor_pais: 'PA', proveedor_id_fiscal: '155' }),
      quote('2', { proveedor_pais: 'ZZ', proveedor_id_fiscal: '155' }),
      quote('3', { proveedor_pais: 'XX', proveedor_id_fiscal: '155' }),
    ],
  })
  assert.ok(variants.includes('proveedor_invalido'))
  assert.ok(variants.includes('minimo_tres'))
})

test('exige tres proveedores fiscales distintos y PDF distinto', () => {
  const valid = validateSubmission({ texto: 'Reparar fregador', categoria: 'reparacion', cotizaciones: [quote('1'), quote('2'), quote('3')] })
  assert.deepEqual(valid, [])
  const duplicateSupplier = validateSubmission({ texto: 'x', categoria: 'reparacion', cotizaciones: [quote('1'), quote('1', { archivo_sha256: 'otro' }), quote('3')] })
  assert.ok(duplicateSupplier.includes('proveedor_duplicado'))
  const duplicatePdf = validateSubmission({ texto: 'x', categoria: 'reparacion', cotizaciones: [quote('1'), quote('2', { archivo_sha256: 'hash-1' }), quote('3')] })
  assert.ok(duplicatePdf.includes('pdf_duplicado'))
  const withFailedAttempt = validateSubmission({
    texto: 'x', categoria: 'reparacion',
    cotizaciones: [quote('1'), quote('2'), quote('3'), quote('4', { upload_status: 'invalid', archivo_sha256: null })],
  })
  assert.deepEqual(withFailedAttempt, [])
})

test('aplica topes y estados terminales', () => {
  assert.equal(MAX_COTIZACIONES, 10)
  assert.equal(MAX_UPLOAD_ATTEMPTS, 5)
  assert.equal(canAddQuote('En proceso'), true)
  assert.equal(canAddQuote('Cumplido'), false)
  assert.equal(canAddQuote('Anulada'), false)
  assert.equal(canAddQuote('estado-inventado'), false)
})

test('traduce códigos internos a un mensaje operativo', () => {
  assert.equal(
    submissionErrorMessage(['minimo_tres', 'proveedor_duplicado']),
    'Adjunta al menos tres cotizaciones válidas de proveedores fiscales distintos. Las cotizaciones deben pertenecer a proveedores fiscales distintos.'
  )
})
