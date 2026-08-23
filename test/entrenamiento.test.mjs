import test from 'node:test'
import assert from 'node:assert/strict'
import { completado, porcentaje, siguienteModulo, corregirQuiz, rutaDePaso } from '../lib/entrenamiento/progreso.js'

const MODS = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

test('completado exige tour visto Y quiz aprobado', () => {
  assert.equal(completado(null), false)
  assert.equal(completado({}), false)
  assert.equal(completado({ tourVistoAt: '2026-08-23T10:00:00Z' }), false)
  assert.equal(completado({ quizAprobadoAt: '2026-08-23T10:00:00Z' }), false)
  assert.equal(completado({ tourVistoAt: '2026-08-23T10:00:00Z', quizAprobadoAt: '2026-08-23T10:05:00Z' }), true)
})

test('porcentaje cuenta módulos completados sobre el total', () => {
  const done = { tourVistoAt: 'x', quizAprobadoAt: 'y' }
  assert.deepEqual(porcentaje({}, MODS), { completados: 0, total: 3, pct: 0 })
  assert.deepEqual(porcentaje({ a: done }, MODS), { completados: 1, total: 3, pct: 33 })
  assert.deepEqual(porcentaje({ a: done, b: done, c: done }, MODS), { completados: 3, total: 3, pct: 100 })
  // un módulo con tour visto pero sin quiz NO cuenta
  assert.deepEqual(porcentaje({ a: { tourVistoAt: 'x' } }, MODS), { completados: 0, total: 3, pct: 0 })
})

test('siguienteModulo devuelve el primer no completado en orden, o null', () => {
  const done = { tourVistoAt: 'x', quizAprobadoAt: 'y' }
  assert.equal(siguienteModulo({}, MODS), 'a')
  assert.equal(siguienteModulo({ a: done }, MODS), 'b')
  assert.equal(siguienteModulo({ a: done, c: done }, MODS), 'b')
  assert.equal(siguienteModulo({ a: done, b: done, c: done }, MODS), null)
})

test('rutaDePaso: la página del paso n es la última ruta de los pasos anteriores, o inicio.ruta', () => {
  const m = { inicio: { ruta: '/a' }, pasos: [{}, {}, { ruta: '/b' }, {}] }
  assert.equal(rutaDePaso(m, 1), '/a')
  assert.equal(rutaDePaso(m, 3), '/a') // el hazlo con ruta vive en la página ORIGEN
  assert.equal(rutaDePaso(m, 4), '/b')
  assert.equal(rutaDePaso(m, 99), '/b') // fuera de rango: la última conocida
})

test('corregirQuiz: 3/3 aprueba, menos no, fuera de rango no cuenta', () => {
  assert.deepEqual(corregirQuiz([0, 2, 1], [0, 2, 1]), { puntaje: 3, correctas: [true, true, true], aprobado: true })
  assert.deepEqual(corregirQuiz([0, 1, 1], [0, 2, 1]), { puntaje: 2, correctas: [true, false, true], aprobado: false })
  assert.deepEqual(corregirQuiz([9, -1, 'x'], [0, 2, 1]), { puntaje: 0, correctas: [false, false, false], aprobado: false })
  assert.deepEqual(corregirQuiz([0], [0, 2, 1]), { puntaje: 1, correctas: [true, false, false], aprobado: false })
  assert.deepEqual(corregirQuiz(null, [0, 2, 1]), { puntaje: 0, correctas: [false, false, false], aprobado: false })
})

import { MODULOS, ERRORES_GLOBALES, FAQ } from '../lib/entrenamiento/modulos.js'
import { RESPUESTAS } from '../lib/entrenamiento/respuestas.js'

test('hay 9 módulos con ids únicos y en orden 1..9', () => {
  assert.equal(MODULOS.length, 9)
  const ids = MODULOS.map((m) => m.id)
  assert.equal(new Set(ids).size, 9)
  assert.deepEqual(MODULOS.map((m) => m.orden), [1, 2, 3, 4, 5, 6, 7, 8, 9])
})

test('cada módulo tiene intro, inicio.ruta bajo /centro/{id}, 5-8 pasos y 1-3 errores', () => {
  for (const m of MODULOS) {
    assert.ok(m.titulo && m.intro?.texto, `${m.id}: falta título o intro`)
    assert.ok(Number.isInteger(m.duracionMin) && m.duracionMin > 0, `${m.id}: duracionMin`)
    assert.match(m.inicio.ruta, /^\/centro\/\{id\}/, `${m.id}: inicio.ruta`)
    assert.ok(m.pasos.length >= 5 && m.pasos.length <= 8, `${m.id}: ${m.pasos.length} pasos`)
    assert.ok(m.errores.length >= 1 && m.errores.length <= 3, `${m.id}: errores`)
  }
})

test('cada paso tiene id único global, tipo válido, target, título y texto', () => {
  const vistos = new Set()
  for (const m of MODULOS) for (const p of m.pasos) {
    assert.ok(!vistos.has(p.id), `paso repetido ${p.id}`); vistos.add(p.id)
    assert.ok(['mostrar', 'hazlo'].includes(p.tipo), `${p.id}: tipo ${p.tipo}`)
    assert.match(p.target, /^[a-z]+\.[a-z-]+$/, `${p.id}: target ${p.target}`)
    assert.ok(p.titulo && p.texto, `${p.id}: título/texto`)
    if (p.ruta) assert.match(p.ruta, /^\/centro\/\{id\}/, `${p.id}: ruta`)
  }
  // el último paso de cada módulo es mostrar (Terminar vive en la tarjeta)
  for (const m of MODULOS) assert.equal(m.pasos[m.pasos.length - 1].tipo, 'mostrar', `${m.id}: último paso debe ser mostrar`)
})

