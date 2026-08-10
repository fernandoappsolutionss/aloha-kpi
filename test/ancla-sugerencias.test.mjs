import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ORIGENES_ANCLA,
  TIPOS_EVENTO_ANCLA,
  topeAncla,
  errorFechaAncla,
  modaDeAnclas,
  sugerenciasAncla,
} from '../lib/ancla-sugerencias.mjs'
import { generarItinerario } from '../lib/itinerario.js'
import { crearMemoPlanes } from '../lib/plan-nino.mjs'

// Aula KIDS 3 que arrancó el lunes 2026-04-06, clases lunes(1) y miércoles(3).
const REF = generarItinerario({ fechaInicio: '2026-04-06', dias: [1, 3], nivel: 3, pais: 'PA' })
const HOY = '2026-08-10'

const grupoBase = (extra = {}) => ({
  id: 71,
  itinerario: 'KIDS',
  itinerario_clases: REF,
  horarios: [{ dia: 1 }, { dia: 3 }],
  fecha_inicio_clases: '2026-04-06',
  ...extra,
})

const ninoBase = (extra = {}) => ({
  id: 900,
  itinerario: 'KIDS',
  nivel: 3,
  estado: 'activo',
  grupo_id: 71,
  fecha_inicio_nivel: null,
  ...extra,
})

// Evento de inscripción como lo trae el SQL: con a_nivel y a_grupo_id, que es
// lo único que permite verificar que la fecha sea la del nivel que cursa hoy.
const inscripcion = (extra = {}) => ({
  id: 1,
  tipo: 'inscripcion',
  fecha: '2026-05-11',
  a_nivel: 3,
  a_grupo_id: 71,
  estudiante_id: 900,
  ...extra,
})

const companero = (id, fecha, extra = {}) => ({
  id,
  itinerario: 'KIDS',
  nivel: 3,
  estado: 'activo',
  fecha_inicio_nivel: fecha,
  ...extra,
})

const claves = (r) => r.opciones.map((o) => o.clave)
const opcion = (r, clave) => r.opciones.find((o) => o.clave === clave) || null

// ── Moda de las anclas de la cohorte ────────────────────────────────────────

test('modaDeAnclas: gana la fecha más repetida', () => {
  const m = modaDeAnclas(['2026-04-06', '2026-05-04', '2026-04-06'])
  assert.deepEqual(m, { fecha: '2026-04-06', cuantos: 2, distintas: 2 })
})

test('modaDeAnclas: empate → la MÁS ANTIGUA', () => {
  const m = modaDeAnclas(['2026-05-04', '2026-04-06'])
  assert.equal(m.fecha, '2026-04-06')
  assert.equal(m.cuantos, 1)
  assert.equal(m.distintas, 2)
})

test('modaDeAnclas: normaliza Date de la BD y descarta basura', () => {
  const m = modaDeAnclas([new Date('2026-04-06T00:00:00Z'), null, 'corrupta', '2026-04-06'])
  assert.deepEqual(m, { fecha: '2026-04-06', cuantos: 2, distintas: 1 })
})

test('modaDeAnclas: sin anclas válidas → null', () => {
  assert.equal(modaDeAnclas([]), null)
  assert.equal(modaDeAnclas([null, '2026-13-01']), null)
})

// ── Validación de la fecha (la que aplica el server) ────────────────────────

test('topeAncla: hoy + 1 año', () => {
  assert.equal(topeAncla('2026-08-10'), '2027-08-10')
  assert.equal(topeAncla(new Date('2026-08-10T00:00:00Z')), '2027-08-10')
  assert.equal(topeAncla('corrupta'), null)
})

test('errorFechaAncla: formato y calendario real', () => {
  assert.match(errorFechaAncla('10/08/2026', HOY), /AAAA-MM-DD/)
  assert.match(errorFechaAncla('', HOY), /AAAA-MM-DD/)
  assert.match(errorFechaAncla('2026-02-31', HOY), /calendario/)
  assert.equal(errorFechaAncla('2026-02-28', HOY), null)
})

