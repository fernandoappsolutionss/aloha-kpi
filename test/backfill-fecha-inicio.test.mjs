import test from 'node:test'
import assert from 'node:assert/strict'

import {
  comparableMes,
  compararComparables,
  decidirFechaInicio,
  estadoCandidato,
  finDeMes,
  itInicioDe,
  patchFechaInicio,
  universosPorGrupo,
} from '../lib/backfill-fecha-inicio.mjs'

// --- Fixtures: misma forma que las filas reales de la BD ---------------------

const grupo = (overrides = {}) => ({
  id: 1,
  centro_id: 1,
  numero: 'G1',
  itinerario: 'TINY',
  estado: 'activo',
  fecha_inicio_clases: null,
  itinerario_clases: { nivel: 1, fecha_inicio: '2026-09-07' },
  ...overrides,
})

const estudiante = (overrides = {}) => ({
  id: 1,
  grupo_id: 1,
  nombre: 'Ana Perez',
  itinerario: 'TINY',
  nivel: 1,
  estado: 'activo',
  fecha_inscripcion: '2026-08-05',
  ...overrides,
})

const inscripcion = (overrides = {}) => ({
  id: 100,
  estudiante_id: 1,
  tipo: 'inscripcion',
  fecha: '2026-08-05',
  a_grupo_id: 1,
  ...overrides,
})

test('itInicioDe lee el inicio del nivel del JSONB, string o corrupto', () => {
  assert.equal(itInicioDe(grupo()), '2026-09-07')
  assert.equal(itInicioDe(grupo({ itinerario_clases: '{"fecha_inicio":"2026-09-07"}' })), '2026-09-07')
  assert.equal(itInicioDe(grupo({ itinerario_clases: { fecha_inicio: new Date('2026-09-07T00:00:00Z') } })), '2026-09-07')
  assert.equal(itInicioDe(grupo({ itinerario_clases: '{corrupto' })), null)
  assert.equal(itInicioDe(grupo({ itinerario_clases: {} })), null)
  assert.equal(itInicioDe(grupo({ itinerario_clases: null })), null)
})

test('el universo atribuye por la PRIMERA inscripcion efectiva, no el grupo actual', () => {
  // Espejo de lib/inicios-clase.mjs:40-43: a_grupo_id del primer evento manda
  // aunque el niño hoy este en otro grupo; sin evento, fallback a grupo_id.
  const estudiantes = [
    estudiante({ id: 1, grupo_id: 2 }), // movido: su primera inscripcion apunta al 1
    estudiante({ id: 2, grupo_id: 1, fecha_inscripcion: '2026-07-01' }), // sin evento
    estudiante({ id: 3, grupo_id: null, fecha_inscripcion: null }), // sin grupo ni evento: fuera
    estudiante({ id: 4, grupo_id: 1, estado: 'retirado', fecha_inscripcion: '2026-06-10' }), // retirado TAMBIEN cuenta
  ]
  const eventos = [
    inscripcion({ id: 101, estudiante_id: 1, fecha: '2026-08-05', a_grupo_id: 1 }),
    inscripcion({ id: 102, estudiante_id: 1, fecha: '2026-08-20', a_grupo_id: 2 }), // posterior: no es la primera
  ]

  const universos = universosPorGrupo(estudiantes, eventos)
  assert.deepEqual(universos.get('1'), [
    { estudianteId: 1, fecha: '2026-08-05' },
    { estudianteId: 2, fecha: '2026-07-01' },
    { estudianteId: 4, fecha: '2026-06-10' },
  ])
  assert.equal(universos.get('2'), undefined)
})

test('sin niños en el universo la fecha es el inicio del nivel', () => {
  assert.deepEqual(decidirFechaInicio({ itInicio: '2026-09-07' }), {
    fecha: '2026-09-07',
    regla: 'del_itinerario',
    minInscripcion: null,
  })
})

