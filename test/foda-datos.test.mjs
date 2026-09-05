import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PREFIJO_GENERADO,
  alertasCoachDesdeFilas,
  construirFoda,
  evaluarProductoFoda,
  faltantesOportunidad,
  fusionarGenerado,
  lineaOportunidad,
  lineasSinDiagnostico,
  verdictoCrecimientoFoda,
  edicionesGeneradas,
} from '../lib/foda-datos.mjs'
import { normalizarMetas } from '../lib/marcadores.mjs'

// ── Fixture ANCLAS MALL Q3-2026, congelado desde la base de producción ──────
// 88% de cumplimiento y las TRES metas de resultado en "No": el caso que
// destapó el problema. Los números son los que se ven en pantalla.
const METAS = { meta_nuevos_ingresos_mes: 20, meta_desercion_mes: 8, meta_cobranza_max: 3 }
const MESES_CALC = [
  { mo: 7, nuevos: 5, desercion: 9, ninosInicio: 140 },
  { mo: 8, nuevos: 6, desercion: 14, ninosInicio: 135 },
  { mo: 9, nuevos: 3, desercion: 6, ninosInicio: 133 },
]
const RS = [
  { month: 7, mot_graduado: 1 },
  { month: 8, mot_graduado: 2 },
  { month: 9, mot_graduado: 1 },
]
const KS = [
  { month: 7, semana: 4, cob_d5: 16 },
  { month: 8, semana: 4, cob_d5: 5 },
  { month: 9, semana: 4, cob_d5: 2 },
]
const anclas = () => evaluarProductoFoda({ mesesCalc: MESES_CALC, rs: RS, ks: KS, metas: METAS, trimestre: 3 })

const GROWTH_ANCLAS = {
  metrics: {
    monthsUsed: 5,
    rates: { inviteToEnrollment: 0.093 },
    confidence: { level: 'low', score: 0.49 },
    window: { missingPeriods: ['2026-08'] },
    medians: { sales: 3 },
  },
  projection: {
    currentChildren: 135,
    currentLevel: 0,
    capacityMax: null,
    nextLevel: { level: 1, threshold: 170, gap: 35 },
    requirements: { commercial: { weeklyInvitations: 50, monthlyInvitations: 214, salesPerMonth: 20 } },
    scenarios: {
      base: {
        monthlyNet: -2.7,
        targetMonth: null,
        series: [
          { period: '2026-10', endChildren: 133 }, { period: '2026-11', endChildren: 131 },
          { period: '2026-12', endChildren: 129 }, { period: '2027-01', endChildren: 127 },
          { period: '2027-02', endChildren: 125 }, { period: '2027-03', endChildren: 123 },
        ],
      },
    },
  },
  recommendations: [
    { kind: 'data_quality', action: 'Completar los cierres de Agosto y las fechas de inicio del pipeline.', responsible: 'Administradora', dueDays: 2, metric: 'Confianza de la proyeccion', baseline: 0.49, target: 0.9, unit: 'indice', impactType: 'enabler', estimatedImpact: 0, priority: 1000 },
    { kind: 'class_loss', action: 'Revisar ausencias cada semana y contactar a la familia antes de la segunda clase perdida.', responsible: 'Administradora', dueDays: 7, metric: 'Retiros por perdida de clases al mes', baseline: 1, target: 0.75, unit: 'retiros/mes', estimatedImpact: 0.25, priority: 3 },
    { kind: 'activations', action: 'Programar una activacion local.', responsible: 'Administradora', dueDays: 14, metric: 'Ingresos por activaciones al mes', baseline: 0, target: 2, unit: 'ingresos/mes', estimatedImpact: 0.4, priority: 2 },
    // Sin métrica ni objetivo: no es una oportunidad y no debe escribirse.
    { kind: 'humo', action: 'Motivar al equipo.', responsible: 'Administradora', metric: null, baseline: null, target: null },
  ],
}

const COACHES_ANCLAS = [
  { nombre: 'ROSA LÓPEZ', expuestos: 44, bajas_reales: 12, graduados: 0, controlables: 5, motivo_top: 'PERDIDA_CLASES' },
  { nombre: 'YOEMI VÁSQUEZ', expuestos: 25, bajas_reales: 2, graduados: 1, controlables: 1, motivo_top: 'ECONOMICO' },
  { nombre: 'MAYERLINE', expuestos: 1, bajas_reales: 1, graduados: 0, controlables: 0, motivo_top: 'HORARIO' },
  { nombre: 'DAMIANO', expuestos: 22, bajas_reales: 6, graduados: 0, controlables: 2, motivo_top: 'ECONOMICO' },
  { nombre: 'OTRA', expuestos: 73, bajas_reales: 4, graduados: 3, controlables: 1, motivo_top: 'ECONOMICO' },
]

