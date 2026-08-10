import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CONCURRENCIA_OUTBOX,
  LOCK_VENCIDO_MS,
  LOTE_OUTBOX,
  MAX_INTENTOS,
  armarLoteOutbox,
  dedupIds,
  fingerprintLlenado,
  grupoVigenteAEmpujar,
  partirEnLotes,
  seleccionarPendientes,
} from '../lib/llenado-outbox.mjs'

// --- Fixtures: misma forma de itinerario que genera lib/itinerario.js -------

const semana = (corto, tipo, fechas) => ({ etiqueta: String(corto), tipo, corto, fechas })

const itinerarioTiny = () => ({
  nivel: 1,
  fecha_inicio: '2026-08-17',
  semanas: [
    semana('I1', 'induccion', ['2026-08-17', '2026-08-19']),
    semana('I2', 'induccion', ['2026-08-24', '2026-08-26']),
    semana('1', 'clase', ['2026-08-31', '2026-09-02']),
    semana('2', 'clase', ['2026-09-07', '2026-09-09']),
    semana('3', 'clase', ['2026-09-14', '2026-09-16']),
    semana('4', 'clase', ['2026-09-21', '2026-09-23']),
  ],
})

const grupoTiny = (extra = {}) => ({
  id: 7,
  estado: 'activo',
  itinerario: 'TINY',
  inscripcion_abierta: true,
  itinerario_clases: itinerarioTiny(),
  ...extra,
})

// --- fingerprintLlenado ------------------------------------------------------

test('fingerprint: nivel|fecha límite|abierta con la ventana vigente', () => {
  // Límite TINY = última fecha de la semana 4 del libro.
  assert.equal(fingerprintLlenado(grupoTiny(), '2026-09-01'), 'TINY 1|2026-09-23|abierta')
})

test('fingerprint: cruzar la fecha límite lo cambia sin tocar el grupo (vencimiento)', () => {
  const g = grupoTiny()
  const antes = fingerprintLlenado(g, '2026-09-23')
  const despues = fingerprintLlenado(g, '2026-09-24')
  assert.equal(antes, 'TINY 1|2026-09-23|abierta')
  assert.equal(despues, 'TINY 1|2026-09-23|cerrada')
  assert.notEqual(antes, despues)
})

test('fingerprint: pasar de nivel CIERRA la ventana y cambia el fingerprint', () => {
  const vencido = fingerprintLlenado(grupoTiny(), '2026-10-01')
  const nivel2 = fingerprintLlenado(grupoTiny({
    itinerario_clases: {
      nivel: 2,
      fecha_inicio: '2027-01-11',
      semanas: [
        semana('1', 'clase', ['2027-01-11', '2027-01-13']),
        semana('2', 'clase', ['2027-01-18', '2027-01-20']),
        semana('3', 'clase', ['2027-01-25', '2027-01-27']),
        semana('4', 'clase', ['2027-02-01', '2027-02-03']),
      ],
    },
  }), '2026-10-01')
  assert.equal(vencido, 'TINY 1|2026-09-23|cerrada')
  // Regla de Fernando 2026-08-10: la ventana es del llenado del grupo, no de
  // cada nivel — un veterano que arranca nivel 2 no vuelve a aceptar nuevos.
  assert.equal(nivel2, 'TINY 2|nivel_avanzado|cerrada')
})

test('fingerprint: la palanca manual cerrada también lo cambia', () => {
  assert.equal(
    fingerprintLlenado(grupoTiny({ inscripcion_abierta: false }), '2026-09-01'),
    'TINY 1|2026-09-23|cerrada'
  )
})

test('fingerprint: exento y legacy inválido no se confunden entre sí', () => {
  const kinder = fingerprintLlenado(grupoTiny({ itinerario: 'KINDER' }), '2026-09-01')
  const legacy = fingerprintLlenado(grupoTiny({
    itinerario_clases: { semanas: [{ etiqueta: 'Semana 1', fechas: ['2026-08-17'] }] },
  }), '2026-09-01')
  assert.equal(kinder, 'KINDER 1|exento|abierta')
  assert.equal(legacy, 'TINY|sin_itinerario_valido|abierta')
  assert.notEqual(kinder, legacy)
})

test('fingerprint: estable si nada cambió (el cron no genera statements de más)', () => {
  assert.equal(fingerprintLlenado(grupoTiny(), '2026-09-01'), fingerprintLlenado(grupoTiny(), '2026-09-02'))
})

// --- dedupIds ---------------------------------------------------------------

test('dedupIds: normaliza, dedupe y bota basura preservando el orden', () => {
  assert.deepEqual(dedupIds([3, '3', 5, null, undefined, 'x', 0, -1, 5, 8]), [3, 5, 8])
  assert.deepEqual(dedupIds(null), [])
})

// --- armarLoteOutbox (dedup del lote) ----------------------------------------

