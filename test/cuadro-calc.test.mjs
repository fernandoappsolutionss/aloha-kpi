import test from 'node:test'
import assert from 'node:assert/strict'

import {
  estadoAsOfMes,
  poblacionAsOfMes,
  cuadroRoyalties,
  cuadroControlGrupos,
  cuadroDeserciones,
} from '../lib/cuadro-calc.js'

// ── Fixtures: la forma que entrega calcularCuadro (lib/cuadro-snapshot.js) ──

const grupo = (overrides = {}) => ({
  id: 10,
  numero: 'A-10',
  itinerario: 'TINY',
  estado: 'activo',
  coach: null,
  horarios: [{ dia: 1, hora_inicio: '15:00', hora_fin: '17:00' }],
  fecha_inicio_clases: '2026-06-01',
  ...overrides,
})

const estudiante = (overrides = {}) => ({
  id: 1,
  centro_id: 1,
  grupo_id: 10,
  nombre: 'Ana Perez',
  itinerario: 'TINY',
  nivel: 3,
  estado: 'activo',
  fecha_inscripcion: '2026-06-03',
  ...overrides,
})

let seqEvento = 100
const evento = (overrides = {}) => {
  const fecha = overrides.fecha || '2026-06-03'
  return {
    id: (seqEvento += 1),
    estudiante_id: 1,
    centro_id: 1,
    tipo: 'inscripcion',
    year: Number(fecha.slice(0, 4)),
    month: Number(fecha.slice(5, 7)),
    a_grupo_id: null,
    de_grupo_id: null,
    ...overrides,
    fecha,
  }
}

const delMes = (eventos, y, m) =>
  eventos.filter((ev) => Number(ev.year) === y && Number(ev.month) === m)

// ── Escenario exacto del gate (g1-22): retiro programado ejecutado el 1-sep ──

test('as-of: el retiro que el cron ejecutó el 1-sep no altera agosto abierto', () => {
  // El cron ya corrió: la ficha dice retirado HOY, pero el evento es de
  // septiembre (fecha lógica = retiro_programado_para, no el día físico).
  const e = estudiante({ estado: 'retirado', motivo_retiro: 'ECONOMICO', fecha_retiro: '2026-09-01' })
  const g = grupo()
  const eventos = [
    evento({ fecha: '2026-06-03', tipo: 'inscripcion', a_grupo_id: 10 }),
    evento({ fecha: '2026-09-01', tipo: 'retiro', motivo: 'ECONOMICO', de_grupo_id: 10 }),
  ]

  // Agosto abierto: el niño sigue en la población, activo al cierre del mes.
  const agosto = poblacionAsOfMes([e], eventos, 2026, 8)
  assert.equal(agosto.length, 1)
  assert.equal(agosto[0].estado, 'activo')

  const evAgosto = delMes(eventos, 2026, 8)
  const control = cuadroControlGrupos([g], agosto, evAgosto, new Set())
  assert.equal(control.totales.aPagar, 1)
  assert.equal(control.totales.retirados, 0)
  assert.equal(cuadroDeserciones(agosto, evAgosto, [g]).length, 0)
  const royalties = cuadroRoyalties(agosto, evAgosto, 12, new Set())
  assert.equal(royalties.totales.totalNinos, 1)
  assert.equal(royalties.totales.totalRoyalty, 12)

  // Septiembre: el retiro cae donde su evento lo declara.
  const septiembre = poblacionAsOfMes([e], eventos, 2026, 9)
  assert.equal(septiembre[0].estado, 'retirado')
  const evSept = delMes(eventos, 2026, 9)
  const controlSept = cuadroControlGrupos([g], septiembre, evSept, new Set())
  assert.equal(controlSept.totales.retirados, 1)
  assert.equal(controlSept.totales.aPagar, 0)
  assert.equal(cuadroDeserciones(septiembre, evSept, [g]).length, 1)
})

// ── Paridad: mes sin eventos posteriores == cálculo actual (regresión cero) ──

