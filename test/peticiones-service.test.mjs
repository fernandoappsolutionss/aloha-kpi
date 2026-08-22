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

test('Negado notifica al centro sin exigir selección de cotización y limpia la ganadora guardada', async () => {
  const notifyCalls = []
  let changeStatusArgs = null
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, tipo: 'peticion', estado: 'Aprobado', cotizacion_aprobada_id: 91, submitted_at: '2026-08-21T12:00:00Z' }),
    changeStatus: async (_query, row) => { changeStatusArgs = row; return { ...row, id: 4 } },
    insertHistory: async () => {},
  }
  const service = createPeticionesService({ repo, notifyDecision: async (payload) => { notifyCalls.push(payload) } })
  await service.changeStatus(admin, { centroId: 10, id: 4, estado: 'Negado' })
  assert.equal(changeStatusArgs.cotizacion_aprobada_id, null)
  assert.equal(notifyCalls.length, 1)
  assert.equal(notifyCalls[0].estado, 'Negado')
  assert.equal(notifyCalls[0].cotizacionAprobada, null)
})

test('un estado que no cambia no dispara notificación (fuera de Aprobado)', async () => {
  const notifyCalls = []
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, tipo: 'peticion', estado: 'Cumplido', submitted_at: '2026-08-21T12:00:00Z' }),
  }
  const service = createPeticionesService({ repo, notifyDecision: async (payload) => { notifyCalls.push(payload) } })
  const result = await service.changeStatus(admin, { centroId: 10, id: 4, estado: 'Cumplido' })
  assert.equal(result.unchanged, true)
  assert.equal(notifyCalls.length, 0)
})

test('Aprobado sobre una petición ya aprobada permite corregir/backfillear la cotización ganadora', async () => {
  const newQuote = { id: 95, upload_status: 'valid', proveedor_razon_social: 'Proveedor Nuevo' }
  let setApprovedArgs = null
  let historyInserted = false
  const notifyCalls = []
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({
      id: 4, centro_id: 10, tipo: 'peticion', estado: 'Aprobado', cotizacion_aprobada_id: 91,
      submitted_at: '2026-08-21T12:00:00Z',
    }),
    listQuotes: async () => [{ id: 91, upload_status: 'valid' }, newQuote],
    setApprovedQuote: async (_query, args) => { setApprovedArgs = args; return { id: 4, cotizacion_aprobada_id: args.cotizacionAprobadaId } },
    insertHistory: async () => { historyInserted = true },
  }
  const service = createPeticionesService({ repo, notifyDecision: async (payload) => { notifyCalls.push(payload) } })
  const result = await service.changeStatus(admin, { centroId: 10, id: 4, estado: 'Aprobado', cotizacionAprobadaId: 95 })
  assert.equal(result.ok, true)
  assert.equal(setApprovedArgs.cotizacionAprobadaId, 95)
  assert.equal(historyInserted, false)
  assert.equal(notifyCalls.length, 1)
  assert.equal(notifyCalls[0].estado, 'Aprobado')
  assert.equal(notifyCalls[0].cotizacionAprobada.id, 95)
})

test('backfillear una petición Aprobada sin ganadora guardada también corrige', async () => {
  const newQuote = { id: 95, upload_status: 'valid', proveedor_razon_social: 'Proveedor Nuevo' }
  let setApprovedArgs = null
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({
      id: 4, centro_id: 10, tipo: 'peticion', estado: 'Aprobado', cotizacion_aprobada_id: null,
      submitted_at: '2026-08-21T12:00:00Z',
    }),
    listQuotes: async () => [newQuote],
    setApprovedQuote: async (_query, args) => { setApprovedArgs = args; return { id: 4, cotizacion_aprobada_id: args.cotizacionAprobadaId } },
  }
  const service = createPeticionesService({ repo })
  const result = await service.changeStatus(admin, { centroId: 10, id: 4, estado: 'Aprobado', cotizacionAprobadaId: 95 })
  assert.equal(result.ok, true)
  assert.equal(setApprovedArgs.cotizacionAprobadaId, 95)
})