test('con niños la fecha es LEAST(it_inicio, min inscripcion) — cero reclasificacion', () => {
  // Venta anticipada: el niño de julio obliga a retroceder la fecha del grupo
  // para que max(inscripcion, fecha grupo) no se le mueva a nadie.
  assert.deepEqual(
    decidirFechaInicio({ itInicio: '2026-09-07' }),
    { fecha: '2026-09-07', regla: 'del_itinerario', minInscripcion: null },
  )
  // Todos inscritos despues del inicio del nivel: gana it_inicio.
  assert.deepEqual(
    decidirFechaInicio({ itInicio: '2026-08-01' }),
    { fecha: '2026-08-01', regla: 'del_itinerario', minInscripcion: null },
  )
})

test('sin it_inicio o con universo sin fecha el grupo queda EXCLUIDO', () => {
  assert.equal(decidirFechaInicio({ itInicio: null }).regla, 'sin_it_inicio')
})

test('patchFechaInicio solo pisa filas en NULL (la condicion del CAS) y no muta', () => {
  const original = [
    grupo({ id: 1 }),
    grupo({ id: 2, fecha_inicio_clases: '2026-05-04' }),
    grupo({ id: 3 }),
  ]
  const decisiones = new Map([
    ['1', { fecha: '2026-09-07', regla: 'del_itinerario' }],
    ['2', { fecha: '2026-09-07', regla: 'del_itinerario' }], // ya tiene fecha: no se toca
  ])

  const parchado = patchFechaInicio(original, decisiones)
  assert.equal(parchado[0].fecha_inicio_clases, '2026-09-07')
  assert.equal(parchado[1].fecha_inicio_clases, '2026-05-04')
  assert.equal(parchado[2].fecha_inicio_clases, null)
  assert.equal(original[0].fecha_inicio_clases, null)
})

test('comparableMes reproduce el filtro del cuadro: grupo con inicio futuro fuera', () => {
  const grupos = [
    grupo({ id: 1, fecha_inicio_clases: '2026-09-07' }), // en llenado: fuera de agosto
    grupo({ id: 2, fecha_inicio_clases: '2026-05-04' }),
  ]
  const estudiantes = [
    estudiante({ id: 1, grupo_id: 1 }), // niño del grupo en llenado: fuera
    estudiante({ id: 2, grupo_id: 2, fecha_inscripcion: '2026-05-10' }),
    estudiante({ id: 3, grupo_id: null, fecha_inscripcion: '2026-05-10' }), // suelto: paga
    estudiante({ id: 4, grupo_id: 2, nivel: 0, fecha_inscripcion: '2026-05-10' }), // nivel fuera de catalogo: sin royalty
    estudiante({ id: 5, grupo_id: 2, estado: 'retirado', fecha_inscripcion: '2026-05-10' }), // contado pero no paga
  ]
  const eventos = [
    inscripcion({ id: 101, estudiante_id: 1, fecha: '2026-08-05', a_grupo_id: 1 }),
    inscripcion({ id: 102, estudiante_id: 2, fecha: '2026-05-10', a_grupo_id: 2 }),
  ]

  const agosto = comparableMes({ grupos, estudiantes, eventos, year: 2026, month: 8, royaltyRate: 12 })
  assert.deepEqual(agosto.gruposIds, ['2'])
  assert.deepEqual(agosto.ninosIds, ['2', '3', '4', '5'])
  assert.deepEqual(agosto.nuevosIds, []) // el unico inicio de agosto seria el niño 1, pero arranca en septiembre
  assert.deepEqual(agosto.royalties, { totalNinos: 2, totalNuevos: 0, totalRoyalty: 24 })
  assert.equal(agosto.aPagar, 3) // niños 2 y 4 del grupo 2 + el suelto 3

  // En septiembre el grupo 1 ya inicio: entra el, su niño y el inicio operativo.
  const septiembre = comparableMes({ grupos, estudiantes, eventos, year: 2026, month: 9, royaltyRate: 12 })
  assert.deepEqual(septiembre.gruposIds, ['1', '2'])
  assert.deepEqual(septiembre.nuevosIds, ['1'])
  assert.equal(septiembre.aPagar, 4)
})