test('as-of: sin eventos posteriores la proyección es el estado actual, tal cual', () => {
  const g = grupo()
  const poblacion = [
    // Activo normal con su inscripción vieja.
    estudiante({ id: 1, nombre: 'Ana' }),
    // Baja potencial con retiro PROGRAMADO para septiembre: el evento
    // retiro_programado no es de membresía y no puede activar el rebobinado.
    estudiante({ id: 2, nombre: 'Beto', estado: 'baja_potencial', retiro_programado_para: '2026-09-01' }),
    // Retirado del mes consultado (evento de agosto).
    estudiante({ id: 3, nombre: 'Caro', estado: 'retirado', fecha_retiro: '2026-08-12' }),
    // Retirado viejo (evento de julio): fuera de la población, sin desercion.
    estudiante({ id: 4, nombre: 'Dani', estado: 'retirado', fecha_retiro: '2026-07-02' }),
    // Legacy sin un solo evento: manda la ficha.
    estudiante({ id: 5, nombre: 'Elio' }),
  ]
  const eventos = [
    evento({ estudiante_id: 1, fecha: '2026-06-03' }),
    evento({ estudiante_id: 2, fecha: '2026-06-10' }),
    evento({ estudiante_id: 2, fecha: '2026-08-20', tipo: 'retiro_programado', motivo: 'HORARIO', year: 2026, month: 9 }),
    evento({ estudiante_id: 3, fecha: '2026-06-15' }),
    evento({ estudiante_id: 3, fecha: '2026-08-12', tipo: 'retiro', motivo: 'HORARIO', de_grupo_id: 10 }),
    evento({ estudiante_id: 4, fecha: '2026-06-20' }),
    evento({ estudiante_id: 4, fecha: '2026-07-02', tipo: 'retiro', motivo: 'OTRO', de_grupo_id: 10 }),
  ]

  const proyectada = poblacionAsOfMes(poblacion, eventos, 2026, 8)
  // Nadie sale de la población y cada objeto queda idéntico (misma referencia).
  assert.deepEqual(proyectada, poblacion)
  assert.ok(proyectada.every((e, i) => e === poblacion[i]))

  // El cuadro completo con la población proyectada == con la población cruda.
  const evAgosto = delMes(eventos, 2026, 8).filter((ev) => ev.tipo !== 'retiro_programado')
  const nuevos = new Set()
  assert.deepEqual(
    cuadroControlGrupos([g], proyectada, evAgosto, nuevos),
    cuadroControlGrupos([g], poblacion, evAgosto, nuevos),
  )
  assert.deepEqual(
    cuadroRoyalties(proyectada, evAgosto, 12, nuevos),
    cuadroRoyalties(poblacion, evAgosto, 12, nuevos),
  )
  assert.deepEqual(
    cuadroDeserciones(proyectada, evAgosto, [g]),
    cuadroDeserciones(poblacion, evAgosto, [g]),
  )
})

// ── Reincorporaciones: ni borran retiros del mes ni reviven de más ──────────

test('as-of: la reincorporación de septiembre no borra el retiro de agosto', () => {
  const e = estudiante({ estado: 'activo' })
  const g = grupo()
  const eventos = [
    evento({ fecha: '2026-06-03' }),
    evento({ fecha: '2026-08-10', tipo: 'retiro', motivo: 'ECONOMICO', de_grupo_id: 10 }),
    evento({ fecha: '2026-09-05', tipo: 'reincorporacion', a_grupo_id: 10 }),
  ]
  const agosto = poblacionAsOfMes([e], eventos, 2026, 8)
  assert.equal(agosto[0].estado, 'retirado')
  const evAgosto = delMes(eventos, 2026, 8)
  assert.equal(cuadroDeserciones(agosto, evAgosto, [g]).length, 1)
  assert.equal(cuadroRoyalties(agosto, evAgosto, 12, new Set()).totales.totalNinos, 0)
  const control = cuadroControlGrupos([g], agosto, evAgosto, new Set())
  assert.equal(control.totales.retirados, 1)
  assert.equal(control.totales.aPagar, 0)
})

test('as-of: una reincorporación pasada mantiene al niño activo en el mes', () => {
  const e = estudiante({ estado: 'retirado', fecha_retiro: '2026-09-15' })
  const eventos = [
    evento({ fecha: '2026-05-03' }),
    evento({ fecha: '2026-06-10', tipo: 'retiro', motivo: 'OTRO' }),
    evento({ fecha: '2026-07-08', tipo: 'reincorporacion' }),
    evento({ fecha: '2026-09-15', tipo: 'retiro', motivo: 'ECONOMICO' }),
  ]
  assert.equal(estadoAsOfMes(e, eventos, 2026, 8), 'activo')
  assert.equal(estadoAsOfMes(e, eventos, 2026, 7), 'activo')
  assert.equal(estadoAsOfMes(e, eventos, 2026, 6), 'retirado')
})

