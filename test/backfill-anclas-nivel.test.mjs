import test from 'node:test'
import assert from 'node:assert/strict'

import {
  coberturaAnclas,
  decidirAncla,
  estadoAncla,
  fingerprintAncla,
  muestreoPosiciones,
} from '../lib/backfill-anclas-nivel.mjs'

const HOY = '2026-08-08'

// --- Fixtures: misma forma que las filas reales de la BD ---------------------

const estudiante = (overrides = {}) => ({
  id: 1,
  centro_id: 1,
  grupo_id: 1,
  nombre: 'Ana Perez',
  itinerario: 'TINY',
  nivel: 1,
  estado: 'activo',
  fecha_inscripcion: '2026-05-10',
  fecha_inicio_nivel: null,
  fecha_cierre_nivel: null,
  ...overrides,
})

const grupo = (overrides = {}) => ({
  id: 1,
  centro_id: 1,
  numero: 'G1',
  itinerario: 'TINY',
  estado: 'activo',
  fecha_inicio_clases: '2026-05-04',
  itinerario_clases: {
    nivel: 1,
    fecha_inicio: '2026-05-04',
    versiones: [{ vigente_desde: '2026-05-04', dias: [1, 3] }],
  },
  horarios: [],
  ...overrides,
})

const ev = (overrides = {}) => ({
  id: 100,
  estudiante_id: 1,
  tipo: 'inscripcion',
  fecha: '2026-05-10',
  a_grupo_id: 1,
  a_nivel: 1,
  ...overrides,
})

// --- Peldaño 0: ancla existente ----------------------------------------------

test('un niño con ancla queda ya_tiene y no se recalcula nada', () => {
  const d = decidirAncla({
    estudiante: estudiante({ fecha_inicio_nivel: new Date('2026-05-04T00:00:00Z') }),
    eventos: [ev()],
    grupo: grupo(),
  })
  assert.equal(d.estado, 'ya_tiene')
  assert.equal(d.ancla, '2026-05-04')
})

// --- Peldaño 1: evento de cambio de nivel ------------------------------------

test('cambio_nivel concordante y sin posterior: ancla = fecha del evento', () => {
  const d = decidirAncla({
    estudiante: estudiante({ nivel: 3 }),
    eventos: [
      ev({ id: 100 }),
      ev({ id: 200, tipo: 'cambio_nivel', fecha: '2026-07-06', de_nivel: 2, a_nivel: 3 }),
    ],
    grupo: grupo(),
  })
  assert.deepEqual([d.estado, d.fuente, d.ancla], ['resuelta', 'evento_cambio', '2026-07-06'])
})

test('el detalle.ancla_despues del evento manda sobre su fecha', () => {
  const d = decidirAncla({
    estudiante: estudiante({ nivel: 3 }),
    eventos: [
      ev({
        id: 200, tipo: 'cambio_nivel', fecha: '2026-07-06', a_nivel: 3,
        detalle: '{"ancla_despues":"2026-07-08"}', // JSONB defensivo como string
      }),
    ],
    grupo: grupo(),
  })
  assert.equal(d.ancla, '2026-07-08')
})

test('graduacion_tiny concuerda solo si el niño quedo en KIDS', () => {
  const eventos = [ev({ id: 200, tipo: 'graduacion_tiny', fecha: '2026-07-06', de_nivel: 10, a_nivel: 5 })]
  const kids = decidirAncla({ estudiante: estudiante({ itinerario: 'KIDS', nivel: 5 }), eventos, grupo: null })
  assert.deepEqual([kids.estado, kids.ancla], ['resuelta', '2026-07-06'])
  const tiny = decidirAncla({ estudiante: estudiante({ itinerario: 'TINY', nivel: 5 }), eventos, grupo: null })
  assert.deepEqual([tiny.estado, tiny.motivo], ['ambiguo', 'transicion_discordante'])
})

test('transicion discordante con la ficha: ambiguo terminal (nunca inferido)', () => {
  const d = decidirAncla({
    estudiante: estudiante({ nivel: 4 }), // la ficha dice 4, el evento llego a 3
    eventos: [ev({ id: 200, tipo: 'cambio_nivel', fecha: '2026-07-06', a_nivel: 3 })],
    grupo: grupo({ itinerario_clases: { nivel: 4, fecha_inicio: '2026-07-06' } }), // ni la referencia lo salva
  })
  assert.deepEqual([d.estado, d.motivo], ['ambiguo', 'transicion_discordante'])
})

