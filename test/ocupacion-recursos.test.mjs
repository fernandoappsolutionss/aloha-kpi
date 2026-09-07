import test from 'node:test'
import assert from 'node:assert/strict'
import { ocupacionRecursos } from '../lib/ocupacion-recursos.mjs'

const coaches = [{ id: 1, nombre: 'Coach A', activo: true }, { id: 2, nombre: 'Coach B', activo: true }]
const salones = [{ id: 1, nombre: 'Salón A', activo: true }, { id: 2, nombre: 'Salón B', activo: true }]
const grupo = (extra = {}) => ({ id: 1, numero: '10', estado: 'activo', itinerario: 'KIDS', coach_id: 1, ninos: 8, horarios: [{ dia: 1, hora_inicio: '16:00', hora_fin: '17:00', salon_id: 1 }], ...extra })
const reserva = (extra = {}) => ({ id: 1, activo: true, dia: 1, hora_inicio: '14:00', hora_fin: '15:30', salones: [{ salon_id: 1, rol: 'tiny', coach_id: 1 }, { salon_id: 2, rol: 'padres', coach_id: null }], ...extra })
const calc = (grupos = [], reservas = []) => ocupacionRecursos({ coaches, salones, grupos, reservas })

test('promedio por coach cuenta cada grupo una vez y respeta exclusiones de Kinder y online', () => {
  const a = grupo({ horarios: [...grupo().horarios, { dia: 3, hora_inicio: '16:00', hora_fin: '17:00', salon_id: 1 }] })
  const r = calc([a, grupo({ id: 2, ninos: 12 }), grupo({ id: 3, itinerario: 'KINDER', ninos: 5 }), grupo({ id: 4, es_online: true, ninos: 2 }), grupo({ id: 5, ninos: 0 }), grupo({ id: 6, estado: 'cerrado', ninos: 50 })]).coaches[0]
  assert.equal(r.promedio, 10)
  assert.equal(r.gruposPromedio, 2)
  assert.equal(r.ninos, 27)
  assert.equal(r.grupos.length, 5)
  assert.equal(r.promedioConKinder, 25 / 3)
})

test('prueba bloquea coach y salón, incluso salón de padres sin coach', () => {
  const r = calc([grupo()], [reserva()])
  for (const item of [r.coaches[0], ...r.salones]) {
    const d = item.dias[0]
    assert.equal(d.segmentos.some(s => s.tipo === 'libre' && s.inicio < 930 && s.fin > 840), false)
    assert.ok(d.segmentos.some(s => s.tipo === 'prueba'))
  }
  assert.equal(r.coaches[0].minutosPrueba, 90)
  assert.equal(r.coaches[1].minutosPrueba, 0)
})

test('separación de 15 minutos es transición y no hueco libre', () => {
  const d = calc([grupo()], [reserva({ hora_inicio: '14:15', hora_fin: '15:45' })]).salones[0].dias[0]
  assert.ok(d.segmentos.some(s => s.tipo === 'transicion' && s.inicio === 945 && s.fin === 960))
  assert.ok(d.segmentos.some(s => s.tipo === 'libre' && s.inicio === 1035 && s.fin === 1230 && s.minutos === 195))
  assert.equal(d.segmentos.reduce((n, s) => n + s.minutos, 0), 480)
})

test('solapes y roles de una reserva no duplican horas; se muestra el conflicto real', () => {
  const r = calc([grupo(), grupo({ id: 2, horarios: [{ dia: 1, hora_inicio: '16:30', hora_fin: '17:30', salon_id: 1 }] })], [reserva({ salones: [{ salon_id: 1, rol: 'tiny', coach_id: 1 }, { salon_id: 1, rol: 'padres', coach_id: null }] })])
  assert.equal(r.salones[0].minutosOcupados, 180)
  assert.equal(r.salones[0].minutosPrueba, 90)
  assert.ok(r.salones[0].dias[0].segmentos.some(s => s.tipo === 'conflicto'))
})

test('reservas inactivas y grupos cerrados no ocupan; un recurso sin grupos muestra promedio ausente', () => {
  const r = calc([grupo({ estado: 'cerrado' })], [reserva({ activo: false })])
  assert.equal(r.coaches[0].promedio, null)
  assert.equal(r.salones[0].minutosOcupados, 0)
  assert.equal(r.salones[0].dias[0].segmentos[0].minutos, 480)
})

test('un coach sin horario completo no se presenta libre todo el día', () => {
  const r = calc([grupo({ horarios: [] })]).coaches[0]
  assert.equal(r.completo, false)
  assert.equal(r.minutosLibres, null)
  assert.ok(r.avisos.length)
  assert.equal(r.dias.some(d => d.segmentos.some(s => s.tipo === 'libre')), false)
})

test('un grupo presencial sin salón deja la disponibilidad de salas por verificar', () => {
  const r = calc([grupo({ horarios: [{ dia: 1, hora_inicio: '16:00', hora_fin: '17:00', salon_id: null }] })])
  assert.equal(r.salones[0].completo, false)
  assert.equal(r.salones[1].minutosLibres, null)
  assert.equal(r.coaches[0].minutosGrupo, 60)
})

test('online ocupa al coach sin inventar ocupación de un salón', () => {
  const r = calc([grupo({ es_online: true, horarios: [{ dia: '1', hora_inicio: '16:00', hora_fin: '17:00', salon_id: null }] })])
  assert.equal(r.coaches[0].minutosGrupo, 60)
  assert.equal(r.salones[0].completo, true)
  assert.equal(r.salones[0].minutosOcupados, 0)
})

test('horarios inválidos no se convierten en medianoche ni en tiempo libre confirmado', () => {
  const r = calc([grupo({ horarios: [{ dia: 1, hora_inicio: 'xx', hora_fin: '17:00', salon_id: 1 }] })])
  assert.equal(r.coaches[0].minutosLibres, null)
  assert.equal(r.salones[0].minutosLibres, null)
})

test('recurso inactivo nunca ofrece tiempo libre para asignar grupos', () => {
  const r = ocupacionRecursos({ coaches: [{ ...coaches[0], activo: false }], salones: [{ ...salones[0], activo: false }] })
  assert.equal(r.coaches[0].minutosLibres, null)
  assert.equal(r.salones[0].minutosLibres, null)
})
