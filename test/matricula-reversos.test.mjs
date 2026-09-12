import test from 'node:test'
import assert from 'node:assert/strict'
import { createMatriculaReversosService } from '../lib/matricula-reversos-service.mjs'
import { loadCurrentUser } from '../lib/current-user.mjs'

const actor = { id: 7, rol: 'administradora', centro_id: 2 }
const data = {
  fecha: '2026-09-12', factura: 'FAC-12', notaCredito: 'NC-12',
  comprobanteDevolucion: 'ACH-12', importe: '125.50', moneda: 'USD',
}

function fixture({ user = actor, estudiante = { id: 11, centro_id: 2, estado: 'matricula_anulada' },
  anulaciones = [{ id: 40, fecha: '2026-09-10' }], reversos = [], failCommit = false,
  now = new Date('2026-09-12T17:00:00Z') } = {}) {
  const events = structuredClone(reversos)
  const calls = []
  let nextId = 100
  let authorizations = 0
  let transactions = 0
  const query = async (strings, ...values) => {
    const sql = strings.join('?').replace(/\s+/g, ' ').trim()
    calls.push({ sql, values })
    if (sql.startsWith('SELECT') && sql.includes('FROM estudiantes ')) {
      assert.match(sql, /FOR UPDATE/)
      return estudiante && Number(estudiante.id) === values[0] && Number(estudiante.centro_id) === values[1] ? [estudiante] : []
    }
    if (sql.startsWith('SELECT') && sql.includes("tipo = 'anulacion_matricula'")) {
      assert.match(sql, /ORDER BY id DESC LIMIT 1/)
      return [...anulaciones].sort((a, b) => b.id - a.id).slice(0, 1)
    }
    if (sql.startsWith('SELECT') && sql.includes("tipo = 'reverso_matricula'")) {
      assert.ok(calls[0].sql.includes('FOR UPDATE'), 'bloquea la ficha antes de consultar duplicados')
      return events.filter((event) => String(event.detalle.anulacion_evento_id) === values[2])
    }
    if (sql.startsWith('INSERT INTO estudiante_eventos')) {
      const [estudianteId, centroId, year, month, fecha, detalle] = values
      const event = { id: nextId++, estudiante_id: estudianteId, centro_id: centroId,
        tipo: 'reverso_matricula', year, month, fecha, detalle: JSON.parse(detalle) }
      events.push(event)
      return [{ id: event.id }]
    }
    throw new Error(`Consulta inesperada: ${sql}`)
  }
  const service = createMatriculaReversosService({
    authorize: async (centroId) => { authorizations++; assert.equal(centroId, 2); return user },
    transaction: async (work, options) => {
      transactions++
      assert.deepEqual(options, { isolationLevel: 'Serializable' })
      const snapshot = structuredClone(events)
      try {
        const result = await work(query)
        if (failCommit) throw Object.assign(new Error('commit falló'), { code: '40001' })
        return result
      } catch (error) {
        events.splice(0, events.length, ...snapshot)
        throw error
      }
    },
    now: () => now,
  })
  return { service, events, calls, authorizations: () => authorizations, transactions: () => transactions }
}

test('registra una constancia auditada por anulación sin modificar ficha, KPI ni proveedor', async () => {
  const fx = fixture()
  const result = await fx.service.registrarReversoMatricula('2', '11', { ...data, registrado_por: 99, factura: ' FAC-12 ' })
  assert.deepEqual(result, { ok: true, eventoId: 100, yaRegistrado: false })
  assert.equal(fx.authorizations(), 1)
  assert.equal(fx.transactions(), 1)
  assert.deepEqual(fx.events[0], {
    id: 100, estudiante_id: 11, centro_id: 2, tipo: 'reverso_matricula', year: 2026, month: 9, fecha: '2026-09-12',
    detalle: { factura: 'FAC-12', notaCredito: 'NC-12', comprobanteDevolucion: 'ACH-12', importe: 125.5,
      moneda: 'USD', registrado_por: 7, anulacion_evento_id: 40 },
  })
  assert.equal(fx.calls.filter((c) => c.sql.startsWith('INSERT')).length, 1)
  assert.equal(fx.calls.some((c) => /UPDATE estudiantes|mes_kpi|cuadro_mensual/.test(c.sql)), false)
})

test('reintento equivalente conserva evento y autor originales; otro comprobante requiere revisión', async () => {
  const fx = fixture()
  await fx.service.registrarReversoMatricula(2, 11, data)
  assert.deepEqual(await fx.service.registrarReversoMatricula(2, 11, { ...data, importe: 125.5 }), {
    ok: true, eventoId: 100, yaRegistrado: true,
  })
  for (const change of [{ factura: 'otra' }, { notaCredito: 'otra' }, { comprobanteDevolucion: 'otro' },
    { importe: 120 }, { moneda: 'VES' }, { fecha: '2026-09-11' }]) {
    await assert.rejects(() => fx.service.registrarReversoMatricula(2, 11, { ...data, ...change }), /revisión/i)
  }
  assert.equal(fx.events.length, 1)
  assert.equal(fx.events[0].detalle.registrado_por, 7)
})