test('movimiento posterior a la transicion: pudo re-anclar (g1-9) → ambiguo', () => {
  const d = decidirAncla({
    estudiante: estudiante({ nivel: 3, grupo_id: 2 }),
    eventos: [
      ev({ id: 200, tipo: 'cambio_nivel', fecha: '2026-07-06', a_nivel: 3 }),
      ev({ id: 300, tipo: 'cambio_grupo', fecha: '2026-07-20', a_grupo_id: 2, a_nivel: null }),
    ],
    grupo: grupo({ id: 2 }),
  })
  assert.deepEqual([d.estado, d.motivo], ['ambiguo', 'movimiento_posterior_a_transicion'])
  assert.deepEqual(d.detalle.posteriores, [300])
})

test('manda el ULTIMO cambio de nivel, no el primero', () => {
  const d = decidirAncla({
    estudiante: estudiante({ nivel: 3 }),
    eventos: [
      ev({ id: 200, tipo: 'cambio_nivel', fecha: '2026-06-01', a_nivel: 2 }),
      ev({ id: 300, tipo: 'cambio_nivel', fecha: '2026-07-06', a_nivel: 3 }),
    ],
    grupo: null,
  })
  assert.deepEqual([d.estado, d.ancla], ['resuelta', '2026-07-06'])
})

// --- Peldaño 2: inscripcion canonica -----------------------------------------

test('inscripcion canonica con a_nivel concordante: ancla = max(insc, grupo) — g1-8', () => {
  // Inscrito despues del arranque del grupo: gana la inscripcion.
  const tarde = decidirAncla({ estudiante: estudiante(), eventos: [ev()], grupo: grupo() })
  assert.deepEqual([tarde.estado, tarde.fuente, tarde.ancla], ['resuelta', 'inscripcion_canonica', '2026-05-10'])
  // Venta anticipada: gana el arranque del grupo.
  const temprano = decidirAncla({
    estudiante: estudiante(),
    eventos: [ev({ fecha: '2026-04-20' })],
    grupo: grupo(),
  })
  assert.equal(temprano.ancla, '2026-05-04')
  // Suelto (sin grupo): la inscripcion sola.
  const suelto = decidirAncla({
    estudiante: estudiante({ grupo_id: null }),
    eventos: [ev({ a_grupo_id: null })],
    grupo: null,
  })
  assert.equal(suelto.ancla, '2026-05-10')
})

test('inscripciones multiples: dedupe g1-17 pendiente → ambiguo', () => {
  const d = decidirAncla({
    estudiante: estudiante(),
    eventos: [ev({ id: 100 }), ev({ id: 101, fecha: '2026-06-01' })],
    grupo: grupo(),
  })
  assert.deepEqual([d.estado, d.motivo], ['ambiguo', 'inscripcion_multiple'])
})

test('inscripcion discordante (grupo o nivel distinto en la ficha): ambiguo', () => {
  const otroGrupo = decidirAncla({
    estudiante: estudiante({ grupo_id: 2 }), // movido sin evento de movimiento
    eventos: [ev({ a_grupo_id: 1 })],
    grupo: grupo({ id: 2 }),
  })
  assert.deepEqual([otroGrupo.estado, otroGrupo.motivo], ['ambiguo', 'inscripcion_discordante_grupo'])
  const otroNivel = decidirAncla({
    estudiante: estudiante({ nivel: 4 }),
    eventos: [ev({ a_nivel: 1 })],
    grupo: grupo(),
  })
  assert.deepEqual([otroNivel.estado, otroNivel.motivo], ['ambiguo', 'inscripcion_discordante_nivel'])
})

test('inscripcion legacy sin a_nivel NO se infiere: cae a la referencia', () => {
  const d = decidirAncla({
    estudiante: estudiante(),
    eventos: [ev({ a_nivel: null })],
    grupo: grupo(),
  })
  assert.deepEqual([d.estado, d.fuente, d.ancla], ['resuelta', 'referencia_grupo', '2026-05-04'])
})

// --- Peldaño 3: referencia del grupo -----------------------------------------

test('referencia concordante sin movimientos: el niño legacy sigue al aula', () => {
  const d = decidirAncla({
    estudiante: estudiante({ nivel: 5 }),
    eventos: [], // sin historia de eventos (legacy puro)
    grupo: grupo({ itinerario_clases: { nivel: 5, fecha_inicio: '2026-06-01' } }),
  })
  assert.deepEqual([d.estado, d.fuente, d.ancla], ['resuelta', 'referencia_grupo', '2026-06-01'])
})

