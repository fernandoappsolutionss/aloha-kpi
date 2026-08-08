import test from 'node:test'
import assert from 'node:assert/strict'

import {
  anclaDeAlta,
  periodosCorreccionInscripcion,
  fechasDeClase,
  errorFechaAsistencia,
  primerDiaMesSiguiente,
  estadoPrevioDeProgramacion,
} from '../lib/retiros.mjs'
import { generarItinerario } from '../lib/itinerario.js'

// ── anclaDeAlta (g1-8): max(fecha_inscripcion, fecha_inicio_clases) ──────────

test('anclaDeAlta: el niño nunca arranca antes de que el grupo dé clases', () => {
  assert.equal(anclaDeAlta('2026-08-05', '2026-08-17'), '2026-08-17')
  assert.equal(anclaDeAlta('2026-08-20', '2026-08-17'), '2026-08-20')
  assert.equal(anclaDeAlta('2026-08-17', '2026-08-17'), '2026-08-17')
})

test('anclaDeAlta: grupo legacy sin fecha → rige la inscripción; sin nada → null', () => {
  assert.equal(anclaDeAlta('2026-08-05', null), '2026-08-05')
  assert.equal(anclaDeAlta(null, '2026-08-17'), '2026-08-17')
  assert.equal(anclaDeAlta(null, null), null)
})

test('anclaDeAlta: acepta Date del driver y string ISO largo', () => {
  assert.equal(anclaDeAlta(new Date('2026-08-05T00:00:00Z'), '2026-08-17T00:00:00.000Z'), '2026-08-17')
})

// ── periodosCorreccionInscripcion (g1-19): los 4 periodos a bloquear ─────────

test('periodosCorreccion: ficha vieja + year/month del evento + periodo real + nuevo', () => {
  const periodos = periodosCorreccionInscripcion({
    fechaFichaVieja: '2026-05-20',
    // Evento con year/month DISCORDANTES de su fecha (la herida que g1-19
    // repara): ambos periodos se bloquean.
    evento: { year: 2026, month: 6, fecha: '2026-07-02' },
    fechaNueva: '2026-08-01',
  })
  assert.deepEqual(periodos, [
    { year: 2026, month: 5 },
    { year: 2026, month: 6 },
    { year: 2026, month: 7 },
    { year: 2026, month: 8 },
  ])
})

test('periodosCorreccion: la ficha vieja NULL no aporta periodo (los demás sí)', () => {
  const periodos = periodosCorreccionInscripcion({
    fechaFichaVieja: null,
    evento: { year: 2026, month: 7, fecha: new Date('2026-07-15T00:00:00Z') },
    fechaNueva: '2026-07-10',
  })
  // Duplicados se listan tal cual: bloquearMesesEditables depura y ordena.
  assert.deepEqual(periodos, [
    { year: 2026, month: 7 },
    { year: 2026, month: 7 },
    { year: 2026, month: 7 },
  ])
})

// ── Evidencia de asistencia (g1-23): clase real del calendario y <= hoy ──────

// Plan real de referencia: martes y jueves desde el lunes 3-ago-2026.
const plan = generarItinerario({ fechaInicio: '2026-08-03', dias: [2, 4], nivel: 2, pais: 'PA' })

test('fechasDeClase: aplana todas las fechas de semanas[] del plan', () => {
  const fechas = fechasDeClase(plan)
  assert.ok(fechas.has('2026-08-04')) // primer martes
  assert.ok(fechas.has('2026-08-06')) // primer jueves
  assert.ok(!fechas.has('2026-08-05')) // miércoles: no hay clase
  assert.equal(fechasDeClase(null).size, 0)
})

test('errorFechaAsistencia: clase real y ya dada → pasa (incluida hoy mismo)', () => {
  assert.equal(errorFechaAsistencia(plan, '2026-08-04', '2026-08-20'), null)
  assert.equal(errorFechaAsistencia(plan, '2026-08-04', '2026-08-04'), null) // hoy mismo cuenta
})

test('errorFechaAsistencia: una fecha fuera del calendario se rechaza', () => {
  const err = errorFechaAsistencia(plan, '2026-08-05', '2026-08-20')
  assert.match(err, /no es una clase del itinerario/)
})

test('errorFechaAsistencia: el futuro no se marca (<= hoy Panamá)', () => {
  const err = errorFechaAsistencia(plan, '2026-08-06', '2026-08-05')
  assert.match(err, /todavía no llega/)
})

test('errorFechaAsistencia: grupo sin itinerario = fail closed', () => {
  assert.match(errorFechaAsistencia(null, '2026-08-04', '2026-08-20'), /no tiene itinerario/)
  assert.match(errorFechaAsistencia({ semanas: [] }, '2026-08-04', '2026-08-20'), /no tiene itinerario/)
})

test('errorFechaAsistencia: fecha o hoy inválidos se rechazan', () => {
  assert.match(errorFechaAsistencia(plan, '04/08/2026', '2026-08-20'), /Fecha inválida/)
  assert.match(errorFechaAsistencia(plan, '2026-08-04', null), /Fecha inválida/)
})

// ── primerDiaMesSiguiente (g1-24) ────────────────────────────────────────────

test('primerDiaMesSiguiente: día 1 del mes que viene, con cruce de año', () => {
  assert.equal(primerDiaMesSiguiente('2026-08-08'), '2026-09-01')
  assert.equal(primerDiaMesSiguiente('2026-08-31'), '2026-09-01')
  assert.equal(primerDiaMesSiguiente('2026-12-15'), '2027-01-01')
  assert.equal(primerDiaMesSiguiente('no-fecha'), null)
})

// ── estadoPrevioDeProgramacion: restaurar sin inventar ───────────────────────

test('estadoPrevio: baja_potencial guardada se respeta; todo lo demás → activo', () => {
  assert.equal(estadoPrevioDeProgramacion({ estado_previo: 'baja_potencial' }), 'baja_potencial')
  assert.equal(estadoPrevioDeProgramacion({ estado_previo: 'activo' }), 'activo')
  // Fail safe: sin evento, detalle vacío o un estado imposible jamás dejan al
  // niño 'retirado' ni en un estado inventado.
  assert.equal(estadoPrevioDeProgramacion(null), 'activo')
  assert.equal(estadoPrevioDeProgramacion({}), 'activo')
  assert.equal(estadoPrevioDeProgramacion({ estado_previo: 'retirado' }), 'activo')
})
