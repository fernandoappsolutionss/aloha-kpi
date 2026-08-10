import test from 'node:test'
import assert from 'node:assert/strict'

import {
  LINEA_APROBACION,
  SEMANA_LIMITE_NUEVOS,
  fechaLimiteNuevos,
  ordenarPorCierreLlenado,
  ritmoLlenado,
  sugerenciasLlenado,
  ventanaNuevos,
} from '../lib/llenado.mjs'

// --- Fixtures: itinerarios con la MISMA forma que genera lib/itinerario.js ---

const semana = (corto, tipo, fechas) => ({ etiqueta: String(corto), tipo, corto, fechas })

// TINY con feriados corridos: entre la semana 3 y la 4 se pierde una semana
// calendario completa (el contenido corre), y R1/MD1 se intercalan — el
// lookup por `corto` no puede confundirse con el índice del arreglo.
const itinerarioTiny = () => ({
  nivel: 1,
  fecha_inicio: '2026-08-17',
  semanas: [
    semana('I1', 'induccion', ['2026-08-17', '2026-08-19']),
    semana('I2', 'induccion', ['2026-08-24', '2026-08-26']),
    semana('1', 'clase', ['2026-08-31', '2026-09-02']),
    semana('2', 'clase', ['2026-09-07', '2026-09-09']),
    semana('3', 'clase', ['2026-09-14', '2026-09-16']),
    semana('R1', 'evaluacion', ['2026-09-21', '2026-09-23']),
    semana('4', 'clase', ['2026-10-05', '2026-10-07']),
    semana('MD1', 'mental', ['2026-10-12', '2026-10-14']),
    semana('5', 'clase', ['2026-10-19', '2026-10-21']),
  ],
})

const itinerarioKids = () => ({
  nivel: 1,
  fecha_inicio: '2026-08-17',
  semanas: [
    semana('INT', 'induccion', ['2026-08-17', '2026-08-20']),
    semana('1', 'clase', ['2026-08-24', '2026-08-27']),
    semana('2', 'clase', ['2026-08-31', '2026-09-03']),
    semana('3', 'clase', ['2026-09-07', '2026-09-10']),
  ],
})

const alumnos = (n, estado = 'activo') =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, estado }))

const grupoTiny = (overrides = {}) => ({
  id: 7,
  numero: 3,
  estado: 'activo',
  itinerario: 'TINY',
  inscripcion_abierta: true,
  itinerario_clases: itinerarioTiny(),
  created_at: '2026-07-01T12:00:00.000Z',
  estudiantes: [],
  ...overrides,
})

const inscripcion = (fecha, overrides = {}) => ({
  id: 100,
  tipo: 'inscripcion',
  fecha,
  a_grupo_id: 7,
  ...overrides,
})

// --- SEMANA_LIMITE_NUEVOS ---

test('la regla del manual queda codificada: TINY hasta la semana 4, KIDS hasta la 2', () => {
  assert.deepEqual(SEMANA_LIMITE_NUEVOS, { TINY: 4, KIDS: 2 })
})

// --- fechaLimiteNuevos ---

test('TINY: el limite es la ultima fecha de la semana 4 del LIBRO aunque los feriados corran el plan', () => {
  const { fechaLimite, razon, extendida } = fechaLimiteNuevos(grupoTiny())
  assert.equal(fechaLimite, '2026-10-07') // semana corto '4', no la 4.ª posicion del arreglo
  assert.equal(razon, null)
  assert.equal(extendida, false)
})

test('KIDS: el limite es la ultima fecha de la semana 2 del libro', () => {
  const g = grupoTiny({ itinerario: 'KIDS', itinerario_clases: itinerarioKids() })
  assert.equal(fechaLimiteNuevos(g).fechaLimite, '2026-09-03')
})

test('el lookup tolera corto numerico (String a ambos lados)', () => {
  const it = itinerarioTiny()
  it.semanas = it.semanas.map((s) => (s.tipo === 'clase' ? { ...s, corto: Number(s.corto) } : s))
  assert.equal(fechaLimiteNuevos(grupoTiny({ itinerario_clases: it })).fechaLimite, '2026-10-07')
})

test('KINDER esta exento aunque tenga itinerario valido', () => {
  const g = grupoTiny({ itinerario: 'KINDER' })
  assert.deepEqual(fechaLimiteNuevos(g), { fechaLimite: null, razon: 'exento', extendida: false })
})

test('un grupo sin itinerario de clases esta exento', () => {
  const g = grupoTiny({ itinerario_clases: null })
  assert.deepEqual(fechaLimiteNuevos(g), { fechaLimite: null, razon: 'exento', extendida: false })
})