test('errorFechaAncla: pasada sí, futura hasta un año sí, más allá no', () => {
  assert.equal(errorFechaAncla('2024-01-15', HOY), null)
  assert.equal(errorFechaAncla(HOY, HOY), null)
  assert.equal(errorFechaAncla('2027-08-10', HOY), null) // el tope exacto pasa
  assert.match(errorFechaAncla('2027-08-11', HOY), /2027-08-10/)
  assert.match(errorFechaAncla('2036-08-10', HOY), /hoy \+ 1 año/)
})

test('errorFechaAncla: sin fecha de negocio no se valida nada a ciegas', () => {
  assert.match(errorFechaAncla('2026-04-06', null), /negocio/)
})

test('ORIGENES_ANCLA cubre las cuatro fuentes del manual', () => {
  assert.deepEqual(ORIGENES_ANCLA, ['con_el_grupo', 'con_la_cohorte', 'desde_su_inscripcion', 'manual'])
})

test('TIPOS_EVENTO_ANCLA: el SQL trae la inscripción Y los movimientos que re-anclan', () => {
  // Traer solo 'inscripcion' dejaba ciega la verificación del peldaño 3: el
  // aula le prestaba su fecha a un niño trasladado a mitad de nivel.
  assert.deepEqual(
    [...TIPOS_EVENTO_ANCLA].sort(),
    ['cambio_grupo', 'cambio_nivel', 'fusion', 'graduacion_tiny', 'inscripcion'],
  )
})

// ── Sugerencias: orden, recomendada y explicaciones ─────────────────────────

test('las cuatro fuentes aplican: orden de probabilidad y recomendada', () => {
  const r = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase(),
    companeros: [companero(901, '2026-04-06'), companero(902, '2026-04-06'), companero(903, '2026-05-04')],
    eventos: [inscripcion({ fecha: '2026-05-11' })],
    hoy: HOY,
  })
  assert.deepEqual(claves(r), ['con_el_grupo', 'con_la_cohorte', 'desde_su_inscripcion', 'manual'])
  assert.equal(r.recomendada, 'con_el_grupo')
  assert.equal(opcion(r, 'con_el_grupo').fecha, '2026-04-06')
  assert.equal(opcion(r, 'con_la_cohorte').fecha, '2026-04-06')
  assert.equal(opcion(r, 'desde_su_inscripcion').fecha, '2026-05-11')
  assert.equal(opcion(r, 'manual').fecha, null)
})

test('la explicación dice por dónde iría el niño con esa fecha', () => {
  const r = sugerenciasAncla({ nino: ninoBase(), grupo: grupoBase(), hoy: HOY })
  // 2026-04-06 + lunes/miércoles: al 2026-08-10 el aula va por una semana del
  // medio del libro — el texto trae la posición derivada, no una promesa vaga.
  assert.match(opcion(r, 'con_el_grupo').explicacion, /va por S\d+/)
  assert.match(opcion(r, 'con_el_grupo').explicacion, /nivel 3 el 2026-04-06/)
})

test('sin grupo derivable la explicación no inventa posición', () => {
  const grupo = grupoBase({ itinerario_clases: { ...REF, versiones: [] }, horarios: [] })
  // Sin horarios y sin versiones utilizables el calendario queda vacío: la
  // opción se ofrece igual (la fecha es real) pero sin "va por S{x}".
  const it = { fecha_inicio: '2026-04-06', nivel: 3, semanas: [] }
  const r = sugerenciasAncla({ nino: ninoBase(), grupo: { ...grupo, itinerario_clases: it }, hoy: HOY })
  assert.equal(opcion(r, 'con_el_grupo').fecha, '2026-04-06')
  assert.doesNotMatch(opcion(r, 'con_el_grupo').explicacion, /va por S/)
})

test('nivel discordante con la referencia: NO se ofrece con_el_grupo', () => {
  const r = sugerenciasAncla({ nino: ninoBase({ nivel: 4 }), grupo: grupoBase(), hoy: HOY })
  assert.equal(opcion(r, 'con_el_grupo'), null)
  assert.equal(r.recomendada, 'manual')
})

