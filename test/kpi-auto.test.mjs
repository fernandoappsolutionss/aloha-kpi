import test from 'node:test'
import assert from 'node:assert/strict'

import {
  aplicarAjustes,
  celdaSemanal,
  crearAjustes,
  fuenteKpiAutomatica,
  poblacionKpiAutomatica,
  usaKpiAutomatico,
} from '../lib/kpi-auto.mjs'
import { esOrigenVenta, requiereOrigenVenta } from '../lib/operaciones.js'
import {
  cargarRegistrosPorLotes,
  filtrarClasesVigentesCrm,
  formaKpiGuardada,
  mezclarSemanasAutomaticas,
  validarEventosCrm,
} from '../lib/kpi-auto-server.js'

const matriz = () => Array.from({ length: 5 }, () => [0, 0, 0, 0, 0])

function fuenteVacia(overrides = {}) {
  return {
    cp_invitados: 0,
    cp_asistieron: 0,
    cp_matriculados: 0,
    mot_tecnica: 0,
    mot_perdida_clase: 0,
    mot_economico: 0,
    mot_horario: 0,
    mot_graduado: 0,
    mot_otro: 0,
    orig_referido: 0,
    orig_marketing: 0,
    orig_centro: 0,
    orig_activaciones: 0,
    orig_medios: 0,
    orig_por_clasificar: 0,
    ing: matriz(),
    des: matriz(),
    ...overrides,
  }
}

test('solo automatiza desde agosto de 2026 mientras el mes esta abierto', () => {
  assert.equal(usaKpiAutomatico(2026, 7, 'abierto'), false)
  assert.equal(usaKpiAutomatico(2026, 8, 'abierto'), true)
  assert.equal(usaKpiAutomatico(2027, 1, 'abierto'), true)
  assert.equal(usaKpiAutomatico(2026, 8, 'cerrado'), false)
})

test('la poblacion automatica acepta ceros reales y nunca necesita el formulario', () => {
  assert.deepEqual(poblacionKpiAutomatica({
    arrastrado: null,
    operacion: { inicio: 0, grupos: 0, nuevos: 0 },
  }), {
    ninosInicio: 0,
    gruposActivos: 0,
    nuevosActivos: 0,
  })

  assert.deepEqual(poblacionKpiAutomatica({
    arrastrado: { valor: 148 },
    operacion: { inicio: 135, grupos: 19, nuevos: 14 },
  }), {
    ninosInicio: 148,
    gruposActivos: 19,
    nuevosActivos: 14,
  })
})

test('consulta todos los eventos CRM en lotes de hasta 500 sin perder registros', async () => {
  const ids = Array.from({ length: 1001 }, (_, index) => `event-${index}`)
  const calls = []
  const crm = async (action, body) => {
    calls.push({ action, ids: body.event_ids })
    return { registrations: body.event_ids.map((event_id) => ({
      id: `reg-${event_id}`,
      event_id,
      attendance_status: null,
      registered_at: '2026-08-01T12:00:00.000Z',
      checked_in_at: null,
    })) }
  }

  const result = await cargarRegistrosPorLotes(ids, crm)

  assert.equal(result.complete, true)
  assert.deepEqual(calls.map((call) => call.ids.length), [500, 500, 1])
  assert.ok(calls.every((call) => call.action === 'list_registrations_by_event_ids'))
  assert.equal(result.registrations.length, 1001)
})

test('un lote CRM fallido invalida la fuente completa', async () => {
  let call = 0
  const result = await cargarRegistrosPorLotes(
    Array.from({ length: 501 }, (_, index) => `event-${index}`),
    async (_action, body) => (++call === 2
      ? { error: 'CRM no disponible' }
      : { registrations: [{
          id: 'reg-1',
          event_id: body.event_ids[0],
          attendance_status: null,
          registered_at: '2026-08-01T12:00:00.000Z',
          checked_in_at: null,
        }] }),
  )

  assert.deepEqual(result, { complete: false, error: 'CRM no disponible' })
})

test('una respuesta CRM exitosa pero malformada invalida la fuente completa', async () => {
  for (const response of [{}, { registrations: null }, { registrations: 'no-es-lista' }]) {
    const result = await cargarRegistrosPorLotes(['event-1'], async () => response)
    assert.equal(result.complete, false)
    assert.match(result.error, /respuesta inválida/i)
  }
})