test('itinerario legacy sin tipo/corto: preflight, nunca cerrar a ciegas', () => {
  const legacy = {
    fecha_inicio: '2026-08-17',
    semanas: [
      { etiqueta: 'Semana 1', fechas: ['2026-08-17', '2026-08-19'] },
      { etiqueta: 'Semana 2', fechas: ['2026-08-24', '2026-08-26'] },
    ],
  }
  const { fechaLimite, razon } = fechaLimiteNuevos(grupoTiny({ itinerario_clases: legacy }))
  assert.equal(fechaLimite, null)
  assert.equal(razon, 'sin_itinerario_valido')
})

test('itinerario truncado sin la semana limite tambien es invalido, no exento', () => {
  const it = itinerarioTiny()
  it.semanas = it.semanas.filter((s) => !(s.tipo === 'clase' && String(s.corto) === '4'))
  assert.equal(fechaLimiteNuevos(grupoTiny({ itinerario_clases: it })).razon, 'sin_itinerario_valido')
})

test('normaliza fechas del itinerario que llegan como objetos Date', () => {
  const it = itinerarioTiny()
  it.semanas = it.semanas.map((s) => ({ ...s, fechas: s.fechas.map((f) => new Date(`${f}T00:00:00.000Z`)) }))
  assert.equal(fechaLimiteNuevos(grupoTiny({ itinerario_clases: it })).fechaLimite, '2026-10-07')
})

test('llenado_extendido_hasta posterior al limite manda (y llega como Date de la BD)', () => {
  const g = grupoTiny({ llenado_extendido_hasta: new Date('2026-10-21T00:00:00.000Z') })
  const { fechaLimite, extendida } = fechaLimiteNuevos(g)
  assert.equal(fechaLimite, '2026-10-21')
  assert.equal(extendida, true)
})

test('una extension anterior al limite derivado se ignora', () => {
  const g = grupoTiny({ llenado_extendido_hasta: '2026-09-30' })
  assert.deepEqual(fechaLimiteNuevos(g), { fechaLimite: '2026-10-07', razon: null, extendida: false })
})

// --- ventanaNuevos ---

test('dentro de la ventana: abierta con dias hasta el limite', () => {
  assert.deepEqual(ventanaNuevos(grupoTiny(), '2026-09-30'), {
    abierta: true,
    fechaLimite: '2026-10-07',
    razon: 'en_ventana',
    diasHastaLimite: 7,
  })
})

test('el dia exacto del limite todavia se puede inscribir', () => {
  const v = ventanaNuevos(grupoTiny(), '2026-10-07')
  assert.equal(v.abierta, true)
  assert.equal(v.diasHastaLimite, 0)
})

test('un dia despues del limite la ventana esta vencida', () => {
  const v = ventanaNuevos(grupoTiny(), '2026-10-08')
  assert.equal(v.abierta, false)
  assert.equal(v.razon, 'vencida')
  assert.equal(v.diasHastaLimite, -1)
})

test('exento con palanca abierta = abierta true con fechaLimite null', () => {
  const v = ventanaNuevos(grupoTiny({ itinerario: 'KINDER' }), '2026-12-01')
  assert.deepEqual(v, { abierta: true, fechaLimite: null, razon: 'exento', diasHastaLimite: null })
})

test('la palanca manual cerrada gana aunque la ventana derivada este vigente', () => {
  const v = ventanaNuevos(grupoTiny({ inscripcion_abierta: false }), '2026-09-30')
  assert.equal(v.abierta, false)
  assert.equal(v.razon, 'palanca_cerrada')
  assert.equal(v.fechaLimite, '2026-10-07') // se conserva para el chip "cerrado a nuevos (manual, semana Y)"
})

test('inscripcion_abierta ausente cuenta como abierta (convencion !== false)', () => {
  const g = grupoTiny()
  delete g.inscripcion_abierta
  assert.equal(ventanaNuevos(g, '2026-09-30').abierta, true)
})

test('un grupo cerrado o fusionado nunca esta en llenado', () => {
  assert.equal(ventanaNuevos(grupoTiny({ estado: 'cerrado' }), '2026-09-30').razon, 'no_activo')
  assert.equal(ventanaNuevos(grupoTiny({ estado: 'fusionado' }), '2026-09-30').abierta, false)
})

