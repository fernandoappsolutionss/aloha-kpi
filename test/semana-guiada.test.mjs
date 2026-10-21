import test from 'node:test'
import assert from 'node:assert/strict'
import { avanceCuota, filasAvanceDiario, diasDeSemana } from '../lib/avance-semana.mjs'
import { ESTADISTICAS_CENTRO as catalogo } from '../lib/estadisticas-semana/catalogo.mjs'
import { completarSerieCentro, calcularSemanaCentro } from '../lib/estadisticas-semana/servicio.js'
import { validarJuego, resultadoJuego } from '../lib/juegos-semana.mjs'
import { leerInformeSemana } from '../lib/informe-semana-servicio.js'
import { guardarJuegoEn, aprobarJuegoEn } from '../lib/juegos-semana-servicio.js'
import { MODULOS } from '../lib/entrenamiento/modulos.js'
import { rutaDePaso } from '../lib/entrenamiento/progreso.js'

const meta = catalogo.find(m => m.codigo === 'nuevos_inscritos')
const fin = '2026-10-22'
const now = new Date('2026-10-20T22:00:00Z')
const juego = { titulo: 'Bienvenida', codigo: 'cp_asistidas', meta: '10', participantes: 'Equipo', reglas: 'Asistencias registradas en CRM', premio: 'Reconocimiento', version: 0 }

test('cuotas diarias enteras suman la semanal; días futuros no inventan ceros', () => {
  for (const cuota of [0, 1, 5, 8, 30]) {
    const filas = filasAvanceDiario({ semanaFin: fin, hoy: '2026-10-20', meta, cuota, diario: [{ fecha: '2026-10-16', valores: { nuevos_inscritos: 0 } }] })
    assert.equal(filas.reduce((s, d) => s + d.cuotaDia, 0), cuota)
    assert.equal(filas[0].realizadoDia, 0)
    assert.equal(filas[1].valor, null)
    assert.equal(filas[6].estado, 'Por venir')
    assert.equal(filas[6].valor, null)
  }
  assert.deepEqual(diasDeSemana('2027-01-07'), ['2027-01-01','2027-01-02','2027-01-03','2027-01-04','2027-01-05','2027-01-06','2027-01-07'])
  assert.throws(() => diasDeSemana('2026-10-21'))
})

test('niveles y máximos no se dividen entre días; cero y ausencia se distinguen', () => {
  assert.equal(avanceCuota({ meta: catalogo[0], cuota: 140, valor: 131, dia: 1 }).esperado, 140)
  assert.equal(avanceCuota({ meta: catalogo[2], cuota: 2, valor: 1, dia: 1 }).estado, 'Dentro del límite')
  assert.equal(avanceCuota({ meta: catalogo[2], cuota: 0, valor: 1, dia: 3 }).estado, 'Supera el límite')
  assert.equal(avanceCuota({ meta, cuota: 0, valor: 0, dia: 1 }).estado, 'Al ritmo')
  assert.equal(avanceCuota({ meta, cuota: 0, valor: null, dia: 1 }).estado, 'Sin dato o cuota')
})

test('detalle diario comparte las fuentes, respeta cortes y no escribe snapshots', async () => {
  const llamadas = new Map()
  const query = async (s, ...v) => {
    const q = s.join('?'); assert.doesNotMatch(q, /INSERT|UPDATE|DELETE/)
    const clave = JSON.stringify([q,v]); llamadas.set(clave, (llamadas.get(clave) || 0) + 1)
    if (q.includes('FROM centros')) return [{ id: 2, pais: 'PA' }]
    if (q.includes('FROM resumen_mes')) return [{ ninos_final_mes: 100 }]
    if (q.includes('FROM estudiantes')) return [{ id: 1, estado: 'activo', fecha_inscripcion: '2026-10-19' }]
    if (q.includes('FROM estudiante_eventos')) return [{ id: 1, estudiante_id: 1, tipo: 'inscripcion', fecha: '2026-10-19', origen: 'venta' }]
    if (q.includes('FROM cobranza_diaria')) return [{ fecha: '2026-10-19', vencidas: 5 }]
    return []
  }
  const result = await completarSerieCentro(2, [fin], [], { query, now, diario: true })
  assert.equal(result.avanceDiario.length, 5)
  assert.equal(result.avanceDiario[0].valores.nuevos_inscritos, 0)
  assert.equal(result.avanceDiario[3].valores.nuevos_inscritos, 1)
  assert.equal(result.avanceDiario[0].valores.facturas_vencidas, null)
  assert.equal(result.avanceDiario[4].valores.facturas_vencidas, 5)
  assert([...llamadas.values()].every(n => n === 1), 'cada consulta idéntica se comparte')
  await assert.rejects(calcularSemanaCentro(2, fin, { query, now, corteDiario: '2026-10-21' }), /Corte diario inválido/)
})

