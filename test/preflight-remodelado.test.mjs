import test from 'node:test'
import assert from 'node:assert/strict'

import {
  activosSinFecha,
  clasificarVeteranoFuturo,
  estadoCorreccion,
  medirHistoriaApertura,
  patchCorreccionVeteranos,
} from '../lib/preflight-remodelado.mjs'
import {
  comparableMes,
  compararComparables,
  finDeMes,
} from '../lib/backfill-fecha-inicio.mjs'

const HOY = '2026-08-08'

// --- Fixtures: misma forma que las filas reales de la BD ---------------------

const grupo = (overrides = {}) => ({
  id: 1,
  centro_id: 1,
  numero: 'G1',
  itinerario: 'TINY',
  estado: 'activo',
  fecha_inicio_clases: '2026-09-07',
  fecha_apertura: null,
  itinerario_clases: { nivel: 5, fecha_inicio: '2026-09-07' },
  created_at: '2026-01-15T18:00:00Z',
  ...overrides,
})

const estudiante = (overrides = {}) => ({
  id: 1,
  grupo_id: 1,
  nombre: 'Ana Perez',
  itinerario: 'TINY',
  nivel: 5,
  estado: 'activo',
  fecha_inscripcion: '2026-05-10',
  ...overrides,
})

const inscripcion = (overrides = {}) => ({
  id: 100,
  estudiante_id: 1,
  tipo: 'inscripcion',
  fecha: '2026-05-10',
  a_grupo_id: 1,
  ...overrides,
})

// --- (a) g1-2: activos sin fecha --------------------------------------------

test('activosSinFecha: solo activos con NULL, con y sin itinerario', () => {
  const grupos = [
    grupo({ id: 1, fecha_inicio_clases: null }), // activo sin fecha CON itinerario
    grupo({ id: 2, fecha_inicio_clases: null, itinerario_clases: null }), // sin itinerario
    grupo({ id: 3 }), // con fecha: fuera
    grupo({ id: 4, fecha_inicio_clases: null, estado: 'cerrado' }), // no activo: fuera
  ]
  const filas = activosSinFecha(grupos)
  assert.deepEqual(filas.map((f) => f.grupoId), [1, 2])
  assert.equal(filas[0].tieneItinerario, true)
  assert.equal(filas[0].itInicio, '2026-09-07')
  assert.equal(filas[1].tieneItinerario, false)
  assert.equal(filas[1].itInicio, null)
  // El respaldo informativo es la publicación civil Panamá, jamás otra fecha.
  assert.equal(filas[0].fechaPublicacion, '2026-01-15')
})

// --- (b) g1-1: clasificación de veteranos futuros ----------------------------

test('veterano futuro con niños: candidato con LEAST(actual, min inscripcion)', () => {
  const universo = [
    { estudianteId: 1, fecha: '2026-05-10', estado: 'activo' },
    { estudianteId: 2, fecha: '2026-04-01', estado: 'retirado' }, // el retirado TAMBIEN acota
  ]
  const r = clasificarVeteranoFuturo(grupo(), universo, HOY)
  assert.equal(r.estado, 'candidato')
  assert.equal(r.minInscripcion, '2026-04-01')
  assert.equal(r.fechaNueva, '2026-04-01') // LEAST: gana la inscripcion pasada
  assert.equal(r.universo, 2)
  assert.equal(r.activos, 1)
})

test('LEAST conserva la fecha actual cuando es la menor', () => {
  const universo = [{ estudianteId: 1, fecha: '2026-09-15', estado: 'activo' }]
  const r = clasificarVeteranoFuturo(grupo({ fecha_inicio_clases: '2026-09-01', itinerario_clases: { nivel: 5, fecha_inicio: '2026-09-01' } }), universo, HOY)
  assert.equal(r.estado, 'candidato')
  assert.equal(r.fechaNueva, '2026-09-01')
})

