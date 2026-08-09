import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ajusteHistoricoKpi,
  balanceMensual,
  cierreKpiDeclarado,
  cuadroConBalanceDeclarado,
  estadoMesPermiteCambios,
  estudiantesConInicioAlCierre,
  fechaInicioClasesConfiable,
  fechaInicioOperativa,
  finalVisibleKpi,
  grupoEntraAlCuadro,
  iniciosClaseMes,
  inicioVisibleKpi,
  movimientosVivosMes,
  periodosAfectadosCambioInicioGrupo,
  periodosAbiertosOperativos,
  proyeccionSiguienteMes,
  resumenConCuadroVivo,
  usaIniciosClaseOperativos,
  valorHistorialMes,
} from '../lib/inicios-clase.mjs'

const grupo = (overrides = {}) => ({
  id: 10,
  numero: 'A-10',
  fecha_inicio_clases: '2026-08-15',
  ...overrides,
})

const estudiante = (overrides = {}) => ({
  id: 1,
  grupo_id: 10,
  nombre: 'Ana Perez',
  fecha_inscripcion: '2026-06-03',
  estado: 'activo',
  ...overrides,
})

const inscripcion = (overrides = {}) => ({
  id: 100,
  estudiante_id: 1,
  tipo: 'inscripcion',
  fecha: '2026-06-03',
  a_grupo_id: 10,
  ...overrides,
})

test('una venta anticipada cuenta cuando el grupo inicia clases', () => {
  const e = estudiante()
  const g = grupo()
  const ev = inscripcion()

  assert.equal(fechaInicioOperativa(e, g, ev), '2026-08-15')
  assert.deepEqual(iniciosClaseMes([e], [g], [ev], 2026, 6), [])
  assert.deepEqual(iniciosClaseMes([e], [g], [ev], 2026, 8).map((x) => x.estudianteId), [1])
})

test('una venta sin grupo no crea un nuevo activo', () => {
  const e = estudiante({ grupo_id: null })
  const ev = inscripcion({ a_grupo_id: null })

  assert.deepEqual(iniciosClaseMes([e], [grupo()], [ev], 2026, 6), [])
  assert.deepEqual(iniciosClaseMes([e], [grupo()], [ev], 2026, 8), [])
})

test('retirar una venta que nunca tuvo grupo no descuenta un nino activo', () => {
  const e = estudiante({ grupo_id: null, estado: 'retirado', fecha_inscripcion: '2026-08-06' })
  const eventos = [
    inscripcion({ fecha: '2026-08-06', a_grupo_id: null }),
    { id: 101, estudiante_id: 1, tipo: 'retiro', fecha: '2026-08-20', year: 2026, month: 8 },
  ]

  const movimientos = movimientosVivosMes({
    estudiantes: [e],
    grupos: [grupo()],
    eventos,
    year: 2026,
    month: 8,
  })

  assert.equal(movimientos.deserciones.length, 0)
  assert.equal(movimientos.totales.retirados, 0)
})

test('una asignacion posterior usa la fecha mayor entre asignacion e inicio del grupo', () => {
  const eventos = [
    inscripcion({ fecha: '2026-08-06', a_grupo_id: null }),
    { id: 101, estudiante_id: 1, tipo: 'cambio_grupo', fecha: '2026-08-20', a_grupo_id: 10 },
  ]

  const [inicio] = iniciosClaseMes(
    [estudiante({ fecha_inscripcion: '2026-08-06' })],
    [grupo({ fecha_inicio_clases: '2026-08-15' })],
    eventos,
    2026,
    8,
  )

  assert.equal(inicio.grupoId, 10)
  assert.equal(inicio.fechaInicio, '2026-08-20')
})

test('una asignacion previa espera la fecha de inicio del grupo', () => {
  const eventos = [
    inscripcion({ fecha: '2026-08-06', a_grupo_id: null }),
    { id: 101, estudiante_id: 1, tipo: 'cambio_grupo', fecha: '2026-08-10', a_grupo_id: 10 },
  ]

  const [inicio] = iniciosClaseMes(
    [estudiante({ fecha_inscripcion: '2026-08-06' })],
    [grupo({ fecha_inicio_clases: '2026-08-15' })],
    eventos,
    2026,
    8,
  )

  assert.equal(inicio.fechaInicio, '2026-08-15')
})