test('quiz: exactamente 3 preguntas con 2-4 opciones; respuestas válidas y sin índices en el cliente', () => {
  for (const m of MODULOS) {
    assert.equal(m.quiz.length, 3, `${m.id}: quiz`)
    for (const q of m.quiz) {
      assert.ok(q.pregunta && q.explicacion, `${m.id}: pregunta/explicación`)
      assert.ok(q.opciones.length >= 2 && q.opciones.length <= 4, `${m.id}: opciones`)
      assert.equal(q.correcta, undefined, `${m.id}: el índice correcto NO va en modulos.js`)
    }
    const r = RESPUESTAS[m.id]
    assert.ok(Array.isArray(r) && r.length === 3, `${m.id}: RESPUESTAS`)
    r.forEach((idx, i) => assert.ok(Number.isInteger(idx) && idx >= 0 && idx < m.quiz[i].opciones.length, `${m.id} q${i + 1}: índice ${idx}`))
  }
  assert.deepEqual(Object.keys(RESPUESTAS).sort(), MODULOS.map((m) => m.id).sort())
})

test('errores globales y FAQ apuntan a módulos existentes', () => {
  const ids = new Set(MODULOS.map((m) => m.id))
  assert.ok(ERRORES_GLOBALES.length >= 10)
  assert.ok(FAQ.length >= 12)
  for (const e of ERRORES_GLOBALES) { assert.ok(e.sintoma && e.causa && e.arreglo); assert.ok(ids.has(e.modulo), `error → ${e.modulo}`) }
  for (const f of FAQ) { assert.ok(f.pregunta && f.respuesta); assert.ok(ids.has(f.modulo), `faq → ${f.modulo}`) }
})

test('texto de cada paso ≤ 35 palabras (advertencia)', () => {
  for (const m of MODULOS) for (const p of m.pasos) {
    const n = p.texto.trim().split(/\s+/).length
    if (n > 35) console.warn(`⚠ ${p.id}: ${n} palabras (el clon lee lento)`)
  }
})

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

function archivosJs(dir) {
  const out = []
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) out.push(...archivosJs(p))
    else if (/\.(js|jsx)$/.test(n)) out.push(p)
  }
  return out
}

test('cada target del contenido existe como data-tour (o prop tour) en app/ o components/', () => {
  const fuentes = [...archivosJs('app'), ...archivosJs('components')].map((p) => readFileSync(p, 'utf8')).join('\n')
  const presentes = new Set()
  // Casa data-tour="x.y", tour="x.y", tour: 'x.y' y data-tour={cond ? 'x.y' : undefined}:
  // cualquier literal entrecomillado con forma ns.nombre en la misma línea que la palabra tour.
  for (const m of fuentes.matchAll(/\btour\b[^\n]*?['"]([a-z]+\.[a-z-]+)['"]/g)) presentes.add(m[1])
  const faltan = []
  for (const m of MODULOS) for (const p of m.pasos) if (!presentes.has(p.target)) faltan.push(`${m.id}/${p.id} → ${p.target}`)
  assert.deepEqual(faltan, [], `targets sin data-tour en el código:\n  ${faltan.join('\n  ')}`)
})

// Spec §12.5 — contrato manifest ↔ mp3 que comparten TourHost, la página del
// módulo y scripts/entrenamiento-audio.mjs. En PR 1 el manifest está vacío y
// pasa trivialmente; en PR 2 (solo mp3 + manifest, sin código) es el único seguro.
const manifest = JSON.parse(readFileSync('lib/entrenamiento/audio-manifest.json', 'utf8'))
test('manifest de audio: cada clave es un módulo/paso real y su mp3 existe en public/entrenamiento', () => {
  const claves = new Set()
  for (const m of MODULOS) { claves.add(`${m.id}/intro`); for (const p of m.pasos) claves.add(`${m.id}/${p.id}`) }
  for (const [k, v] of Object.entries(manifest)) {
    assert.ok(claves.has(k), `clave huérfana en el manifest (paso renombrado o borrado): ${k}`)
    assert.ok(v?.file && existsSync(join('public/entrenamiento', v.file)), `falta el mp3 de ${k}: public/entrenamiento/${v?.file}`)
  }
  const sinClip = [...claves].filter((k) => !manifest[k])
  if (sinClip.length) console.warn(`⚠ ${sinClip.length} clips sin audio todavía (llegan en PR 2)`)
})

// Las respuestas correctas solo pueden importarse desde módulos 'use server'.
test('respuestas.js solo se importa desde módulos de servidor (use server)', () => {
  const malos = [...archivosJs('app'), ...archivosJs('components')].filter((p) => {
    const src = readFileSync(p, 'utf8')
    return /entrenamiento\/respuestas/.test(src) && !/^\s*['"]use server['"]/m.test(src)
  })
  assert.deepEqual(malos, [], `respuestas.js importado fuera del servidor: ${malos.join(', ')}`)
})
