import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { barrerHistorico, evaluarTrimestre } from '../lib/discrepancias-historico.mjs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

// Fecha fija: `pesoMes` prorratea el trimestre en curso, así que sin `hoy` el
// resultado cambiaría con el calendario y el test caducaría solo.
const HOY = '2026-12-15'

// Un mes que falla las tres metas: 0 ventas contra 20, 12 bajas reales sobre
// 100 niños (12%, meta ≤8) y 9 cuotas vencidas (meta ≤3).
const mesMalo = (centroId, year, month) => ({
  resumen: {
    centro_id: centroId, year, month,
    ninos_inicio_mes: 100, nuevos_activos_mes: 0, retiros_operativos_mes: 12,
    ninos_final_mes: 88, mot_graduado: 0, balance_vivo: true,
  },
  semana: {
    centro_id: centroId, year, month,
    ing_d1: 0, ing_d2: 0, ing_d3: 0, ing_d4: 0, ing_d5: 0,
    des_d1: 0, des_d2: 0, des_d3: 0, des_d4: 0, des_d5: 0,
    cob_d1: 9, cob_d2: 0, cob_d3: 0, cob_d4: 0, cob_d5: 0,
  },
})

// Un mes impecable: 30 ventas, 1 baja sobre 100 y 0 vencidas.
const mesBueno = (centroId, year, month) => ({
  resumen: {
    centro_id: centroId, year, month,
    ninos_inicio_mes: 100, nuevos_activos_mes: 30, retiros_operativos_mes: 1,
    ninos_final_mes: 129, mot_graduado: 0, balance_vivo: true,
  },
  semana: {
    centro_id: centroId, year, month,
    ing_d1: 30, ing_d2: 0, ing_d3: 0, ing_d4: 0, ing_d5: 0,
    des_d1: 0, des_d2: 0, des_d3: 0, des_d4: 0, des_d5: 0,
    cob_d1: 0, cob_d2: 0, cob_d3: 0, cob_d4: 0, cob_d5: 0,
  },
})

const fila = (trimestreId, mes, valor) => ({
  trimestre_id: trimestreId, mes,
  meta_nuevos_ingresos: valor, meta_desercion: valor, meta_cobranza: valor,
})

// ANCLAS MALL falla 2026-Q3 y 2026-Q2; CALLE 50 falla 2025-Q1. Los tres
// trimestres tienen las 3 metas marcadas "si" a mano.
function mundo() {
  const meses = [
    mesMalo(1, 2026, 7), mesMalo(1, 2026, 8),   // centro 1, Q3
    mesMalo(1, 2026, 4),                        // centro 1, Q2
    mesMalo(2, 2025, 1),                        // centro 2, Q1
  ]
  return {
    centros: [{ id: 1, nombre: 'ANCLAS MALL' }, { id: 2, nombre: 'CALLE 50' }],
    trimestres: [
      { id: 10, centro_id: 1, anio: 2026, trimestre: 3 },
      { id: 11, centro_id: 1, anio: 2026, trimestre: 2 },
      { id: 20, centro_id: 2, anio: 2025, trimestre: 1 },
    ],
    cumplimiento: [
      fila(10, 1, 'si'), fila(10, 2, 'si'),
      fila(11, 1, 'si'),
      fila(20, 1, 'si'),
    ],
    rsAll: meses.map((m) => m.resumen),
    ksAll: meses.map((m) => m.semana),
    metasAll: [
      { anio: 2026, trimestre: 3, meta_nuevos_ingresos_mes: 20, meta_desercion_mes: 8, meta_cobranza_max: 3 },
      { anio: 2026, trimestre: 2, meta_nuevos_ingresos_mes: 20, meta_desercion_mes: 8, meta_cobranza_max: 3 },
    ],
    estados: meses.map((m) => ({ centro_id: m.resumen.centro_id, year: m.resumen.year, month: m.resumen.month, estado: 'cerrado' })),
    hoy: HOY,
  }
}

test('EL BARRIDO NO DEPENDE DE NINGÚN TRIMESTRE: cuenta todo lo que tiene filas', () => {
  // Éste es el hallazgo crítico. La tarjeta del panel leía sólo el trimestre
  // seleccionado, y ese trimestre sale de localStorage compartido con Panel,
  // Ranking y Reporte: cambiar de trimestre APAGABA la alerta sin corregir un
  // dato. `barrerHistorico` no recibe año ni trimestre a propósito.
  const r = barrerHistorico(mundo())
  assert.equal(r.hay, true)
  assert.equal(r.trimestresMirados, 3, 'los 3 (centro, trimestre) con filas')
  assert.equal(r.trimestres, 3, 'los 3 tienen discrepancias')
  assert.equal(r.casos, 9, '3 metas × 3 trimestres')
  assert.equal(r.filas, 4, 'las 4 filas de `cumplimiento`, no las 12 celdas')
  assert.equal(r.celdas, 12)
  assert.equal(r.centros, 2, 'centroId distintos, no entradas')
  assert.equal(r.deMas, 9)
  assert.equal(r.deMenos, 0)
  assert.equal(r.centrosMirados, 2)
})