test('referencia discordante o ausente: sin_resolver (falta fuente, no conflicto)', () => {
  const nivelDistinto = decidirAncla({
    estudiante: estudiante({ nivel: 4 }),
    eventos: [],
    grupo: grupo({ itinerario_clases: { nivel: 5, fecha_inicio: '2026-06-01' } }),
  })
  assert.deepEqual([nivelDistinto.estado, nivelDistinto.motivo], ['sin_resolver', 'referencia_discordante'])
  const itDistinto = decidirAncla({
    estudiante: estudiante({ itinerario: 'KIDS', nivel: 5 }),
    eventos: [],
    grupo: grupo({ itinerario_clases: { nivel: 5, fecha_inicio: '2026-06-01' } }),
  })
  assert.equal(itDistinto.motivo, 'referencia_discordante')
  const sinRef = decidirAncla({ estudiante: estudiante(), eventos: [], grupo: grupo({ itinerario_clases: null }) })
  assert.deepEqual([sinRef.estado, sinRef.motivo], ['sin_resolver', 'grupo_sin_referencia'])
  const sinGrupo = decidirAncla({ estudiante: estudiante({ grupo_id: null }), eventos: [], grupo: null })
  assert.deepEqual([sinGrupo.estado, sinGrupo.motivo], ['sin_resolver', 'sin_grupo'])
})

test('movido DESPUES del arranque de la referencia: ambiguo (g1-9 sin detalle)', () => {
  const d = decidirAncla({
    estudiante: estudiante({ nivel: 5 }),
    eventos: [ev({ id: 300, tipo: 'cambio_grupo', fecha: '2026-06-15', a_grupo_id: 1, a_nivel: null })],
    grupo: grupo({ itinerario_clases: { nivel: 5, fecha_inicio: '2026-06-01' } }),
  })
  assert.deepEqual([d.estado, d.motivo], ['ambiguo', 'movimiento_posterior_a_referencia'])
})

test('movido hacia el grupo ANTES del arranque de la referencia: sigue al aula', () => {
  const d = decidirAncla({
    estudiante: estudiante({ nivel: 5 }),
    eventos: [ev({ id: 300, tipo: 'cambio_grupo', fecha: '2026-05-20', a_grupo_id: 1, a_nivel: null })],
    grupo: grupo({ itinerario_clases: { nivel: 5, fecha_inicio: '2026-06-01' } }),
  })
  assert.deepEqual([d.estado, d.fuente, d.ancla], ['resuelta', 'referencia_grupo', '2026-06-01'])
})

test('ultimo movimiento hacia OTRO grupo que el de la ficha: ambiguo', () => {
  const d = decidirAncla({
    estudiante: estudiante({ nivel: 5 }),
    eventos: [ev({ id: 300, tipo: 'cambio_grupo', fecha: '2026-05-20', a_grupo_id: 9, a_nivel: null })],
    grupo: grupo({ itinerario_clases: { nivel: 5, fecha_inicio: '2026-06-01' } }),
  })
  assert.deepEqual([d.estado, d.motivo], ['ambiguo', 'movimiento_discordante_grupo'])
})

// --- Fingerprint y estado del CAS --------------------------------------------

test('fingerprintAncla es estable y cambia con un evento nuevo o la ficha', () => {
  const est = estudiante()
  const eventos = [ev()]
  const decision = { fuente: 'inscripcion_canonica', ancla: '2026-05-10' }
  const fp = fingerprintAncla(est, eventos, decision)
  assert.equal(fp, fingerprintAncla(estudiante(), [ev()], { ...decision })) // determinista
  assert.notEqual(fp, fingerprintAncla(est, [ev(), ev({ id: 500, tipo: 'cambio_grupo' })], decision))
  assert.notEqual(fp, fingerprintAncla(estudiante({ nivel: 2 }), eventos, decision))
  assert.notEqual(fp, fingerprintAncla(estudiante({ fecha_cierre_nivel: '2026-09-01' }), eventos, decision))
})

