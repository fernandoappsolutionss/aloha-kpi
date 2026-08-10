import test from 'node:test'
import assert from 'node:assert/strict'

import {
  etiquetaNivel,
  subgruposDePlan,
  subgruposConPlan,
  montonesConPlan,
  esGrupoMixto,
  siguePlanDelAula,
  subgruposSinPlan,
  opcionesComunes,
  idsDeLote,
  preparaFijadoAncla,
} from '../lib/ancla-lote.mjs'

// Niño ya ENRIQUECIDO por el server (lib/plan-nino.enriquecerNinos): la
// pantalla nunca deriva planes, solo agrupa lo que llegó.
const nino = (id, nombre, extra = {}) => ({
  id,
  nombre,
  itinerario: 'KIDS',
  nivel: 3,
  estado: 'activo',
  ...extra,
})
const conPlan = (id, nombre, ancla, indiceSemana = 3, extra = {}) =>
  nino(id, nombre, {
    fecha_inicio_nivel: ancla,
    plan: {
      estado: 'en_curso',
      ancla,
      indiceSemana,
      semana: { etiqueta: `Semana ${indiceSemana + 1}`, tipo: 'clase', corto: `S${indiceSemana + 1}` },
      cierre: { fecha: '2026-09-07', origen: 'derivado' },
      itinerario: { nivel: 3, fecha_inicio: ancla, semanas: [{ corto: 'S1', tipo: 'clase', etiqueta: 'Semana 1', fechas: [ancla] }] },
    },
    ...extra,
  })
const sinPlan = (id, nombre, extra = {}) =>
  nino(id, nombre, {
    fecha_inicio_nivel: null,
    plan: { estado: 'sin_plan', ancla: null, indiceSemana: null, semana: null, cierre: { fecha: null, origen: null }, itinerario: null },
    ...extra,
  })

// ── Subgrupos del aula ──────────────────────────────────────────────────────

test('etiquetaNivel: el par itinerario+nivel del montón', () => {
  assert.equal(etiquetaNivel({ itinerario: 'KIDS', nivel: 3 }), 'KIDS 3')
  assert.equal(etiquetaNivel({}), '— ?')
})

test('subgruposDePlan: aula homogénea = UN subgrupo (no es mixta)', () => {
  const ninos = [conPlan(1, 'Ana', '2026-04-06'), conPlan(2, 'Beto', '2026-04-06')]
  const subs = subgruposDePlan(ninos)
  assert.equal(subs.length, 1)
  assert.equal(subs[0].etiqueta, 'KIDS 3')
  assert.equal(subs[0].ancla, '2026-04-06')
  assert.equal(subs[0].ninos.length, 2)
  assert.equal(esGrupoMixto(ninos), false)
})

test('subgruposDePlan: grupo sin niños no es mixto', () => {
  assert.deepEqual(subgruposDePlan([]), [])
  assert.equal(esGrupoMixto([]), false)
})

test('subgruposDePlan: misma ancla pero NIVEL distinto = dos líneas de tiempo', () => {
  const ninos = [conPlan(1, 'Ana', '2026-04-06'), conPlan(2, 'Beto', '2026-04-06', 3, { nivel: 4 })]
  const subs = subgruposDePlan(ninos)
  assert.equal(subs.length, 2)
  assert.equal(esGrupoMixto(ninos), true)
})

test('subgruposDePlan: mismo nivel con ANCLAS distintas = grupo fusionado, arriba el que arrancó primero', () => {
  const subs = subgruposDePlan([
    conPlan(1, 'Ana', '2026-05-04', 1),
    conPlan(2, 'Beto', '2026-04-06', 3),
    conPlan(3, 'Caro', '2026-04-06', 3),
  ])
  assert.deepEqual(subs.map((s) => s.ancla), ['2026-04-06', '2026-05-04'])
  assert.deepEqual(subs[0].ninos.map((n) => n.nombre), ['Beto', 'Caro'])
  assert.equal(subs[0].indiceSemana, 3)
  assert.equal(subs[0].plan.nivel, 3)
})

test('subgruposDePlan: los sin ancla van al final y sin plan que pintar', () => {
  const subs = subgruposDePlan([sinPlan(9, 'Zoe'), conPlan(1, 'Ana', '2026-04-06')])
  assert.deepEqual(subs.map((s) => s.estado), ['en_curso', 'sin_plan'])
  assert.equal(subs[1].plan, null)
  assert.equal(subs[1].ancla, null)
})

