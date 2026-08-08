import test from 'node:test'
import assert from 'node:assert/strict'

import {
  VENTAS_AUTO_DESDE,
  calcularKpiSemanalAuto,
  superponerSemanasAuto,
  usaKpiSemanalAuto,
} from '../lib/kpi-semanal-auto.mjs'

// Agosto 2026: empieza sábado; lunes 3 = S1/D1, viernes 7 = S1/D5,
// miércoles 12 = S2/D3 (los mismos anclajes de test/bucket-habil.test.mjs).

const insc = (estudianteId, fecha, extra = {}) => ({
  id: extra.id ?? estudianteId * 10,
  estudiante_id: estudianteId,
  tipo: 'inscripcion',
  fecha,
  year: fecha ? Number(fecha.slice(0, 4)) : extra.year,
  month: fecha ? Number(fecha.slice(5, 7)) : extra.month,
  origen: 'directo',
  ...extra,
})

const retiro = (estudianteId, fecha, extra = {}) => ({
  id: extra.id ?? 9000 + estudianteId,
  estudiante_id: estudianteId,
  tipo: 'retiro',
  fecha,
  ...extra,
})

// ── Gate y resultado discriminado (g1-20) ────────────────────────────────────

test('antes del gate el resultado es manual_pre_gate y no se calcula nada', () => {
  assert.equal(usaKpiSemanalAuto(2026, 7), false)
  assert.deepEqual(calcularKpiSemanalAuto({ year: 2026, month: 7 }), { estado: 'manual_pre_gate' })
  assert.equal(usaKpiSemanalAuto(2026, 8), true)
  assert.equal(VENTAS_AUTO_DESDE, 202608)
})

test('sin eventos el resultado es auto con matrices en cero (cero también es auto)', () => {
  const r = calcularKpiSemanalAuto({ year: 2026, month: 8 })
  assert.equal(r.estado, 'auto')
  assert.equal(r.ingTotal, 0)
  assert.equal(r.desTotal, 0)
  assert.equal(r.cp, 0)
  assert.equal(r.traslados, 0)
  assert.deepEqual(r.ing.flat(), Array(25).fill(0))
  assert.deepEqual(r.des.flat(), Array(25).fill(0))
})

test('periodo inválido ⇒ fallo, jamás un cálculo a medias', () => {
  const r = calcularKpiSemanalAuto({ year: 2026, month: 13 })
  assert.equal(r.estado, 'fallo')
  assert.match(r.mensaje, /Periodo inválido/)
})

// ── Ventas: primer evento GLOBAL, bucket hábil, origen (g1-17/g1-18) ─────────

test('las ventas del mes caen en su celda de día hábil', () => {
  const r = calcularKpiSemanalAuto({
    year: 2026,
    month: 8,
    inscripciones: [
      insc(1, '2026-08-01'), // sábado inicial → avanza al lunes 3: S1/D1
      insc(2, '2026-08-07'), // viernes: S1/D5
      insc(3, '2026-08-12'), // miércoles: S2/D3
      insc(4, '2026-08-12'), // misma celda: se acumula
    ],
  })
  assert.equal(r.estado, 'auto')
  assert.equal(r.ing[0][0], 1)
  assert.equal(r.ing[0][4], 1)
  assert.equal(r.ing[1][2], 2)
  assert.equal(r.ingTotal, 4)
  assert.equal(r.cp, 4)
})

test('el canónico es el PRIMER evento global: un duplicado del mes no cuenta', () => {
  const r = calcularKpiSemanalAuto({
    year: 2026,
    month: 8,
    inscripciones: [
      // La venta real fue en julio (pre-gate, mes ya contado a mano):
      insc(1, '2026-07-10', { id: 1 }),
      // El duplicado de agosto NO puede volver a venderla:
      insc(1, '2026-08-05', { id: 2 }),
      // Empate de fecha: gana el id menor.
      insc(2, '2026-08-04', { id: 4 }),
      insc(2, '2026-08-04', { id: 3 }),
    ],
  })
  assert.equal(r.estado, 'auto')
  assert.equal(r.ingTotal, 1) // solo el niño 2, una vez
  assert.equal(r.ing[0][1], 1) // martes 4-ago: S1/D2
})