test('una inscripcion posterior al inicio del grupo cuenta al inscribirse', () => {
  const e = estudiante({ fecha_inscripcion: '2026-08-21' })
  const ev = inscripcion({ fecha: '2026-08-21' })

  assert.equal(fechaInicioOperativa(e, grupo(), ev), '2026-08-21')
})

test('una asignacion efectiva posterior no cuenta al niño en un mes anterior abierto', () => {
  const e = estudiante({ fecha_inscripcion: '2026-08-06' })
  const eventos = [
    inscripcion({ fecha: '2026-08-06', a_grupo_id: null }),
    { id: 101, estudiante_id: 1, tipo: 'cambio_grupo', fecha: '2026-09-03', a_grupo_id: 10 },
  ]

  assert.deepEqual(
    estudiantesConInicioAlCierre([e], [grupo({ fecha_inicio_clases: '2026-07-01' })], eventos, 2026, 8),
    [],
  )
  assert.deepEqual(
    estudiantesConInicioAlCierre([e], [grupo({ fecha_inicio_clases: '2026-07-01' })], eventos, 2026, 9),
    [e],
  )
})

test('una venta nueva sin grupo no entra en la poblacion activa del mes', () => {
  const e = estudiante({ grupo_id: null, fecha_inscripcion: '2026-08-06' })
  assert.deepEqual(
    estudiantesConInicioAlCierre([e], [grupo()], [inscripcion({ fecha: '2026-08-06', a_grupo_id: null })], 2026, 8),
    [],
  )
})

test('mover el inicio del grupo protege tambien el mes efectivo de cada nino', () => {
  const periodos = periodosAfectadosCambioInicioGrupo({
    grupo: grupo({ fecha_inicio_clases: '2026-08-15' }),
    fechaNueva: '2026-10-01',
    estudiantes: [estudiante({ fecha_inscripcion: '2026-09-10' })],
    eventos: [inscripcion({ fecha: '2026-09-10' })],
    fechaReferencia: '2026-08-08',
  })

  assert.deepEqual(periodos, [
    { year: 2026, month: 8 },
    { year: 2026, month: 9 },
    { year: 2026, month: 10 },
  ])
})

// Cascada nueva del respaldo (R1, g1-3): fecha de PUBLICACIÓN — el día civil
// Panamá de created_at — y, sin created_at, la fecha de referencia. JAMÁS
// fecha_inicio_clases ni fecha_apertura (columna congelada).
test('un grupo sin fecha inicial protege desde su publicación al asignarle una', () => {
  // Publicado a las 19:30 de Panamá del 20-jun = 00:30 UTC del 21-jun: el
  // respaldo es el día CIVIL de Panamá (20-jun), no el del reloj UTC.
  const periodos = periodosAfectadosCambioInicioGrupo({
    grupo: grupo({ fecha_inicio_clases: null, created_at: '2026-06-21T00:30:00.000Z' }),
    fechaNueva: '2026-09-01',
    estudiantes: [estudiante({ fecha_inscripcion: '2026-07-05' })],
    eventos: [inscripcion({ fecha: '2026-07-05' })],
    fechaReferencia: '2026-08-08',
  })

  assert.deepEqual(periodos, [
    { year: 2026, month: 6 },
    { year: 2026, month: 7 },
    { year: 2026, month: 8 },
    { year: 2026, month: 9 },
  ])
})

test('la fecha_apertura congelada ya no participa del respaldo', () => {
  // Si el respaldo leyera fecha_apertura (mayo), protegería desde mayo; la
  // publicación real fue en julio.
  const periodos = periodosAfectadosCambioInicioGrupo({
    grupo: grupo({
      fecha_inicio_clases: null,
      fecha_apertura: '2026-05-02',
      created_at: '2026-07-10T15:00:00.000Z',
    }),
    fechaNueva: '2026-08-01',
    estudiantes: [],
    eventos: [],
    fechaReferencia: '2026-08-08',
  })

  assert.deepEqual(periodos, [
    { year: 2026, month: 7 },
    { year: 2026, month: 8 },
  ])
})

test('sin created_at el respaldo cae a la fecha de referencia', () => {
  const periodos = periodosAfectadosCambioInicioGrupo({
    grupo: grupo({ fecha_inicio_clases: null }),
    fechaNueva: '2026-09-01',
    estudiantes: [],
    eventos: [],
    fechaReferencia: '2026-08-08',
  })

  assert.deepEqual(periodos, [
    { year: 2026, month: 8 },
    { year: 2026, month: 9 },
  ])
})