test('itinerario legacy invalido queda abierto y marcado, nunca cerrado a ciegas', () => {
  const legacy = { semanas: [{ etiqueta: 'Semana 1', fechas: ['2026-08-17'] }] }
  const v = ventanaNuevos(grupoTiny({ itinerario_clases: legacy }), '2026-12-01')
  assert.equal(v.abierta, true)
  assert.equal(v.razon, 'sin_itinerario_valido')
  assert.equal(v.fechaLimite, null)
})

test('la extension reabre la ventana despues del limite derivado y vence sola', () => {
  const g = grupoTiny({ llenado_extendido_hasta: '2026-10-21' })
  assert.deepEqual(ventanaNuevos(g, '2026-10-14'), {
    abierta: true,
    fechaLimite: '2026-10-21',
    razon: 'extendida',
    diasHastaLimite: 7,
  })
  assert.equal(ventanaNuevos(g, '2026-10-22').razon, 'vencida')
})

// --- ritmoLlenado ---

test('ritmo apretado: cuenta activos + baja_potencial y exige el faltante en las semanas que quedan', () => {
  const g = grupoTiny({ estudiantes: [...alumnos(5), ...alumnos(1, 'baja_potencial'), ...alumnos(1, 'retirado')] })
  const eventos = [inscripcion('2026-09-25'), inscripcion('2026-09-28')]
  const r = ritmoLlenado(g, 8, eventos, '2026-09-30')

  assert.equal(r.ninos, 6) // el retirado no ocupa cupo
  assert.equal(r.meta, 8)
  assert.equal(r.faltan, 2)
  assert.equal(r.diasHastaLimite, 7)
  assert.equal(r.ritmoSemanalNecesario, 2) // 2 / max(1, 7/7)
  assert.equal(r.ritmoSemanalObservado, 1) // 2 inscripciones en 14 dias × 0.5
  assert.equal(r.estado, 'apretado')
})

test('ritmo a ritmo: el observado alcanza al necesario', () => {
  const g = grupoTiny({ estudiantes: alumnos(6) })
  const eventos = ['2026-09-20', '2026-09-23', '2026-09-26', '2026-09-29'].map((f, i) => inscripcion(f, { id: i }))
  const r = ritmoLlenado(g, 8, eventos, '2026-09-30')
  assert.equal(r.ritmoSemanalObservado, 2)
  assert.equal(r.estado, 'a_ritmo')
})

test('el necesario se redondea a 1 decimal', () => {
  const g = grupoTiny({ estudiantes: alumnos(5) })
  const r = ritmoLlenado(g, 8, [], '2026-09-21') // 16 dias de ventana
  assert.equal(r.diasHastaLimite, 16)
  assert.equal(r.ritmoSemanalNecesario, 1.3) // 3 / (16/7) = 1.3125
})

test('limite HOY: la ventana sigue abierta y el necesario es el faltante completo', () => {
  const g = grupoTiny({ estudiantes: alumnos(5) })
  const r = ritmoLlenado(g, 8, [], '2026-10-07')
  assert.equal(r.diasHastaLimite, 0)
  assert.equal(r.ritmoSemanalNecesario, 3) // 3 / max(1, 0/7)
  assert.notEqual(r.estado, 'vencida')
})

test('ventana vencida: necesario null y estado vencida', () => {
  const g = grupoTiny({ estudiantes: alumnos(5) })
  const r = ritmoLlenado(g, 8, [], '2026-10-20')
  assert.equal(r.diasHastaLimite, -13)
  assert.equal(r.ritmoSemanalNecesario, null)
  assert.equal(r.estado, 'vencida')
})

test('meta cumplida gana incluso con la ventana vencida', () => {
  const g = grupoTiny({ estudiantes: alumnos(8) })
  const r = ritmoLlenado(g, 8, [], '2026-10-20')
  assert.equal(r.faltan, 0)
  assert.equal(r.ritmoSemanalNecesario, 0)
  assert.equal(r.estado, 'meta_cumplida')
})

test('grupo con menos de 14 dias creado: observado sin_datos', () => {
  const g = grupoTiny({ created_at: '2026-09-20T09:00:00.000Z', estudiantes: alumnos(3) })
  const r = ritmoLlenado(g, 8, [inscripcion('2026-09-28')], '2026-09-30')
  assert.equal(r.ritmoSemanalObservado, 'sin_datos')
  assert.equal(r.estado, 'sin_datos')
})

test('diasParaInicio cuenta hasta el inicio del nivel y es null si ya inicio', () => {
  const g = grupoTiny({ estudiantes: alumnos(2) })
  assert.equal(ritmoLlenado(g, 8, [], '2026-08-10').diasParaInicio, 7) // inicia 2026-08-17
  assert.equal(ritmoLlenado(g, 8, [], '2026-09-30').diasParaInicio, null)
})