test('los que NO son el caso: pasado, nivel 1, fecha manual, sin niños', () => {
  const universo = [{ estudianteId: 1, fecha: '2026-05-10', estado: 'activo' }]
  // Fecha pasada o presente: fuera del caso.
  assert.equal(clasificarVeteranoFuturo(grupo({ fecha_inicio_clases: '2026-08-08' }), universo, HOY).estado, 'no_aplica')
  assert.equal(clasificarVeteranoFuturo(grupo({ fecha_inicio_clases: null }), universo, HOY).estado, 'no_aplica')
  // Nivel 1 con fecha futura = llenado normal (venta anticipada), no un roto.
  assert.equal(
    clasificarVeteranoFuturo(grupo({ itinerario_clases: { nivel: 1, fecha_inicio: '2026-09-07' } }), universo, HOY).estado,
    'nivel_1_en_llenado',
  )
  // Sin itinerario no hay nivel vigente: se trata como caso de humano (nivel 1).
  assert.equal(clasificarVeteranoFuturo(grupo({ itinerario_clases: null }), universo, HOY).estado, 'nivel_1_en_llenado')
  // La fecha futura NO es el arranque del nivel vigente: la puso un humano.
  assert.equal(
    clasificarVeteranoFuturo(grupo({ fecha_inicio_clases: '2026-09-14' }), universo, HOY).estado,
    'fecha_manual_futura',
  )
  // Veterano futuro sin niños atribuidos: nada que reclasificar.
  assert.equal(clasificarVeteranoFuturo(grupo(), [], HOY).estado, 'sin_ninos')
})

test('universo sin fecha o solo retirados: decide un humano, no el preflight', () => {
  assert.equal(
    clasificarVeteranoFuturo(grupo(), [{ estudianteId: 1, fecha: null, estado: 'activo' }], HOY).estado,
    'universo_sin_fecha',
  )
  assert.equal(
    clasificarVeteranoFuturo(grupo(), [{ estudianteId: 1, fecha: '2026-05-10', estado: 'retirado' }], HOY).estado,
    'solo_retirados',
  )
})

// --- (b) comparable before/after --------------------------------------------

test('la correccion LEAST deja el comparable del cuadro IDENTICO', () => {
  const grupos = [grupo()]
  const estudiantes = [
    estudiante({ id: 1, fecha_inscripcion: '2026-05-10' }),
    estudiante({ id: 2, fecha_inscripcion: '2026-04-01', estado: 'retirado' }),
  ]
  const eventos = [
    inscripcion({ id: 101, estudiante_id: 1, fecha: '2026-05-10' }),
    inscripcion({ id: 102, estudiante_id: 2, fecha: '2026-04-01' }),
    { id: 103, estudiante_id: 2, tipo: 'retiro', fecha: '2026-07-20', de_grupo_id: 1 },
  ]
  const correcciones = new Map([
    ['1', { fecha: '2026-09-07', fechaNueva: '2026-04-01' }],
  ])
  // "antes" modela prod hoy (fecha ignorada para el veterano → NULL); "despues"
  // es la fecha corregida: max(inscripcion, fechaNueva) = inscripcion para
  // TODOS los atribuidos, asi que nada puede moverse.
  const base = { estudiantes, eventos, year: 2026, month: 8, royaltyRate: 12 }
  const antes = comparableMes({ ...base, grupos: patchCorreccionVeteranos(grupos, correcciones, 'antes') })
  const despues = comparableMes({ ...base, grupos: patchCorreccionVeteranos(grupos, correcciones, 'despues') })
  const r = compararComparables(antes, despues, { decisiones: new Map(), finMes: finDeMes(2026, 8) })
  assert.deepEqual(r.diferencias, [])
  assert.deepEqual(r.variaciones, [])
  // Y el grupo esta EN el cuadro en ambos lados (el veterano nunca sale).
  assert.deepEqual(antes.gruposIds, ['1'])
  assert.deepEqual(despues.gruposIds, ['1'])
})

test('una correccion mala (fecha aun futura) la cubre la guardia: el veterano no sale', () => {
  // Antes de la guardia de runtime (g1-1), dejarle al veterano una fecha aún
  // futura lo sacaba del cuadro y la verificación abortaba. Ahora la guardia
  // (nivel 2+ con fecha futura = dato roto → se trata como NULL) lo mantiene
  // dentro con su gente: la corrección mala no reclasifica nada en runtime y
  // el preflight sigue siendo quien deja los DATOS correctos.
  const grupos = [grupo()]
  const estudiantes = [estudiante({ id: 1 })]
  const eventos = [inscripcion({ id: 101, estudiante_id: 1 })]
  const correcciones = new Map([
    ['1', { fecha: '2026-09-07', fechaNueva: '2026-09-07' }], // no corrige nada
  ])
  const base = { estudiantes, eventos, year: 2026, month: 8, royaltyRate: 12 }
  const antes = comparableMes({ ...base, grupos: patchCorreccionVeteranos(grupos, correcciones, 'antes') })
  const despues = comparableMes({ ...base, grupos: patchCorreccionVeteranos(grupos, correcciones, 'despues') })
  const r = compararComparables(antes, despues, { decisiones: new Map(), finMes: finDeMes(2026, 8) })
  assert.deepEqual(r.diferencias, [])
  assert.deepEqual(antes.gruposIds, ['1'])
  assert.deepEqual(despues.gruposIds, ['1'])
})

