import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('panel separa comentario y petición sin permisos desde localStorage', () => {
  const panel = read('../components/foda/PeticionesPanel.js')
  assert.match(panel, /Comentario/)
  assert.match(panel, /Petición/)
  assert.doesNotMatch(panel, /localStorage/)
})

test('tarjeta exige proveedor fiscal, certificaciones y PDF', () => {
  const card = read('../components/foda/CotizacionCard.js')
  for (const token of ['proveedorRazonSocial', 'proveedorPais', 'proveedorIdFiscal', 'empresaConstituida', 'emiteFacturaFiscal', 'application/pdf']) {
    assert.ok(card.includes(token), `falta ${token}`)
  }
  assert.match(card, /onUploadProgress/)
  assert.match(card, /getCotizacionUploadStatus/)
  assert.match(card, /discardCotizacionAttempt/)
  assert.match(card, /ISO_COUNTRY_CODES/)
  assert.match(card, /Intl\.DisplayNames/)
  assert.match(card, /<select[^>]+name="proveedorPais"/)
  assert.ok(card.indexOf('setCotizacionId(prepared.cotizacionId)') < card.indexOf('await upload('))
})

test('sin Blob se bloquea solo la creación documental y se explica la causa', () => {
  const panel = read('../components/foda/PeticionesPanel.js')
  const form = read('../components/foda/PeticionDraftForm.js')
  const list = read('../components/foda/PeticionesList.js')
  assert.match(panel, /uploadsAvailable/)
  assert.match(form, /uploadsAvailable/)
  assert.match(form, /Carga de cotizaciones no disponible/)
  assert.match(form, /const documentFormDisabled = !uploadsAvailable \|\| busy/)
  assert.match(form, /<fieldset[^>]*disabled=\{documentFormDisabled\}/)
  assert.match(list, /uploadsAvailable/)
})

test('lista marca legacy, descarga por id y no muestra borrado físico', () => {
  const list = read('../components/foda/PeticionesList.js')
  assert.match(list, /Anterior · sin requisitos documentales/)
  assert.match(list, /\/api\/peticiones\/cotizaciones\/\$\{quote\.id\}\/download/)
  assert.doesNotMatch(list, /deletePeticion/)
})

test('aprobar exige elegir la cotización ganadora y muestra la ya aprobada', () => {
  const list = read('../components/foda/PeticionesList.js')
  assert.match(list, /cotizacionAprobada/)
  assert.match(list, /Cotización aprobada:/)
  assert.match(list, /Selecciona la cotización aprobada/)
})

test('gerencia elimina definitivamente con confirmación, y una petición formal exige estar Anulada', () => {
  const list = read('../components/foda/PeticionesList.js')
  assert.match(list, /eliminarPeticion/)
  assert.match(list, /Eliminar definitivamente/)
  assert.match(list, /confirm\(/)
  assert.match(
    list,
    /estado === 'Anulada'[\s\S]{0,400}Eliminar definitivamente|Eliminar definitivamente[\s\S]{0,400}estado === 'Anulada'/
  )
})

test('página FODA delega el panel y retira CRUD anterior', () => {
  const page = read('../app/centro/[id]/foda/page.js')
  assert.match(page, /<PeticionesPanel/)
  assert.doesNotMatch(page, /addPeticion|updatePeticion|deletePeticion/)
})