test('subgruposDePlan: la fecha DATE del driver se normaliza antes de agrupar', () => {
  const conDate = conPlan(2, 'Beto', '2026-04-06')
  conDate.plan.ancla = new Date(Date.UTC(2026, 3, 6))
  const subs = subgruposDePlan([conPlan(1, 'Ana', '2026-04-06'), conDate])
  assert.equal(subs.length, 1)
})

// ── Montones sin plan ───────────────────────────────────────────────────────

test('subgruposSinPlan: solo los sin plan, agrupados por itinerario+nivel y el montón grande primero', () => {
  const subs = subgruposSinPlan([
    conPlan(1, 'Ana', '2026-04-06'),
    sinPlan(2, 'Beto'),
    sinPlan(3, 'Caro'),
    sinPlan(4, 'Dani', { itinerario: 'TINY', nivel: 7 }),
  ])
  assert.deepEqual(subs.map((s) => s.etiqueta), ['KIDS 3', 'TINY 7'])
  assert.deepEqual(subs[0].ninos.map((n) => n.nombre), ['Beto', 'Caro'])
  assert.equal(subs[1].ninos.length, 1)
})

test('subgruposSinPlan: aula completa con plan = nada que fijar', () => {
  assert.deepEqual(subgruposSinPlan([conPlan(1, 'Ana', '2026-04-06')]), [])
})

// ── Opciones comunes del lote ───────────────────────────────────────────────

const sug = (id, opciones) => ({ id, nombre: `N${id}`, opciones, recomendada: opciones[0]?.clave || null })
const op = (clave, fecha, etiqueta = clave) => ({ clave, etiqueta, fecha, explicacion: `${clave} ${fecha}` })
const MANUAL = op('manual', null, 'Escribir la fecha')

test('opcionesComunes: un solo niño conserva sus opciones y su recomendada', () => {
  const r = opcionesComunes([sug(1, [op('con_el_grupo', '2026-04-06'), op('desde_su_inscripcion', '2026-06-12'), MANUAL])])
  assert.deepEqual(r.opciones.map((o) => o.clave), ['con_el_grupo', 'desde_su_inscripcion', 'manual'])
  assert.equal(r.recomendada, 'con_el_grupo')
  assert.deepEqual(r.descartadas, [])
})

test('opcionesComunes: la fuente que todos comparten con la MISMA fecha sobrevive', () => {
  const r = opcionesComunes([
    sug(1, [op('con_el_grupo', '2026-04-06'), MANUAL]),
    sug(2, [op('con_el_grupo', '2026-04-06'), MANUAL]),
  ])
  assert.deepEqual(r.opciones.map((o) => o.clave), ['con_el_grupo', 'manual'])
  assert.equal(r.opciones[0].fecha, '2026-04-06')
})

test('opcionesComunes: fechas distintas → descartada CON MOTIVO, nunca promediada', () => {
  const r = opcionesComunes([
    sug(1, [op('con_el_grupo', '2026-04-06'), op('desde_su_inscripcion', '2026-06-12'), MANUAL]),
    sug(2, [op('con_el_grupo', '2026-04-06'), op('desde_su_inscripcion', '2026-07-01'), MANUAL]),
  ])
  assert.deepEqual(r.opciones.map((o) => o.clave), ['con_el_grupo', 'manual'])
  const d = r.descartadas.find((x) => x.clave === 'desde_su_inscripcion')
  assert.ok(d && /2026-06-12/.test(d.motivo) && /2026-07-01/.test(d.motivo))
})

test('opcionesComunes: fuente que le falta a alguno → descartada, se dice a cuántos', () => {
  const r = opcionesComunes([
    sug(1, [op('con_la_cohorte', '2026-04-06'), MANUAL]),
    sug(2, [MANUAL]),
  ])
  assert.deepEqual(r.opciones.map((o) => o.clave), ['manual'])
  assert.equal(r.recomendada, 'manual')
  assert.match(r.descartadas[0].motivo, /1 de los 2/)
})

test('opcionesComunes: manual siempre cierra la lista y el orden es el de probabilidad', () => {
  const r = opcionesComunes([
    sug(1, [MANUAL, op('con_la_cohorte', '2026-05-04'), op('con_el_grupo', '2026-04-06')]),
    sug(2, [MANUAL, op('con_la_cohorte', '2026-05-04'), op('con_el_grupo', '2026-04-06')]),
  ])
  assert.deepEqual(r.opciones.map((o) => o.clave), ['con_el_grupo', 'con_la_cohorte', 'manual'])
})

