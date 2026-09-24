import test from 'node:test'
import assert from 'node:assert/strict'
import { perfilIngresos, estadoBaldes, calcularCurva, consolidar } from '../lib/caja/curva.mjs'

const cerca = (a, b) => assert.ok(Math.abs(a - b) < 0.011, `${a} ≠ ${b}`)
const PLANO = { promedioMensual: 9000, pesos: [0.25, 0.25, 0.25, 0.25] }
const BALDES = [{ vigente_desde: '2026-01-01', dueno_pct: 10, impuesto_pct: 5 }]

test('perfil: promedio de los 3 últimos meses cerrados y peso por bloque', () => {
  const movs = [
    { fecha: '2026-06-03', monto: 100, clase: 'ingreso' },
    { fecha: '2026-07-05', monto: 300, clase: 'ingreso' },
    { fecha: '2026-08-25', monto: 300, clase: 'ingreso' },
    { fecha: '2026-08-26', monto: -50, clase: 'planilla' },
    { fecha: '2026-06-30', monto: 1, clase: 'planilla' },
    { fecha: '2026-09-10', monto: 999, clase: 'ingreso' }, // mes en curso: no cuenta
  ]
  const p = perfilIngresos(movs, '2026-09-24')
  assert.deepEqual(p.meses, ['2026-06', '2026-07', '2026-08'])
  cerca(p.promedioMensual, 700 / 3) // 100 + 300 + 300 en 3 meses cerrados
  // días 3 y 5 → bloque 1-7 (400/700); día 25 → bloque 22-fin (300/700)
  assert.deepEqual(p.pesos.map((x) => Math.round(x * 100)), [57, 0, 0, 43])
})

test('estado de baldes: pendiente del dueño y reserva de impuesto desde vigente_desde', () => {
  const movs = [
    { fecha: '2025-12-31', monto: 1000, clase: 'ingreso' }, // antes de vigente: no cuenta
    { fecha: '2026-02-01', monto: 1000, clase: 'ingreso' },
    { fecha: '2026-02-10', monto: -60, clase: 'dueno' },
    { fecha: '2026-02-11', monto: -20, clase: 'impuesto' },
  ]
  assert.deepEqual(estadoBaldes(movs, BALDES, '2026-09-24'), { duenoPendiente: 40, reservaImpuesto: 30 })
})

test('curva: semana en curso parcial, cruce de mes, compromiso, baldes', () => {
  const r = calcularCurva({
    hoy: '2026-09-23', // miércoles → proyecta jue 24 a dom 27
    saldoHoy: 5000,
    perfil: PLANO,
    compromisos: [{ id: 1, clase: 'alquiler', concepto: 'Alquiler', monto: 500, frecuencia: 'mensual', dia: 1, desde: '2026-01-01' }],
    baldes: BALDES,
    baldesEstado: { duenoPendiente: 0, reservaImpuesto: 0 },
    lineaDisponible: 50000,
  })
  assert.equal(r.semanas.length, 13)
  const [s1, s2] = r.semanas
  assert.equal(s1.lunes, '2026-09-21')
  cerca(s1.ingresos, 1000) // bloque 22-30 de septiembre = 9 días → 250/día × 4
  cerca(s1.dueno, 100)
  cerca(s1.saldoFinal, 5900)
  cerca(s1.reservaImpuesto, 50)
  cerca(s1.disponible, 5850)
  cerca(s2.ingresos, 750 + 4 * 2250 / 7) // 28-30 sep + 1-4 oct
  assert.deepEqual(s2.egresos, { alquiler: 500 })
  cerca(s2.saldoFinal, 5900 + s2.ingresos - 500 - s2.ingresos * 0.1)
  assert.equal(r.semanas[12].lunes, '2026-12-14')
})

test('ajuste manual reemplaza el ingreso proyectado de esa semana', () => {
  const r = calcularCurva({ hoy: '2026-09-23', saldoHoy: 0, perfil: PLANO, compromisos: [], baldes: [], ajustes: [{ semana: '2026-09-28', ingreso: 123 }] })
  assert.equal(r.semanas[1].ingresos, 123)
  assert.equal(r.semanas[1].ajustado, true)
})

test('semáforo rojo y línea necesaria cuando un pago grande deja el disponible negativo', () => {
  const r = calcularCurva({
    hoy: '2026-09-23', saldoHoy: 1000, perfil: { promedioMensual: 0, pesos: [0.25, 0.25, 0.25, 0.25] }, baldes: [],
    compromisos: [{ id: 1, clase: 'impuesto', concepto: 'ISR', monto: 3000, frecuencia: 'unico', fecha: '2026-10-01', desde: '2026-01-01' }],
    lineaDisponible: 1500,
  })
  assert.equal(r.semanas[0].semaforo, 'verde') // 1000 ≥ piso (2 × 3000/13)
  assert.equal(r.semanas[1].semaforo, 'rojo')
  assert.equal(r.semanas[1].lineaNecesaria, 2000)
  assert.equal(r.semanas[1].lineaExcedida, true)
})

test('pendiente del dueño se separa en la semana 1', () => {
  const r = calcularCurva({ hoy: '2026-09-27', saldoHoy: 1000, perfil: PLANO, compromisos: [], baldes: [], baldesEstado: { duenoPendiente: 400, reservaImpuesto: 0 } })
  assert.equal(r.semanas[0].dueno, 400)
  assert.equal(r.semanas[0].saldoFinal, 600)
})

test('consolidado suma por semana y recalcula semáforo', () => {
  const base = { hoy: '2026-09-23', perfil: PLANO, compromisos: [], baldes: [] }
  const a = calcularCurva({ ...base, saldoHoy: 1000 })
  const b = calcularCurva({ ...base, saldoHoy: -3000 })
  const c = consolidar(a, b)
  assert.equal(c.semanas.length, 13)
  cerca(c.semanas[0].saldoInicial, -2000)
  cerca(c.semanas[0].ingresos, 2000)
})

// Extra (no estaba en el plan): el Master sube un escalón con vigente_desde a mitad de
// semana. Cada día proyectado usa el balde vigente ESE día, igual que estadoBaldes con lo real;
// tomar el balde del lunes aplicaría el % viejo a toda la semana del cambio.
test('cambio de baldes a mitad de semana: cada día usa el % vigente ese día', () => {
  const r = calcularCurva({
    hoy: '2026-09-23', saldoHoy: 5000, perfil: PLANO, compromisos: [],
    baldes: [...BALDES, { vigente_desde: '2026-10-01', dueno_pct: 20, impuesto_pct: 10 }], // jueves
    baldesEstado: { duenoPendiente: 0, reservaImpuesto: 0 },
  })
  const [s1, s2, s3] = r.semanas
  cerca(s1.dueno, 100) // 1000 × 10%
  // s2: 28-30 sep = 3 × 250 = 750 al 10% → 75; 1-4 oct = 4 × 2250/7 = 1285.714 al 20% → 257.143
  cerca(s2.dueno, 75 + 4 * 2250 / 7 * 0.2) // 332.14 (el % del lunes daría 203.57)
  // reserva: 50 (s1) + 750 × 5% + 1285.714 × 10% = 50 + 37.5 + 128.571 = 216.07
  cerca(s2.reservaImpuesto, 50 + 37.5 + 4 * 2250 / 7 * 0.1)
  cerca(s3.dueno, 2250 * 0.2) // 5-7 oct + 8-11 oct = 2250, todo al 20%
})
