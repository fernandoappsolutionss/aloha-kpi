import test from 'node:test'
import assert from 'node:assert/strict'

import {
  grupoIniciado,
  clavesNoPermitidasPostInicio,
  fingerprintPlanGrupo,
  cohorteDeTransicion,
  reAnclaEnDestino,
  errorExcepcionesPasado,
} from '../lib/plan-grupo.mjs'
import { generarItinerario } from '../lib/itinerario.js'
import { crearMemoPlanes } from '../lib/plan-nino.mjs'

// ── grupoIniciado: el candado post-inicio (g1-5, R1) ─────────────────────────

test('grupoIniciado: la igualdad exacta cuenta como iniciado (día 1 = intocable)', () => {
  assert.equal(grupoIniciado('2026-08-08', '2026-08-08'), true)
  assert.equal(grupoIniciado('2026-08-08', '2026-08-09'), true)
  assert.equal(grupoIniciado('2026-08-09', '2026-08-08'), false)
})

test('grupoIniciado: fecha NULL legacy = INICIADO (fail closed, R1)', () => {
  assert.equal(grupoIniciado(null, '2026-08-08'), true)
  assert.equal(grupoIniciado(undefined, '2026-08-08'), true)
  assert.equal(grupoIniciado('', '2026-08-08'), true)
})

test('grupoIniciado: acepta Date del driver y string ISO largo', () => {
  assert.equal(grupoIniciado(new Date('2026-08-08T00:00:00Z'), '2026-08-08'), true)
  assert.equal(grupoIniciado('2026-08-09T00:00:00.000Z', '2026-08-08'), false)
})

// Borde 19:30 Panamá / 00:30 UTC (g1-5): a las 00:30 UTC del día D, en Panamá
// todavía es el día D-1 — el grupo que inicia el día D AÚN NO está iniciado.
// La petición que esperó el lock cruzando medianoche Panamá (05:00 UTC) ya sí.
test('grupoIniciado: cruce de medianoche — hoy Panamá recalculado tras el lock decide', () => {
  const panama = (instante) => new Date(instante).toLocaleDateString('en-CA', { timeZone: 'America/Panama' })
  const antesDeMedianoche = panama('2026-08-09T00:30:00Z') // 19:30 del 8-ago en Panamá
  assert.equal(antesDeMedianoche, '2026-08-08')
  assert.equal(grupoIniciado('2026-08-09', antesDeMedianoche), false)
  const trasElLock = panama('2026-08-09T05:00:00Z') // 00:00 del 9-ago en Panamá
  assert.equal(trasElLock, '2026-08-09')
  assert.equal(grupoIniciado('2026-08-09', trasElLock), true)
})

// ── Allowlist post-inicio (g1-4) ─────────────────────────────────────────────

test('clavesNoPermitidasPostInicio: horarios y coach_id pasan, todo lo demás se lista', () => {
  assert.deepEqual(clavesNoPermitidasPostInicio({ horarios: [], coach_id: 3 }), [])
  assert.deepEqual(
    clavesNoPermitidasPostInicio({ horarios: [], coach_id: 3, numero: '5', notas: 'x', fecha_inicio_clases: '2026-01-01' }),
    ['numero', 'notas', 'fecha_inicio_clases']
  )
  // Presente con el MISMO valor también se rechaza: la clave presente basta.
  assert.deepEqual(clavesNoPermitidasPostInicio({ itinerario: 'TINY' }), ['itinerario'])
  // undefined explícito no cuenta como presente (payload JSON nunca lo trae).
  assert.deepEqual(clavesNoPermitidasPostInicio({ numero: undefined, coach_id: null }), [])
  assert.deepEqual(clavesNoPermitidasPostInicio(null), [])
})

// ── fingerprintPlanGrupo: CAS optimista de la transición (g1-10) ─────────────

const planBase = () =>
  generarItinerario({ fechaInicio: '2026-03-02', dias: [1], nivel: 2, pais: 'PA' })

