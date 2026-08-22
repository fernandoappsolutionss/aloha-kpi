import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createPeticionUploadService } from '../lib/peticion-upload-service.mjs'

const actor = { id: 8, nombre: 'Centro', email: 'c@aloha.com', rol: 'administradora', centro_id: 10, password_hash: 'hash' }

test('prepare genera pathname servidor, nonce y consume un intento', async () => {
  let renewedDraft = null
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, created_by: 8, submitted_at: null, estado: 'Próximo trimestre' }),
    countQuotes: async () => 2,
    prepareQuote: async (_query, row) => ({ id: 9, ...row }),
    touchDraft: async (_query, row) => { renewedDraft = row },
  }
  const ids = ['nonce-1', 'path-1']
  const service = createPeticionUploadService({ repo, uuid: () => ids.shift(), now: () => new Date('2026-08-21T12:00:00Z') })
  const result = await service.prepare(actor, {
    centroId: 10, peticionId: 4, archivoNombre: 'cotizacion.pdf',
    proveedorRazonSocial: 'Proveedor Uno', proveedorPais: 'PA', proveedorIdFiscal: '155-1',
    empresaConstituida: true, emiteFacturaFiscal: true,
  })
  assert.deepEqual(result, { cotizacionId: 9, pathname: 'peticiones/4/path-1.pdf', nonce: 'nonce-1', attempt: 1 })
  assert.deepEqual(renewedDraft, { id: 4, draft_expires_at: '2026-09-20T12:00:00.000Z' })
})

test('una cotización nueva fallida puede reintentar después del envío', async () => {
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, created_by: 8, submitted_at: '2026-08-20T12:00:00Z', estado: 'En proceso' }),
    lockQuote: async () => ({ id: 9, peticion_id: 4, upload_status: 'invalid', upload_attempts: 1, expected_pathname: 'peticiones/4/viejo.pdf' }),
    prepareQuote: async (_query, row) => ({ id: 9, ...row }),
    enqueueCleanup: async () => {},
  }
  const ids = ['nonce-2', 'path-2']
  const service = createPeticionUploadService({ repo, uuid: () => ids.shift() })
  const result = await service.prepare(actor, {
    centroId: 10, peticionId: 4, cotizacionId: 9, archivoNombre: 'cotizacion.pdf',
    proveedorRazonSocial: 'Proveedor Uno', proveedorPais: 'PA', proveedorIdFiscal: '155-1',
    empresaConstituida: true, emiteFacturaFiscal: true,
  })
  assert.equal(result.attempt, 2)
  assert.equal(result.cotizacionId, 9)
})

test('prepare no renueva un borrador que ya venció', async () => {
  let prepared = false
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({
      id: 4, centro_id: 10, created_by: 8, submitted_at: null, estado: 'Próximo trimestre',
      draft_expires_at: '2026-08-20T12:00:00Z',
    }),
    prepareQuote: async () => { prepared = true },
  }
  const service = createPeticionUploadService({ repo, now: () => new Date('2026-08-21T12:00:00Z') })
  await assert.rejects(() => service.prepare(actor, {
    centroId: 10, peticionId: 4, archivoNombre: 'cotizacion.pdf', proveedorRazonSocial: 'Proveedor Uno',
    proveedorPais: 'PA', proveedorIdFiscal: '155-1', empresaConstituida: true, emiteFacturaFiscal: true,
  }), /borrador venció/i)
  assert.equal(prepared, false)
})

test('prepare rechaza un código de país ficticio aunque tenga dos letras', async () => {
  let prepared = false
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, created_by: 8, submitted_at: null, estado: 'Próximo trimestre' }),
    countQuotes: async () => 0,
    prepareQuote: async () => { prepared = true },
  }
  const service = createPeticionUploadService({ repo })
  await assert.rejects(() => service.prepare(actor, {
    centroId: 10, peticionId: 4, archivoNombre: 'cotizacion.pdf', proveedorRazonSocial: 'Proveedor Uno',
    proveedorPais: 'ZZ', proveedorIdFiscal: '155-1', empresaConstituida: true, emiteFacturaFiscal: true,
  }), /país ISO válido/i)
  assert.equal(prepared, false)
})

test('un intento no válido se puede retirar sin borrar una cotización válida', async () => {
  const events = []
  const quote = { id: 9, peticion_id: 4, upload_status: 'invalid', expected_pathname: 'peticiones/4/fallo.pdf' }
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, created_by: 8, submitted_at: null, estado: 'Próximo trimestre' }),
    lockQuote: async () => quote,
    enqueueCleanup: async (_query, row) => { events.push(`queue:${row.blob_pathname}`) },
    deleteQuoteAttempt: async () => { events.push('delete:attempt') },
  }
  const service = createPeticionUploadService({ repo })
  const result = await service.discardAttempt(actor, { centroId: 10, peticionId: 4, cotizacionId: 9 })
  assert.equal(result.ok, true)
  assert.deepEqual(events, ['queue:peticiones/4/fallo.pdf', 'delete:attempt'])
  quote.upload_status = 'valid'
  await assert.rejects(
    () => service.discardAttempt(actor, { centroId: 10, peticionId: 4, cotizacionId: 9 }),
    /cotización válida/
  )
})