test('el desglose por trimestre va del más reciente al más viejo', () => {
  const r = barrerHistorico(mundo())
  assert.deepEqual(r.porTrimestre.map((t) => t.etiqueta), ['Q3 2026', 'Q2 2026', 'Q1 2025'])
  const q3 = r.porTrimestre[0]
  assert.equal(q3.casos, 3)
  assert.equal(q3.filas, 2, 'julio y agosto')
  assert.equal(q3.centros, 1)
  // Y el desglose por centro suma sus trimestres.
  assert.deepEqual(r.porCentro.map((c) => [c.centro, c.casos, c.trimestres]),
    [['ANCLAS MALL', 6, 2], ['CALLE 50', 3, 1]])
})

test('el titular nombra metas, filas, centros y trimestres, y no acusa', () => {
  const r = barrerHistorico(mundo())
  assert.equal(r.titular, '9 metas guardadas no coinciden con el cálculo, en 4 filas de 2 centros y 3 trimestres.')
  assert.match(r.reparto, /^9 guardadas como «Sí» que el cálculo da en «No» · 0 al revés\.$/)
  const prohibidas = /mentir|mentira|falso|falsear|fraude|trampa|incorrect|erróne|inflad|maquill|culpa|miente|engañ/i
  assert.doesNotMatch(r.titular, prohibidas)
  assert.doesNotMatch(r.reparto, prohibidas)
})

test('un trimestre que SÍ coincide no aparece, y sin filas no hay alerta', () => {
  const datos = mundo()
  // CALLE 50 pasa a cumplir su trimestre y su marca "si" deja de discrepar.
  // Los TRES meses tienen que estar: la meta de ventas es trimestral (20 × 3 =
  // 60 exigibles en un trimestre ya cerrado), así que un solo mes bueno seguiría
  // fallándola — que es justo lo que dice el aviso y por qué se explica la regla.
  const buenos = [1, 2, 3].map((mes) => mesBueno(2, 2025, mes))
  datos.rsAll = [...datos.rsAll.filter((r) => r.centro_id !== 2), ...buenos.map((m) => m.resumen)]
  datos.ksAll = [...datos.ksAll.filter((k) => k.centro_id !== 2), ...buenos.map((m) => m.semana)]
  datos.estados = [...datos.estados, ...buenos.map((m) => ({ centro_id: 2, year: 2025, month: m.resumen.month, estado: 'cerrado' }))]
  const r = barrerHistorico(datos)
  assert.equal(r.centros, 1, 'CALLE 50 sale de la lista sola, sin botón')
  assert.equal(r.casos, 6)
  assert.deepEqual(r.porCentro.map((c) => c.centro), ['ANCLAS MALL'])

  // Sin filas guardadas no se afirma nada.
  const vacio = barrerHistorico({ ...mundo(), cumplimiento: [] })
  assert.equal(vacio.hay, false)
  assert.equal(vacio.titular, '')
  assert.equal(barrerHistorico().hay, false)
  assert.equal(barrerHistorico({}).casos, 0)
})

test('sólo se mira lo que está en el alcance, y una fila huérfana no inventa nada', () => {
  const datos = mundo()
  // El coordinador que sólo ve CALLE 50 no puede enterarse de ANCLAS.
  const acotado = barrerHistorico({ ...datos, centros: [{ id: 2, nombre: 'CALLE 50' }] })
  assert.equal(acotado.centros, 1)
  assert.equal(acotado.casos, 3)
  assert.deepEqual(acotado.porCentro.map((c) => c.centro), ['CALLE 50'])

  // Una fila cuyo trimestre no existe es un dato roto, no una discrepancia.
  const conHuerfana = barrerHistorico({ ...datos, cumplimiento: [...datos.cumplimiento, fila(999, 1, 'si')] })
  assert.equal(conHuerfana.huerfanas, 1)
  assert.equal(conHuerfana.casos, 9, 'la huérfana no suma ni resta discrepancias')
})