test('sin fecha de inicio de grupo se usa la fecha de inscripcion', () => {
  assert.equal(fechaInicioOperativa(estudiante(), grupo({ fecha_inicio_clases: null }), inscripcion()), '2026-06-03')
})

test('el grupo original de la inscripcion prevalece sobre el grupo actual', () => {
  const grupos = [
    grupo({ id: 10, fecha_inicio_clases: '2026-08-15' }),
    grupo({ id: 20, fecha_inicio_clases: '2026-07-01' }),
  ]
  const e = estudiante({ grupo_id: 20 })

  const [inicio] = iniciosClaseMes([e], grupos, [inscripcion()], 2026, 8)
  assert.equal(inicio.grupoId, 10)
  assert.equal(inicio.fechaInicio, '2026-08-15')
})

test('un retiro anterior al inicio cancela el nuevo activo', () => {
  const eventos = [
    inscripcion(),
    { id: 101, estudiante_id: 1, tipo: 'retiro', fecha: '2026-08-01' },
  ]

  assert.deepEqual(iniciosClaseMes([estudiante()], [grupo()], eventos, 2026, 8), [])
})

test('una cancelacion antes del inicio de clases no descuenta un nino activo', () => {
  const eventos = [
    inscripcion(),
    { id: 101, estudiante_id: 1, tipo: 'retiro', fecha: '2026-08-01', year: 2026, month: 8 },
  ]
  const movimientos = movimientosVivosMes({
    estudiantes: [estudiante({ estado: 'retirado' })],
    grupos: [grupo()],
    eventos,
    year: 2026,
    month: 8,
  })

  assert.equal(movimientos.iniciosClase.length, 0)
  assert.equal(movimientos.deserciones.length, 0)
  assert.equal(movimientos.totales.retirados, 0)
})

test('un retiro despues del inicio conserva el inicio y ambos se declaran', () => {
  const eventos = [
    inscripcion(),
    { id: 101, estudiante_id: 1, tipo: 'retiro', fecha: '2026-08-20' },
  ]

  assert.deepEqual(iniciosClaseMes([estudiante({ estado: 'retirado' })], [grupo()], eventos, 2026, 8).map((x) => x.estudianteId), [1])
})

test('un retiro el mismo dia del inicio conserva ambas declaraciones', () => {
  const eventos = [
    inscripcion(),
    { id: 101, estudiante_id: 1, tipo: 'retiro', fecha: '2026-08-15' },
  ]

  assert.equal(iniciosClaseMes([estudiante({ estado: 'retirado' })], [grupo()], eventos, 2026, 8).length, 1)
})

test('normaliza las fechas DATE que Neon entrega como objetos Date', () => {
  const e = estudiante({ fecha_inscripcion: new Date('2026-06-03T00:00:00.000Z') })
  const g = grupo({ fecha_inicio_clases: new Date('2026-08-15T00:00:00.000Z') })
  const ev = inscripcion({ fecha: new Date('2026-06-03T00:00:00.000Z') })

  assert.equal(fechaInicioOperativa(e, g, ev), '2026-08-15')
})

test('una reincorporacion no crea un nuevo activo', () => {
  const e = estudiante({ fecha_inscripcion: '2026-01-10' })
  const eventos = [
    inscripcion({ fecha: '2026-01-10' }),
    { id: 102, estudiante_id: 1, tipo: 'reincorporacion', fecha: '2026-09-04', a_grupo_id: 10 },
  ]

  assert.deepEqual(iniciosClaseMes([e], [grupo({ fecha_inicio_clases: '2026-01-15' })], eventos, 2026, 9), [])
})

test('calcula el balance operativo mensual', () => {
  assert.equal(balanceMensual({ inicio: 150, nuevosActivos: 12, reincorporados: 2, retirados: 5 }), 159)
})

test('el snapshot cerrado conserva el mismo balance que el resumen mensual', () => {
  const datos = cuadroConBalanceDeclarado({
    datos: {
      totales: { mesAnterior: 126, nuevos: 1, reincorporados: 0, retirados: 9, aPagar: 118 },
      controlGrupos: { totales: { mesAnterior: 126, nuevos: 1, reincorporados: 0, retirados: 9, aPagar: 118 } },
    },
    inicio: 135,
    nuevosActivos: 1,
    reincorporados: 0,
    retirados: 8,
  })

  assert.equal(datos.totales.mesAnterior, 135)
  assert.equal(datos.totales.aPagar, 128)
  assert.equal(datos.controlGrupos.totales.aPagar, 128)
})

