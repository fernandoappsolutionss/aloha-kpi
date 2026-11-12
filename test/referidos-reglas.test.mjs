import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CUENTA_PA, CUENTA_VE, CODIGO_RE, aCentavos, claseElegible, codigoDeRegistro, decidirAtribucion,
  deltaConcepto, generarCodigo, normalizarTelefono,
} from '../lib/referidos/reglas.mjs'

test('teléfono: misma identidad con o sin prefijo de país', () => {
  assert.equal(normalizarTelefono('6123-4567', CUENTA_PA), '50761234567')
  assert.equal(normalizarTelefono('+507 6123 4567', CUENTA_PA), '50761234567')
  assert.equal(normalizarTelefono('0414-1234567', CUENTA_VE), '584141234567')
  assert.equal(normalizarTelefono('+58 414 1234567', CUENTA_VE), '584141234567')
})

test('teléfono inválido o cuenta ajena: sin identidad (no se agrupan desconocidos)', () => {
  assert.equal(normalizarTelefono('', CUENTA_PA), null)
  assert.equal(normalizarTelefono('12345', CUENTA_PA), null)
  assert.equal(normalizarTelefono('61234567', 'otra-cuenta'), null)
})

test('código: 6 caracteres del alfabeto sin ambiguos', () => {
  const codigo = generarCodigo(Uint8Array.from([0, 255, 31, 64, 100, 7]))
  assert.match(codigo, CODIGO_RE)
  assert.doesNotMatch(codigo, /[ilo01]/)
})

test('código de la inscripción: campo propio primero, UTM de respaldo', () => {
  assert.equal(codigoDeRegistro({ referral_code: 'ABC234' }), 'abc234')
  assert.equal(codigoDeRegistro({ referral_code: 'abc234', utm_source: 'facebook', utm_campaign: 'verano' }), 'abc234')
  assert.equal(codigoDeRegistro({ utm_source: 'referido', utm_campaign: 'xyz789' }), 'xyz789')
  assert.equal(codigoDeRegistro({ utm_source: 'facebook', utm_campaign: 'xyz789' }), null)
  assert.equal(codigoDeRegistro({ referral_code: '<script>' }), null)
})

const config = { activo: true, activo_desde: '2026-11-01', bono_clase_prueba_cent: 500, bono_referido_asiste_cent: 300, bono_referido_inscrito_cent: 1000 }

test('neto: ciclo asistió → no asistió → asistió conserva el importe congelado', () => {
  const base = { clase: 'cp', elegible: true, config }
  assert.equal(deltaConcepto({ ...base, cumple: true, congelado: null, asentado: 0 }), 500)
  assert.equal(deltaConcepto({ ...base, cumple: true, congelado: 500, asentado: 500 }), 0)
  assert.equal(deltaConcepto({ ...base, cumple: false, congelado: 500, asentado: 500 }), -500)
  // Cambió la configuración: el bono vuelve con su importe original.
  assert.equal(deltaConcepto({ ...base, config: { ...config, bono_clase_prueba_cent: 900 }, cumple: true, congelado: 500, asentado: 0 }), 500)
})

test('neto: sin elegibilidad no nace bono, pero un bono ya asentado sí se revierte', () => {
  assert.equal(deltaConcepto({ clase: 'cp', cumple: true, elegible: false, congelado: null, asentado: 0, config }), 0)
  assert.equal(deltaConcepto({ clase: 'cp', cumple: false, elegible: false, congelado: 500, asentado: 500, config }), -500)
})

test('elegibilidad: país activo y clase desde activo_desde', () => {
  assert.equal(claseElegible(config, '2026-11-05T15:00:00Z'), true)
  assert.equal(claseElegible(config, '2026-10-31T15:00:00Z'), false)
  assert.equal(claseElegible({ ...config, activo: false }, '2026-11-05'), false)
  assert.equal(claseElegible({ ...config, activo_desde: null }, '2026-11-05'), false)
})

const duenos = { abc234: { id: 1 }, xyz789: { id: 2 } }
const miembroPorCodigo = (c) => duenos[c] || null

test('atribución: manda la inscripción más antigua', () => {
  const registros = [
    { crm_registration_id: 'r2', registered_at: '2026-11-10T10:00:00Z', codigo_referido: 'xyz789' },
    { crm_registration_id: 'r1', registered_at: '2026-11-01T10:00:00Z', codigo_referido: 'abc234' },
  ]
  assert.deepEqual(decidirAtribucion({ miembroId: 9, registros, miembroPorCodigo }), { referidorId: 1, registrationId: 'r1' })
})

test('atribución: inscripción antigua sin código + nueva con código no es referido nuevo', () => {
  const registros = [
    { crm_registration_id: 'r1', registered_at: '2026-01-10T10:00:00Z', codigo_referido: null },
    { crm_registration_id: 'r2', registered_at: '2026-11-10T10:00:00Z', codigo_referido: 'abc234' },
  ]
  assert.equal(decidirAtribucion({ miembroId: 9, registros, miembroPorCodigo }), null)
})

test('atribución: sin autorreferido, sin código desconocido, sin alumno previo', () => {
  const r = [{ crm_registration_id: 'r1', registered_at: '2026-11-10T10:00:00Z', codigo_referido: 'abc234' }]
  assert.equal(decidirAtribucion({ miembroId: 1, registros: r, miembroPorCodigo }), null)
  assert.equal(decidirAtribucion({ miembroId: 9, registros: [{ ...r[0], codigo_referido: 'zzzzzz' }], miembroPorCodigo }), null)
  assert.equal(decidirAtribucion({ miembroId: 9, registros: r, miembroPorCodigo, primeraFichaFecha: '2026-03-01' }), null)
  assert.ok(decidirAtribucion({ miembroId: 9, registros: r, miembroPorCodigo, primeraFichaFecha: '2026-11-12' }))
})

test('monto escrito a centavos', () => {
  assert.equal(aCentavos('12.50'), 1250)
  assert.equal(aCentavos('12,5'), 1250)
  assert.equal(aCentavos('0'), null)
  assert.equal(aCentavos('-5'), null)
  assert.equal(aCentavos('1.234'), null)
})