// Regla nueva (R1, g1-1) + GUARDIA de runtime: el cuadro depende de la fecha
// de inicio de clases, pero un grupo cuya referencia ya cursa nivel 2+ dio
// clases por definición — si el backfill D7 le escribe el arranque FUTURO de
// su nivel vigente (dato roto), la guardia trata esa fecha como NULL: el grupo
// y su gente NO se mueven del cuadro (cero reclasificación) mientras el
// preflight g1-1 corrige la fecha en los datos (LEAST con la primera
// inscripción atribuida).
test('grupo de nivel 2+ con niños y arranque futuro: la guardia lo deja quieto (cero diferencias)', () => {
  const grupos = [grupo({ id: 1, itinerario_clases: { nivel: 5, fecha_inicio: '2026-09-07' } })]
  const estudiantes = [
    estudiante({ id: 1, grupo_id: 1, fecha_inscripcion: '2026-08-05' }),
    estudiante({ id: 2, grupo_id: 1, estado: 'retirado', fecha_inscripcion: '2026-07-01' }),
  ]
  const eventos = [
    inscripcion({ id: 101, estudiante_id: 1, fecha: '2026-08-05' }),
    inscripcion({ id: 102, estudiante_id: 2, fecha: '2026-07-01' }),
    { id: 103, estudiante_id: 2, tipo: 'retiro', fecha: '2026-07-20', de_grupo_id: 1 },
  ]
  const decision = decidirFechaInicio({ itInicio: itInicioDe(grupos[0]) })
  assert.deepEqual(decision, { fecha: '2026-09-07', regla: 'del_itinerario', minInscripcion: null })

  const decisiones = new Map([['1', decision]])
  const base = { estudiantes, eventos, year: 2026, month: 8, royaltyRate: 12 }
  const antes = comparableMes({ ...base, grupos })
  const despues = comparableMes({ ...base, grupos: patchFechaInicio(grupos, decisiones) })
  const resultado = compararComparables(antes, despues, { decisiones, finMes: finDeMes(2026, 8) })

  // El niño 1 es el nuevo de agosto ANTES y DESPUÉS del parche: la guardia
  // (nivel 2+ con fecha futura) neutraliza la fecha rota y nada se reclasifica
  // — el backfill puede aplicar sin sacar al veterano del cuadro.
  assert.deepEqual(antes.nuevosIds, ['1'])
  assert.deepEqual(despues.nuevosIds, ['1'])
  assert.deepEqual(despues.gruposIds, antes.gruposIds)
  assert.deepEqual(resultado.variaciones, [])
  assert.deepEqual(resultado.diferencias, [])
})

// Contraparte: un grupo de nivel 1 que todavia no estrena SI sale del mes, y su
// niño con el. Eso es correcto (esta en llenado), pero cualquier diferencia de
// niños aborta el backfill para que lo revise un humano.
test('grupo de nivel 1 con niños y arranque futuro: la verificacion lo marca y aborta', () => {
  const grupos = [grupo({ id: 1 })]
  const estudiantes = [estudiante({ id: 1, grupo_id: 1, fecha_inscripcion: '2026-08-05' })]
  const eventos = [inscripcion({ id: 101, estudiante_id: 1, fecha: '2026-08-05' })]
  const decisiones = new Map([['1', decidirFechaInicio({ itInicio: itInicioDe(grupos[0]) })]])

  const base = { estudiantes, eventos, year: 2026, month: 8, royaltyRate: 12 }
  const antes = comparableMes({ ...base, grupos })
  const despues = comparableMes({ ...base, grupos: patchFechaInicio(grupos, decisiones) })
  const resultado = compararComparables(antes, despues, { decisiones, finMes: finDeMes(2026, 8) })

  assert.ok(resultado.diferencias.some((d) => d.campo === 'ninosIds' && d.tipo === 'sale' && d.id === '1'))
})