test('rechaza registros CRM incompletos o ajenos al lote solicitado', async () => {
  const invalidos = [
    { event_id: 'event-1', registered_at: '2026-08-01T12:00:00.000Z' },
    { id: 'reg-1', registered_at: '2026-08-01T12:00:00.000Z' },
    { id: 'reg-1', event_id: 'event-ajeno', registered_at: '2026-08-01T12:00:00.000Z' },
    { id: 'reg-1', event_id: 'event-1', registered_at: 'fecha-invalida' },
    { id: 'reg-1', event_id: 'event-1', registered_at: '1' },
    { id: 'reg-1', event_id: 'event-1', registered_at: '2026-08-01T12:00:00.000Z', attendance_status: 'inventado' },
  ]

  for (const registration of invalidos) {
    const result = await cargarRegistrosPorLotes(
      ['event-1'],
      async () => ({ registrations: [registration] }),
    )
    assert.equal(result.complete, false)
    assert.match(result.error, /respuesta inválida/i)
  }
})

test('acepta asistencia pendiente nula cuando el resto del registro CRM es válido', async () => {
  const result = await cargarRegistrosPorLotes(['event-1'], async () => ({
    registrations: [{
      id: 'reg-1',
      event_id: 'event-1',
      attendance_status: null,
      registered_at: '2026-08-01T12:00:00.000Z',
      checked_in_at: null,
    }],
  }))

  assert.equal(result.complete, true)
  assert.equal(result.registrations.length, 1)
})

test('los espejos de clases eliminadas del CRM no bloquean los registros vigentes', () => {
  const clases = [
    { id: 'vigente-1', start_date: '2026-08-06T23:00:00.000Z' },
    { id: 'eliminada', start_date: '2026-08-15T23:00:00.000Z' },
    { id: 'vigente-2', start_date: '2026-08-20T23:00:00.000Z' },
  ]

  assert.deepEqual(
    filtrarClasesVigentesCrm(clases, [{ id: 'vigente-2' }, { id: 'vigente-1' }]),
    [clases[0], clases[2]],
  )
})

test('una lista de clases CRM con filas incompletas falla cerrada', () => {
  assert.equal(validarEventosCrm([{}], 'cuenta-1').complete, false)
  assert.equal(validarEventosCrm([{ id: 'ev-1' }], 'cuenta-1').complete, false)
  assert.equal(validarEventosCrm([{ id: 'ev-1', account_id: 'otra-cuenta' }], 'cuenta-1').complete, false)
  assert.equal(validarEventosCrm([{ id: 'ev-1', account_id: 'cuenta-1' }], 'cuenta-1').complete, true)
})

test('valida el origen comercial separado del origen tecnico', () => {
  assert.equal(esOrigenVenta('referido'), true)
  assert.equal(esOrigenVenta('activaciones'), true)
  assert.equal(esOrigenVenta('clase_prueba'), false)
  assert.equal(esOrigenVenta(''), false)
})

test('exige origen comercial solo para ventas desde agosto de 2026', () => {
  assert.equal(requiereOrigenVenta('2026-07-31'), false)
  assert.equal(requiereOrigenVenta('2026-08-01'), true)
  assert.equal(requiereOrigenVenta(new Date('2026-08-01T00:00:00.000Z')), true)
})

test('ubica movimientos por bloque semanal y acumula el fin de semana en dia 5', () => {
  assert.deepEqual(celdaSemanal('2026-08-03'), { semana: 1, dia: 1 })
  assert.deepEqual(celdaSemanal('2026-08-08'), { semana: 2, dia: 5 })
  assert.deepEqual(celdaSemanal('2026-08-09'), { semana: 2, dia: 5 })
  assert.deepEqual(celdaSemanal('2026-08-31'), { semana: 5, dia: 1 })
})

test('sincroniza el embudo y la venta de una clase de prueba sin duplicar registros', () => {
  const source = fuenteKpiAutomatica({
    year: 2026,
    month: 8,
    clases: [{ id: 'ev-1', start_date: '2026-08-06T23:00:00.000Z' }],
    registros: [
      {
        id: 'reg-1',
        event_id: 'ev-1',
        attendance_status: 'attended',
        registered_at: '2026-08-02T12:00:00.000Z',
        checked_in_at: '2026-08-06T23:00:00.000Z',
      },
      {
        id: 'reg-1',
        event_id: 'ev-1',
        attendance_status: 'attended',
        registered_at: '2026-08-02T12:00:00.000Z',
        checked_in_at: '2026-08-06T23:00:00.000Z',
      },
      {
        id: 'cancelled',
        event_id: 'ev-1',
        attendance_status: 'cancelled',
        registered_at: '2026-08-02T12:00:00.000Z',
      },
    ],
    movimientos: [{
      tipo: 'inscripcion',
      fecha: '2026-08-06',
      crm_registration_id: 'reg-1',
      origen_venta: 'referido',
    }],
  })

  assert.equal(source.cp_invitados, 1)
  assert.equal(source.cp_asistieron, 1)
  assert.equal(source.cp_matriculados, 1)
  assert.equal(source.orig_referido, 1)
  assert.equal(source.ing[0][3], 1)
})

