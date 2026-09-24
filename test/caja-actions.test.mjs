import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { CLASES, CLASES_FUERA_DE_CURVA, clasificar } from '../lib/caja/reglas.mjs'

// Corre la Server Action real sustituyendo solo sus fronteras de E/S.
function acciones(dependencies) {
  const source = readFileSync(new URL('../app/actions/caja.js', import.meta.url), 'utf8')
    .replace(/^'use server'$/m, '')
    .replace(/^import[\s\S]*?from .*$/gm, '')
    .replace(/export /g, '')
  return vm.runInNewContext(`${source}\n;({ guardarCompromiso })`, {
    CLASES, CLASES_FUERA_DE_CURVA, clasificar, ...dependencies,
  })
}

const BASE = { empresa: 'altavia', concepto: 'Pago', monto: 100, frecuencia: 'mensual', dia: 5 }

test('guardarCompromiso rechaza la clase dueno: la separación del dueño es automática', async () => {
  let escrituras = 0
  const { guardarCompromiso } = acciones({
    requireCurrentCaja: async () => ({ id: 1 }),
    guardarCompromisoRepo: async () => { escrituras++; return 9 },
  })
  const r = await guardarCompromiso({ ...BASE, clase: 'dueno' })
  assert.equal(r.error, 'La separación del dueño es automática: no se programa como pago.')
  assert.equal(escrituras, 0)
  assert.equal((await guardarCompromiso({ ...BASE, clase: 'linea' })).id, 9, 'el pago de la línea sí se programa')
  assert.equal((await guardarCompromiso({ ...BASE, clase: 'planilla' })).id, 9)
  assert.equal(escrituras, 2)
})