test('el observado solo cuenta inscripciones A ESTE grupo dentro de los 14 dias', () => {
  const g = grupoTiny({ estudiantes: alumnos(2) })
  const eventos = [
    inscripcion('2026-09-30'),                          // cuenta (hoy mismo)
    inscripcion('2026-09-28', { a_grupo_id: 9 }),       // otro grupo
    inscripcion('2026-09-28', { tipo: 'retiro' }),      // otro tipo de evento
    inscripcion('2026-09-10'),                          // hace 20 dias
    inscripcion('2026-10-02'),                          // futuro
  ]
  assert.equal(ritmoLlenado(g, 8, eventos, '2026-09-30').ritmoSemanalObservado, 0.5)
})

test('normaliza created_at y fechas de eventos que llegan como Date', () => {
  const g = grupoTiny({ created_at: new Date('2026-07-01T12:00:00.000Z'), estudiantes: alumnos(2) })
  const eventos = [inscripcion(new Date('2026-09-28T00:00:00.000Z'))]
  assert.equal(ritmoLlenado(g, 8, eventos, '2026-09-30').ritmoSemanalObservado, 0.5)
})

test('grupo exento (KINDER): sin limite no hay ritmo exigido y no se declara apretado', () => {
  const g = grupoTiny({ itinerario: 'KINDER', estudiantes: alumnos(1) })
  const r = ritmoLlenado(g, 3, [inscripcion('2026-09-28')], '2026-09-30')
  assert.equal(r.fechaLimite, null)
  assert.equal(r.diasHastaLimite, null)
  assert.equal(r.ritmoSemanalNecesario, null)
  assert.equal(r.ritmoSemanalObservado, 0.5)
  assert.equal(r.estado, 'a_ritmo')
})

// --- sugerenciasLlenado ---

const conDescuento = (sugerencias) => sugerencias.filter((s) => s.descuento != null)

test('meta cumplida: sin sugerencias', () => {
  assert.deepEqual(sugerenciasLlenado({ estado: 'meta_cumplida' }, grupoTiny()), [])
})

test('toda lista de sugerencias cierra con la linea de aprobacion de Administracion General', () => {
  for (const estado of ['a_ritmo', 'apretado', 'vencida', 'sin_datos']) {
    const s = sugerenciasLlenado({ estado, diasParaInicio: null, diasHastaLimite: 10 }, grupoTiny())
    assert.equal(s[s.length - 1].texto, LINEA_APROBACION)
  }
})

test('a ritmo: solo el escalon del 10% sin limite, nada mas agresivo', () => {
  const s = sugerenciasLlenado({ estado: 'a_ritmo', diasParaInicio: 12, diasHastaLimite: 20 }, grupoTiny())
  assert.deepEqual(conDescuento(s).map((x) => [x.descuento, x.tope]), [[10, 'sin límite']])
  assert.ok(s.some((x) => /quincena/.test(x.texto))) // aun no inicia: empuje de quincena
})

test('apretado con mas de una semana de ventana: sube al 15% max 3/mes sin llegar al 25%', () => {
  const s = sugerenciasLlenado({ estado: 'apretado', diasParaInicio: null, diasHastaLimite: 10 }, grupoTiny())
  const escalones = conDescuento(s).map((x) => [x.descuento, x.tope])
  assert.deepEqual(escalones, [[10, 'sin límite'], [15, 'máx. 3/mes']])
  assert.ok(s.some((x) => /semana 4/.test(x.texto))) // ya inicio: aprovechar la ventana TINY
})

test('apretado en la ultima semana: aparece el 25% max 2/mes', () => {
  const s = sugerenciasLlenado({ estado: 'apretado', diasParaInicio: null, diasHastaLimite: 5 }, grupoTiny())
  const escalones = conDescuento(s).map((x) => [x.descuento, x.tope])
  assert.deepEqual(escalones, [[10, 'sin límite'], [15, 'máx. 3/mes'], [25, 'máx. 2/mes']])
})

test('apretado a 3 dias o menos: ultimo escalon 25% + 10% max 1/mes', () => {
  const s = sugerenciasLlenado({ estado: 'apretado', diasParaInicio: null, diasHastaLimite: 2 }, grupoTiny())
  const topes = conDescuento(s).map((x) => x.tope)
  assert.deepEqual(topes, ['sin límite', 'máx. 3/mes', 'máx. 2/mes', 'máx. 1/mes'])
  assert.ok(s.some((x) => /25% \+ 10%/.test(x.texto)))
})