test('patchCorreccionVeteranos solo pisa la fecha futura auditada y no muta', () => {
  const original = [grupo({ id: 1 }), grupo({ id: 2, fecha_inicio_clases: '2026-05-04' })]
  const correcciones = new Map([
    ['1', { fecha: '2026-09-07', fechaNueva: '2026-04-01' }],
    ['2', { fecha: '2026-09-07', fechaNueva: '2026-04-01' }], // la fila viva ya no coincide
  ])
  const antes = patchCorreccionVeteranos(original, correcciones, 'antes')
  const despues = patchCorreccionVeteranos(original, correcciones, 'despues')
  assert.equal(antes[0].fecha_inicio_clases, null)
  assert.equal(despues[0].fecha_inicio_clases, '2026-04-01')
  assert.equal(antes[1].fecha_inicio_clases, '2026-05-04') // CAS simulado: intacta
  assert.equal(original[0].fecha_inicio_clases, '2026-09-07')
})

// --- (b) estado del manifiesto en el --apply ---------------------------------

test('estadoCorreccion: aplicada / pendiente / conflicto', () => {
  const entrada = { grupoId: 1, fecha: '2026-09-07', fechaNueva: '2026-04-01' }
  const vivaPendiente = grupo({ fecha_inicio_clases: '2026-09-07' })
  const clasifViva = { estado: 'candidato', fechaNueva: '2026-04-01' }

  assert.equal(estadoCorreccion(vivaPendiente, entrada, clasifViva), 'pendiente')
  // Idempotencia: la fecha corregida ya esta puesta (el driver da Date).
  assert.equal(estadoCorreccion(grupo({ fecha_inicio_clases: new Date('2026-04-01T00:00:00Z') }), entrada, null), 'aplicada')
  // Derivas: fecha ajena, clasificacion viva distinta, fila ausente.
  assert.equal(estadoCorreccion(grupo({ fecha_inicio_clases: '2026-06-01' }), entrada, clasifViva), 'conflicto')
  assert.equal(estadoCorreccion(vivaPendiente, entrada, { estado: 'candidato', fechaNueva: '2026-05-10' }), 'conflicto')
  assert.equal(estadoCorreccion(vivaPendiente, entrada, { estado: 'universo_sin_fecha' }), 'conflicto')
  assert.equal(estadoCorreccion(null, entrada, clasifViva), 'conflicto')
})

// --- (c) g1-3: medicion de historia ------------------------------------------

test('medirHistoriaApertura compara contra el dia civil Panama de created_at', () => {
  const grupos = [
    // 18:00Z = 13:00 Panama: mismo dia civil → coincide.
    grupo({ id: 1, fecha_apertura: '2026-01-15', created_at: '2026-01-15T18:00:00Z' }),
    // 00:30Z del 16 = 19:30 Panama del 15: slice(0,10) mentiria — el helper no.
    grupo({ id: 2, fecha_apertura: '2026-01-15', created_at: '2026-01-16T00:30:00Z' }),
    // Apertura registrada en otro dia: discrepancia real de historia.
    grupo({ id: 3, fecha_apertura: '2026-02-01', created_at: '2026-01-15T18:00:00Z' }),
    grupo({ id: 4, fecha_apertura: null }),
  ]
  const m = medirHistoriaApertura(grupos)
  assert.equal(m.total, 4)
  assert.equal(m.sinApertura, 1)
  assert.equal(m.coinciden, 2) // el 1 y el 2 (borde de medianoche bien resuelto)
  assert.equal(m.distintos, 1)
  assert.deepEqual(m.muestras.map((x) => x.grupoId), [3])
  assert.equal(m.muestras[0].fechaPublicacion, '2026-01-15')
})

test('medirHistoriaApertura respeta maxMuestras', () => {
  const grupos = [1, 2, 3].map((id) =>
    grupo({ id, fecha_apertura: '2026-02-01', created_at: '2026-01-15T18:00:00Z' })
  )
  const m = medirHistoriaApertura(grupos, { maxMuestras: 2 })
  assert.equal(m.distintos, 3)
  assert.equal(m.muestras.length, 2)
})