test('fingerprintPlanGrupo: determinista — mismo plan, mismo fingerprint', () => {
  assert.equal(fingerprintPlanGrupo(planBase()), fingerprintPlanGrupo(planBase()))
  // El JSONB puede llegar como string: mismo contenido, mismo fingerprint.
  assert.equal(fingerprintPlanGrupo(JSON.stringify(planBase())), fingerprintPlanGrupo(planBase()))
})

test('fingerprintPlanGrupo: cambia con nivel, fecha o excepciones; sin plan = sin_plan', () => {
  const base = fingerprintPlanGrupo(planBase())
  const otroNivel = generarItinerario({ fechaInicio: '2026-03-02', dias: [1], nivel: 3, pais: 'PA' })
  const otraFecha = generarItinerario({ fechaInicio: '2026-03-09', dias: [1], nivel: 2, pais: 'PA' })
  const conExc = generarItinerario({
    fechaInicio: '2026-03-02', dias: [1], nivel: 2, pais: 'PA',
    excepciones: [{ fecha: '2026-03-09', motivo: 'suspendida' }],
  })
  assert.notEqual(fingerprintPlanGrupo(otroNivel), base)
  assert.notEqual(fingerprintPlanGrupo(otraFecha), base)
  assert.notEqual(fingerprintPlanGrupo(conExc), base)
  assert.equal(fingerprintPlanGrupo(null), 'sin_plan')
  assert.equal(fingerprintPlanGrupo(undefined), 'sin_plan')
})

// ── cohorteDeTransicion (g1-10): coincidencia EXACTA o intacto ───────────────

test('cohorteDeTransicion: solo entra el (itinerario, nivel, ancla) exacto y vivo', () => {
  const referencia = { nivel: 2, fecha_inicio: '2026-03-02' }
  const enCohorte = { id: 1, itinerario: 'TINY', nivel: 2, fecha_inicio_nivel: '2026-03-02', estado: 'activo' }
  const bajaPotencial = { id: 2, itinerario: 'TINY', nivel: 2, fecha_inicio_nivel: new Date('2026-03-02T00:00:00Z'), estado: 'baja_potencial' }
  const adelantado = { id: 3, itinerario: 'TINY', nivel: 3, fecha_inicio_nivel: '2026-03-02', estado: 'activo' }
  const anclaPropia = { id: 4, itinerario: 'TINY', nivel: 2, fecha_inicio_nivel: '2026-03-09', estado: 'activo' }
  const otroItinerario = { id: 5, itinerario: 'KIDS', nivel: 2, fecha_inicio_nivel: '2026-03-02', estado: 'activo' }
  const retirado = { id: 6, itinerario: 'TINY', nivel: 2, fecha_inicio_nivel: '2026-03-02', estado: 'retirado' }
  const sinAncla = { id: 7, itinerario: 'TINY', nivel: 2, fecha_inicio_nivel: null, estado: 'activo' }
  const cohorte = cohorteDeTransicion(referencia, 'TINY', [
    enCohorte, bajaPotencial, adelantado, anclaPropia, otroItinerario, retirado, sinAncla,
  ])
  assert.deepEqual(cohorte.map((e) => e.id), [1, 2])
})

test('cohorteDeTransicion: sin referencia anterior no hay cohorte (nadie se mueve)', () => {
  const nino = { id: 1, itinerario: 'TINY', nivel: 2, fecha_inicio_nivel: '2026-03-02', estado: 'activo' }
  assert.deepEqual(cohorteDeTransicion(null, 'TINY', [nino]), [])
  assert.deepEqual(cohorteDeTransicion({ nivel: 2 }, 'TINY', [nino]), [])
})

// ── reAnclaEnDestino (g1-9): misma semana en el calendario del destino ───────

const cal = (dias, desde = null) => [{ vigente_desde: desde, dias }]