test('"no se puede juzgar" nunca entra como discrepancia', () => {
  // Un trimestre sin un solo mes de datos: las 3 metas marcadas quedan en
  // noVerificables. "No se puede saber" no es "no cumple".
  const r = barrerHistorico({
    centros: [{ id: 1, nombre: 'ANCLAS MALL' }],
    trimestres: [{ id: 10, centro_id: 1, anio: 2026, trimestre: 3 }],
    cumplimiento: [fila(10, 1, 'si')],
    rsAll: [], ksAll: [], metasAll: [], estados: [], hoy: HOY,
  })
  assert.equal(r.casos, 0)
  assert.equal(r.hay, false)
  assert.equal(r.noVerificables, 3)
})

test('el barrido y el backfill comparten evaluador: no pueden discrepar', () => {
  // Si cada uno evaluara el trimestre a su manera, la alerta pediría corregir
  // algo que el script no corrige y el aviso no se iría nunca.
  const backfill = read('../scripts/backfill-metas-cumplimiento-2026-09-05.mjs')
  assert.match(backfill, /import \{ evaluarTrimestre \} from '\.\.\/lib\/discrepancias-historico\.mjs'/)
  assert.doesNotMatch(backfill, /^(?:async )?function evaluarTrimestre/m,
    'el backfill no puede tener su propia copia del evaluador')
  assert.equal(typeof evaluarTrimestre, 'function')

  // Y el módulo del barrido es PURO: sin base de datos, sin React. Se miran los
  // comentarios fuera — el módulo EXPLICA que es puro, y un test que se rompe
  // porque el código está bien documentado no vigila nada.
  const modulo = read('../lib/discrepancias-historico.mjs')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  assert.doesNotMatch(modulo, /from '\.\/db'|'use server'|'use client'|from 'react'/i)
})

test('evaluarTrimestre encadena con el cierre del mes anterior al trimestre', () => {
  // El primer mes de un trimestre hereda el cierre de diciembre del año
  // anterior; sin esa semilla, enero arrancaría en 0 niños y la deserción
  // saldría al 100%.
  const previo = { centro_id: 1, year: 2025, month: 12, ninos_inicio_mes: 0, nuevos_activos_mes: 0, retiros_operativos_mes: 0, ninos_final_mes: 200, balance_vivo: true }
  const enero = {
    centro_id: 1, year: 2026, month: 1,
    ninos_inicio_mes: 0, nuevos_activos_mes: 0, retiros_operativos_mes: 10,
    ninos_final_mes: 190, mot_graduado: 0, balance_vivo: true,
  }
  const p = evaluarTrimestre({
    centroId: 1, anio: 2026, trimestre: 1,
    rsAll: [previo, enero],
    ksAll: [{ centro_id: 1, year: 2026, month: 1, cob_d1: 0 }],
    metasAll: [{ anio: 2026, trimestre: 1, meta_nuevos_ingresos_mes: 20, meta_desercion_mes: 8, meta_cobranza_max: 3 }],
    estados: [{ centro_id: 1, year: 2026, month: 1, estado: 'cerrado' }],
    hoy: HOY,
  })
  const desercion = p.detalle.find((d) => d.clave === 'meta_desercion')
  // 10 bajas sobre los 200 heredados = 5%, dentro de la meta de 8%.
  assert.equal(desercion.cumple, true)
  // El centroId puede llegar como string desde un parámetro de URL.
  const comoTexto = evaluarTrimestre({
    centroId: '1', anio: 2026, trimestre: 1,
    rsAll: [previo, enero],
    ksAll: [{ centro_id: 1, year: 2026, month: 1, cob_d1: 0 }],
    metasAll: [{ anio: 2026, trimestre: 1, meta_nuevos_ingresos_mes: 20, meta_desercion_mes: 8, meta_cobranza_max: 3 }],
    estados: [{ centro_id: 1, year: 2026, month: 1, estado: 'cerrado' }],
    hoy: HOY,
  })
  assert.equal(comoTexto.detalle.find((d) => d.clave === 'meta_desercion').cumple, true)
})

test('la lectura del barrido no recibe período y sólo lee', () => {
  const accion = read('../app/actions/cumplimiento.js')
  assert.match(accion, /export async function getDiscrepanciasHistoricas\(\)/,
    'sin argumentos: un período la volvería apagable')
  const cuerpo = accion.slice(accion.indexOf('export async function getDiscrepanciasHistoricas'))
  const hasta = cuerpo.indexOf('\nexport async function', 1)
  const solo = hasta > 0 ? cuerpo.slice(0, hasta) : cuerpo
  assert.doesNotMatch(solo, /INSERT|UPDATE|DELETE|upsert\(/i, 'el barrido no escribe nada')
  assert.match(solo, /alcancePanel\(\)/, 'y respeta el alcance de quien mira')
})