const fodaAnclas = () => construirFoda({
  producto: anclas(),
  growth: GROWTH_ANCLAS,
  coach: alertasCoachDesdeFilas(COACHES_ANCLAS),
  graduacion: { graduados: 4, bajas: 29 },
  motivos: { economico: 7 },
  fechaFinDeMes: '2026-09-30',
  hoy: '2026-09-04',
})

test('las 3 metas de PRODUCTO se juzgan con deserción real y con el PEOR mes de cobranza', () => {
  const p = anclas()
  assert.equal(p.P1, false)
  assert.equal(p.P2, false)
  assert.equal(p.P3, false)
  assert.equal(p.metasFallidas, 3)
  assert.equal(p.ventasQ, 14)
  assert.equal(p.metaQ, 60)
  assert.equal(p.desRealQ, 25)
  // El peor mes de cobranza es Julio (16), no el último (Septiembre, 2).
  assert.equal(p.peorCobranza.nombre, 'Julio')
  assert.equal(p.mesesFueraCobranza, 2)
  // El mes que rompe la meta de deserción es Agosto: 12 de 135 = 8,9%.
  assert.equal(p.peorDesercion.nombre, 'Agosto')
  assert.equal(Math.round(p.peorDesercion.desPct * 10) / 10, 8.9)
})

test('graduarse NO empeora la meta de deserción, pero sí cuenta como baja', () => {
  const conGraduados = evaluarProductoFoda({
    mesesCalc: [{ mo: 7, nuevos: 20, desercion: 12, ninosInicio: 120 }],
    rs: [{ month: 7, mot_graduado: 8 }], ks: [{ month: 7, semana: 1, cob_d5: 0 }], metas: METAS, trimestre: 3,
  })
  // 12 bajas sobre 120 sería 10% (falla); descontando 8 graduados son 4 = 3,3%.
  assert.equal(conGraduados.P2, true)
  assert.equal(conGraduados.desRealQ, 4)
  assert.equal(conGraduados.bajasQ, 12, 'la baja bruta sigue existiendo: el graduado deja el cupo igual')
  const sinGraduados = evaluarProductoFoda({
    mesesCalc: [{ mo: 7, nuevos: 20, desercion: 12, ninosInicio: 120 }],
    rs: [{ month: 7, mot_graduado: 0 }], ks: [{ month: 7, semana: 1, cob_d5: 0 }], metas: METAS, trimestre: 3,
  })
  assert.equal(sinGraduados.P2, false)
})

test('la banda muerta de ±0,5 niños/mes separa crecer de estar plano', () => {
  assert.equal(verdictoCrecimientoFoda(3.3), 'CRECE')
  assert.equal(verdictoCrecimientoFoda(0.5), 'CRECE')
  assert.equal(verdictoCrecimientoFoda(0.3), 'PLANO')
  assert.equal(verdictoCrecimientoFoda(-0.4), 'PLANO')
  assert.equal(verdictoCrecimientoFoda(-2.7), 'DECRECE')
  assert.equal(verdictoCrecimientoFoda(null), 'INDETERMINADO')
})

test('ANCLAS: las debilidades dicen el dato, la brecha y a dónde lleva', () => {
  const foda = fodaAnclas()
  assert.deepEqual(foda.debilidades, [
    'Ventas: 14 de 60 (23%). Al ritmo de 4,7/mes cierras el trimestre en 14; faltan 46.',
    'Deserción real sobre meta en Agosto: 12 de 135 = 8,9% (meta <8%). En el trimestre 25 bajas reales.',
    'Cobranza vencida llegó a 16 en Julio (meta ≤3). Meses fuera de meta: 2 de 3.',
    'El centro pierde 2,7 niños/mes al ritmo mediano de los últimos 5 cierres: 135 hoy → 123 en marzo 2027.',
    'La deserción se concentra en ROSA LÓPEZ: 12 de 25 bajas con coach identificado (27,3% de sus 44 niños contra 15,2% del centro).',
  ])
})

test('ANCLAS: ninguna línea del FODA se escribe sin un número', () => {
  const foda = fodaAnclas()
  for (const k of ['fortalezas', 'debilidades', 'oportunidades', 'amenazas']) {
    assert.ok(foda[k].length > 0, `${k} vacío`)
    for (const linea of foda[k]) {
      assert.match(linea, /\d/, `${k}: "${linea}" no tiene ningún número`)
      assert.doesNotMatch(linea, /^Meta de cobranza lograda$|^Meta 20\+ nuevos ingresos$/, 'volvió la etiqueta del checklist')
    }
  }
})