test('opcionesComunes: sin sugerencias no inventa nada', () => {
  assert.deepEqual(opcionesComunes([]), { opciones: [], recomendada: null, descartadas: [] })
  assert.deepEqual(opcionesComunes(null), { opciones: [], recomendada: null, descartadas: [] })
})

// ── Homogéneo vs fusionado: qué cuenta como "otro plan en el salón" ──────────

test('montonesConPlan: 15 niños del mismo nivel escalonados = UN montón, no 15 líneas de tiempo', () => {
  // Escenario exacto del defecto: aula KIDS 2 que el centro llama homogénea,
  // con incorporaciones repartidas entre la semana 1 y la 2 (lo que el manual
  // permite). Antes: 15 subgrupos → mixto → 15 líneas de 19 semanas.
  const ninos = Array.from({ length: 15 }, (_, i) =>
    conPlan(i + 1, `N${i + 1}`, `2026-04-${String(6 + i).padStart(2, '0')}`, 3 - (i % 3), { nivel: 2 }),
  )
  const montones = montonesConPlan(ninos)
  assert.equal(montones.length, 1)
  assert.equal(esGrupoMixto(ninos), false)
  assert.equal(montones[0].ninos.length, 15)
  assert.equal(montones[0].cohortes.length, 15)
})

test('esGrupoMixto: aula homogénea con niños SIN ancla NO es mezclada (no se repite la línea de tiempo)', () => {
  // El caso de producción: 7 con ancla + 3 sin ella. El montón sin plan ya
  // tiene su bloque de creación rápida; contarlo como plan anunciaba el aula
  // como "2 planes distintos" y pintaba SU MISMA línea de tiempo dos veces.
  const ninos = [
    conPlan(1, 'Ana', '2026-04-06'),
    conPlan(2, 'Beto', '2026-04-06'),
    sinPlan(3, 'Caro'),
    sinPlan(4, 'Dani'),
  ]
  assert.equal(subgruposDePlan(ninos).length, 2) // el agrupador sigue viéndolos
  assert.equal(subgruposConPlan(ninos).length, 1) // pero solo uno tiene plan que dictar
  assert.equal(esGrupoMixto(ninos), false)
})

test('esGrupoMixto: aula FUSIONADA (dos NIVELES vivos) sí es mezclada', () => {
  const ninos = [conPlan(1, 'Ana', '2026-04-06'), conPlan(2, 'Beto', '2026-05-04', 1, { nivel: 4 }), sinPlan(3, 'Caro')]
  const con = subgruposConPlan(ninos)
  assert.deepEqual(con.map((s) => s.ancla), ['2026-04-06', '2026-05-04'])
  assert.equal(esGrupoMixto(ninos), true)
  assert.deepEqual(montonesConPlan(ninos).map((m) => m.etiqueta), ['KIDS 3', 'KIDS 4'])
})

test('esGrupoMixto: MISMO nivel con anclas distintas NO es mezclada (el manual deja entrar tarde)', () => {
  // El caso de producción: 15 KIDS 2 del mismo salón incorporados en semanas
  // distintas. anclaDeAlta le da a cada uno SU fecha, así que había 15
  // subgrupos → cartel de "grupo mezclado" y 15 líneas de tiempo. Es el mismo
  // libro corrido: una sola línea (la del aula) y punto.
  const ninos = [
    conPlan(1, 'Ana', '2026-04-06', 3),
    conPlan(2, 'Beto', '2026-04-13', 2),
    conPlan(3, 'Caro', '2026-04-20', 1),
  ]
  assert.equal(subgruposConPlan(ninos).length, 3)
  assert.equal(esGrupoMixto(ninos), false)
  const [m] = montonesConPlan(ninos)
  assert.equal(m.etiqueta, 'KIDS 3')
  assert.equal(m.ninos.length, 3)
  assert.deepEqual(m.cohortes.map((c) => c.ancla), ['2026-04-06', '2026-04-13', '2026-04-20'])
  // Montón escalonado = NO hay una línea de tiempo del montón: pintar la de una
  // cohorte con el nombre de todas sería mentir la fecha de los demás.
  assert.equal(m.ancla, null)
  assert.equal(m.plan, null)
  assert.equal(siguePlanDelAula(m, { itinerario: 'KIDS', nivel: 3, fecha_inicio: '2026-04-06' }), false)
})

