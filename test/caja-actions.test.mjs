import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { CLASES, CLASES_FUERA_DE_CURVA, clasificar } from '../lib/caja/reglas.mjs'
import * as semanas from '../lib/caja/semanas.mjs'
import * as curva from '../lib/caja/curva.mjs'
import { INGRESO_REFERENCIA } from '../lib/caja/semilla-datos.mjs'

// Corre la Server Action real sustituyendo solo sus fronteras de E/S.
function acciones(dependencies) {
  const source = readFileSync(new URL('../app/actions/caja.js', import.meta.url), 'utf8')
    .replace(/^'use server'$/m, '')
    .replace(/^import[\s\S]*?from .*$/gm, '')
    .replace(/export /g, '')
  return vm.runInNewContext(`${source}\n;({ guardarCompromiso, getCaja })`, {
    CLASES, CLASES_FUERA_DE_CURVA, clasificar, ...semanas, ...curva, INGRESO_REFERENCIA, ...dependencies,
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

test('getCaja sin historia de cobro proyecta con la referencia de Zoho y lo marca estimado', async () => {
  const cuenta = { id: 1, empresa: 'altavia', tipo: 'operativa', base: 1000, posterior: 0 }
  const { getCaja } = acciones({
    requireCurrentCaja: async () => ({ id: 1 }),
    hoyPanama: () => '2026-09-24',
    listarCuentas: async () => [cuenta, { ...cuenta, id: 2, empresa: 'ff' }],
    listarBaldes: async () => [],
    movimientosDesde: async () => [
      // F&F tiene agosto cerrado: usa lo propio.
      { cuenta_id: 2, fecha: '2026-08-03', monto: 500, clase: 'ingreso' },
    ],
    listarCompromisos: async () => [],
    listarAjustes: async () => [],
    porClasificar: async () => [],
  })
  const r = await getCaja()
  assert.equal(r.error, undefined)
  assert.equal(r.resumen.altavia.perfil.estimado, true)
  assert.equal(r.resumen.altavia.perfil.promedioMensual, 40646)
  assert.ok(r.curvas.altavia.semanas[1].ingresos > 0, 'la curva proyecta cobro de referencia')
  assert.equal(r.resumen.ff.perfil.estimado, false)
  assert.equal(r.resumen.ff.perfil.promedioMensual, 500)
})
