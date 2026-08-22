import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../app/actions/peticiones.js', import.meta.url), 'utf8')
test('acciones usan auth fresca y no exponen borrado físico', () => {
  assert.match(source, /requireCurrentCentroAccess/)
  assert.match(source, /requireCurrentAdmin/)
  for (const name of ['listPeticiones', 'createComentario', 'createPeticionDraft', 'submitPeticion', 'changePeticionStatus']) {
    assert.match(source, new RegExp(`export async function ${name}\\b`))
  }
  assert.doesNotMatch(source, /DELETE FROM peticiones/)
  assert.doesNotMatch(source, /export (async function|const) deletePeticion/)
})
