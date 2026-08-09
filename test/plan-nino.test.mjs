import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizarCalendarioVersionado,
  fingerprintCalendarioVersionado,
  calendarioVersionadoDe,
  generarItinerarioVersionado,
  crearMemoPlanes,
  planNino,
  posicionPlanNino,
  cierreEfectivo,
  enriquecerNinos,
} from '../lib/plan-nino.mjs'
import { generarItinerario, plantillaNivel } from '../lib/itinerario.js'

// 2026-01-12 es lunes. Días lunes(1)/miércoles(3); la versión 2 cambia a
// martes(2)/jueves(4) desde el domingo 2026-02-01 (corte en frontera de semana
// calendario, para leer el antes/después sin ambigüedad).
const V1 = { vigente_desde: '2026-01-12', dias: [1, 3] }
const V2 = { vigente_desde: '2026-02-01', dias: [2, 4] }

const weekdayUtc = (f) => new Date(`${f}T00:00:00Z`).getUTCDay()

// ── Normalización y fingerprint del calendario ───────────────────────────────

test('normaliza versiones: ordena por vigencia, null primero, limpia dias', () => {
  const out = normalizarCalendarioVersionado([
    { vigente_desde: '2026-02-01', dias: [4, 2, 2, 9, 0] },
    { vigente_desde: null, dias: [3, 1] },
    { vigente_desde: '2026-03-01', dias: [] }, // sin días válidos: fuera
    { vigente_desde: 'corrupta', dias: [1] }, // vigencia inválida: fuera
  ])
  assert.deepEqual(out, [
    { vigente_desde: null, dias: [1, 3] },
    { vigente_desde: '2026-02-01', dias: [2, 4] },
  ])
})

test('misma vigencia repetida: la última escrita gana', () => {
  const out = normalizarCalendarioVersionado([
    { vigente_desde: '2026-02-01', dias: [1, 3] },
    { vigente_desde: '2026-02-01', dias: [2, 4] },
  ])
  assert.deepEqual(out, [{ vigente_desde: '2026-02-01', dias: [2, 4] }])
})

test('el fingerprint es estable ante desorden y ruido del calendario', () => {
  const a = fingerprintCalendarioVersionado([V1, V2])
  const b = fingerprintCalendarioVersionado([
    { vigente_desde: '2026-02-01', dias: [4, 2] },
    { vigente_desde: new Date('2026-01-12T00:00:00Z'), dias: [3, 1, 1] },
  ])
  assert.equal(a, b)
  assert.notEqual(a, fingerprintCalendarioVersionado([V1]))
  assert.equal(fingerprintCalendarioVersionado([]), '[]')
})

test('calendarioVersionadoDe: referencia, legacy inferido, horarios, nada', () => {
  const it = generarItinerario({ fechaInicio: '2026-01-12', dias: [1, 3], nivel: 1, pais: 'PA' })
  // 1. La referencia trae versiones[]: se usan tal cual.
  assert.deepEqual(calendarioVersionadoDe({ id: 1, itinerario_clases: it }), [V1])
  // 2. Itinerario legacy sin versiones[]: se infiere la versión 1 de sus fechas.
  const { versiones, ...legacy } = it
  assert.deepEqual(calendarioVersionadoDe({ id: 1, itinerario_clases: legacy }), [V1])
  // 3. Sin referencia: los días de los horarios rigen desde siempre.
  assert.deepEqual(
    calendarioVersionadoDe({ id: 1, horarios: [{ dia: 3 }, { dia: 1 }] }),
    [{ vigente_desde: null, dias: [1, 3] }],
  )
  // 4. Sin horario no se inventa nada: [] (los consumidores verán sin_plan).
  assert.deepEqual(calendarioVersionadoDe({ id: 1, horarios: [] }), [])
})

// ── El generador único (g1-13) ───────────────────────────────────────────────

test('con una sola versión el plan es IDÉNTICO al del motor clásico', () => {
  const versionado = generarItinerarioVersionado({
    fechaInicio: '2026-01-12',
    calendarioVersionado: [V1],
    nivel: 1,
    pais: 'PA',
  })
  const clasico = generarItinerario({ fechaInicio: '2026-01-12', dias: [1, 3], nivel: 1, pais: 'PA' })
  assert.deepEqual(versionado, clasico)
})

