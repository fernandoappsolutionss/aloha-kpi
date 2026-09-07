import test from 'node:test'
import assert from 'node:assert/strict'
import { validateSubmission } from '../lib/peticiones-domain.mjs'
import { createPeticionesService } from '../lib/peticiones-service.mjs'
import { createPeticionUploadService } from '../lib/peticion-upload-service.mjs'
import { decisionEmail } from '../lib/peticion-notificaciones.mjs'

const autora = { id: 8, rol: 'administradora', centro_id: 10 }
const coordinador = { id: 2, rol: 'coordinador', centros: [10] }
const datos = { texto: 'Reparar aire acondicionado', categoria: 'reparacion', proveedor_preaprobado: true, proveedor_preaprobado_nombre: '  Servicios del Istmo  ' }
function fixture(overrides = {}) {
  let row = { id: 4, centro_id: 10, created_by: 8, tipo: 'peticion', estado: 'Próximo trimestre', submitted_at: null, ...datos, ...overrides }
  const history = [], notifications = [], quotes = []
  const repo = {
    transaction: async fn => fn(repo),
    lockPeticion: async () => row,
    insertDraft: async (_, data) => (row = { id: 4, ...data }),
    updateDraft: async (_, data) => (row = { ...row, ...data }),
    markSubmitted: async (_, data) => (row = { ...row, ...data }),
    changeStatus: async (_, data) => (row = { ...row, ...data }),
    listQuotes: async () => quotes,
    listSubmitted: async () => [row], listDrafts: async () => [],
    insertHistory: async (_, event) => history.push(event),
  }
  const service = createPeticionesService({ repo, notifyDecision: async value => notifications.push(value) })
  return { repo, service, history, notifications, quotes }
}

test('proveedor preaprobado permite enviar solo con su nombre, categoría y descripción', () => {
  assert.deepEqual(validateSubmission(datos), [])
  assert.ok(validateSubmission({ ...datos, proveedor_preaprobado_nombre: '  ' }).includes('nombre_proveedor_requerido'))
  assert.ok(validateSubmission({ ...datos, proveedor_preaprobado_nombre: 'a'.repeat(201) }).includes('nombre_proveedor_invalido'))
  assert.ok(validateSubmission({ ...datos, texto: '' }).includes('texto_requerido'))
  assert.ok(validateSubmission({ ...datos, categoria: '' }).includes('categoria_invalida'))
})

test('un nombre aislado o un booleano falsificado no eximen las tres cotizaciones', () => {
  for (const value of [false, undefined, 'true', 'false', 1]) {
    assert.ok(validateSubmission({ ...datos, proveedor_preaprobado: value }).includes('minimo_tres'))
  }
})

test('guardar y continuar conserva modalidad y nombre normalizado', async () => {
  const { service } = fixture()
  const created = await service.createDraft(autora, { ...datos, centroId: 10, anio: 2026, trimestre: 3 })
  assert.equal(created.draft.proveedor_preaprobado, true)
  assert.equal(created.draft.proveedor_preaprobado_nombre, 'Servicios del Istmo')
  const updated = await service.updateDraft(autora, { ...datos, centroId: 10, id: 4, proveedor_preaprobado_nombre: '  Otro servicio  ' })
  assert.equal(updated.draft.proveedor_preaprobado_nombre, 'Otro servicio')
})

test('envío sin PDFs queda pendiente, con historial e idempotencia', async () => {
  const { service, history, notifications } = fixture()
  const first = await service.submitPeticion(autora, { centroId: 10, id: 4 })
  assert.ok(first.peticion.submitted_at)
  assert.equal(first.peticion.estado, 'Próximo trimestre')
  assert.equal((await service.submitPeticion(autora, { centroId: 10, id: 4 })).alreadySubmitted, true)
  assert.equal(history.length, 1)
  assert.equal(notifications.length, 0)
})