test('token exige coincidencia exacta y limita tipo, tamaño y vencimiento', async () => {
  const repo = { getUploadAttempt: async () => ({ id: 9, peticion_id: 4, centro_id: 10, created_by: 8, submitted_at: null, upload_nonce: 'n-1', expected_pathname: 'peticiones/4/n-1.pdf', upload_status: 'pending' }) }
  const service = createPeticionUploadService({ repo, now: () => new Date('2026-08-21T12:00:00Z') })
  const token = await service.authorizeToken(actor, { pathname: 'peticiones/4/n-1.pdf', cotizacionId: 9, nonce: 'n-1' })
  assert.deepEqual(token.allowedContentTypes, ['application/pdf'])
  assert.equal(token.maximumSizeInBytes, 10485760)
  assert.equal(token.addRandomSuffix, false)
  assert.equal(token.allowOverwrite, false)
  assert.equal(token.validUntil, Date.parse('2026-08-21T12:10:00Z'))
  await assert.rejects(() => service.authorizeToken(actor, { pathname: 'peticiones/otro.pdf', cotizacionId: 9, nonce: 'n-1' }), /Carga no autorizada/)
  await assert.rejects(() => service.authorizeToken({ ...actor, id: 99 }, { pathname: 'peticiones/4/n-1.pdf', cotizacionId: 9, nonce: 'n-1' }), /Carga no autorizada/)
})

test('la acción exige Blob configurado antes de crear un intento', () => {
  const source = readFileSync(new URL('../app/actions/peticiones.js', import.meta.url), 'utf8')
  const action = source.slice(source.indexOf('export async function prepareCotizacionUpload'))
  assert.ok(action.indexOf('requireBlobToken()') < action.indexOf('peticionUploadService.prepare'))
})

test('el adaptador solo inspecciona respuestas Blob 200 con stream', () => {
  const source = readFileSync(new URL('../lib/peticion-blob.js', import.meta.url), 'utf8')
  assert.match(source, /result\.statusCode !== 200/)
  assert.match(source, /!result\.stream/)
})

test('callback repetido es idempotente y callback obsoleto encola limpieza', async () => {
  const events = []
  const repo = {
    transaction: async (work) => work(repo),
    getCallbackContext: async (payload) => payload.nonce === 'vigente'
      ? { user_exists: true, user_password_hash: 'hash', user_centro_id: 10, user_rol: 'administradora', centro_id: 10, created_by: 8, submitted_at: null, id: 9, peticion_id: 4, upload_nonce: 'vigente', expected_pathname: 'peticiones/4/a.pdf', upload_status: 'valid' }
      : { user_exists: true, user_password_hash: 'hash', user_centro_id: 10, user_rol: 'administradora', centro_id: 10, created_by: 8, submitted_at: null, id: 9, peticion_id: 4, upload_nonce: 'nuevo', expected_pathname: 'peticiones/4/nuevo.pdf', upload_status: 'pending' },
    markValidating: async () => false,
    enqueueCleanup: async (_query, row) => { events.push(row) },
  }
  const blob = { pathname: 'peticiones/4/a.pdf', contentType: 'application/pdf' }
  const service = createPeticionUploadService({ repo, blob: { inspect: async () => ({ bytes: 10, sha256: 'a'.repeat(64) }) } })
  assert.equal((await service.complete({ blob, tokenPayload: JSON.stringify({ v: 1, uid: 8, peticionId: 4, cotizacionId: 9, nonce: 'vigente', pathname: blob.pathname }) })).idempotent, true)
  await service.complete({ blob, tokenPayload: JSON.stringify({ v: 1, uid: 8, peticionId: 4, cotizacionId: 9, nonce: 'viejo', pathname: blob.pathname }) })
  assert.deepEqual(events.map((row) => row.motivo), ['stale_callback'])
})