test('el cierre congela la cifra guardada en KPI aunque el cuadro vivo difiera', () => {
  const cierre = cierreKpiDeclarado({
    resumen: {
      ninos_inicio_mes: 135,
      ninos_final_mes: 122,
      nuevos_activos_mes: 0,
      grupos_activos: 19,
    },
    datos: {
      totales: {
        mesAnterior: 148,
        nuevos: 0,
        reincorporados: 0,
        retirados: 13,
        aPagar: 135,
        gruposActivos: 17,
      },
    },
  })

  assert.deepEqual(cierre, {
    inicio: 135,
    final: 122,
    nuevosActivos: 0,
    reincorporados: 0,
    retirados: 13,
  })
})

test('un mes cerrado conserva su inicio historico aunque cambie el cierre anterior', () => {
  assert.equal(inicioVisibleKpi({ estado: 'cerrado', guardado: 135, arrastrado: 148 }), 135)
})

test('un mes cerrado conserva su final historico y no lo recalcula en pantalla', () => {
  assert.equal(finalVisibleKpi({ estado: 'cerrado', guardado: 122, calculado: 135 }), 122)
})

test('un mes abierto usa el cierre anterior y su calculo vivo', () => {
  assert.equal(inicioVisibleKpi({ estado: 'abierto', guardado: 134, arrastrado: 135 }), 135)
  assert.equal(finalVisibleKpi({ estado: 'abierto', guardado: 134, calculado: 136 }), 136)
})

test('un cierre historico de cero sigue siendo un valor guardado valido', () => {
  assert.equal(finalVisibleKpi({ estado: 'cerrado', guardado: 0, calculado: 99 }), 0)
})

test('identifica un ajuste historico sin alterar el mes cerrado', () => {
  assert.equal(ajusteHistoricoKpi({ estado: 'cerrado', inicioGuardado: 135, cierreAnterior: 148 }), -13)
  assert.equal(ajusteHistoricoKpi({ estado: 'cerrado', inicioGuardado: 135, cierreAnterior: 135 }), null)
  assert.equal(ajusteHistoricoKpi({ estado: 'abierto', inicioGuardado: 135, cierreAnterior: 148 }), null)
})

test('proyecta el mes siguiente con bajas e inicios programados', () => {
  assert.equal(proyeccionSiguienteMes({ cierreActual: 165, bajasPotenciales: 6, iniciosProgramados: 14 }), 173)
})

test('la fecha operativa reemplaza el legado desde agosto de 2026', () => {
  assert.equal(usaIniciosClaseOperativos(2026, 7), false)
  assert.equal(usaIniciosClaseOperativos(2026, 8), true)
  assert.equal(usaIniciosClaseOperativos(2027, 1), true)
})

test('el historial de un mes abierto usa el calculo vivo del cuadro', () => {
  assert.equal(valorHistorialMes({
    estado: 'abierto',
    guardado: 0,
    cuadro: { vivo: true, nuevos: 1 },
    campo: 'nuevos',
  }), 1)
})

test('el historial de un mes cerrado conserva el valor guardado', () => {
  assert.equal(valorHistorialMes({
    estado: 'cerrado',
    guardado: 14,
    cuadro: { vivo: true, nuevos: 99 },
    campo: 'nuevos',
  }), 14)
})

test('el resumen trimestral usa el balance KPI aunque el roster vivo tenga otra cantidad', () => {
  const filas = resumenConCuadroVivo([
    { centro_id: 2, year: 2026, month: 7, ninos_inicio_mes: 135, ninos_final_mes: 122, nuevos_activos_mes: 0, grupos_activos: 19 },
    { centro_id: 2, year: 2026, month: 8, ninos_inicio_mes: 122, ninos_final_mes: 115, nuevos_activos_mes: 1, grupos_activos: 19 },
  ], {
    year: 2026,
    month: 8,
    estado: 'abierto',
    inicioArrastrado: 122,
    cuadro: {
      totales: { mesAnterior: 126, aPagar: 127, gruposActivos: 17, reincorporados: 0 },
      iniciosClase: [{}],
      deserciones: Array.from({ length: 8 }, () => ({})),
    },
    motivos: { mot_economico: 4, mot_graduado: 1, mot_otro: 3 },
  })

  assert.equal(filas[1].ninos_inicio_mes, 122)
  assert.equal(filas[1].ninos_final_mes, 115)
  assert.equal(filas[1].nuevos_activos_mes, 1)
  assert.equal(filas[1].retiros_operativos_mes, 8)
  assert.equal(filas[1].mot_graduado, 1)
})