test('reAnclaEnDestino: días distintos — el ancla se corre para conservar el índice', () => {
  // Origen lunes, ancla 2-mar: INT 2-mar, S1 9-mar. Hoy 5-mar → va por S1 (índice 1).
  // Destino jueves: el ancla equivalente más cercana es 26-feb (INT 26-feb,
  // S1 5-mar → índice 1 el 5-mar). Las candidatas más cercanas dan índice 0.
  const r = reAnclaEnDestino({
    ancla: '2026-03-02',
    nivel: 2,
    hoy: '2026-03-05',
    origen: { calendarioVersionado: cal([1]), excepciones: [], pais: 'PA' },
    destino: { calendarioVersionado: cal([4]), excepciones: [], pais: 'PA' },
  })
  assert.deepEqual(r.antes, { estado: 'en_curso', indice: 1 })
  assert.deepEqual(r.despues, { estado: 'en_curso', indice: 1 })
  assert.equal(r.ancla, '2026-02-26')
})

test('reAnclaEnDestino: feriados del destino no rompen la equivalencia (nov PA)', () => {
  // Origen martes, ancla 27-oct: S1 cae 17-nov (3 y 10-nov feriados). Hoy
  // 18-nov → índice 2. Destino jueves: 5-nov feriado corre su S1 al 12-nov y
  // S2 al 19-nov → la misma ancla 27-oct produce índice 2: no hay que moverla.
  const r = reAnclaEnDestino({
    ancla: '2026-10-27',
    nivel: 2,
    hoy: '2026-11-18',
    origen: { calendarioVersionado: cal([2]), excepciones: [], pais: 'PA' },
    destino: { calendarioVersionado: cal([4]), excepciones: [], pais: 'PA' },
  })
  assert.deepEqual(r.antes, { estado: 'en_curso', indice: 2 })
  assert.deepEqual(r.despues, { estado: 'en_curso', indice: 2 })
  assert.equal(r.ancla, '2026-10-27')
})

test('reAnclaEnDestino: la excepción EXCLUSIVA del destino sí se respeta', () => {
  const base = {
    ancla: '2026-03-04', // miércoles: INT 4-mar, S1 11-mar, S2 18-mar
    nivel: 2,
    hoy: '2026-03-13', // va por S2 (índice 2)
    origen: { calendarioVersionado: cal([3]), excepciones: [], pais: 'PA' },
  }
  // Sin excepción en el destino (jueves), la propia ancla ya da índice 2.
  const sinExc = reAnclaEnDestino({
    ...base,
    destino: { calendarioVersionado: cal([4]), excepciones: [], pais: 'PA' },
  })
  assert.equal(sinExc.ancla, '2026-03-04')
  // Con la clase del 12-mar suspendida SOLO en el destino, esa ancla ya no
  // sirve (daría índice 1): hay que retroceder hasta el 26-feb.
  const conExc = reAnclaEnDestino({
    ...base,
    destino: {
      calendarioVersionado: cal([4]),
      excepciones: [{ fecha: '2026-03-12', motivo: 'suspendida' }],
      pais: 'PA',
    },
  })
  assert.deepEqual(conExc.antes, { estado: 'en_curso', indice: 2 })
  assert.deepEqual(conExc.despues, { estado: 'en_curso', indice: 2 })
  assert.equal(conExc.ancla, '2026-02-26')
})

test('reAnclaEnDestino: por_iniciar se conserva como por_iniciar', () => {
  const r = reAnclaEnDestino({
    ancla: '2026-04-08',
    nivel: 2,
    hoy: '2026-03-13',
    origen: { calendarioVersionado: cal([3]), excepciones: [], pais: 'PA' },
    destino: { calendarioVersionado: cal([1]), excepciones: [], pais: 'PA' },
  })
  assert.equal(r.antes.estado, 'por_iniciar')
  assert.equal(r.despues.estado, 'por_iniciar')
  assert.equal(r.ancla, '2026-04-08')
})

