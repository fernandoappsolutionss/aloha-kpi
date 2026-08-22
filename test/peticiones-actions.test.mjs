import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../app/actions/peticiones.js', import.meta.url), 'utf8')
test('acciones usan auth fresca y el borrado físico queda en gerencia', () => {
  assert.match(source, /requireCurrentCentroAccess/)
  assert.match(source, /requireCurrentAdmin/)
  for (const name of ['listPeticiones', 'createComentario', 'createPeticionDraft', 'submitPeticion', 'changePeticionStatus', 'eliminarPeticion']) {
    assert.match(source, new RegExp(`export async function ${name}\\b`))
  }
  // El SQL de borrado vive solo en el repositorio, nunca en la acción.
  assert.doesNotMatch(source, /DELETE FROM peticiones/)
  // No se expone un alias en inglés de la acción de borrado.
  assert.doesNotMatch(source, /export (async function|const) deletePeticion/)
  // eliminarPeticion está protegida por requireCurrentAdmin (no basta con
  // requireCurrentCentroAccess): se aísla el cuerpo de la función -desde su
  // firma hasta el siguiente "export "- y se exige la referencia ahí dentro.
  const start = source.indexOf('export async function eliminarPeticion')
  assert.ok(start >= 0, 'no se encontró eliminarPeticion')
  const nextExport = source.indexOf('export ', start + 1)
  const body = source.slice(start, nextExport === -1 ? source.length : nextExport)
  assert.match(body, /requireCurrentAdmin/)
})