test('itinerario distinto al del aula: NO se ofrece con_el_grupo', () => {
  const r = sugerenciasAncla({ nino: ninoBase({ itinerario: 'TINY' }), grupo: grupoBase(), hoy: HOY })
  assert.equal(opcion(r, 'con_el_grupo'), null)
})

test('grupo sin referencia (nunca se le generó plan): solo lo que sí exista', () => {
  const r = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase({ itinerario_clases: null }),
    companeros: [companero(901, '2026-04-06')],
    hoy: HOY,
  })
  assert.deepEqual(claves(r), ['con_la_cohorte', 'manual'])
  assert.equal(r.recomendada, 'con_la_cohorte')
})

test('la cohorte solo cuenta compañeros vivos del mismo itinerario y nivel', () => {
  const r = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase({ itinerario_clases: null }),
    companeros: [
      companero(900, '2026-01-05'), // él mismo: fuera
      companero(901, '2026-01-05', { estado: 'retirado' }), // retirado: fuera
      companero(902, '2026-01-05', { nivel: 4 }), // otro nivel: fuera
      companero(903, '2026-01-05', { itinerario: 'TINY' }), // otro itinerario: fuera
      companero(904, null), // sin ancla: fuera
      companero(905, '2026-04-06'),
      companero(906, new Date('2026-04-06T00:00:00Z')),
    ],
    hoy: HOY,
  })
  const o = opcion(r, 'con_la_cohorte')
  assert.equal(o.fecha, '2026-04-06')
  assert.match(o.explicacion, /^2 compañeros de KIDS 3 ya tienen su ancla el 2026-04-06/)
})

test('cohorte con anclas dispares: avisa que hay más de una', () => {
  const r = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase({ itinerario_clases: null }),
    companeros: [companero(901, '2026-04-06'), companero(902, '2026-04-06'), companero(903, '2026-05-04')],
    hoy: HOY,
  })
  assert.match(opcion(r, 'con_la_cohorte').explicacion, /2 anclas distintas/)
})

test('inscripción anterior al arranque del aula: manda la fecha del grupo (g1-8)', () => {
  const r = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase({ itinerario_clases: null }),
    eventos: [inscripcion({ fecha: '2026-03-02' })],
    hoy: HOY,
  })
  const o = opcion(r, 'desde_su_inscripcion')
  assert.equal(o.fecha, '2026-04-06')
  assert.match(o.explicacion, /registrada el 2026-03-02/)
  assert.match(o.explicacion, /no arranca antes que el aula/)
})

test('inscripción: solo la del propio niño y solo si es la ÚNICA (peldaño 2)', () => {
  // Dos inscripciones = el dedupe canónico (g1-17) está pendiente: el backfill
  // lo declara 'inscripcion_multiple' y la pantalla tampoco escoge por su
  // cuenta cuál de las dos manda.
  const r = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase({ itinerario_clases: null }),
    eventos: [
      inscripcion({ id: 9, fecha: '2026-05-11' }),
      inscripcion({ id: 3, fecha: '2026-06-01' }),
      inscripcion({ id: 1, fecha: '2026-01-05', estudiante_id: 555 }), // de otro niño
    ],
    hoy: HOY,
  })
  assert.equal(opcion(r, 'desde_su_inscripcion'), null)
  // Con una sola suya (la del otro niño se ignora) sí se ofrece.
  const uno = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase({ itinerario_clases: null }),
    eventos: [inscripcion({ id: 9, fecha: '2026-05-11' }), inscripcion({ id: 1, fecha: '2026-01-05', estudiante_id: 555 })],
    hoy: HOY,
  })
  assert.equal(opcion(uno, 'desde_su_inscripcion').fecha, '2026-05-11')
})

test('sin evento de inscripción usable: la opción no se ofrece', () => {
  const r = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase({ itinerario_clases: null }),
    eventos: [inscripcion({ fecha: null })],
    hoy: HOY,
  })
  assert.deepEqual(claves(r), ['manual'])
  assert.equal(r.recomendada, 'manual')
})