test('usa la fecha de la clase como respaldo para una asistencia sin checked_in_at', () => {
  const source = fuenteKpiAutomatica({
    year: 2026,
    month: 8,
    clases: [{ id: 'ev-1', start_date: '2026-08-13T23:00:00.000Z' }],
    registros: [{
      id: 'reg-1',
      event_id: 'ev-1',
      attendance_status: 'attended',
      registered_at: '2026-07-31T23:00:00.000Z',
      checked_in_at: null,
    }],
    movimientos: [],
  })

  assert.equal(source.cp_invitados, 0)
  assert.equal(source.cp_asistieron, 1)
})

test('no suma invitados que no pertenecen a una clase solicitada', () => {
  const source = fuenteKpiAutomatica({
    year: 2026,
    month: 8,
    clases: [{ id: 'ev-1', start_date: '2026-08-13T23:00:00.000Z' }],
    registros: [{
      id: 'reg-ajeno',
      event_id: 'ev-ajeno',
      attendance_status: null,
      registered_at: '2026-08-02T12:00:00.000Z',
    }],
    movimientos: [],
  })

  assert.equal(source.cp_invitados, 0)
})

test('distribuye retiros por semana y agrupa sus motivos', () => {
  const source = fuenteKpiAutomatica({
    year: 2026,
    month: 8,
    clases: [],
    registros: [],
    movimientos: [
      { tipo: 'retiro', fecha: '2026-08-08', motivo: 'PERDIDA_CLASES' },
      { tipo: 'retiro', fecha: '2026-08-10', motivo: 'ECONOMICO' },
      { tipo: 'retiro', fecha: '2026-08-11', motivo: 'NO_CONFIRMO' },
    ],
  })

  assert.equal(source.des[1][4], 1)
  assert.equal(source.des[1][0], 1)
  assert.equal(source.des[1][1], 1)
  assert.equal(source.mot_perdida_clase, 1)
  assert.equal(source.mot_economico, 1)
  assert.equal(source.mot_otro, 1)
})

test('clasifica ventas sin origen sin adjudicar una categoria inventada', () => {
  const source = fuenteKpiAutomatica({
    year: 2026,
    month: 8,
    clases: [],
    registros: [],
    movimientos: [
      { tipo: 'inscripcion', fecha: '2026-08-04', origen_venta: null },
      { tipo: 'inscripcion', fecha: '2026-08-05', origen_venta: 'desconocido' },
    ],
  })

  assert.equal(source.orig_por_clasificar, 2)
  assert.equal(source.orig_referido, 0)
  assert.equal(source.orig_marketing, 0)
})

test('la conciliacion conserva cifras manuales y evita duplicar fuentes existentes', () => {
  const sourceIng = matriz()
  sourceIng[0][0] = 1
  const savedIng = matriz()
  savedIng[0][0] = 2
  const source = fuenteVacia({ cp_invitados: 10, ing: sourceIng })
  const saved = fuenteVacia({ cp_invitados: 15, ing: savedIng })

  const adjustments = crearAjustes(saved, source)
  const reconciled = aplicarAjustes(source, adjustments)

  assert.equal(adjustments.cp_invitados, 5)
  assert.equal(adjustments.ing[0][0], 1)
  assert.equal(reconciled.cp_invitados, 15)
  assert.equal(reconciled.ing[0][0], 2)
})

test('la conciliacion no duplica el origen cuando la misma venta automatica estaba por clasificar', () => {
  const ing = matriz()
  ing[0][0] = 1
  const source = fuenteVacia({ ing, orig_por_clasificar: 1 })
  const saved = fuenteVacia({ ing, orig_referido: 1 })

  const adjustments = crearAjustes(saved, source)
  const reconciled = aplicarAjustes(source, adjustments)

  assert.equal(reconciled.orig_referido, 1)
  assert.equal(reconciled.orig_por_clasificar, 0)
  assert.equal(
    reconciled.orig_referido + reconciled.orig_marketing + reconciled.orig_centro
      + reconciled.orig_activaciones + reconciled.orig_medios + reconciled.orig_por_clasificar,
    1,
  )
})