test('cada constancia se vincula a la última anulación y no se confunde con una anterior', async () => {
  const fx = fixture({ anulaciones: [{ id: 40, fecha: '2026-09-10' }, { id: 51, fecha: '2026-09-11' }],
    reversos: [{ id: 50, fecha: data.fecha, detalle: { ...data, anulacion_evento_id: 40 } }] })
  await fx.service.registrarReversoMatricula(2, 11, data)
  assert.equal(fx.events.length, 2)
  assert.equal(fx.events[1].detalle.anulacion_evento_id, 51)
})

test('deniega roles de lectura, coach, centro ajeno y actor no autenticado antes de la transacción', async () => {
  for (const user of [null, { ...actor, rol: 'admin_general' }, { ...actor, rol: 'supervisor' },
    { ...actor, rol: 'coach' }, { ...actor, centro_id: 3 }, { ...actor, bloqueado: true },
    { ...actor, rol: 'coordinador', centro_id: null, centros: [3] }]) {
    const fx = fixture({ user })
    await assert.rejects(() => fx.service.registrarReversoMatricula(2, 11, data))
    assert.equal(fx.transactions(), 0)
    assert.equal(fx.events.length, 0)
  }
})

test('asistente y coordinador vigente registran dentro del alcance', async () => {
  for (const user of [{ ...actor, rol: 'asistente' }, { ...actor, rol: 'coordinador', centro_id: null, centros: [2] }]) {
    const fx = fixture({ user })
    assert.equal((await fx.service.registrarReversoMatricula(2, 11, data)).ok, true)
  }
})

test('acepta el usuario autenticado que loadCurrentUser entrega sin hash de contraseña', async () => {
  const user = await loadCurrentUser({ uid: actor.id }, async () => [{ ...actor, centros: [], password_hash: 'x', bloqueado: false }])
  assert.equal(Object.hasOwn(user, 'password_hash'), false)
  const fx = fixture({ user })
  assert.equal((await fx.service.registrarReversoMatricula(2, 11, data)).ok, true)
})

test('exige ficha del centro, estado anulado y evento de anulación confiable', async () => {
  for (const options of [{ estudiante: null }, { estudiante: { id: 11, centro_id: 3, estado: 'matricula_anulada' } },
    { estudiante: { id: 11, centro_id: 2, estado: 'retirado' } }, { anulaciones: [] },
    { anulaciones: [{ id: 40, fecha: null }] }]) {
    const fx = fixture(options)
    await assert.rejects(() => fx.service.registrarReversoMatricula(2, 11, data))
    assert.equal(fx.events.length, 0)
  }
})

test('rechaza referencias vacías, objetos y textos que exceden 180 caracteres', async () => {
  for (const campo of ['factura', 'notaCredito', 'comprobanteDevolucion']) {
    for (const valor of [undefined, null, '', '  ', {}, 123, 'a'.repeat(181)]) {
      const fx = fixture()
      await assert.rejects(() => fx.service.registrarReversoMatricula(2, 11, { ...data, [campo]: valor }))
      assert.equal(fx.events.length, 0)
    }
  }
})

test('valida importe monetario y moneda sin conversión ni coerciones ambiguas', async () => {
  for (const importe of [0, -1, NaN, Infinity, 1000000.01, '1e3', '0x10', 'abc', '', true, null, {}, 1.234]) {
    const fx = fixture()
    await assert.rejects(() => fx.service.registrarReversoMatricula(2, 11, { ...data, importe }))
    assert.equal(fx.events.length, 0)
  }
  for (const moneda of ['EUR', 'usd', '', null, {}]) {
    await assert.rejects(() => fixture().service.registrarReversoMatricula(2, 11, { ...data, moneda }))
  }
  const fx = fixture()
  await fx.service.registrarReversoMatricula(2, 11, { ...data, importe: 25000, moneda: 'VES' })
  assert.equal(fx.events[0].detalle.importe, 25000)
  assert.equal(fx.events[0].detalle.moneda, 'VES')
})

test('fecha real, no futura en Panamá ni anterior a la anulación; año/mes salen de la fecha registrada', async () => {
  for (const fecha of ['2026-02-30', '2026-13-01', '2026-9-12', '', null, '2026-09-13', '2026-09-09']) {
    const fx = fixture()
    await assert.rejects(() => fx.service.registrarReversoMatricula(2, 11, { ...data, fecha }))
    assert.equal(fx.events.length, 0)
  }
  const fx = fixture({ now: new Date('2026-10-01T04:59:59Z') })
  await assert.rejects(() => fx.service.registrarReversoMatricula(2, 11, { ...data, fecha: '2026-10-01' }), /futura/)
  await fx.service.registrarReversoMatricula(2, 11, { ...data, fecha: '2026-09-30' })
  assert.equal(fx.events[0].year, 2026)
  assert.equal(fx.events[0].month, 9)
})

test('rechaza identificadores inválidos antes de autorizar y no confirma si el commit falla', async () => {
  for (const id of [0, -1, 1.5, '11 OR 1=1', true, null, Number.MAX_SAFE_INTEGER + 1]) {
    const fx = fixture()
    await assert.rejects(() => fx.service.registrarReversoMatricula(2, id, data))
    assert.equal(fx.authorizations(), 0)
  }
  const fx = fixture({ failCommit: true })
  await assert.rejects(() => fx.service.registrarReversoMatricula(2, 11, data), { code: '40001' })
  assert.equal(fx.events.length, 0)
})