// ── La inscripción tiene que ser DEL NIVEL QUE CURSA (peldaño 2) ─────────────

test('inscripción de OTRO nivel: la fuente no se ofrece (es el caso que el backfill rechazó)', () => {
  // Los 84 niños sin ancla de producción: su inscripción declara nivel 1 y hoy
  // van en KIDS 3 ('inscripcion_discordante_nivel'). Ofrecerla —y encima
  // corrida al arranque del aula— era escribir una fecha que no es ni su
  // inscripción ni el arranque de su nivel.
  const r = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase({ itinerario_clases: null, fecha_inicio_clases: '2026-01-12' }),
    eventos: [inscripcion({ fecha: '2024-02-05', a_nivel: 1 })],
    hoy: HOY,
  })
  assert.equal(opcion(r, 'desde_su_inscripcion'), null)
  assert.deepEqual(claves(r), ['manual'])
  assert.equal(r.recomendada, 'manual')
})

test('inscripción sin a_nivel (legacy): no hay nada que verificar → no se ofrece', () => {
  const r = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase({ itinerario_clases: null }),
    eventos: [inscripcion({ a_nivel: null })],
    hoy: HOY,
  })
  assert.equal(opcion(r, 'desde_su_inscripcion'), null)
})

test('inscripción a OTRO grupo o con movimientos de por medio: no se ofrece', () => {
  const otroGrupo = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase({ itinerario_clases: null }),
    eventos: [inscripcion({ a_grupo_id: 55 })],
    hoy: HOY,
  })
  assert.equal(opcion(otroGrupo, 'desde_su_inscripcion'), null)
  // Un traslado posterior pudo re-anclarlo (g1-9): su inscripción ya no manda.
  const conTraslado = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase({ itinerario_clases: null }),
    eventos: [inscripcion(), { id: 4, tipo: 'cambio_grupo', fecha: '2026-06-01', a_grupo_id: 71, estudiante_id: 900 }],
    hoy: HOY,
  })
  assert.equal(opcion(conTraslado, 'desde_su_inscripcion'), null)
})

// ── con_el_grupo: filtro COMPLETO del peldaño 3 ─────────────────────────────

test('niño trasladado DESPUÉS del arranque del nivel: NO arrancó con el grupo', () => {
  // G71 arrancó el nivel 3 el 2026-04-06 y este niño llegó el 2026-06-01, con
  // el aula ya andando: la fecha del aula le adelantaría el plan varias
  // semanas (chip, cierre y aviso de liberación corridos).
  const r = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase(),
    eventos: [{ id: 4, tipo: 'cambio_grupo', fecha: '2026-06-01', a_grupo_id: 71, estudiante_id: 900 }],
    hoy: HOY,
  })
  assert.equal(opcion(r, 'con_el_grupo'), null)
  assert.equal(r.recomendada, 'manual')
})

test('movimiento ANTERIOR al arranque del nivel: sí arrancó con el grupo', () => {
  const r = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase(),
    eventos: [{ id: 4, tipo: 'cambio_grupo', fecha: '2026-03-02', a_grupo_id: 71, estudiante_id: 900 }],
    hoy: HOY,
  })
  assert.equal(opcion(r, 'con_el_grupo').fecha, '2026-04-06')
  assert.equal(r.recomendada, 'con_el_grupo')
})

test('último movimiento hacia OTRA aula o sin fecha: la referencia no se ofrece', () => {
  const otraAula = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase(),
    eventos: [{ id: 4, tipo: 'fusion', fecha: '2026-03-02', a_grupo_id: 88, estudiante_id: 900 }],
    hoy: HOY,
  })
  assert.equal(opcion(otraAula, 'con_el_grupo'), null)
  const sinFecha = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase(),
    eventos: [{ id: 4, tipo: 'cambio_grupo', fecha: null, a_grupo_id: 71, estudiante_id: 900 }],
    hoy: HOY,
  })
  assert.equal(opcion(sinFecha, 'con_el_grupo'), null)
})

