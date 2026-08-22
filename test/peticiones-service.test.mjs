import test from 'node:test'
import assert from 'node:assert/strict'
import { createPeticionesService } from '../lib/peticiones-service.mjs'

const admin = { id: 1, nombre: 'Gerencia', email: 'g@aloha.com', rol: 'admin_general', centro_id: null }
const centerUser = { id: 8, nombre: 'Centro 10', email: 'c10@aloha.com', rol: 'administradora', centro_id: 10 }

test('comentario se envía sin categoría ni archivos y crea evento inicial', async () => {
  const calls = []
  const repo = {
    transaction: async (work) => work(repo),
    insertComentario: async (_query, row) => ({ id: 41, ...row }),
    insertHistory: async (_query, event) => { calls.push(event) },
  }
  const service = createPeticionesService({ repo, now: () => new Date('2026-08-21T12:00:00Z') })
  const result = await service.createComentario(centerUser, { centroId: 10, anio: 2026, trimestre: 3, texto: 'Revisar horario' })
  assert.equal(result.peticion.tipo, 'comentario')
  assert.equal(result.peticion.categoria, null)
  assert.equal(result.peticion.submitted_at, '2026-08-21T12:00:00.000Z')
  assert.deepEqual(calls.map((event) => [event.estado_anterior, event.estado_nuevo]), [[null, 'Próximo trimestre']])
})

test('lista enviados y solo borradores de la autora', async () => {
  const repo = {
    listSubmitted: async () => [{
      id: 1, tipo: 'legado', texto: 'Anterior',
      created_by_snapshot: { id: 1, nombre: 'Gerencia', email: 'gerencia@aloha.com', rol: 'admin_general' },
      cotizaciones: [{
        id: 9, proveedor_razon_social: 'Proveedor', proveedor_pais: 'PA', proveedor_id_fiscal: '155',
        archivo_nombre: 'oferta.pdf', upload_status: 'valid', blob_pathname: 'privado/a.pdf',
        expected_pathname: 'privado/a.pdf', upload_nonce: 'secreto', archivo_sha256: 'a'.repeat(64),
      }],
    }],
    listDrafts: async (_period, user) => [{ id: 2, tipo: 'peticion', created_by: user.id, submitted_at: null }],
  }
  const service = createPeticionesService({ repo })
  const panel = await service.listPanel(centerUser, { centroId: 10, anio: 2026, trimestre: 3 })
  assert.deepEqual(panel.items.map((row) => row.id), [1])
  assert.deepEqual(panel.drafts.map((row) => row.id), [2])
  assert.equal(panel.items[0].legacy, true)
  assert.equal(panel.permissions.canChangeStatus, false)
  assert.equal(panel.items[0].cotizaciones[0].archivo_nombre, 'oferta.pdf')
  assert.doesNotMatch(JSON.stringify(panel), /blob_pathname|expected_pathname|upload_nonce|archivo_sha256|privado\/a\.pdf|secreto|created_by_snapshot|gerencia@aloha\.com/)
})

test('un registro legado no se edita ni se borra', async () => {
  const repo = { transaction: async (work) => work(repo), lockPeticion: async () => ({ id: 1, tipo: 'legado', centro_id: 10 }) }
  const service = createPeticionesService({ repo })
  await assert.rejects(() => service.updateComentario(centerUser, { centroId: 10, id: 1, texto: 'cambio' }), /registro anterior/)
  assert.equal(typeof service.deletePeticion, 'undefined')
})

test('un comentario no se puede vaciar al editar', async () => {
  let updated = false
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 3, tipo: 'comentario', centro_id: 10, created_by: 8, estado: 'Próximo trimestre' }),
    updateComentario: async () => { updated = true },
  }
  await assert.rejects(
    () => createPeticionesService({ repo }).updateComentario(centerUser, { centroId: 10, id: 3, texto: '   ' }),
    /Escribe el comentario/
  )
  assert.equal(updated, false)
  const foreignRepo = {
    transaction: async (work) => work(foreignRepo),
    lockPeticion: async () => ({ id: 3, tipo: 'comentario', centro_id: 11, created_by: 8, estado: 'Próximo trimestre' }),
    updateComentario: async () => { updated = true },
  }
  await assert.rejects(
    () => createPeticionesService({ repo: foreignRepo }).updateComentario(centerUser, { centroId: 10, id: 3, texto: 'Cambio' }),
    /registro anterior/i
  )
})