test('origen traslado sale de ing_* y suma en el contador aparte', () => {
  const r = calcularKpiSemanalAuto({
    year: 2026,
    month: 8,
    inscripciones: [
      insc(1, '2026-08-05'),
      insc(2, '2026-08-05', { origen: 'traslado' }),
      insc(3, '2026-08-06', { origen: null }), // legacy sin origen: sí es venta
    ],
  })
  assert.equal(r.estado, 'auto')
  assert.equal(r.ingTotal, 2)
  assert.equal(r.traslados, 1)
  assert.equal(r.cp, 2)
})

test('venta del mes con fecha nula, inexistente o discordante ⇒ fallo (no clamp)', () => {
  const sinFecha = calcularKpiSemanalAuto({
    year: 2026,
    month: 8,
    inscripciones: [insc(7, null, { year: 2026, month: 8 })],
  })
  assert.equal(sinFecha.estado, 'fallo')
  assert.match(sinFecha.mensaje, /estudiante 7/)

  const discordante = calcularKpiSemanalAuto({
    year: 2026,
    month: 8,
    // year/month dicen agosto pero la fecha vive en septiembre.
    inscripciones: [insc(8, '2026-09-02', { year: 2026, month: 8 })],
  })
  assert.equal(discordante.estado, 'fallo')

  const inexistente = calcularKpiSemanalAuto({
    year: 2026,
    month: 8,
    inscripciones: [insc(9, '2026-08-99', { year: 2026, month: 8 })],
  })
  assert.equal(inexistente.estado, 'fallo')
})

test('un traslado con fecha rota también es fallo: el dato se repara, no se ignora', () => {
  const r = calcularKpiSemanalAuto({
    year: 2026,
    month: 8,
    inscripciones: [insc(5, null, { year: 2026, month: 8, origen: 'traslado' })],
  })
  assert.equal(r.estado, 'fallo')
})

// ── Retiros operativos (des_*) ───────────────────────────────────────────────

test('los retiros del mes caen en su celda y suman desTotal', () => {
  const r = calcularKpiSemanalAuto({
    year: 2026,
    month: 8,
    retiros: [
      retiro(1, '2026-08-03'), // lunes: S1/D1
      retiro(2, '2026-08-09'), // domingo → viernes 7: S1/D5
      retiro(3, '2026-08-12'), // miércoles: S2/D3
    ],
  })
  assert.equal(r.estado, 'auto')
  assert.equal(r.des[0][0], 1)
  assert.equal(r.des[0][4], 1)
  assert.equal(r.des[1][2], 1)
  assert.equal(r.desTotal, 3)
  // Los retiros no tocan las ventas ni el cp derivado.
  assert.equal(r.ingTotal, 0)
  assert.equal(r.cp, 0)
})

test('retiro contado en el mes sin fecha válida ⇒ fallo', () => {
  const r = calcularKpiSemanalAuto({
    year: 2026,
    month: 8,
    retiros: [retiro(4, null)],
  })
  assert.equal(r.estado, 'fallo')
  assert.match(r.mensaje, /retiro del estudiante 4/i)
})

// ── Superposición sobre filas de kpi_semanas (g1-16) ────────────────────────