test('estadoAncla: aplicada / pendiente / conflicto', () => {
  const est = estudiante()
  const eventos = [ev()]
  const decision = { fuente: 'inscripcion_canonica', ancla: '2026-05-10' }
  const entrada = { estudianteId: 1, ancla: '2026-05-10', fingerprint: fingerprintAncla(est, eventos, decision) }

  assert.equal(estadoAncla(est, entrada, fingerprintAncla(est, eventos, decision)), 'pendiente')
  // Idempotencia: la ancla decidida ya esta puesta (el driver da Date).
  assert.equal(estadoAncla(estudiante({ fecha_inicio_nivel: new Date('2026-05-10T00:00:00Z') }), entrada, 'x'), 'aplicada')
  // Derivas: ancla ajena, fingerprint vivo distinto (evento nuevo), fila ausente.
  assert.equal(estadoAncla(estudiante({ fecha_inicio_nivel: '2026-06-01' }), entrada, 'x'), 'conflicto')
  const fpVivo = fingerprintAncla(est, [ev(), ev({ id: 500, tipo: 'cambio_grupo' })], decision)
  assert.equal(estadoAncla(est, entrada, fpVivo), 'conflicto')
  assert.equal(estadoAncla(null, entrada, 'x'), 'conflicto')
})

// --- Validacion: cobertura y muestreo ----------------------------------------

test('coberturaAnclas cuenta la poblacion completa contra las decisiones', () => {
  const poblacion = [estudiante({ id: 1 }), estudiante({ id: 2 }), estudiante({ id: 3 }), estudiante({ id: 4 })]
  const decisiones = new Map([
    ['1', { estado: 'ya_tiene' }],
    ['2', { estado: 'resuelta' }],
    ['3', { estado: 'ambiguo' }],
    ['4', { estado: 'sin_resolver' }],
  ])
  assert.deepEqual(coberturaAnclas(poblacion, decisiones), {
    poblacion: 4,
    yaTienen: 1,
    resueltas: 1,
    ambiguas: 1,
    sinResolver: 1,
    conAncla: 2,
    cobertura: 50,
  })
  assert.equal(coberturaAnclas([], new Map()).cobertura, 100)
})

test('muestreoPosiciones deriva la posicion con el generador unico (g1-13)', () => {
  const g = grupo() // lunes y miercoles desde 2026-05-04
  const entradas = [{
    estudiante: estudiante({ nivel: 1 }),
    decision: { fuente: 'referencia_grupo', ancla: '2026-05-04' },
  }]
  const { muestras, alertas } = muestreoPosiciones({
    entradas,
    gruposPorId: new Map([['1', g]]),
    paisPorCentro: new Map([[1, 'PA']]),
    hoy: HOY,
  })
  assert.equal(alertas.length, 0)
  assert.equal(muestras.length, 1)
  assert.equal(muestras[0].estudianteId, 1)
  assert.equal(muestras[0].estado, 'en_curso') // 2026-08-08 cae dentro del nivel
  assert.ok(Number.isInteger(muestras[0].indice) && muestras[0].indice > 0)
})

test('muestreoPosiciones: sin calendario es sin_plan explicito, SIN alerta', () => {
  const g = grupo({ itinerario_clases: null, horarios: [] })
  const { muestras, alertas } = muestreoPosiciones({
    entradas: [{ estudiante: estudiante(), decision: { fuente: 'evento_cambio', ancla: '2026-05-04' } }],
    gruposPorId: new Map([['1', g]]),
    hoy: HOY,
  })
  assert.equal(muestras[0].estado, 'sin_plan')
  assert.equal(alertas.length, 0)
})

test('muestreoPosiciones alerta cuando hay calendario pero el plan no deriva', () => {
  const { alertas } = muestreoPosiciones({
    entradas: [{ estudiante: estudiante({ nivel: 0 }), decision: { fuente: 'evento_cambio', ancla: '2026-05-04' } }],
    gruposPorId: new Map([['1', grupo()]]),
    hoy: HOY,
  })
  assert.deepEqual(alertas.map((a) => a.tipo), ['plan_no_derivable'])
})

test('muestreoPosiciones muestrea determinista: uno de cada `cada` hasta `max`', () => {
  const entradas = Array.from({ length: 20 }, (_, i) => ({
    estudiante: estudiante({ id: 20 - i }), // desordenados a proposito
    decision: { fuente: 'referencia_grupo', ancla: '2026-05-04' },
  }))
  const { muestras } = muestreoPosiciones({
    entradas,
    gruposPorId: new Map([['1', grupo()]]),
    hoy: HOY,
    cada: 5,
    max: 3,
  })
  assert.deepEqual(muestras.map((m) => m.estudianteId), [1, 6, 11]) // ordena por id y salta de a 5
})
