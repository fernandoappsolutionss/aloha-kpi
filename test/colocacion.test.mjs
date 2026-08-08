import test from 'node:test'
import assert from 'node:assert/strict'

import {
  AVISO_CERRADO_A_NUEVOS,
  aceptaNuevosEnSelector,
  colocacionInvalida,
  etiquetaGrupoSelector,
  fechaCortaEs,
  ordenarPorLimiteNuevos,
} from '../lib/colocacion.mjs'

// Fixture con la MISMA forma que devuelve listarGruposActivos.
const grupoSelector = (overrides = {}) => ({
  id: 7,
  numero: 3,
  itinerario: 'TINY',
  nivel: 1,
  inscripcionAbierta: true,
  fechaLimiteNuevos: '2026-10-07',
  cupos: 4,
  horarioTexto: 'lun 3:00–4:00 pm',
  ...overrides,
})

// --- colocacionInvalida (matriz replicada de lib/fusiones.js:130-148) ---

test('un niño Tiny NO entra a un grupo Kids (cualquier nivel)', () => {
  assert.match(colocacionInvalida({ itinerario: 'TINY', nivel: 9 }, 'KIDS'), /Tiny no entra a un grupo Kids/)
})

test('un KIDS menor a nivel 3 NO se une a un grupo Tiny', () => {
  assert.match(colocacionInvalida({ itinerario: 'KIDS', nivel: 2 }, 'TINY'), /menor a nivel 3/)
})

test('un KIDS nivel 3+ SÍ cruza a un grupo Tiny (criterio literal del manual)', () => {
  assert.equal(colocacionInvalida({ itinerario: 'KIDS', nivel: 3 }, 'TINY'), null)
})

test('mismo itinerario siempre pasa (Tiny→Tiny, Kids→Kids)', () => {
  assert.equal(colocacionInvalida({ itinerario: 'TINY', nivel: 1 }, 'TINY'), null)
  assert.equal(colocacionInvalida({ itinerario: 'KIDS', nivel: 1 }, 'KIDS'), null)
})

test('la matriz solo regula el cruce Tiny↔Kids: KINDER no se bloquea aquí', () => {
  assert.equal(colocacionInvalida({ itinerario: 'KINDER', nivel: 1 }, 'TINY'), null)
  assert.equal(colocacionInvalida({ itinerario: 'TINY', nivel: 1 }, 'KINDER'), null)
})

test('itinerarios en minúscula y nivel como string no se cuelan por el tipo', () => {
  assert.match(colocacionInvalida({ itinerario: 'tiny', nivel: 1 }, 'kids'), /Tiny no entra/)
  assert.match(colocacionInvalida({ itinerario: 'KIDS', nivel: '2' }, 'TINY'), /menor a nivel 3/)
})

// --- aceptaNuevosEnSelector ---

test('palanca cerrada = no acepta, aunque la ventana siga vigente', () => {
  assert.equal(aceptaNuevosEnSelector(grupoSelector({ inscripcionAbierta: false }), '2026-09-01'), false)
})

test('con ventana vigente acepta; el día del límite todavía acepta', () => {
  assert.equal(aceptaNuevosEnSelector(grupoSelector(), '2026-09-01'), true)
  assert.equal(aceptaNuevosEnSelector(grupoSelector(), '2026-10-07'), true)
})

test('ventana vencida = no acepta', () => {
  assert.equal(aceptaNuevosEnSelector(grupoSelector(), '2026-10-08'), false)
})

test('sin fecha límite (exento o sin itinerario válido) se falla ABIERTO', () => {
  assert.equal(aceptaNuevosEnSelector(grupoSelector({ fechaLimiteNuevos: null }), '2027-01-01'), true)
})

// --- ordenarPorLimiteNuevos ---

test('ordena por cierre asc con los sin fecha al final, sin mutar el arreglo', () => {
  const a = grupoSelector({ id: 1, fechaLimiteNuevos: '2026-10-07' })
  const b = grupoSelector({ id: 2, fechaLimiteNuevos: null })
  const c = grupoSelector({ id: 3, fechaLimiteNuevos: '2026-09-03' })
  const originales = [a, b, c]
  const orden = ordenarPorLimiteNuevos(originales)
  assert.deepEqual(orden.map((g) => g.id), [3, 1, 2])
  assert.deepEqual(originales.map((g) => g.id), [1, 2, 3])
})

test('el orden es estable entre grupos sin fecha', () => {
  const sin1 = grupoSelector({ id: 1, fechaLimiteNuevos: null })
  const sin2 = grupoSelector({ id: 2, fechaLimiteNuevos: null })
  assert.deepEqual(ordenarPorLimiteNuevos([sin1, sin2]).map((g) => g.id), [1, 2])
})

// --- etiquetaGrupoSelector ---

test('la opción muestra grupo, itinerario, cupos, cierre y días que faltan', () => {
  assert.equal(
    etiquetaGrupoSelector(grupoSelector(), '2026-09-30'),
    'Grupo 3 · TINY · 4 cupos · cierra 7 oct · faltan 7 días'
  )
})

test('singular: 1 cupo y falta 1 día; el día del límite dice último día', () => {
  const g = grupoSelector({ cupos: 1 })
  assert.equal(etiquetaGrupoSelector(g, '2026-10-06'), 'Grupo 3 · TINY · 1 cupo · cierra 7 oct · falta 1 día')
  assert.equal(etiquetaGrupoSelector(g, '2026-10-07'), 'Grupo 3 · TINY · 1 cupo · cierra 7 oct · último día')
})

test('exento (sin fecha límite): la etiqueta no inventa un cierre', () => {
  assert.equal(
    etiquetaGrupoSelector(grupoSelector({ itinerario: 'KINDER', fechaLimiteNuevos: null }), '2026-09-30'),
    'Grupo 3 · KINDER · 4 cupos'
  )
})

// --- fechaCortaEs / aviso ---

test('fechaCortaEs acepta Date del driver o string ISO', () => {
  assert.equal(fechaCortaEs('2026-08-20'), '20 ago')
  assert.equal(fechaCortaEs(new Date('2026-08-20T00:00:00.000Z')), '20 ago')
  assert.equal(fechaCortaEs(null), '')
})

test('el aviso del vínculo cerrado pide reasignar (nunca desvincular en silencio)', () => {
  assert.equal(AVISO_CERRADO_A_NUEVOS, 'cerrado a nuevos — reasignar')
})