test('el panel agregado aplica los inicios y retiros vivos del mes abierto', () => {
  const movimientos = movimientosVivosMes({
    estudiantes: [estudiante({ id: 877, fecha_inscripcion: '2026-08-07' })],
    grupos: [grupo({ fecha_inicio_clases: '2026-01-10', estado: 'activo' })],
    eventos: [inscripcion({ id: 956, estudiante_id: 877, fecha: '2026-08-07' })],
    year: 2026,
    month: 8,
  })
  const filas = resumenConCuadroVivo([
    { centro_id: 6, year: 2026, month: 8, ninos_inicio_mes: 61, ninos_final_mes: 61 },
    { centro_id: 1, year: 2026, month: 8, ninos_inicio_mes: 200, ninos_final_mes: 200 },
  ], {
    centroId: 6,
    year: 2026,
    month: 8,
    estado: 'abierto',
    inicioArrastrado: 61,
    cuadro: movimientos,
  })

  assert.equal(movimientos.iniciosClase.length, 1)
  assert.equal(movimientos.deserciones.length, 0)
  assert.equal(movimientos.totales.gruposActivos, 1)
  assert.equal(filas[0].ninos_final_mes, 62)
  assert.equal(filas[1].ninos_final_mes, 200)
})

test('el mes abierto se crea desde los movimientos aunque aun no tenga fila KPI', () => {
  const filas = resumenConCuadroVivo([], {
    centroId: 2,
    year: 2026,
    month: 8,
    estado: 'abierto',
    inicioArrastrado: 122,
    cuadro: {
      totales: { gruposActivos: 17, reincorporados: 0 },
      iniciosClase: [{}],
      deserciones: Array.from({ length: 8 }, () => ({})),
    },
  })

  assert.equal(filas.length, 1)
  assert.equal(filas[0].centro_id, 2)
  assert.equal(filas[0].ninos_inicio_mes, 122)
  assert.equal(filas[0].ninos_final_mes, 115)
})

test('un resumen sin estado sigue abierto aunque ya no sea el mes actual', () => {
  const periodos = periodosAbiertosOperativos({
    resumenes: [{ centro_id: 2, year: 2026, month: 8 }],
    estados: [],
    centroIds: [2],
    desde: 202608,
    hasta: 202609,
    periodoActual: 202609,
  })

  assert.deepEqual(periodos, [
    { centroId: 2, year: 2026, month: 8, estado: 'abierto' },
    { centroId: 2, year: 2026, month: 9, estado: 'abierto' },
  ])
})

test('un mes en proceso de cierre rechaza nuevas escrituras', () => {
  assert.equal(estadoMesPermiteCambios(null), true)
  assert.equal(estadoMesPermiteCambios('abierto'), true)
  assert.equal(estadoMesPermiteCambios('cerrando'), false)
  assert.equal(estadoMesPermiteCambios('cerrado'), false)
})

test('el resumen trimestral no reinterpreta un mes cerrado', () => {
  const original = [
    { centro_id: 2, year: 2026, month: 7, ninos_final_mes: 122, nuevos_activos_mes: 0, grupos_activos: 19 },
  ]
  const filas = resumenConCuadroVivo(original, {
    year: 2026,
    month: 7,
    estado: 'cerrado',
    cuadro: { totales: { mesAnterior: 1, aPagar: 999, gruposActivos: 99 }, iniciosClase: [{}, {}] },
  })

  assert.deepEqual(filas, original)
})

// Regla nueva (R1, g1-1): el inicio operativo es max(evento canónico de
// inscripción, fecha_inicio_clases del grupo de inscripción). La regla es la
// misma para todos los niveles, con UNA guardia de runtime: un grupo cuya
// referencia ya cursa nivel 2+ dio clases por definición — su fecha FUTURA es
// un dato roto (residuo del backfill D7, pendiente del preflight g1-1) y se
// trata como NULL (rige la inscripción). Con la fecha corregida (pasada), la
// guardia es inerte.
test('venta anticipada en grupo nuevo (nivel 1 o sin plan): manda la fecha del grupo', () => {
  const estudianteFx = { id: 1, grupo_id: 7, fecha_inscripcion: '2026-06-20' }
  const inscripcionFx = { estudiante_id: 1, tipo: 'inscripcion', fecha: '2026-06-20', a_grupo_id: 7 }
  const grupoDeNivel = (nivel) => ({
    id: 7,
    fecha_inicio_clases: '2026-08-10',
    itinerario_clases: nivel == null ? null : { nivel, fecha_inicio: '2026-08-10' },
  })

  // El llenado normal: grupo en nivel 1 (o sin referencia) con inicio futuro.
  for (const nivel of [1, null]) {
    assert.equal(fechaInicioOperativa(estudianteFx, grupoDeNivel(nivel), inscripcionFx), '2026-08-10')
    assert.equal(iniciosClaseMes([estudianteFx], [grupoDeNivel(nivel)], [inscripcionFx], 2026, 8).length, 1)
  }
})