test('un borrador incompleto no se envía ni crea historial', async () => {
  let writes = 0
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, created_by: 8, tipo: 'peticion', categoria: 'reparacion', texto: 'Reparar', submitted_at: null }),
    listQuotes: async () => [],
    markSubmitted: async () => { writes++ },
    insertHistory: async () => { writes++ },
  }
  const service = createPeticionesService({ repo })
  await assert.rejects(() => service.submitPeticion(centerUser, { centroId: 10, id: 4 }), /al menos tres cotizaciones válidas/)
  assert.equal(writes, 0)
})

test('un borrador vencido solo puede descartarse, no editarse ni enviarse', async () => {
  let writes = 0
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({
      id: 4, centro_id: 10, created_by: 8, tipo: 'peticion', categoria: 'reparacion', texto: 'Reparar',
      submitted_at: null, draft_expires_at: '2026-08-20T12:00:00Z',
    }),
    listQuotes: async () => { throw new Error('no debe leer cotizaciones') },
    updateDraft: async () => { writes++ },
    markSubmitted: async () => { writes++ },
  }
  const service = createPeticionesService({ repo, now: () => new Date('2026-08-21T12:00:00Z') })
  await assert.rejects(() => service.submitPeticion(centerUser, { centroId: 10, id: 4 }), /borrador venció/i)
  await assert.rejects(() => service.updateDraft(centerUser, { centroId: 10, id: 4, texto: 'Reparar', categoria: 'reparacion' }), /borrador venció/i)
  assert.equal(writes, 0)
})

test('tres cotizaciones válidas permiten enviar aunque exista un intento inválido', async () => {
  const events = []
  const valid = ['1', '2', '3'].map((id) => ({
    id: Number(id), proveedor_razon_social: `Proveedor ${id}`, proveedor_pais: 'PA', proveedor_id_fiscal: id,
    empresa_constituida: true, emite_factura_fiscal: true, upload_status: 'valid', archivo_sha256: id.repeat(64),
  }))
  const failed = { id: 9, upload_status: 'invalid', blob_pathname: 'peticiones/4/fallo.pdf', expected_pathname: 'peticiones/4/fallo.pdf' }
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, created_by: 8, tipo: 'peticion', categoria: 'reparacion', texto: 'Reparar', submitted_at: null }),
    listQuotes: async () => [...valid, failed],
    enqueueCleanup: async (_query, row) => { events.push(`queue:${row.blob_pathname}`) },
    deleteIncompleteDraftQuotes: async () => { events.push('delete:incomplete') },
    markSubmitted: async (_query, row) => { events.push('submit'); return row },
    insertHistory: async () => { events.push('history') },
  }
  let verified = 0
  const result = await createPeticionesService({ repo, verifyQuote: async () => { verified++ } })
    .submitPeticion(centerUser, { centroId: 10, id: 4 })
  assert.equal(result.ok, true)
  assert.equal(verified, 3)
  assert.deepEqual(events, ['queue:peticiones/4/fallo.pdf', 'delete:incomplete', 'submit', 'history'])
})

test('reintentar submit devuelve la petición enviada sin segundo evento', async () => {
  let histories = 0
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, created_by: 8, tipo: 'peticion', submitted_at: '2026-08-21T12:00:00Z' }),
    insertHistory: async () => { histories++ },
  }
  const result = await createPeticionesService({ repo }).submitPeticion(centerUser, { centroId: 10, id: 4 })
  assert.equal(result.alreadySubmitted, true)
  assert.equal(histories, 0)
})

test('dos submits concurrentes producen un envío y un evento inicial', async () => {
  let row = { id: 4, centro_id: 10, created_by: 8, tipo: 'peticion', categoria: 'reparacion', texto: 'Reparar', estado: 'Próximo trimestre', submitted_at: null }
  const quotes = ['1', '2', '3'].map((id) => ({
    proveedor_razon_social: `Proveedor ${id}`, proveedor_pais: 'PA', proveedor_id_fiscal: id,
    empresa_constituida: true, emite_factura_fiscal: true, upload_status: 'valid', archivo_sha256: id.repeat(64),
  }))
  let chain = Promise.resolve()
  let histories = 0
  let verified = 0
  const repo = {
    transaction: async (work) => {
      const result = chain.then(() => work(repo))
      chain = result.catch(() => {})
      return result
    },
    lockPeticion: async () => ({ ...row }),
    listQuotes: async () => quotes,
    markSubmitted: async (_query, patch) => { row = { ...row, submitted_at: patch.submitted_at }; return { ...row } },
    insertHistory: async () => { histories++ },
  }
  const service = createPeticionesService({ repo, verifyQuote: async () => { verified++ } })
  const results = await Promise.all([
    service.submitPeticion(centerUser, { centroId: 10, id: 4 }),
    service.submitPeticion(centerUser, { centroId: 10, id: 4 }),
  ])
  assert.deepEqual(results.map((result) => result.alreadySubmitted).sort(), [false, true])
  assert.equal(histories, 1)
  assert.equal(verified, 3)
})

