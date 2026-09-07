import test from 'node:test'
import assert from 'node:assert/strict'
import { clasesDelItinerario, presentarMisGrupos } from '../lib/coach-mis-grupos.mjs'

const itinerario = {
  semanas: [
    { corto: 'S1', etiqueta: 'Clase', fechas: ['2026-09-01', '2026-09-03'] },
    { corto: 'S2', etiqueta: 'Clase', fechas: ['2026-09-08', '2026-09-01'] },
  ],
}

const grupo = (extra = {}) => ({
  id: 7,
  numero: '12',
  itinerario: 'TINY',
  centro: 'ANCLAS MALL',
  horarioTexto: 'Lun 3:30–4:30 pm',
  token: 'tok123',
  itinerarioClases: itinerario,
  estudiantes: [{ id: 1, nombre: 'Ana' }, { id: 2, nombre: 'Beto' }],
  asistencias: [
    { estudiante_id: 1, fecha: '2026-09-01', estado: 'presente' },
    { estudiante_id: 2, fecha: '2026-09-01', estado: 'ausente' },
    { estudiante_id: 1, fecha: '2026-09-03', estado: 'presente' },
  ],
  ...extra,
})

test('las clases salen ordenadas y sin repetir', () => {
  assert.deepEqual(clasesDelItinerario(itinerario).map((c) => c.fecha), ['2026-09-01', '2026-09-03', '2026-09-08'])
  assert.deepEqual(clasesDelItinerario(null), [])
  assert.deepEqual(clasesDelItinerario({ semanas: [{ fechas: ['ayer'] }] }), [])
})

test('marca completa, pendiente y próxima según el día de hoy', () => {
  const [g] = presentarMisGrupos({ grupos: [grupo()], hoy: '2026-09-04' })
  assert.deepEqual(g.clases.map((c) => c.estado), ['completa', 'pendiente', 'proxima'])
  assert.equal(g.clasesPendientes, 1)
  assert.equal(g.proximaPendiente, '2026-09-03')
  assert.equal(g.proximaClase, '2026-09-08')
  assert.equal(g.dictadas, 2)
  assert.equal(g.linkAsistencia, '/coach/tok123')
})

test('un grupo sin niños nunca queda pendiente', () => {
  const [g] = presentarMisGrupos({ grupos: [grupo({ estudiantes: [], asistencias: [] })], hoy: '2026-09-30' })
  assert.deepEqual(new Set(g.clases.map((c) => c.estado)), new Set(['sin_ninos']))
  assert.equal(g.clasesPendientes, 0)
})

test('sin token no se inventa link de asistencia', () => {
  const [g] = presentarMisGrupos({ grupos: [grupo({ token: null })], hoy: '2026-09-04' })
  assert.equal(g.linkAsistencia, null)
})
