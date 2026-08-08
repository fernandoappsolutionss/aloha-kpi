import test from 'node:test'
import assert from 'node:assert/strict'

import { sugerenciasPara, proximasFusiones } from '../lib/fusiones.js'

// --- Fixtures: la misma forma que entrega cargarGrupos (ver lib/fusiones.js) --

const kid = (id, nivel = 3) => ({ id, nombre: `n${id}`, itinerario: 'TINY', nivel, fecha_cierre_nivel: null, estado: 'activo' })

const grupo = (id, estudiantes, extra = {}) => ({
  id,
  numero: String(id),
  itinerario: 'TINY',
  es_online: false,
  estado: 'activo',
  coach: null,
  horarios: [{ dia: 1, hora_inicio: '15:00', hora_fin: '17:00', salon_id: 1 }],
  estudiantes,
  ...extra,
})

const OPTS = { MIN: 8, MAX: 15 }

// --- Filtro de destinos con palanca cerrada (defecto D3 del diseño) ----------

test('sugerenciasPara: un destino con la palanca cerrada no se sugiere', () => {
  const origen = grupo(1, [kid(11), kid(12)])
  const abierto = grupo(2, [kid(21), kid(22), kid(23)])
  const cerrado = grupo(3, [kid(31), kid(32), kid(33)], { inscripcion_abierta: false })
  const sugs = sugerenciasPara(origen, [origen, abierto, cerrado], OPTS)
  assert.deepEqual(sugs.map((s) => s.grupo.id), [2])
})

test('sugerenciasPara: palanca NULL o true cuenta como abierta (convención !== false)', () => {
  const origen = grupo(1, [kid(11)])
  const sinColumna = grupo(2, [kid(21), kid(22)]) // filas viejas sin la palanca
  const abierto = grupo(3, [kid(31), kid(32)], { inscripcion_abierta: true })
  const sugs = sugerenciasPara(origen, [origen, sinColumna, abierto], OPTS)
  assert.deepEqual(sugs.map((s) => s.grupo.id).sort((a, b) => a - b), [2, 3])
})

test('proximasFusiones: el plan del mes no propone destinos cerrados, pero un grupo cerrado sí puede ser origen', () => {
  const chico = grupo(1, [kid(11), kid(12)]) // bajo meta (2 < 8)
  const cerrado = grupo(2, [kid(21), kid(22), kid(23), kid(24), kid(25)], { inscripcion_abierta: false }) // bajo meta (5 < 8)
  const pares = proximasFusiones([chico, cerrado], OPTS)
  // El grupo 1 no encuentra destino (el 2 está cerrado); el 2 sí puede vaciarse
  // HACIA el 1 — sacar niños de un grupo cerrado nunca está bloqueado.
  assert.equal(pares.length, 1)
  assert.equal(pares[0].from.id, 2)
  assert.equal(pares[0].to.id, 1)
})