test('si el Blob ya no coincide el borrador permanece sin enviar', async () => {
  let writes = 0
  const quotes = ['1', '2', '3'].map((id) => ({
    proveedor_razon_social: `Proveedor ${id}`, proveedor_pais: 'PA', proveedor_id_fiscal: id,
    empresa_constituida: true, emite_factura_fiscal: true, upload_status: 'valid', archivo_sha256: id.repeat(64),
  }))
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, created_by: 8, tipo: 'peticion', categoria: 'reparacion', texto: 'Reparar', submitted_at: null }),
    listQuotes: async () => quotes,
    markSubmitted: async () => { writes++ },
    insertHistory: async () => { writes++ },
  }
  const service = createPeticionesService({ repo, verifyQuote: async () => { throw new Error('El PDF cambió después de validarse.') } })
  await assert.rejects(() => service.submitPeticion(centerUser, { centroId: 10, id: 4 }), /PDF cambió/)
  assert.equal(writes, 0)
})

test('solo gerencia cambia estado y cada cambio conserva transición', async () => {
  const events = []
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, tipo: 'peticion', estado: 'Aprobado', submitted_at: '2026-08-21T12:00:00Z' }),
    changeStatus: async (_query, row) => row,
    insertHistory: async (_query, row) => { events.push(row) },
  }
  const service = createPeticionesService({ repo, now: () => new Date('2026-08-22T12:00:00Z') })
  await assert.rejects(() => service.changeStatus(centerUser, { centroId: 10, id: 4, estado: 'Cumplido' }), /No autorizado/)
  await service.changeStatus(admin, { centroId: 10, id: 4, estado: 'Cumplido' })
  assert.deepEqual(events.map((event) => [event.estado_anterior, event.estado_nuevo]), [['Aprobado', 'Cumplido']])
})

test('Aprobado en una petición exige seleccionar la cotización ganadora', async () => {
  let changeStatusCalled = false
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, tipo: 'peticion', estado: 'Próximo trimestre', submitted_at: '2026-08-21T12:00:00Z' }),
    changeStatus: async () => { changeStatusCalled = true },
    insertHistory: async () => { changeStatusCalled = true },
  }
  const service = createPeticionesService({ repo })
  await assert.rejects(
    () => service.changeStatus(admin, { centroId: 10, id: 4, estado: 'Aprobado' }),
    /Selecciona la cotización aprobada/
  )
  assert.equal(changeStatusCalled, false)
})

test('Aprobado rechaza una cotización que no pertenece o no es válida en la petición', async () => {
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, tipo: 'peticion', estado: 'Próximo trimestre', submitted_at: '2026-08-21T12:00:00Z' }),
    listQuotes: async () => [{ id: 91, upload_status: 'valid' }, { id: 92, upload_status: 'invalid' }],
    changeStatus: async () => { throw new Error('no debe llamarse') },
  }
  const service = createPeticionesService({ repo })
  await assert.rejects(
    () => service.changeStatus(admin, { centroId: 10, id: 4, estado: 'Aprobado', cotizacionAprobadaId: 92 }),
    /no es válida/
  )
  await assert.rejects(
    () => service.changeStatus(admin, { centroId: 10, id: 4, estado: 'Aprobado', cotizacionAprobadaId: 999 }),
    /no es válida/
  )
})