test('sin ninguna fuente: queda manual y nada se inventa', () => {
  const r = sugerenciasAncla({ nino: ninoBase(), hoy: HOY })
  assert.deepEqual(claves(r), ['manual'])
  assert.equal(opcion(r, 'manual').fecha, null)
  assert.equal(r.recomendada, 'manual')
})

test('sin niño no hay nada que sugerir', () => {
  const r = sugerenciasAncla({})
  assert.deepEqual(r, { opciones: [], recomendada: null })
})

// ── Con cohorte y sin cohorte (la misma pantalla, dos aulas distintas) ──────

test('CON cohorte: los compañeros con ancla ofrecen su fecha aunque el aula no la dé', () => {
  // Aula sin referencia utilizable, pero tres compañeros del mismo nivel ya
  // anclados: esa es la fuente, y la fecha es la de ellos — no una inventada.
  const r = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase({ itinerario_clases: null }),
    companeros: [companero(901, '2026-04-06'), companero(902, '2026-04-06'), companero(903, '2026-04-06')],
    hoy: HOY,
  })
  assert.deepEqual(claves(r), ['con_la_cohorte', 'manual'])
  assert.equal(r.recomendada, 'con_la_cohorte')
  assert.equal(opcion(r, 'con_la_cohorte').fecha, '2026-04-06')
  assert.match(opcion(r, 'con_la_cohorte').explicacion, /3 compañeros/)
  assert.doesNotMatch(opcion(r, 'con_la_cohorte').explicacion, /anclas distintas/)
})

test('SIN cohorte: ningún compañero anclado ⇒ la fuente no se ofrece', () => {
  // Mismo caso, pero el aula entera está sin ancla (Calle 50 G71): queda el
  // plan del grupo y nada más. La cohorte no se rellena con nadie.
  const r = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase(),
    companeros: [companero(901, null), companero(902, null)],
    hoy: HOY,
  })
  assert.deepEqual(claves(r), ['con_el_grupo', 'manual'])
  assert.equal(opcion(r, 'con_la_cohorte'), null)
})

test('SIN cohorte y sin grupo utilizable: solo queda escribirla a mano', () => {
  const r = sugerenciasAncla({
    nino: ninoBase(),
    grupo: grupoBase({ itinerario_clases: null }),
    companeros: [],
    eventos: [],
    hoy: HOY,
  })
  assert.deepEqual(claves(r), ['manual'])
  assert.equal(r.recomendada, 'manual')
})

test('nivel discordante con el aula: manda la cohorte de SU nivel, no el aula', () => {
  // Aula fusionada: la referencia es KIDS 3 pero este niño cursa KIDS 4 junto a
  // otros dos. La fecha del aula sería falsa para él; la de sus pares, no.
  const r = sugerenciasAncla({
    nino: ninoBase({ nivel: 4 }),
    grupo: grupoBase(),
    companeros: [
      companero(901, '2026-04-06'), // KIDS 3: la cohorte del aula, no la suya
      companero(902, '2026-06-15', { nivel: 4 }),
      companero(903, '2026-06-15', { nivel: 4 }),
    ],
    hoy: HOY,
  })
  assert.equal(opcion(r, 'con_el_grupo'), null)
  assert.equal(r.recomendada, 'con_la_cohorte')
  assert.equal(opcion(r, 'con_la_cohorte').fecha, '2026-06-15')
  assert.match(opcion(r, 'con_la_cohorte').explicacion, /KIDS 4/)
})

test('el memo se comparte entre niños de la misma pantalla', () => {
  const memo = crearMemoPlanes()
  const entrada = { nino: ninoBase(), grupo: grupoBase(), hoy: HOY }
  const a = sugerenciasAncla(entrada, memo)
  const antes = memo.size
  const b = sugerenciasAncla({ ...entrada, nino: ninoBase({ id: 901 }) }, memo)
  assert.ok(antes > 0)
  assert.equal(memo.size, antes) // misma clave (ancla, nivel, país, calendario)
  assert.equal(a.opciones[0].explicacion, b.opciones[0].explicacion)
})