test('el motor es determinista: dos corridas producen el mismo objeto', () => {
  const args = { fechaInicio: '2026-01-12', calendarioVersionado: [V1, V2], nivel: 2, pais: 'PA' }
  assert.deepEqual(generarItinerarioVersionado(args), generarItinerarioVersionado(args))
})

test('un cambio de horario versionado no reescribe el pasado del plan', () => {
  const conCambio = generarItinerarioVersionado({
    fechaInicio: '2026-01-12',
    calendarioVersionado: [V1, V2],
    nivel: 1,
    pais: 'PA',
  })
  const sinCambio = generarItinerarioVersionado({
    fechaInicio: '2026-01-12',
    calendarioVersionado: [V1],
    nivel: 1,
    pais: 'PA',
  })

  // Toda fecha previa a la vigencia nueva cae en lunes/miércoles; el sufijo en
  // martes/jueves.
  for (const s of conCambio.semanas) {
    for (const f of s.fechas) {
      const esperado = f < '2026-02-01' ? [1, 3] : [2, 4]
      assert.ok(esperado.includes(weekdayUtc(f)), `${f} fuera del patrón vigente`)
    }
  }
  // El tramo previo al cambio es EXACTAMENTE el del plan sin cambio.
  const prefijo = (plan) => plan.semanas
    .map((s) => ({ corto: s.corto, fechas: s.fechas.filter((f) => f < '2026-02-01') }))
    .filter((s) => s.fechas.length)
  assert.deepEqual(prefijo(conCambio), prefijo(sinCambio))
  // La semana N sigue siendo la semana N: mismo índice de contenido.
  const cortos = plantillaNivel(1).map((s) => s.corto)
  assert.deepEqual(conCambio.semanas.map((s) => s.corto), cortos)
  assert.deepEqual(sinCambio.semanas.map((s) => s.corto), cortos)
})

test('un ancla anterior a la primera vigencia usa la primera versión', () => {
  // Niño trasladado cuya ancla es previa al calendario registrado del destino.
  const plan = generarItinerarioVersionado({
    fechaInicio: '2026-01-05',
    calendarioVersionado: [V1],
    nivel: 2,
    pais: 'PA',
  })
  assert.equal(plan.semanas[0].fechas[0], '2026-01-05')
  assert.ok(plan.semanas.every((s) => s.fechas.every((f) => [1, 3].includes(weekdayUtc(f)))))
})

test('sin ancla o sin calendario usable no hay plan (null, jamás inventado)', () => {
  assert.equal(generarItinerarioVersionado({ fechaInicio: null, calendarioVersionado: [V1], nivel: 1 }), null)
  assert.equal(generarItinerarioVersionado({ fechaInicio: '2026-01-12', calendarioVersionado: [], nivel: 1 }), null)
  assert.equal(generarItinerarioVersionado({ fechaInicio: '2026-01-12', calendarioVersionado: [{ vigente_desde: '2026-01-12', dias: [] }], nivel: 1 }), null)
})

// ── Memo por (ancla, nivel, pais, calendario, excepciones) ───────────────────

test('el memo comparte el MISMO plan entre niños con la misma clave', () => {
  const memo = crearMemoPlanes()
  const params = { ancla: '2026-01-12', nivel: 2, pais: 'PA', calendarioVersionado: [V1] }
  const a = planNino(params, memo)
  const b = planNino({ ...params }, memo)
  assert.ok(a != null)
  assert.ok(Object.is(a, b), 'la segunda derivación debe salir del memo')
  assert.equal(memo.size, 1)

  const otro = planNino({ ...params, ancla: '2026-02-02' }, memo)
  assert.ok(!Object.is(a, otro))
  assert.equal(memo.size, 2)
})

test('el memo distingue pais, calendario y excepciones', () => {
  const memo = crearMemoPlanes()
  const base = { ancla: '2026-01-12', nivel: 2, pais: 'PA', calendarioVersionado: [V1] }
  planNino(base, memo)
  planNino({ ...base, pais: 'VE' }, memo)
  planNino({ ...base, calendarioVersionado: [V1, V2] }, memo)
  planNino({ ...base, excepciones: [{ fecha: '2026-01-14', motivo: 'coach enferma' }] }, memo)
  assert.equal(memo.size, 4)
})