test('juegos validan límites y nunca declaran ganado antes del cierre aprobado', () => {
  assert.equal(validarJuego(juego).meta, 10)
  for (const cambio of [{ meta: -1 }, { meta: 1.5 }, { meta: '' }, { meta: null }, { codigo: 'intruso' }, { reglas: '' }, { version: -1 }, { premio: 'a'.repeat(301) }]) assert.throws(() => validarJuego({ ...juego, ...cambio }))
  assert.match(resultadoJuego({ ...juego, estado: 'propuesto' }, 20, true), /pendiente/)
  assert.match(resultadoJuego({ ...juego, estado: 'aprobado' }, 20), /al corte/)
  assert.match(resultadoJuego({ ...juego, estado: 'aprobado' }, 20, true), /Meta lograda/)
  assert.match(resultadoJuego({ ...juego, estado: 'aprobado' }, null, true), /Sin dato/)
  assert.match(resultadoJuego({ ...juego, codigo: 'retiros', meta: 0, estado: 'aprobado' }, 0, true), /Meta lograda/)
})

test('informe histórico consulta el plan que se ejecutó esa semana, sin arrastre', async () => {
  const query = async (s, ...v) => {
    const q = s.join('?'); assert.doesNotMatch(q, /INSERT|UPDATE|DELETE/)
    if (q.includes('FROM centros')) return [{ id: 2, pais: 'PA', nombre: 'Demo' }]
    if (q.includes('FROM semana_planes')) { assert.equal(v[1], '2026-10-08'); return [{ id: 5, condicion: 'normal' }] }
    if (q.includes('FROM semana_objetivos')) { assert.deepEqual(v, [5]); return [] }
    if (q.includes('FROM estadisticas_semana')) return [{ codigo: 'nuevos_inscritos', valor: 0, estado: 'cerrada' }, { codigo: 'retiros', valor: 0, estado: 'abierta' }]
    if (q.includes('FROM semana_cuotas')) return [{ codigo: 'nuevos_inscritos', cuota: 0, estado: 'aprobada' }, { codigo: 'retiros', cuota: 2, estado: 'propuesta' }]
    throw new Error(q)
  }
  const r = await leerInformeSemana(2, '2026-10-15', { query, now })
  assert.equal(r.estadisticas[1].cumple, true)
  assert.equal(r.estadisticas[2].valor, null)
  assert.equal(r.estadisticas[2].cumple, null)
  assert.equal(r.pasos.length, 4)
  await assert.rejects(leerInformeSemana(2, fin, { query, now }), /semana anterior/)
})

test('juego bloquea escrituras históricas y rechaza versiones desactualizadas', async () => {
  let writes = 0
  const query = async s => { const q = s.join('?'); if (q.includes('FROM centros')) return [{ pais: 'PA' }]; writes++; return [] }
  await assert.rejects(guardarJuegoEn(2, '2026-10-15', juego, { query, now, actorId: 1 }), /semana en curso/)
  assert.equal(writes, 0)
  await assert.rejects(guardarJuegoEn(2, fin, juego, { query, now, actorId: 1 }), /otra sesión/)
  await assert.rejects(aprobarJuegoEn(2, fin, 1, { query, now, actorId: 1 }), /cambió/)
})

test('recorridos siguen los pasos en sus nuevas pantallas', () => {
  const plan = MODULOS.find(m => m.id === 'semana-plan')
  assert.equal(rutaDePaso(plan, 2), '/centro/{id}/semana/condicion')
  assert.deepEqual(plan.pasos.map((_, i) => rutaDePaso(plan, i + 1)), ['condicion', 'condicion', 'condicion', 'condicion', '', 'condicion', 'acciones', 'juegos', 'cumplimiento', 'cumplimiento'].map(p => `/centro/{id}/semana${p ? '/' + p : ''}`))
  assert.equal(rutaDePaso(plan, 7), '/centro/{id}/semana/acciones')
})