test('vencida: sin descuentos, la venta se apunta a la proxima induccion', () => {
  const s = sugerenciasLlenado({ estado: 'vencida', diasParaInicio: null, diasHastaLimite: -4 }, grupoTiny())
  assert.deepEqual(conDescuento(s), [])
  assert.ok(s.some((x) => /venció/.test(x.texto)))
  assert.equal(s[s.length - 1].texto, LINEA_APROBACION)
})

test('cada sugerencia trae texto, descuento y tope (dato estructurado para la UI)', () => {
  const s = sugerenciasLlenado({ estado: 'apretado', diasParaInicio: null, diasHastaLimite: 2 }, grupoTiny())
  for (const item of s) {
    assert.deepEqual(Object.keys(item).sort(), ['descuento', 'texto', 'tope'])
    assert.equal(typeof item.texto, 'string')
  }
})

// --- ordenarPorCierreLlenado ---

test('ordena ascendente por fecha limite con exentos y legacy al final, sin mutar el original', () => {
  const kinder = grupoTiny({ id: 1, numero: 1, itinerario: 'KINDER' })
  const tardio = grupoTiny({ id: 2, numero: 2 }) // limite 2026-10-07
  const temprano = grupoTiny({ id: 3, numero: 3, itinerario: 'KIDS', itinerario_clases: itinerarioKids() }) // 2026-09-03
  const legacy = grupoTiny({ id: 4, numero: 4, itinerario_clases: { semanas: [{ etiqueta: 'Semana 1', fechas: ['2026-08-17'] }] } })
  const original = [kinder, tardio, temprano, legacy]
  const copia = [...original]

  const orden = ordenarPorCierreLlenado(original, '2026-09-01')
  assert.deepEqual(orden.map((g) => g.numero), [3, 2, 1, 4]) // nulls conservan su orden relativo
  assert.deepEqual(original, copia) // el arreglo recibido queda intacto
  assert.notEqual(orden, original)
})

test('ordena bien aunque las fechas de un itinerario lleguen como Date', () => {
  const conDates = grupoTiny({ id: 5, numero: 5 })
  conDates.itinerario_clases.semanas = conDates.itinerario_clases.semanas.map((s) => ({
    ...s,
    fechas: s.fechas.map((f) => new Date(`${f}T00:00:00.000Z`)),
  }))
  const kids = grupoTiny({ id: 6, numero: 6, itinerario: 'KIDS', itinerario_clases: itinerarioKids() })
  assert.deepEqual(ordenarPorCierreLlenado([conDates, kids], '2026-09-01').map((g) => g.numero), [6, 5])
})

// Regla de Fernando 2026-08-10: la ventana de nuevos es del LLENADO del grupo,
// no de cada nivel. Un veterano que arranca nivel 2+ NO vuelve a "en llenado".
test('la ventana no se reabre al empezar un nivel avanzado', () => {
  const veterano = {
    estado: 'activo',
    itinerario: 'TINY',
    inscripcion_abierta: true,
    itinerario_clases: {
      nivel: 10,
      semanas: [{ tipo: 'clase', corto: '4', fechas: ['2026-08-22'] }],
    },
  }
  const v = ventanaNuevos(veterano, '2026-08-10')
  assert.equal(v.abierta, false)
  assert.equal(v.razon, 'nivel_avanzado')
  assert.equal(v.fechaLimite, null)
})

test('un grupo de nivel 1 conserva su ventana de llenado', () => {
  const nuevo = {
    estado: 'activo',
    itinerario: 'TINY',
    inscripcion_abierta: true,
    itinerario_clases: {
      nivel: 1,
      semanas: [{ tipo: 'clase', corto: '4', fechas: ['2026-08-22'] }],
    },
  }
  const v = ventanaNuevos(nuevo, '2026-08-10')
  assert.equal(v.abierta, true)
  assert.equal(v.fechaLimite, '2026-08-22')
})

test('la extension manual manda incluso en nivel avanzado', () => {
  const conExtension = {
    estado: 'activo',
    itinerario: 'KIDS',
    inscripcion_abierta: true,
    llenado_extendido_hasta: '2026-09-15',
    itinerario_clases: { nivel: 5, semanas: [{ tipo: 'clase', corto: '2', fechas: ['2026-08-20'] }] },
  }
  const v = ventanaNuevos(conExtension, '2026-08-10')
  assert.equal(v.abierta, true)
  assert.equal(v.fechaLimite, '2026-09-15')
  assert.equal(v.razon, 'extendida')
})