test('servidor rechaza enviar sin nombre aunque se omita validación del formulario', async () => {
  const { service, history } = fixture({ proveedor_preaprobado_nombre: '' })
  await assert.rejects(service.submitPeticion(autora, { centroId: 10, id: 4 }), /nombre del proveedor/i)
  assert.equal(history.length, 0)
})

test('coordinador asignado aprueba sin cotización y conserva proveedor e historial', async () => {
  const { service, history, notifications } = fixture({ submitted_at: '2026-09-07' })
  const result = await service.changeStatus(coordinador, { centroId: 10, id: 4, estado: 'Aprobado' })
  assert.equal(result.peticion.estado, 'Aprobado')
  assert.equal(result.peticion.cotizacion_aprobada_id, null)
  assert.equal(history[0].changed_by, coordinador.id)
  assert.equal(notifications[0].peticion.proveedor_preaprobado, true)
})

test('ni administradora ni coordinador ajeno aprueban; coordinador no elimina', async () => {
  const { service } = fixture({ submitted_at: '2026-09-07' })
  for (const actor of [autora, { ...coordinador, centros: [11] }]) {
    await assert.rejects(service.changeStatus(actor, { centroId: 10, id: 4, estado: 'Aprobado' }), /autorizado/i)
  }
  await assert.rejects(service.eliminarPeticion(coordinador, { centroId: 10, id: 4 }), /autorizado/i)
})

test('panel permite decidir solo en centros asignados, sin otorgar borrado', async () => {
  const { service } = fixture({ submitted_at: '2026-09-07' })
  const panel = await service.listPanel(coordinador, { centroId: 10 })
  assert.equal(panel.permissions.canChangeStatus, true)
  assert.equal(panel.permissions.canDelete, false)
  assert.equal(panel.items[0].canAddQuote, false)
  await assert.rejects(service.listPanel({ ...coordinador, centros: [11] }, { centroId: 10 }), /autorizado/i)
})

test('petición documental sigue exigiendo elegir una cotización válida al aprobar', async () => {
  const { service } = fixture({ submitted_at: '2026-09-07', proveedor_preaprobado: false, proveedor_preaprobado_nombre: null })
  await assert.rejects(service.changeStatus(coordinador, { centroId: 10, id: 4, estado: 'Aprobado' }), /Selecciona la cotización/)
})

test('cambiar a cotizaciones limpia el nombre y vuelve a exigir documentos', async () => {
  const { service } = fixture()
  const changed = await service.updateDraft(autora, { ...datos, centroId: 10, id: 4, proveedor_preaprobado: false })
  assert.equal(changed.draft.proveedor_preaprobado_nombre, null)
  await assert.rejects(service.submitPeticion(autora, { centroId: 10, id: 4 }), /tres cotizaciones/)
})

test('no cambia a proveedor preaprobado mientras existan cotizaciones o cargas pendientes', async () => {
  const { service, quotes } = fixture({ proveedor_preaprobado: false })
  quotes.push({ id: 1, upload_status: 'pending' })
  await assert.rejects(service.updateDraft(autora, { ...datos, centroId: 10, id: 4 }), /cotizaciones/i)
})

test('no se preparan cargas en peticiones con proveedor preaprobado', async () => {
  const { repo } = fixture()
  const upload = createPeticionUploadService({ repo, blob: {} })
  await assert.rejects(upload.prepare(autora, { centroId: 10, peticionId: 4 }), /proveedor aprobado/i)
})

test('correo de aprobación muestra nombre escapado del proveedor existente', () => {
  const result = decisionEmail({ peticion: { ...datos, centro_id: 10, proveedor_preaprobado_nombre: '<Proveedor>' }, estado: 'Aprobado', actor: coordinador, centroNombre: 'Centro', baseUrl: 'https://example.test' })
  assert.match(result.html, /Proveedor aprobado del centro/)
  assert.match(result.html, /&lt;Proveedor&gt;/)
  assert.doesNotMatch(result.html, /<Proveedor>/)
})