test('Aprobado con cotización válida guarda el id y notifica al centro', async () => {
  const quote = { id: 91, upload_status: 'valid', proveedor_razon_social: 'Proveedor Uno' }
  let changeStatusArgs = null
  const notifyCalls = []
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, tipo: 'peticion', estado: 'Próximo trimestre', submitted_at: '2026-08-21T12:00:00Z' }),
    listQuotes: async () => [quote, { id: 92, upload_status: 'invalid' }],
    changeStatus: async (_query, row) => { changeStatusArgs = row; return { ...row, id: 4 } },
    insertHistory: async () => {},
  }
  const service = createPeticionesService({ repo, notifyDecision: async (payload) => { notifyCalls.push(payload) } })
  const result = await service.changeStatus(admin, { centroId: 10, id: 4, estado: 'Aprobado', cotizacionAprobadaId: 91 })
  assert.equal(result.ok, true)
  assert.equal(changeStatusArgs.cotizacion_aprobada_id, 91)
  assert.equal(notifyCalls.length, 1)
  assert.equal(notifyCalls[0].estado, 'Aprobado')
  assert.equal(notifyCalls[0].cotizacionAprobada.id, 91)
})

test('Negado notifica al centro sin exigir selección de cotización', async () => {
  const notifyCalls = []
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, tipo: 'peticion', estado: 'Próximo trimestre', submitted_at: '2026-08-21T12:00:00Z' }),
    changeStatus: async (_query, row) => ({ ...row, id: 4 }),
    insertHistory: async () => {},
  }
  const service = createPeticionesService({ repo, notifyDecision: async (payload) => { notifyCalls.push(payload) } })
  await service.changeStatus(admin, { centroId: 10, id: 4, estado: 'Negado' })
  assert.equal(notifyCalls.length, 1)
  assert.equal(notifyCalls[0].estado, 'Negado')
  assert.equal(notifyCalls[0].cotizacionAprobada, null)
})

test('un estado que no cambia no dispara notificación', async () => {
  const notifyCalls = []
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, tipo: 'peticion', estado: 'Aprobado', submitted_at: '2026-08-21T12:00:00Z' }),
  }
  const service = createPeticionesService({ repo, notifyDecision: async (payload) => { notifyCalls.push(payload) } })
  const result = await service.changeStatus(admin, { centroId: 10, id: 4, estado: 'Aprobado', cotizacionAprobadaId: 91 })
  assert.equal(result.unchanged, true)
  assert.equal(notifyCalls.length, 0)
})

test('si notifyDecision falla el resultado igual es exitoso', async () => {
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, tipo: 'comentario', estado: 'Próximo trimestre', submitted_at: '2026-08-21T12:00:00Z' }),
    changeStatus: async (_query, row) => ({ ...row, id: 4 }),
    insertHistory: async () => {},
  }
  const originalError = console.error
  const errors = []
  console.error = (...args) => errors.push(args)
  try {
    const service = createPeticionesService({ repo, notifyDecision: async () => { throw new Error('smtp caído') } })
    const result = await service.changeStatus(admin, { centroId: 10, id: 4, estado: 'Negado' })
    assert.equal(result.ok, true)
    assert.equal(errors.length, 1)
    assert.equal(errors[0][0], '[peticiones-notify]')
  } finally {
    console.error = originalError
  }
})

test('un registro legado puede aprobarse sin seleccionar cotización', async () => {
  const notifyCalls = []
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 5, centro_id: 10, tipo: 'legado', estado: 'Próximo trimestre', submitted_at: '2026-08-21T12:00:00Z' }),
    changeStatus: async (_query, row) => ({ ...row, id: 5 }),
    insertHistory: async () => {},
    listQuotes: async () => { throw new Error('no debe leer cotizaciones para un registro que no es petición') },
  }
  const service = createPeticionesService({ repo, notifyDecision: async (payload) => { notifyCalls.push(payload) } })
  const result = await service.changeStatus(admin, { centroId: 10, id: 5, estado: 'Aprobado' })
  assert.equal(result.ok, true)
  assert.equal(notifyCalls.length, 1)
  assert.equal(notifyCalls[0].cotizacionAprobada, null)
})

test('descartar borrador encola cada ruta antes de borrar filas', async () => {
  const order = []
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, created_by: 8, submitted_at: null }),
    listQuotes: async () => [{ blob_pathname: 'peticiones/4/a.pdf', expected_pathname: 'peticiones/4/b.pdf' }],
    enqueueCleanup: async (_query, row) => { order.push(`queue:${row.blob_pathname}`) },
    deleteDraftQuotes: async () => { order.push('delete:quotes') },
    deleteDraft: async () => { order.push('delete:draft') },
  }
  await createPeticionesService({ repo }).discardDraft(centerUser, { centroId: 10, id: 4 })
  assert.deepEqual(order, ['queue:peticiones/4/a.pdf', 'queue:peticiones/4/b.pdf', 'delete:quotes', 'delete:draft'])
})