test('grupo vacio con it_inicio futuro: sale del mes previo como variacion APROBADA', () => {
  const grupos = [grupo({ id: 1 }), grupo({ id: 2, fecha_inicio_clases: '2026-05-04' })]
  const estudiantes = [estudiante({ id: 2, grupo_id: 2, fecha_inscripcion: '2026-05-10' })]
  const eventos = [inscripcion({ id: 102, estudiante_id: 2, fecha: '2026-05-10', a_grupo_id: 2 })]
  const decision = decidirFechaInicio({ itInicio: '2026-09-07' })
  const decisiones = new Map([['1', decision]])

  const base = { estudiantes, eventos, year: 2026, month: 8, royaltyRate: 12 }
  const antes = comparableMes({ ...base, grupos })
  const despues = comparableMes({ ...base, grupos: patchFechaInicio(grupos, decisiones) })
  const resultado = compararComparables(antes, despues, { decisiones, finMes: finDeMes(2026, 8) })

  assert.deepEqual(resultado.diferencias, [])
  assert.deepEqual(resultado.variaciones, [
    { tipo: 'grupo_vacio_sale_del_mes', grupoId: '1', fechaAsignada: '2026-09-07' },
  ])
})

test('grupo "vacio" con un niño movido encima: la verificacion lo detecta y aborta', () => {
  // El universo del grupo 1 esta vacio (la primera inscripcion del niño apunta
  // al 2), pero el niño VIVE hoy en el 1: darle fecha futura lo sacaria del
  // cuadro de agosto. "Vacio" se mide con los niños DEL MES, no con el universo
  // de atribucion, asi que ni el grupo ni el niño pasan como variacion: ambos
  // son diferencia y el backfill aborta.
  const grupos = [grupo({ id: 1 }), grupo({ id: 2, fecha_inicio_clases: '2026-05-04' })]
  const estudiantes = [estudiante({ id: 1, grupo_id: 1, fecha_inscripcion: '2026-05-10' })]
  const eventos = [inscripcion({ id: 101, estudiante_id: 1, fecha: '2026-05-10', a_grupo_id: 2 })]
  const decision = decidirFechaInicio({ itInicio: '2026-09-07' })
  const decisiones = new Map([['1', decision]])

  const base = { estudiantes, eventos, year: 2026, month: 8, royaltyRate: 12 }
  const antes = comparableMes({ ...base, grupos })
  const despues = comparableMes({ ...base, grupos: patchFechaInicio(grupos, decisiones) })
  const resultado = compararComparables(antes, despues, { decisiones, finMes: finDeMes(2026, 8) })

  assert.deepEqual(resultado.variaciones, [])
  assert.ok(resultado.diferencias.some((d) => d.campo === 'gruposIds' && d.tipo === 'sale' && d.id === '1'))
  assert.ok(resultado.diferencias.some((d) => d.campo === 'ninosIds' && d.tipo === 'sale' && d.id === '1'))
  assert.ok(resultado.diferencias.some((d) => d.campo === 'aPagar'))
})

test('estadoCandidato: aplicada / pendiente / conflicto como la reparacion historica', () => {
  const entrada = { grupoId: 1, itInicio: '2026-09-07', fecha: '2026-07-01', regla: 'del_itinerario' }
  const viva = grupo({ id: 1 })
  const decisionViva = { fecha: '2026-07-01', regla: 'del_itinerario' }

  assert.equal(estadoCandidato(viva, entrada, decisionViva), 'pendiente')
  // Idempotencia: la fecha decidida ya esta puesta (el driver la devuelve como Date).
  assert.equal(estadoCandidato(grupo({ fecha_inicio_clases: new Date('2026-07-01T00:00:00Z') }), entrada, null), 'aplicada')
  // Derivas: fecha ajena, itinerario regenerado, decision viva distinta, fila ausente.
  assert.equal(estadoCandidato(grupo({ fecha_inicio_clases: '2026-06-01' }), entrada, null), 'conflicto')
  assert.equal(estadoCandidato(grupo({ itinerario_clases: { fecha_inicio: '2026-10-05' } }), entrada, decisionViva), 'conflicto')
  assert.equal(estadoCandidato(viva, entrada, { fecha: '2026-06-15', regla: 'del_itinerario' }), 'conflicto')
  assert.equal(estadoCandidato(null, entrada, null), 'conflicto')
})