test('armarLoteOutbox: una fila por evento CRM, dedup por crm_event_id', () => {
  const eventos = [
    { crm_event_id: 'ev-a', grupo_id: 7 },
    { crm_event_id: 'ev-b', grupo_id: 7 },
    { crm_event_id: 'ev-a', grupo_id: 7 }, // repetido: un solo push basta
    { crm_event_id: null, grupo_id: 7 },   // sin evento CRM: no hay a quién empujar
  ]
  const lote = armarLoteOutbox(eventos, { op: 'sync_group', motivo: 'inscripcion', clave: 'T1' })
  assert.equal(lote.length, 2)
  assert.deepEqual(lote[0], {
    crm_event_id: 'ev-a',
    grupo_id: 7,
    op: 'sync_group',
    motivo: 'inscripcion',
    clave_idem: 'sync_group|7|ev-a|T1',
  })
  assert.equal(lote[1].clave_idem, 'sync_group|7|ev-b|T1')
})

test('armarLoteOutbox: clear_group sobrevive sin grupo (desvinculación, g2-5)', () => {
  const [fila] = armarLoteOutbox([{ crm_event_id: 'ev-a', grupo_id: null }], { op: 'clear_group', motivo: 'fusion', clave: 'T2' })
  assert.equal(fila.grupo_id, null)
  assert.equal(fila.op, 'clear_group')
  assert.equal(fila.clave_idem, 'clear_group|sin_grupo|ev-a|T2')
})

test('armarLoteOutbox: claves distintas para encolados distintos del mismo evento', () => {
  const [a] = armarLoteOutbox([{ crm_event_id: 'ev-a', grupo_id: 7 }], { motivo: 'inscripcion', clave: 'T1' })
  const [b] = armarLoteOutbox([{ crm_event_id: 'ev-a', grupo_id: 7 }], { motivo: 'inscripcion', clave: 'T2' })
  assert.notEqual(a.clave_idem, b.clave_idem)
})

// --- grupoVigenteAEmpujar (decisión del consumidor) --------------------------

test('grupoVigenteAEmpujar: el vínculo vigente manda, sin importar la op de la fila', () => {
  // Escenario del cierre + reasignación: lunes 3pm cerrarGrupo desvincula G7 y
  // encola clear_group; lunes 4pm el admin reasigna el evento a G9; martes 5am
  // el cron procesa la fila clear_group pendiente → debe empujar el snapshot
  // de G9, NUNCA null (empujar null le borraría a ventas los cupos de un
  // evento correctamente reasignado).
  assert.equal(grupoVigenteAEmpujar({ crm_event_id: 'ev-a', centro_id: 1, grupo_id: 9 }), 9)
})

test('grupoVigenteAEmpujar: null solo si el evento sigue desvinculado o ya no existe', () => {
  assert.equal(grupoVigenteAEmpujar({ crm_event_id: 'ev-a', centro_id: 1, grupo_id: null }), null)
  assert.equal(grupoVigenteAEmpujar(null), null) // el evento local se borró
  assert.equal(grupoVigenteAEmpujar(undefined), null)
})

// --- seleccionarPendientes (espejo del claim SQL) ----------------------------

const AHORA = Date.parse('2026-08-08T10:00:00Z')
const fila = (id, extra = {}) => ({ id, procesado_at: null, intentos: 0, locked_at: null, ...extra })

test('seleccionarPendientes: filtra procesadas, muertas y con lock vivo', () => {
  const filas = [
    fila(1),
    fila(2, { procesado_at: '2026-08-08T09:00:00Z' }),               // ya procesada
    fila(3, { intentos: MAX_INTENTOS }),                             // muerta: 5 intentos
    fila(4, { locked_at: new Date(AHORA - 60 * 1000).toISOString() }), // lock vivo (1 min)
    fila(5, { locked_at: new Date(AHORA - LOCK_VENCIDO_MS - 1000).toISOString() }), // lock huérfano
    fila(6, { intentos: MAX_INTENTOS - 1 }),                         // aún con vida
  ]
  assert.deepEqual(seleccionarPendientes(filas, { ahora: AHORA }).map((f) => f.id), [1, 5, 6])
})

test('seleccionarPendientes: ordena por id y respeta el tope del lote', () => {
  const filas = [fila(9), fila(2), fila(5), fila(1)]
  assert.deepEqual(seleccionarPendientes(filas, { ahora: AHORA, limite: 3 }).map((f) => f.id), [1, 2, 5])
  assert.equal(LOTE_OUTBOX, 20) // el default del claim SQL
})

test('seleccionarPendientes: no muta el arreglo recibido', () => {
  const filas = [fila(9), fila(1)]
  seleccionarPendientes(filas, { ahora: AHORA })
  assert.deepEqual(filas.map((f) => f.id), [9, 1])
})

// --- partirEnLotes (concurrencia acotada) ------------------------------------

test('partirEnLotes: tandas del tamaño de la concurrencia, resto al final', () => {
  assert.deepEqual(partirEnLotes([1, 2, 3, 4, 5, 6, 7], CONCURRENCIA_OUTBOX), [[1, 2, 3], [4, 5, 6], [7]])
  assert.deepEqual(partirEnLotes([], 3), [])
  assert.deepEqual(partirEnLotes([1, 2], 0), [[1], [2]]) // tamaño mínimo 1: nunca un loop infinito
})