test('el null (clave sin plan derivable) también se memoiza', () => {
  const memo = crearMemoPlanes()
  const params = { ancla: '2026-01-12', nivel: 2, pais: 'PA', calendarioVersionado: [] }
  assert.equal(planNino(params, memo), null)
  assert.equal(memo.size, 1)
  assert.equal(planNino(params, memo), null)
  assert.equal(memo.size, 1)
})

test('sin ancla o con nivel inválido no hay plan ni entrada de memo', () => {
  const memo = crearMemoPlanes()
  assert.equal(planNino({ ancla: null, nivel: 2, calendarioVersionado: [V1] }, memo), null)
  assert.equal(planNino({ ancla: '2026-01-12', nivel: 0, calendarioVersionado: [V1] }, memo), null)
  assert.equal(planNino({ ancla: '2026-01-12', nivel: 'x', calendarioVersionado: [V1] }, memo), null)
  assert.equal(memo.size, 0)
})

// ── Posición y estados explícitos (nadie interpreta -1) ──────────────────────

const planBase = () => generarItinerarioVersionado({
  fechaInicio: '2026-01-12',
  calendarioVersionado: [V1],
  nivel: 1,
  pais: 'PA',
})

test('antes de la primera clase el estado es por_iniciar en la semana 0', () => {
  const pos = posicionPlanNino(planBase(), '2026-01-02')
  assert.equal(pos.estado, 'por_iniciar')
  assert.equal(pos.indice, 0)
  assert.equal(pos.semana.corto, 'I1')
})

test('durante el nivel el estado es en_curso con su índice de semana', () => {
  const pos = posicionPlanNino(planBase(), '2026-01-14')
  assert.equal(pos.estado, 'en_curso')
  assert.equal(pos.indice, 0)
  const despues = posicionPlanNino(planBase(), '2026-01-19')
  assert.equal(despues.estado, 'en_curso')
  assert.equal(despues.indice, 1)
  assert.equal(despues.semana.corto, 'I2')
})

test('pasado el cierre el estado es cerrado, nunca un -1', () => {
  const plan = planBase()
  const pos = posicionPlanNino(plan, '2030-01-01')
  assert.equal(pos.estado, 'cerrado')
  assert.equal(pos.indice, plan.semanas.length - 1)
  assert.equal(pos.semana.corto, 'C')
})

test('sin plan o sin fecha de negocio el estado es sin_plan', () => {
  assert.deepEqual(posicionPlanNino(null, '2026-01-14'), { estado: 'sin_plan', indice: null, semana: null })
  assert.deepEqual(posicionPlanNino(planBase(), null), { estado: 'sin_plan', indice: null, semana: null })
})

// ── Cierre efectivo: override ?? derivado (g1-11) ────────────────────────────

test('cierreEfectivo prefiere el override manual y declara su origen', () => {
  const plan = planBase()
  assert.deepEqual(
    cierreEfectivo({ override: '2026-03-31', plan }),
    { fecha: '2026-03-31', origen: 'manual' },
  )
  assert.deepEqual(
    cierreEfectivo({ override: new Date('2026-03-31T00:00:00Z'), plan }),
    { fecha: '2026-03-31', origen: 'manual' },
  )
  assert.deepEqual(
    cierreEfectivo({ override: null, plan }),
    { fecha: plan.fecha_cierre_estimada, origen: 'derivado' },
  )
  assert.deepEqual(cierreEfectivo({ override: null, plan: null }), { fecha: null, origen: null })
})

// ── Enriquecimiento batch (una pasada) ───────────────────────────────────────

const grupoFx = (overrides = {}) => ({
  id: 10,
  pais: 'PA',
  itinerario_clases: generarItinerario({ fechaInicio: '2026-01-12', dias: [1, 3], nivel: 2, pais: 'PA' }),
  horarios: [{ dia: 1 }, { dia: 3 }],
  ...overrides,
})