test('superponer reemplaza ing/des, conserva cob y crea las semanas faltantes', () => {
  const auto = calcularKpiSemanalAuto({
    year: 2026,
    month: 8,
    inscripciones: [insc(1, '2026-08-03')],
    retiros: [retiro(2, '2026-08-12')],
  })
  const filas = [
    { centro_id: 5, year: 2026, month: 8, semana: 1, cob_d1: 9, ing_d1: 99, des_d1: 99 },
    // Fila de otro mes: intacta.
    { centro_id: 5, year: 2026, month: 7, semana: 1, cob_d1: 3, ing_d1: 7, des_d1: 2 },
    // Fila de otro centro: intacta.
    { centro_id: 6, year: 2026, month: 8, semana: 1, cob_d1: 4, ing_d1: 8, des_d1: 1 },
  ]
  const resultado = superponerSemanasAuto(filas, { centroId: 5, year: 2026, month: 8, auto })

  const s1 = resultado.find((f) => f.centro_id === 5 && f.month === 8 && f.semana === 1)
  assert.equal(s1.cob_d1, 9) // cob intacto
  assert.equal(s1.ing_d1, 1) // lunes 3: S1/D1
  assert.equal(s1.des_d1, 0)

  const s2 = resultado.find((f) => f.centro_id === 5 && f.month === 8 && f.semana === 2)
  assert.ok(s2, 'la semana 2 se crea aunque no exista en la tabla')
  assert.equal(s2.ing_d3, 0)
  assert.equal(s2.des_d3, 1) // miércoles 12: S2/D3
  assert.equal(s2.cob_d1, null)

  assert.equal(resultado.filter((f) => f.centro_id === 5 && f.month === 8).length, 5)
  assert.deepEqual(resultado.find((f) => f.month === 7), filas[1])
  assert.deepEqual(resultado.find((f) => f.centro_id === 6), filas[2])
  // No muta la entrada.
  assert.equal(filas[0].ing_d1, 99)
})

test('superponer con fallo o pre-gate devuelve las filas tal cual (fallback manual)', () => {
  const filas = [{ centro_id: 5, year: 2026, month: 8, semana: 1, ing_d1: 7 }]
  assert.equal(superponerSemanasAuto(filas, {
    centroId: 5, year: 2026, month: 8, auto: { estado: 'fallo', mensaje: 'x' },
  }), filas)
  assert.equal(superponerSemanasAuto(filas, {
    centroId: 5, year: 2026, month: 8, auto: { estado: 'manual_pre_gate' },
  }), filas)
})

// Transversal g1-20: el CERO auto también manda. Un mes sin un solo evento
// produce estado 'auto' y al superponerlo BORRA lo digitado a mano en ing/des
// (la tabla deja de ser fuente en abierto) — no es un fallo que desbloquee.
test('superponer con cero-auto pisa lo manual: las filas quedan en 0, cob intacto', () => {
  const auto = calcularKpiSemanalAuto({ year: 2026, month: 8 }) // sin eventos
  assert.equal(auto.estado, 'auto')
  const filas = [
    // Alguien digitó ventas y retiros a mano en agosto: el auto los pisa.
    { centro_id: 5, year: 2026, month: 8, semana: 1, cob_d1: 9, ing_d1: 7, des_d2: 4 },
    { centro_id: 5, year: 2026, month: 8, semana: 3, cob_d5: 2, ing_d5: 3, des_d5: 1 },
  ]
  const resultado = superponerSemanasAuto(filas, { centroId: 5, year: 2026, month: 8, auto })

  const s1 = resultado.find((f) => f.semana === 1)
  const s3 = resultado.find((f) => f.semana === 3)
  assert.equal(s1.ing_d1, 0)
  assert.equal(s1.des_d2, 0)
  assert.equal(s1.cob_d1, 9) // la cobertura sigue siendo manual: no se toca
  assert.equal(s3.ing_d5, 0)
  assert.equal(s3.des_d5, 0)
  assert.equal(s3.cob_d5, 2)
  // Las 5 semanas existen aunque la tabla solo tuviera dos: el cero se VE.
  assert.equal(resultado.filter((f) => f.centro_id === 5 && f.month === 8).length, 5)
  for (const f of resultado) {
    for (let d = 1; d <= 5; d++) {
      assert.equal(f[`ing_d${d}`] ?? 0, 0)
      assert.equal(f[`des_d${d}`] ?? 0, 0)
    }
  }
  // No muta la entrada: lo digitado sigue en las filas originales.
  assert.equal(filas[0].ing_d1, 7)
})