test('las etiquetas del checklist ya no son el FODA: nada de "Meta de cobranza lograda"', () => {
  const foda = fodaAnclas()
  const todo = [...foda.fortalezas, ...foda.debilidades].join('\n')
  assert.doesNotMatch(todo, /Meta de cobranza lograda/)
  assert.doesNotMatch(todo, /Meta 20\+ nuevos ingresos/)
  assert.match(todo, /14 de 60/)
})

test('cada oportunidad trae acción, dueño, fecha y el número que mueve', () => {
  const foda = fodaAnclas()
  assert.equal(foda.oportunidades.length, 4)
  for (const linea of foda.oportunidades) {
    assert.deepEqual(faltantesOportunidad(linea), [], linea)
  }
  // Las de datos y capacidad van primero: desbloquean a las demás.
  assert.match(foda.oportunidades[0], /confianza de la proyección de 0,49 a 0,9/)
  assert.match(foda.oportunidades[0], /Al: 2026-09-06/, 'la fecha sale de los días de plazo cuando no está persistida')
  // La más dura sale del embudo, no del optimismo: 214 invitaciones al mes.
  assert.match(foda.oportunidades[3], /ventas de 4,7 a 20\/mes \(requiere 214 invitaciones\/mes con la conversión actual de 9,3%\)/)
  // La recomendación sin métrica ni objetivo se descarta.
  assert.ok(!foda.oportunidades.some((l) => /Motivar al equipo/.test(l)))
})

test('una oportunidad sin dueño, fecha o número no pasa el contrato', () => {
  assert.deepEqual(faltantesOportunidad('Alianzas con colegios locales'), ['Dueño', 'Fecha', 'Número que mueve'])
  assert.deepEqual(faltantesOportunidad('Tendencias educativas digitales'), ['Dueño', 'Fecha', 'Número que mueve'])
  const buena = lineaOportunidad({ accion: 'Visitar 3 colegios', dueno: 'Administradora', fecha: '2026-10-15', mueve: 'invitaciones de 17 a 40/mes' })
  assert.deepEqual(faltantesOportunidad(buena), [])
  assert.equal(buena, 'Visitar 3 colegios · Dueño: Administradora · Al: 2026-10-15 · Mueve: invitaciones de 17 a 40/mes.')
})

test('las amenazas cuantifican la concentración, el motivo económico y el techo de nivel', () => {
  const foda = fodaAnclas()
  assert.match(foda.amenazas[0], /ROSA LÓPEZ concentra el 48% de las bajas con coach identificado/)
  assert.match(foda.amenazas[0], /se va con 32 niños a cargo/)
  assert.ok(foda.amenazas.some((l) => /7 de 25 bajas reales del trimestre son económicas/.test(l)))
  assert.ok(foda.amenazas.some((l) => /Faltan 35 niños para el Nivel 1 y al ritmo actual el centro se aleja/.test(l)))
})

test('un coach con 1 baja de 1 niño no se acusa: los 4 candados', () => {
  const { alertas, sinMuestra, tasaCentro } = alertasCoachDesdeFilas(COACHES_ANCLAS)
  assert.equal(alertas.length, 1)
  assert.equal(alertas[0].nombre, 'ROSA LÓPEZ')
  // 100% de deserción con un solo niño expuesto: muestra corta, no se evalúa.
  assert.ok(sinMuestra.some((c) => c.nombre === 'MAYERLINE'))
  assert.ok(!alertas.some((c) => c.nombre === 'MAYERLINE'))
  // Por encima de la media del centro pero sin los 3 niños de exceso: vigilar.
  assert.ok(!alertas.some((c) => c.nombre === 'DAMIANO'))
  assert.equal(Math.round(tasaCentro * 10) / 10, 15.2)
})

test('regenerar reescribe solo lo generado y conserva lo que escribió la administradora', () => {
  const suyo = 'Alianza con el colegio San Agustín, hablé con la directora'
  const primera = fusionarGenerado(suyo, ['Ventas: 14 de 60 (23%).'])
  assert.equal(primera, `${PREFIJO_GENERADO}Ventas: 14 de 60 (23%).\n${suyo}`)
  const segunda = fusionarGenerado(primera, ['Ventas: 20 de 60 (33%).'])
  assert.equal(segunda, `${PREFIJO_GENERADO}Ventas: 20 de 60 (33%).\n${suyo}`)
  assert.ok(segunda.includes(suyo), 'nunca se pierde lo escrito a mano')
  assert.ok(!segunda.includes('14 de 60'), 'la línea generada anterior no se acumula')
})