test('un origen clasificado despues de conciliar sigue limitado al total real de ventas', () => {
  const ing = matriz()
  ing[0][0] = 1
  const adjustments = crearAjustes(
    fuenteVacia({ ing, orig_referido: 1 }),
    fuenteVacia({ ing, orig_por_clasificar: 1 }),
  )

  const reconciled = aplicarAjustes(fuenteVacia({ ing, orig_referido: 1 }), adjustments)

  assert.equal(reconciled.orig_referido, 1)
  assert.equal(reconciled.orig_por_clasificar, 0)
})

test('una reclasificacion anterior no borra el origen de una venta automatica nueva', () => {
  const unaVenta = matriz()
  unaVenta[0][0] = 1
  const dosVentas = matriz()
  dosVentas[0][0] = 2
  const adjustments = crearAjustes(
    fuenteVacia({ ing: unaVenta, orig_referido: 1 }),
    fuenteVacia({
      ing: unaVenta,
      orig_por_clasificar: 1,
      _origin_sales: [{ id: 'venta-antigua', origin: 'orig_por_clasificar' }],
    }),
  )

  const reconciled = aplicarAjustes(
    fuenteVacia({
      ing: dosVentas,
      orig_referido: 1,
      orig_marketing: 1,
      _origin_sales: [
        { id: 'venta-antigua', origin: 'orig_referido' },
        { id: 'venta-nueva', origin: 'orig_marketing' },
      ],
    }),
    adjustments,
  )

  assert.equal(reconciled.orig_referido, 1)
  assert.equal(reconciled.orig_marketing, 1)
  assert.equal(reconciled.orig_por_clasificar, 0)
})

test('una reclasificacion entre categorias sigue a la venta antigua por identidad', () => {
  const unaVenta = matriz()
  unaVenta[0][0] = 1
  const dosVentas = matriz()
  dosVentas[0][0] = 2
  const adjustments = crearAjustes(
    fuenteVacia({ ing: unaVenta, orig_marketing: 1 }),
    fuenteVacia({
      ing: unaVenta,
      orig_referido: 1,
      _origin_sales: [{ id: 'venta-antigua', origin: 'orig_referido' }],
    }),
  )

  const reconciled = aplicarAjustes(
    fuenteVacia({
      ing: dosVentas,
      orig_marketing: 1,
      orig_referido: 1,
      _origin_sales: [
        { id: 'venta-antigua', origin: 'orig_marketing' },
        { id: 'venta-nueva', origin: 'orig_referido' },
      ],
    }),
    adjustments,
  )

  assert.equal(reconciled.orig_marketing, 1)
  assert.equal(reconciled.orig_referido, 1)
})

test('un crecimiento posterior de la fuente se suma sobre el ajuste inicial fijo', () => {
  const source = fuenteVacia({ cp_invitados: 10 })
  const saved = fuenteVacia({ cp_invitados: 15 })
  const adjustments = crearAjustes(saved, source)

  assert.equal(aplicarAjustes(fuenteVacia({ cp_invitados: 12 }), adjustments).cp_invitados, 17)
})

test('convierte el resumen y las semanas guardadas a la forma conciliable', () => {
  const saved = formaKpiGuardada(
    { cp_invitados: 15, orig_centro: 2, mot_horario: 1 },
    [{ semana: 2, ing_d1: 3, des_d5: 2 }],
  )

  assert.equal(saved.cp_invitados, 15)
  assert.equal(saved.orig_centro, 2)
  assert.equal(saved.mot_horario, 1)
  assert.equal(saved.ing[1][0], 3)
  assert.equal(saved.des[1][4], 2)
})

test('mezcla semanas automaticas sin modificar la cobranza manual', () => {
  const automatic = fuenteVacia()
  automatic.ing[0][2] = 4
  automatic.des[0][3] = 2

  const rows = mezclarSemanasAutomaticas(
    [{ semana: 1, cob_d1: 7, cob_d2: 3, ing_d3: 99, des_d4: 99 }],
    automatic,
  )

  assert.equal(rows.length, 5)
  assert.equal(rows[0].cob_d1, 7)
  assert.equal(rows[0].cob_d2, 3)
  assert.equal(rows[0].ing_d3, 4)
  assert.equal(rows[0].des_d4, 2)
  assert.equal(rows[1].cob_d1, 0)
})