test('reAnclaEnDestino: sin equivalente en el destino → null (el caller aborta)', () => {
  const memo = crearMemoPlanes()
  const r = reAnclaEnDestino({
    ancla: '2026-03-02',
    nivel: 2,
    hoy: '2026-03-05',
    origen: { calendarioVersionado: cal([1]), excepciones: [], pais: 'PA' },
    destino: { calendarioVersionado: [], excepciones: [], pais: 'PA' }, // sin calendario: nada se inventa
  }, memo)
  assert.equal(r, null)
})

test('reAnclaEnDestino: niño sin posición derivable → sinPlan explícito, nada que preservar', () => {
  const r = reAnclaEnDestino({
    ancla: null,
    nivel: 2,
    hoy: '2026-03-05',
    origen: { calendarioVersionado: cal([1]), excepciones: [], pais: 'PA' },
    destino: { calendarioVersionado: cal([4]), excepciones: [], pais: 'PA' },
  })
  assert.equal(r.sinPlan, true)
  assert.equal(r.antes.estado, 'sin_plan')
})

// ── errorExcepcionesPasado: el ajuste de excepciones no reescribe (g1-7) ────

const refConExcepciones = (excepciones) => ({
  nivel: 3,
  fecha_inicio: '2026-06-01',
  excepciones,
})

test('errorExcepcionesPasado: agregar o quitar una excepción PASADA se rechaza', () => {
  const hoy = '2026-08-08'
  // Agregar una pasada nueva.
  assert.match(
    errorExcepcionesPasado({
      referencia: refConExcepciones([]),
      excepciones: [{ fecha: '2026-07-06', motivo: 'Coach enferma' }],
      hoy,
      fechasConAsistencia: new Set(),
    }),
    /no se reescriben/
  )
  // Quitar una pasada existente.
  assert.match(
    errorExcepcionesPasado({
      referencia: refConExcepciones([{ fecha: '2026-07-06', motivo: 'Coach enferma' }]),
      excepciones: [],
      hoy,
      fechasConAsistencia: new Set(),
    }),
    /no se reescriben/
  )
})

test('errorExcepcionesPasado: editar el MOTIVO de una pasada sí se permite (no mueve fechas)', () => {
  assert.equal(
    errorExcepcionesPasado({
      referencia: refConExcepciones([{ fecha: '2026-07-06', motivo: 'Coach enferma' }]),
      excepciones: [{ fecha: '2026-07-06', motivo: 'Suspensión del centro' }],
      hoy: '2026-08-08',
      fechasConAsistencia: new Set(),
    }),
    null
  )
})

test('errorExcepcionesPasado: una excepción nueva sobre clase con asistencia se rechaza', () => {
  // Incluye marcas por adelantado: la fecha futura con asistencia también es
  // evidencia (g1-23) y no se suspende.
  assert.match(
    errorExcepcionesPasado({
      referencia: refConExcepciones([]),
      excepciones: [{ fecha: '2026-08-12', motivo: 'Feriado local' }],
      hoy: '2026-08-08',
      fechasConAsistencia: new Set(['2026-08-12']),
    }),
    /asistencia registrada/
  )
})

test('errorExcepcionesPasado: suspender de hoy en adelante sin marcas es legal', () => {
  assert.equal(
    errorExcepcionesPasado({
      referencia: refConExcepciones([{ fecha: '2026-07-06', motivo: 'Coach enferma' }]),
      excepciones: [
        { fecha: '2026-07-06', motivo: 'Coach enferma' },
        { fecha: '2026-08-08', motivo: 'Suspensión del centro' }, // hoy mismo
        { fecha: '2026-08-19', motivo: 'Feriado local' },
      ],
      hoy: '2026-08-08',
      fechasConAsistencia: new Set(['2026-07-06']),
    }),
    null
  )
})