test('el FODA heredado se detecta por lo que le falta: número y comparación', () => {
  // Las tres son etiquetas del checklist; la del medio hasta tiene un número.
  const viejo = 'Meta de cobranza lograda\nMeta 20+ nuevos ingresos\nEncuestas al equipo (semestral)'
  assert.equal(lineasSinDiagnostico(viejo).length, 3)
  assert.equal(lineasSinDiagnostico('Ventas: 14 de 60 (23%).').length, 0)
  assert.equal(lineasSinDiagnostico('El centro pierde 2,7 niños/mes').length, 0)
  assert.equal(lineasSinDiagnostico('Alianzas con colegios locales').length, 1)
})

test('sin metas fallidas y creciendo, las fortalezas hablan de resultado', () => {
  const producto = evaluarProductoFoda({
    mesesCalc: [{ mo: 7, nuevos: 25, desercion: 4, ninosInicio: 120 }],
    rs: [{ month: 7, mot_graduado: 1 }], ks: [{ month: 7, semana: 1, cob_d5: 1 }], metas: METAS, trimestre: 3,
  })
  assert.equal(producto.metasFallidas, 0)
  const foda = construirFoda({
    producto,
    growth: { metrics: { monthsUsed: 6 }, projection: { currentChildren: 141, currentLevel: 0, nextLevel: { level: 1, threshold: 170, gap: 29 }, capacityMax: 200, scenarios: { base: { monthlyNet: 3.3, targetMonth: '2027-06', series: [] } } }, recommendations: [] },
    coach: alertasCoachDesdeFilas([]),
    graduacion: { graduados: 1, bajas: 4 },
    motivos: { economico: 0 },
    fechaFinDeMes: '2026-09-30', hoy: '2026-09-04',
  })
  assert.match(foda.fortalezas[0], /Meta de ventas cumplida: 25 nuevos ingresos contra 20/)
  assert.ok(foda.fortalezas.some((l) => /El centro crece \+3,3 niños\/mes/.test(l)))
  assert.match(foda.debilidades[0], /Sin debilidades de producto/)
})

test('el generador nunca falla su propia regla: cero líneas sin diagnóstico', () => {
  // Un validador que regaña a las líneas que el propio sistema escribió enseña
  // a la administradora a ignorar los avisos amarillos.
  const generado = construirFoda({
    producto: evaluarProductoFoda({
      mesesCalc: [{ mo: 7, nuevos: 3, desercion: 13, ninosInicio: 148 }],
      rs: [{ month: 7, mot_graduado: 3 }],
      ks: [{ month: 7, semana: 1, cob_d5: 16 }],
      metas: { meta_nuevos_ingresos_mes: 20, meta_desercion_mes: 8, meta_cobranza_max: 3 },
      trimestre: 3,
    }),
    growth: null, coach: null, disciplina: null, graduacion: null,
    motivos: { economico: 7 },
    fechaFinDeMes: '2026-09-30', hoy: '2026-09-04',
  })
  for (const k of ['fortalezas', 'debilidades', 'oportunidades', 'amenazas']) {
    const sospechosas = lineasSinDiagnostico((generado[k] || []).map((l) => `${PREFIJO_GENERADO}${l}`).join('\n'))
    assert.deepEqual(sospechosas, [], `${k} no puede producir líneas que su propio validador rechace`)
  }
})

test('el FODA y el Resumen usan los MISMOS defaults de metas', () => {
  // Sin fila en `metas` —y no hay fila para Q4-2026— el FODA usaba 3 de máximo
  // de cobranza y el Resumen 1: un centro con 2 vencidas leía "cumplida" en una
  // pantalla y "no cumple" en la otra, el mismo trimestre.
  const p = evaluarProductoFoda({
    mesesCalc: [{ mo: 7, nuevos: 25, desercion: 2, ninosInicio: 150 }],
    rs: [{ month: 7, mot_graduado: 0 }],
    ks: [{ month: 7, semana: 1, cob_d5: 2 }],
    metas: null, trimestre: 3,
  })
  assert.equal(p.metaCobranza, normalizarMetas(null).cobranza)
  assert.equal(p.metaNuevosMes, normalizarMetas(null).nuevos)
  assert.equal(p.metaDesercion, normalizarMetas(null).desercion)
})

test('regenerar avisa de las líneas del sistema que alguien editó', () => {
  const conEdicion = `${PREFIJO_GENERADO}Ventas: 14 de 60 (23%). — ya hablé con Marta\nMi propia nota`
  const tocadas = edicionesGeneradas(conEdicion, ['Ventas: 14 de 60 (23%).'])
  assert.equal(tocadas.length, 1)
  // Una línea generada intacta no genera aviso.
  const intacta = `${PREFIJO_GENERADO}Ventas: 14 de 60 (23%).\nMi propia nota`
  assert.deepEqual(edicionesGeneradas(intacta, ['Ventas: 14 de 60 (23%).']), [])
})