test('dos callbacks vigentes pueden observar validating sin borrar el PDF activo', async () => {
  const cleanup = []
  const valid = []
  const context = {
    user_exists: true, user_password_hash: 'hash', user_centro_id: 10, user_rol: 'administradora',
    centro_id: 10, created_by: 8, submitted_at: null, id: 9, peticion_id: 4, upload_nonce: 'vigente',
    expected_pathname: 'peticiones/4/a.pdf', upload_status: 'validating',
  }
  const repo = {
    transaction: async (work) => work(repo),
    getCallbackContext: async () => context,
    lockPeticion: async () => ({ id: 4, submitted_at: null, estado: 'Próximo trimestre' }),
    markValid: async (_query, row) => { valid.push(row); return row },
    enqueueCleanup: async (_query, row) => { cleanup.push(row) },
  }
  const uploaded = { pathname: context.expected_pathname, contentType: 'application/pdf' }
  const service = createPeticionUploadService({ repo, blob: { inspect: async () => ({ bytes: 10, sha256: 'a'.repeat(64) }) } })
  const result = await service.complete({
    blob: uploaded,
    tokenPayload: JSON.stringify({ v: 1, uid: 8, peticionId: 4, cotizacionId: 9, nonce: 'vigente', pathname: uploaded.pathname }),
  })
  assert.equal(result.valid, true)
  assert.equal(valid.length, 1)
  assert.deepEqual(cleanup, [])
})

test('degradar al emisor revoca un callback sobre borrador ajeno', async () => {
  const events = []
  const context = {
    user_exists: true, user_password_hash: 'hash', user_centro_id: 10, user_rol: 'administradora',
    centro_id: 10, created_by: 7, submitted_at: null, estado: 'Próximo trimestre', id: 9, peticion_id: 4,
    upload_nonce: 'vigente', expected_pathname: 'peticiones/4/a.pdf', upload_status: 'pending',
  }
  const repo = {
    transaction: async (work) => work(repo),
    getCallbackContext: async () => context,
    markInvalid: async () => { events.push('invalid'); return { id: 9 } },
    enqueueCleanup: async (_query, row) => { events.push(row.motivo) },
  }
  const uploaded = { pathname: context.expected_pathname, contentType: 'application/pdf' }
  const result = await createPeticionUploadService({ repo, blob: { inspect: async () => { throw new Error('no debe inspeccionar') } } })
    .complete({ blob: uploaded, tokenPayload: JSON.stringify({ v: 1, uid: 8, peticionId: 4, cotizacionId: 9, nonce: 'vigente', pathname: uploaded.pathname }) })
  assert.equal(result.invalid, true)
  assert.deepEqual(events, ['invalid', 'revoked_access'])
})

test('invalidación que pierde contra validación no encola el PDF activo', async () => {
  const cleanup = []
  let reads = 0
  const context = {
    user_exists: false, user_password_hash: null, centro_id: 10, created_by: 8, submitted_at: null,
    id: 9, peticion_id: 4, upload_nonce: 'vigente', expected_pathname: 'peticiones/4/a.pdf', upload_status: 'pending',
  }
  const repo = {
    transaction: async (work) => work(repo),
    getCallbackContext: async () => ++reads === 1
      ? context
      : { ...context, user_exists: true, user_password_hash: 'hash', user_centro_id: 10, user_rol: 'administradora', upload_status: 'valid' },
    markInvalid: async () => null,
    enqueueCleanup: async (_query, row) => { cleanup.push(row) },
  }
  const uploaded = { pathname: context.expected_pathname, contentType: 'application/pdf' }
  const result = await createPeticionUploadService({ repo, blob: { inspect: async () => ({ bytes: 10, sha256: 'a'.repeat(64) }) } })
    .complete({ blob: uploaded, tokenPayload: JSON.stringify({ v: 1, uid: 8, peticionId: 4, cotizacionId: 9, nonce: 'vigente', pathname: uploaded.pathname }) })
  assert.equal(result.idempotent, true)
  assert.deepEqual(cleanup, [])
})

test('un estado terminal posterior al token invalida y limpia la carga', async () => {
  const events = []
  const context = {
    user_exists: true, user_password_hash: 'hash', user_centro_id: 10, user_rol: 'administradora',
    centro_id: 10, id: 9, peticion_id: 4, submitted_at: '2026-08-20T12:00:00Z', estado: 'Cumplido',
    upload_nonce: 'vigente', expected_pathname: 'peticiones/4/a.pdf', upload_status: 'pending',
  }
  const repo = {
    transaction: async (work) => work(repo),
    getCallbackContext: async () => context,
    markInvalid: async () => { events.push('invalid'); return { id: 9 } },
    enqueueCleanup: async (_query, row) => { events.push(row.motivo) },
  }
  const uploaded = { pathname: context.expected_pathname, contentType: 'application/pdf' }
  const result = await createPeticionUploadService({ repo, blob: { inspect: async () => { throw new Error('no debe inspeccionar') } } })
    .complete({ blob: uploaded, tokenPayload: JSON.stringify({ v: 1, uid: 8, peticionId: 4, cotizacionId: 9, nonce: 'vigente', pathname: uploaded.pathname }) })
  assert.equal(result.invalid, true)
  assert.deepEqual(events, ['invalid', 'terminal_state'])
})
