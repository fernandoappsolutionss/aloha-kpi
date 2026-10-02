import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cargarPlan, asignarCondicionEn, agregarObjetivoEn, editarObjetivoEn, marcarObjetivoEn, eliminarObjetivoEn } from '../lib/plan-semana-servicio.js'
import { readFileSync } from 'node:fs'

const FIN = '2026-09-24'
const HOY = new Date('2026-10-02T16:00:00Z')
const iso = (v) => v instanceof Date ? v.toISOString().slice(0, 10) : String(v)

function memoria() {
  const planes = new Map()
  const objetivos = []
  const anterior = { id: 1, centro_id: 7, semana_fin: '2026-09-17', condicion: 'emergencia', pendientes_copiados_at: HOY }
  planes.set('7:2026-09-17', anterior)
  objetivos.push({ id: 1, plan_id: 1, seccion: 'urgente', paso: null, texto: 'Llamar padres', hecho: false })
  const consultas = []
  async function query(strings, ...values) {
    const sql = strings.join('?').replace(/\s+/g, ' ').trim()
    consultas.push(sql)
    if (sql.includes('INSERT INTO semana_planes')) {
      const [centro, fin] = values
      const key = `${centro}:${iso(fin)}`
      if (!planes.has(key)) planes.set(key, { id: 2, centro_id: centro, semana_fin: iso(fin), condicion: null, lectura_auto: 'peligro', lectura_motivo: 'Caída', pendientes_copiados_at: null })
      return []
    }
    if (sql.includes('FROM semana_planes') && sql.includes('FOR UPDATE')) return [planes.get(`${values[0]}:${iso(values[1])}`)].filter(Boolean)
    if (sql.includes('FROM semana_planes') && sql.includes('WHERE centro_id')) return [planes.get(`${values[0]}:${iso(values[1])}`)].filter(Boolean)
    if (sql.includes('FROM semana_objetivos') && sql.includes('plan_id')) return objetivos.filter((o) => o.plan_id === values[0])
    if (sql.includes('INSERT INTO semana_objetivos')) {
      objetivos.push({ id: objetivos.length + 1, plan_id: values[0], seccion: 'pendiente', paso: null, texto: values[1], hecho: false })
      return []
    }
    if (sql.includes('UPDATE semana_planes') && sql.includes('pendientes_copiados_at')) { planes.get('7:2026-09-24').pendientes_copiados_at = HOY; return [] }
    if (sql.includes('FROM growth_recommendations')) return []
    if (sql.includes('FROM estadisticas_semana')) return ['2026-09-03', '2026-09-10', '2026-09-17', FIN].map((semana_fin, i) => ({ semana_fin, valor: 100 + i, estado: 'cerrada' }))
    if (sql.includes('FROM centros')) return [{ pais: 'PA' }]
    if (sql.includes('UPDATE semana_objetivos')) return []
    throw new Error(`Consulta no prevista: ${sql}`)
  }
  return { query, planes, objetivos, consultas, transaction: (work) => work(query) }
}

test('abrir dos veces copia pendientes una sola vez', async () => {
  const db = memoria()
  await cargarPlan(7, FIN, { ...db, sesion: { rol: 'administradora' }, now: HOY })
  const count = db.objetivos.length
  await cargarPlan(7, FIN, { ...db, sesion: { rol: 'administradora' }, now: HOY })
  assert.equal(db.objetivos.length, count)
  assert.ok(count > 1)
  assert.ok(db.consultas.some((sql) => sql.includes('FOR UPDATE')))
})

test('la administradora y asistente no reciben lectura ni discrepancia del servidor', async () => {
  const db = memoria()
  for (const rol of ['administradora', 'asistente']) {
    const result = await cargarPlan(7, FIN, { ...db, sesion: { rol }, now: HOY })
    assert.equal('lectura' in result, false)
    assert.equal('discrepancia' in result, false)
    assert.equal('lectura_auto' in result.plan, false)
    assert.equal('lectura_motivo' in result.plan, false)
    assert.equal(JSON.stringify(result).includes('Caída'), false)
  }
  const result = await cargarPlan(7, FIN, { ...db, sesion: { rol: 'coordinador' }, now: HOY })
  assert.equal(result.lectura.condicion, 'normal')
  assert.equal(result.discrepancia, false)
})

test('no se asigna condición a una semana abierta', async () => {
  const db = memoria()
  await assert.rejects(asignarCondicionEn(7, '2026-10-08', { condicion: 'normal' }, { ...db, sesion: { id: 3 }, now: HOY }), /semana cerrada/)
})

test('un objetivo de otro centro no se marca', async () => {
  const db = memoria()
  await assert.rejects(marcarObjetivoEn(8, 1, true, { query: db.query }), /No autorizado/)
})

test('órdenes del coordinador son de solo lectura también en el servidor', async () => {
  const query = async (strings) => {
    const sql = strings.join('?')
    return sql.includes("seccion IN ('formula','urgente','pendiente')") ? [] : [{ id: 5, seccion: 'orden' }]
  }
  await assert.rejects(editarObjetivoEn(7, 5, { texto: 'Cambiada' }, { query }), /No autorizado/)
  await assert.rejects(marcarObjetivoEn(7, 5, true, { query }), /No autorizado/)
  await assert.rejects(eliminarObjetivoEn(7, 5, { query }), /No autorizado/)
})

test('agregar objetivo vuelve a validar el paso bajo bloqueo del plan', async () => {
  let locks = 0; let inserts = 0
  const query = async (strings) => {
    const sql = strings.join('?')
    if (sql.includes('INSERT INTO semana_planes')) return []
    if (sql.includes('FROM semana_planes') && sql.includes('FOR UPDATE')) return [{ id: 2, condicion: ++locks === 1 ? 'normal' : 'cambio_poder', pendientes_copiados_at: HOY }]
    if (sql.includes('FROM semana_objetivos')) return []
    if (sql.includes('FROM growth_recommendations')) return []
    if (sql.includes('FROM estadisticas_semana')) return []
    if (sql.includes('FROM centros')) return [{ pais: 'PA' }]
    if (sql.includes('INSERT INTO semana_objetivos')) { inserts++; return [{ id: 4 }] }
    throw new Error(`Consulta inesperada: ${sql}`)
  }
  await assert.rejects(agregarObjetivoEn(7, FIN, { seccion: 'formula', paso: 3, texto: 'Acción', responsable:'Ana', fecha:'2026-10-07', evidencia_esperada:'Registro' }, { query, transaction: (work) => work(query), sesion: { id: 3 }, now: HOY }), /Paso inválido/)
  assert.equal(inserts, 0)
  assert.equal(locks, 2)
})

test('la apertura usa READ COMMITTED con el bloqueo de fila para concurrencia', () => {
  const source = readFileSync(new URL('../lib/plan-semana-servicio.js', import.meta.url), 'utf8')
  assert.match(source, /withTransaction\(work, \{ isolationLevel: 'ReadCommitted' \}\)/)
})
