import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Hermanos del mismo fragmento con la misma key (key={empresa} en la curva y en
// los pagos) hacían que React acumulara curvas viejas al cambiar de empresa.
test('los componentes con key por empresa en la pantalla de caja usan keys distintas', () => {
  const src = readFileSync(new URL('../app/dashboard/caja/page.js', import.meta.url), 'utf8')
  const keys = [...src.matchAll(/<[A-Z]\w*\s+key=\{([^}]*)\}/g)].map((m) => m[1].trim())
  assert.ok(keys.length >= 2, 'la pantalla monta la curva y los pagos con key por empresa')
  assert.equal(new Set(keys).size, keys.length, `keys repetidas: ${keys.join(', ')}`)
})