test('guardia g1-1: veterano nivel 2+ con fecha FUTURA no re-estrena ni sale del cuadro', () => {
  // El dato roto que el preflight g1-1 aún no corrigió: la fecha del grupo
  // quedó en el arranque futuro de su nivel vigente. La guardia la trata como
  // NULL: el inicio operativo es la inscripción (nadie vuelve a ser "nuevo")
  // y el grupo sigue entrando al Cuadro del mes (fail closed).
  const grupo = {
    id: 7,
    fecha_inicio_clases: '2026-09-14',
    itinerario_clases: { nivel: 5, fecha_inicio: '2026-09-14' },
  }
  const estudiante = { id: 1, grupo_id: 7, fecha_inscripcion: '2025-03-04' }
  const inscripcion = { estudiante_id: 1, tipo: 'inscripcion', fecha: '2025-03-04', a_grupo_id: 7 }

  assert.equal(fechaInicioClasesConfiable(grupo, '2026-08-31'), null)
  assert.equal(fechaInicioOperativa(estudiante, grupo, inscripcion), '2025-03-04')
  assert.equal(iniciosClaseMes([estudiante], [grupo], [inscripcion], 2026, 9).length, 0)
  assert.equal(grupoEntraAlCuadro(grupo, '2026-08-31'), true)
})

test('guardia g1-1: solo aplica a nivel 2+; el nivel 1 futuro es llenado normal', () => {
  const enLlenado = {
    id: 8,
    fecha_inicio_clases: '2026-09-14',
    itinerario_clases: { nivel: 1, fecha_inicio: '2026-09-14' },
  }
  assert.equal(fechaInicioClasesConfiable(enLlenado, '2026-08-31'), '2026-09-14')
  assert.equal(grupoEntraAlCuadro(enLlenado, '2026-08-31'), false)
  assert.equal(grupoEntraAlCuadro(enLlenado, '2026-09-30'), true)
})

test('guardia g1-1: con la fecha corregida (pasada) es inerte y rige la regla pura', () => {
  const veteranoCorregido = {
    id: 9,
    fecha_inicio_clases: '2025-01-13',
    itinerario_clases: { nivel: 5, fecha_inicio: '2026-08-10' },
  }
  assert.equal(fechaInicioClasesConfiable(veteranoCorregido, '2026-08-31'), '2025-01-13')
  assert.equal(grupoEntraAlCuadro(veteranoCorregido, '2026-08-31'), true)
  // itinerario_clases defensivo como string (JSONB serializado).
  const comoString = { ...veteranoCorregido, itinerario_clases: JSON.stringify({ nivel: 5 }) }
  assert.equal(fechaInicioClasesConfiable(comoString, '2026-08-31'), '2025-01-13')
})

test('un grupo veterano con fecha PASADA no re-estrena a su gente al cambiar de nivel', () => {
  // Así quedan los veteranos tras el preflight g1-1: fecha ≤ la inscripción de
  // todos sus niños atribuidos → max(inscripción, fecha) no se mueve de la
  // venta original y nadie vuelve a contar como nuevo.
  const grupo = {
    id: 7,
    fecha_inicio_clases: '2025-01-13',
    itinerario_clases: { nivel: 5, fecha_inicio: '2026-08-10' },
  }
  const estudiante = { id: 1, grupo_id: 7, fecha_inscripcion: '2025-03-04' }
  const inscripcion = { estudiante_id: 1, tipo: 'inscripcion', fecha: '2025-03-04', a_grupo_id: 7 }

  assert.equal(fechaInicioOperativa(estudiante, grupo, inscripcion), '2025-03-04')
  assert.equal(iniciosClaseMes([estudiante], [grupo], [inscripcion], 2026, 8).length, 0)
})