// ── Rebobinado sin eventos pasados: el estado PREVIO al primer futuro ───────

test('as-of: un niño cuya primera inscripción es de septiembre no infla agosto', () => {
  const e = estudiante({ estado: 'activo', fecha_inscripcion: '2026-09-02' })
  const eventos = [evento({ fecha: '2026-09-02' })]
  assert.equal(estadoAsOfMes(e, eventos, 2026, 8), null)
  assert.deepEqual(poblacionAsOfMes([e], eventos, 2026, 8), [])
})

test('as-of: sin pasados, antes de un retiro futuro estaba activo y antes de una reincorporación retirado', () => {
  const soloRetiroFuturo = [evento({ fecha: '2026-09-01', tipo: 'retiro', motivo: 'OTRO' })]
  assert.equal(estadoAsOfMes(estudiante({ estado: 'retirado' }), soloRetiroFuturo, 2026, 8), 'activo')
  const soloReincFutura = [evento({ fecha: '2026-09-01', tipo: 'reincorporacion' })]
  assert.equal(estadoAsOfMes(estudiante({ estado: 'activo' }), soloReincFutura, 2026, 8), 'retirado')
})

test('as-of: manda el year/month DECLARADO del evento, no su fecha', () => {
  // Fecha lógica de agosto pero declarada en octubre: para agosto es futuro.
  const e = estudiante({ estado: 'retirado' })
  const eventos = [
    evento({ fecha: '2026-06-03' }),
    evento({ fecha: '2026-08-05', tipo: 'retiro', motivo: 'OTRO', year: 2026, month: 10 }),
  ]
  assert.equal(estadoAsOfMes(e, eventos, 2026, 8), 'activo')
  assert.equal(estadoAsOfMes(e, eventos, 2026, 10), 'retirado')
})

// ── Ventas canceladas pre-inicio: el filtro operativo sigue mandando ────────

test('as-of: la venta cancelada pre-inicio sigue fuera del cuadro (retirosActivosMes)', () => {
  // Inscrita el 5, el grupo arrancaba el 20, canceló el 10: retirosActivosMes
  // (lib/inicios-clase.mjs) excluye su retiro de eventosOperativos y aquí no
  // aparece ni en población pagante ni en deserciones. Sin eventos futuros la
  // proyección respeta la ficha (retirado) — paridad con el cálculo actual.
  const e = estudiante({ estado: 'retirado', fecha_inscripcion: '2026-08-05', fecha_retiro: '2026-08-10' })
  const g = grupo({ fecha_inicio_clases: '2026-08-20' })
  const eventos = [evento({ fecha: '2026-08-05', a_grupo_id: 10 })] // el retiro ya viene filtrado
  const agosto = poblacionAsOfMes([e], eventos, 2026, 8)
  assert.equal(agosto[0].estado, 'retirado')
  const evAgosto = delMes(eventos, 2026, 8)
  const control = cuadroControlGrupos([g], agosto, evAgosto, new Set())
  assert.equal(control.totales.aPagar, 0)
  assert.equal(control.totales.retirados, 0)
  assert.equal(cuadroDeserciones(agosto, evAgosto, [g]).length, 0)
  assert.equal(cuadroRoyalties(agosto, evAgosto, 12, new Set()).totales.totalNinos, 0)
})

test('el cuadro cuenta grupos activos con el mismo criterio operativo del dashboard', () => {
  const control = cuadroControlGrupos(
    [
      grupo({ id: 1 }),
      grupo({ id: 2, es_online: true }),
      grupo({ id: 3 }),
      grupo({ id: 4, estado: 'fusionado' }),
      grupo({ id: 5 }),
      grupo({ id: 6 }),
    ],
    [
      estudiante({ id: 1, grupo_id: 1 }),
      estudiante({ id: 2, grupo_id: 2 }),
      estudiante({ id: 3, grupo_id: 5, estado: 'retirado' }),
      estudiante({ id: 4, grupo_id: 6, estado: 'baja_potencial' }),
    ],
    [],
  )

  assert.equal(control.totales.gruposActivos, 2)
})