test('reelegir la misma cotización o no enviar ninguna deja una petición Aprobada intacta', async () => {
  let touched = false
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({
      id: 4, centro_id: 10, tipo: 'peticion', estado: 'Aprobado', cotizacion_aprobada_id: 91,
      submitted_at: '2026-08-21T12:00:00Z',
    }),
    setApprovedQuote: async () => { touched = true },
    changeStatus: async () => { touched = true },
    insertHistory: async () => { touched = true },
  }
  const notifyCalls = []
  const service = createPeticionesService({ repo, notifyDecision: async (payload) => notifyCalls.push(payload) })
  const sameId = await service.changeStatus(admin, { centroId: 10, id: 4, estado: 'Aprobado', cotizacionAprobadaId: 91 })
  assert.equal(sameId.unchanged, true)
  const noneProvided = await service.changeStatus(admin, { centroId: 10, id: 4, estado: 'Aprobado' })
  assert.equal(noneProvided.unchanged, true)
  assert.equal(touched, false)
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

test('eliminarPeticion rechaza a quien no es gerencia y no toca el repo', async () => {
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => { throw new Error('no debe bloquear la fila') },
    listQuotes: async () => { throw new Error('no debe leer cotizaciones') },
    enqueueCleanup: async () => { throw new Error('no debe encolar limpieza') },
    deleteDraftQuotes: async () => { throw new Error('no debe borrar cotizaciones') },
    deleteHistorial: async () => { throw new Error('no debe borrar historial') },
    deletePeticionRow: async () => { throw new Error('no debe borrar la fila') },
  }
  const service = createPeticionesService({ repo })
  await assert.rejects(
    () => service.eliminarPeticion(centerUser, { centroId: 10, id: 4 }),
    /No autorizado/
  )
})

test('una petición formal enviada y no anulada no puede eliminarse', async () => {
  let writes = 0
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({
      id: 4, centro_id: 10, tipo: 'peticion', estado: 'En proceso', submitted_at: '2026-08-21T12:00:00Z',
    }),
    listQuotes: async () => { writes++; return [] },
    enqueueCleanup: async () => { writes++ },
    deleteDraftQuotes: async () => { writes++ },
    deleteHistorial: async () => { writes++ },
    deletePeticionRow: async () => { writes++ },
  }
  const service = createPeticionesService({ repo })
  await assert.rejects(
    () => service.eliminarPeticion(admin, { centroId: 10, id: 4 }),
    /Anula la petición antes de eliminarla/
  )
  assert.equal(writes, 0)
})

test('una petición formal Anulada se elimina encolando ambos blobs antes de borrar', async () => {
  const order = []
  const quotes = [
    { id: 91, blob_pathname: 'peticiones/4/a.pdf', expected_pathname: 'peticiones/4/a.pdf' },
    { id: 92, blob_pathname: 'peticiones/4/b.pdf', expected_pathname: 'peticiones/4/b.pdf' },
  ]
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({
      id: 4, centro_id: 10, tipo: 'peticion', estado: 'Anulada', submitted_at: '2026-08-21T12:00:00Z',
    }),
    listQuotes: async () => quotes,
    enqueueCleanup: async (_query, row) => { order.push(`queue:${row.blob_pathname}`) },
    deleteDraftQuotes: async () => { order.push('delete:quotes') },
    deleteHistorial: async () => { order.push('delete:historial') },
    deletePeticionRow: async () => { order.push('delete:row') },
  }
  const result = await createPeticionesService({ repo }).eliminarPeticion(admin, { centroId: 10, id: 4 })
  assert.equal(result.ok, true)
  assert.deepEqual(order, [
    'queue:peticiones/4/a.pdf', 'queue:peticiones/4/b.pdf',
    'delete:quotes', 'delete:historial', 'delete:row',
  ])
})

test('un comentario se elimina directo, sin exigir anulación, historial antes que la fila', async () => {
  const order = []
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({
      id: 6, centro_id: 10, tipo: 'comentario', estado: 'Próximo trimestre', submitted_at: '2026-08-21T12:00:00Z',
    }),
    listQuotes: async () => [],
    enqueueCleanup: async () => { throw new Error('no hay cotizaciones que encolar') },
    deleteDraftQuotes: async () => { order.push('delete:quotes') },
    deleteHistorial: async () => { order.push('delete:historial') },
    deletePeticionRow: async () => { order.push('delete:row') },
  }
  const result = await createPeticionesService({ repo }).eliminarPeticion(admin, { centroId: 10, id: 6 })
  assert.equal(result.ok, true)
  assert.deepEqual(order, ['delete:quotes', 'delete:historial', 'delete:row'])
})

test('un registro legado se elimina directo, sin cotizaciones que encolar', async () => {
  const order = []
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({
      id: 7, centro_id: 10, tipo: 'legado', estado: 'Próximo trimestre', submitted_at: '2026-08-21T12:00:00Z',
    }),
    listQuotes: async () => [],
    enqueueCleanup: async () => { throw new Error('no hay cotizaciones que encolar') },
    deleteDraftQuotes: async () => { order.push('delete:quotes') },
    deleteHistorial: async () => { order.push('delete:historial') },
    deletePeticionRow: async () => { order.push('delete:row') },
  }
  const result = await createPeticionesService({ repo }).eliminarPeticion(admin, { centroId: 10, id: 7 })
  assert.equal(result.ok, true)
  assert.deepEqual(order, ['delete:quotes', 'delete:historial', 'delete:row'])
})