test('montonesConPlan: un montón de una sola cohorte conserva su plan y su posición', () => {
  const [m] = montonesConPlan([conPlan(1, 'Ana', '2026-04-06'), conPlan(2, 'Beto', '2026-04-06')])
  assert.equal(m.cohortes.length, 1)
  assert.equal(m.ancla, '2026-04-06')
  assert.equal(m.indiceSemana, 3)
  assert.equal(m.plan.nivel, 3)
  assert.equal(m.ninos.length, 2)
  assert.equal(siguePlanDelAula(m, { itinerario: 'KIDS', nivel: 3, fecha_inicio: '2026-04-06' }), true)
})

test('montonesConPlan: los sin ancla no arman montón y el aula vacía no tiene ninguno', () => {
  assert.deepEqual(montonesConPlan([sinPlan(1, 'Ana'), sinPlan(2, 'Beto')]), [])
  assert.deepEqual(montonesConPlan([]), [])
})

test('subgruposConPlan: aula entera sin ancla = ningún plan que dictar', () => {
  const ninos = [sinPlan(1, 'Ana'), sinPlan(2, 'Beto')]
  assert.deepEqual(subgruposConPlan(ninos), [])
  assert.equal(esGrupoMixto(ninos), false)
})

test('siguePlanDelAula: mismo itinerario+nivel+fecha de inicio = la MISMA línea de tiempo', () => {
  const [sub] = subgruposConPlan([conPlan(1, 'Ana', '2026-04-06')])
  const ref = { itinerario: 'KIDS', nivel: 3, fecha_inicio: '2026-04-06' }
  assert.equal(siguePlanDelAula(sub, ref), true)
  // La referencia del aula llega como DATE del driver: se normaliza igual.
  assert.equal(siguePlanDelAula(sub, { ...ref, fecha_inicio: new Date(Date.UTC(2026, 3, 6)) }), true)
  assert.equal(siguePlanDelAula(sub, { ...ref, fecha_inicio: '2026-05-04' }), false)
  assert.equal(siguePlanDelAula(sub, { ...ref, nivel: 4 }), false)
  assert.equal(siguePlanDelAula(sub, { ...ref, itinerario: 'TINY' }), false)
  assert.equal(siguePlanDelAula(sub, null), false)
})

test('siguePlanDelAula: el subgrupo sin ancla nunca es la referencia', () => {
  const [sub] = subgruposDePlan([sinPlan(1, 'Ana')])
  assert.equal(siguePlanDelAula(sub, { itinerario: 'KIDS', nivel: 3, fecha_inicio: '2026-04-06' }), false)
})

// ── Lote con niveles distintos: se agrupa, NO se mezcla ─────────────────────

test('lote con niveles distintos: cada montón va por su lado y nadie se repite', () => {
  const ninos = [
    sinPlan(1, 'Ana'),
    sinPlan(2, 'Beto'),
    sinPlan(3, 'Caro', { nivel: 4 }),
    sinPlan(4, 'Dani', { itinerario: 'TINY', nivel: 1 }),
    conPlan(5, 'Eva', '2026-04-06'),
  ]
  const subs = subgruposSinPlan(ninos)
  assert.deepEqual(subs.map((s) => s.etiqueta), ['KIDS 3', 'KIDS 4', 'TINY 1'])
  // Ningún montón mezcla niveles ni itinerarios: una sola fecha lo resuelve.
  for (const s of subs) {
    assert.equal(new Set(s.ninos.map((n) => `${n.itinerario}|${n.nivel}`)).size, 1)
  }
  // Cada niño sin plan aparece EXACTAMENTE una vez; el que ya tiene plan, cero.
  const ids = subs.flatMap((s) => s.ninos.map((n) => n.id))
  assert.deepEqual(ids.sort((a, b) => a - b), [1, 2, 3, 4])
})

test('lote con niveles distintos: si se mandaran juntos, la fuente se descarta en vez de promediar', () => {
  // KIDS 3 arrancó el 06/04 y KIDS 4 el 04/05: no hay UNA fecha común, así que
  // 'con_el_grupo' se cae con motivo y solo queda escribirla por montón.
  const r = opcionesComunes([
    sug(1, [op('con_el_grupo', '2026-04-06'), MANUAL]),
    sug(2, [op('con_el_grupo', '2026-04-06'), MANUAL]),
    sug(3, [op('con_el_grupo', '2026-05-04'), MANUAL]),
  ])
  assert.deepEqual(r.opciones.map((o) => o.clave), ['manual'])
  assert.match(r.descartadas[0].motivo, /2026-04-06 · 2026-05-04/)
})

// ── Qué se escribe al fijar el ancla (regla de fijarInicioNivel) ────────────

