import test from 'node:test'
import assert from 'node:assert/strict'

import {
  balanceMensual,
  fechaInicioOperativa,
  iniciosClaseMes,
  proyeccionSiguienteMes,
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

test('una inscripcion posterior al inicio del grupo cuenta al inscribirse', () => {
  const e = estudiante({ fecha_inscripcion: '2026-08-21' })
  const ev = inscripcion({ fecha: '2026-08-21' })

  assert.equal(fechaInicioOperativa(e, grupo(), ev), '2026-08-21')
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