test('enriquece cada niño una vez y comparte el plan por clave de memo', () => {
  const grupo = grupoFx()
  const ninos = [
    { id: 1, grupo_id: 10, nivel: 2, fecha_inicio_nivel: '2026-01-12' },
    { id: 2, grupo_id: 10, nivel: 2, fecha_inicio_nivel: '2026-01-12' },
    { id: 3, grupo_id: 10, nivel: 2, fecha_inicio_nivel: '2026-02-02' }, // trasladado: ancla propia
    { id: 4, grupo_id: 10, nivel: 2, fecha_inicio_nivel: null }, // sin ancla (backfill sin_resolver)
    { id: 5, grupo_id: null, nivel: 2, fecha_inicio_nivel: '2026-01-12' }, // sin grupo
  ]

  const out = enriquecerNinos(ninos, [grupo], { hoy: '2026-01-20' })
  assert.equal(out.length, 5)

  assert.equal(out[0].plan.estado, 'en_curso')
  assert.equal(out[0].plan.ancla, '2026-01-12')
  // El 20-ene la INT (12/14-ene) ya pasó: va por la semana 1 del libro.
  assert.equal(out[0].plan.indiceSemana, 1)
  assert.equal(out[0].plan.semana.corto, '1')
  assert.ok(Object.is(out[0].plan.itinerario, out[1].plan.itinerario), 'misma clave ⇒ mismo plan físico')

  assert.equal(out[2].plan.estado, 'por_iniciar')
  assert.ok(!Object.is(out[0].plan.itinerario, out[2].plan.itinerario))

  assert.equal(out[3].plan.estado, 'sin_plan')
  assert.equal(out[3].plan.itinerario, null)
  assert.equal(out[4].plan.estado, 'sin_plan')
})

test('el cierre por niño respeta el override manual en el enriquecido', () => {
  const grupo = grupoFx()
  const [conOverride, sinOverride] = enriquecerNinos([
    { id: 1, grupo_id: 10, nivel: 2, fecha_inicio_nivel: '2026-01-12', fecha_cierre_nivel: '2026-03-31' },
    { id: 2, grupo_id: 10, nivel: 2, fecha_inicio_nivel: '2026-01-12' },
  ], grupo, { hoy: '2026-01-20' })

  assert.deepEqual(conOverride.plan.cierre, { fecha: '2026-03-31', origen: 'manual' })
  assert.equal(sinOverride.plan.cierre.origen, 'derivado')
  assert.equal(sinOverride.plan.cierre.fecha, sinOverride.plan.itinerario.fecha_cierre_estimada)
})

test('grupo sin horario ni referencia: ancla conservada pero sin_plan', () => {
  const grupo = { id: 10, pais: 'PA', itinerario_clases: null, horarios: [] }
  const [nino] = enriquecerNinos(
    [{ id: 1, grupo_id: 10, nivel: 2, fecha_inicio_nivel: '2026-01-12' }],
    grupo,
    { hoy: '2026-01-20' },
  )
  assert.equal(nino.plan.estado, 'sin_plan')
  assert.equal(nino.plan.ancla, '2026-01-12')
  assert.equal(nino.plan.itinerario, null)
})

test('el memo compartido evita recalcular entre pasadas del mismo request', () => {
  const memo = crearMemoPlanes()
  const grupo = grupoFx()
  const ninos = [{ id: 1, grupo_id: 10, nivel: 2, fecha_inicio_nivel: '2026-01-12' }]
  const [a] = enriquecerNinos(ninos, grupo, { hoy: '2026-01-20', memo })
  const [b] = enriquecerNinos(ninos, grupo, { hoy: '2026-01-20', memo })
  assert.ok(Object.is(a.plan.itinerario, b.plan.itinerario))
  assert.equal(memo.size, 1)
})

test('el plan derivado usa el calendario versionado del grupo, no un dias fijo', () => {
  // Referencia con cambio de horario registrado (R2b): el plan del niño
  // respeta el patrón viejo antes de la vigencia y el nuevo después.
  const it = generarItinerario({ fechaInicio: '2026-01-12', dias: [1, 3], nivel: 2, pais: 'PA' })
  const grupo = grupoFx({ itinerario_clases: { ...it, versiones: [V1, V2] } })
  const [nino] = enriquecerNinos(
    [{ id: 1, grupo_id: 10, nivel: 2, fecha_inicio_nivel: '2026-01-12' }],
    grupo,
    { hoy: '2026-02-15' },
  )
  for (const s of nino.plan.itinerario.semanas) {
    for (const f of s.fechas) {
      const esperado = f < '2026-02-01' ? [1, 3] : [2, 4]
      assert.ok(esperado.includes(weekdayUtc(f)), `${f} fuera del patrón vigente`)
    }
  }
})