const fila = (id, nombre, extra = {}) => ({
  id,
  nombre,
  nivel: 3,
  estado: 'activo',
  grupo_id: 71,
  fecha_inicio_nivel: null,
  ...extra,
})

test('idsDeLote: únicos, enteros positivos y en el orden del lock', () => {
  assert.deepEqual(idsDeLote([9, 2, 9, '5']), [2, 5, 9])
  assert.deepEqual(idsDeLote([0, -1, 'x', null, 1.5]), [])
  assert.deepEqual(idsDeLote(null), [])
})

test('preparaFijadoAncla: el niño sin ancla se escribe', () => {
  const r = preparaFijadoAncla({ ninos: [fila(1, 'Ana')], ids: [1], ancla: '2026-04-06' })
  assert.equal(r.error, undefined)
  assert.equal(r.ancla, '2026-04-06')
  assert.equal(r.actualizados, 1)
  assert.deepEqual(r.cambios, [{ id: 1, nombre: 'Ana', nivel: 3, anclaAntes: null, cambia: true }])
})

test('preparaFijadoAncla: IDEMPOTENTE — la misma fecha no toca ficha ni escribe evento', () => {
  const ninos = [fila(1, 'Ana', { fecha_inicio_nivel: '2026-04-06' })]
  const r = preparaFijadoAncla({ ninos, ids: [1], ancla: '2026-04-06' })
  assert.equal(r.actualizados, 0)
  assert.equal(r.cambios[0].cambia, false)
  // Y repetirlo otra vez da exactamente lo mismo: cero escrituras nuevas.
  assert.equal(preparaFijadoAncla({ ninos, ids: [1], ancla: '2026-04-06' }).actualizados, 0)
})

test('preparaFijadoAncla: idempotente también con la DATE del driver de Neon', () => {
  const r = preparaFijadoAncla({
    ninos: [fila(1, 'Ana', { fecha_inicio_nivel: new Date(Date.UTC(2026, 3, 6)) })],
    ids: [1],
    ancla: '2026-04-06',
  })
  assert.equal(r.actualizados, 0)
  assert.equal(r.cambios[0].anclaAntes, '2026-04-06')
})

test('preparaFijadoAncla: en lote solo se escribe a quien le cambia la fecha', () => {
  const r = preparaFijadoAncla({
    ninos: [
      fila(1, 'Ana', { fecha_inicio_nivel: '2026-04-06' }),
      fila(2, 'Beto'),
      fila(3, 'Caro', { fecha_inicio_nivel: '2026-05-04' }),
    ],
    ids: [1, 2, 3],
    ancla: '2026-04-06',
  })
  assert.deepEqual(r.cambios.map((c) => c.cambia), [false, true, true])
  assert.equal(r.actualizados, 2)
})

test('preparaFijadoAncla: el nivel del evento sale de la ficha, no del formulario', () => {
  const r = preparaFijadoAncla({ ninos: [fila(1, 'Ana', { nivel: '4' })], ids: [1], ancla: '2026-04-06' })
  assert.equal(r.cambios[0].nivel, 4)
})

test('preparaFijadoAncla: un retirado aborta el LOTE completo', () => {
  const r = preparaFijadoAncla({
    ninos: [fila(1, 'Ana'), fila(2, 'Beto', { estado: 'retirado' })],
    ids: [1, 2],
    ancla: '2026-04-06',
  })
  assert.match(r.error, /Beto está retirado/)
  assert.equal(r.cambios, undefined)
})

test('preparaFijadoAncla: el pendiente sin grupo no lleva ancla (g1-8)', () => {
  const r = preparaFijadoAncla({ ninos: [fila(1, 'Ana', { grupo_id: null })], ids: [1], ancla: '2026-04-06' })
  assert.match(r.error, /no tiene grupo/)
})

test('preparaFijadoAncla: una fila que ya no está en el centro corta todo', () => {
  const r = preparaFijadoAncla({ ninos: [fila(1, 'Ana')], ids: [1, 2], ancla: '2026-04-06' })
  assert.match(r.error, /Recarga la pantalla/)
})

test('preparaFijadoAncla: sin ids o sin fecha no se escribe nada', () => {
  assert.match(preparaFijadoAncla({ ninos: [], ids: [], ancla: '2026-04-06' }).error, /al menos un niño/)
  assert.match(preparaFijadoAncla({ ninos: [fila(1, 'Ana')], ids: [1], ancla: null }).error, /Falta la fecha/)
})
