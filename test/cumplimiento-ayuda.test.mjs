import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { CUMPLIMIENTO_AYUDA } from '../lib/cumplimiento-ayuda.mjs'
import { CUMPLIMIENTO_KEYS } from '../lib/checklist.js'
import { MODULO_CUMPLIMIENTO } from '../lib/entrenamiento/cumplimiento.js'
import { clipsActualizados } from '../scripts/entrenamiento-audio-actualizaciones.mjs'

test('todos los criterios de Cumplimiento tienen una guía práctica completa y fuente distinguible', () => {
  assert.deepEqual(Object.keys(CUMPLIMIENTO_AYUDA).sort(), [...CUMPLIMIENTO_KEYS].sort())
  for (const [clave, ayuda] of Object.entries(CUMPLIMIENTO_AYUDA)) {
    assert.ok(ayuda.como.length >= 2, `${clave}: faltan acciones`)
    assert.ok(ayuda.evitar.length >= 2, `${clave}: faltan ejemplos de qué evitar`)
    for (const texto of [...ayuda.como, ...ayuda.evitar, ayuda.evidencia, ayuda.ejemplo]) {
      assert.ok(typeof texto === 'string' && texto.length > 30, `${clave}: orientación incompleta`)
      assert.doesNotMatch(texto, /TODO|Lorem ipsum/)
    }
    assert.ok(['manual', 'operativa', 'plataforma', 'definicion'].includes(ayuda.fuente.tipo))
    assert.ok(ayuda.fuente.referencia)
  }
})

test('la guía distingue encuesta automática de familias de la encuesta del equipo aún manual', () => {
  const familias = CUMPLIMIENTO_AYUDA.encuestas_satisfaccion
  const equipo = CUMPLIMIENTO_AYUDA.encuestas_equipo
  assert.match(familias.como.join(' '), /más del 50%/)
  assert.match(familias.ejemplo, /148.*75.*74/)
  assert.match(familias.evidencia, /difusión registrada.*automáticamente/)
  assert.match(equipo.como.join(' '), /anónima.*supervisor.*100%.*trimestre/)
  assert.match(equipo.evidencia, /manualmente.*aún no está disponible/)
  assert.doesNotMatch(equipo.como.join(' '), /Q2|Q4/)
})

test('las 39 grabaciones nuevas corresponden a guías cortas en el clon aprobado', () => {
  const clips = clipsActualizados().filter(c => c.clave.startsWith('cumplimiento'))
  assert.equal(clips.length, 33 + MODULO_CUMPLIMIENTO.pasos.length + 1)
  const manifest = JSON.parse(readFileSync(new URL('../lib/entrenamiento/audio-manifest-actualizaciones.json', import.meta.url), 'utf8'))
  for (const clip of clips) {
    assert.equal(clip.receta.voiceId, 'MUPKcfGINNwjsSaWv8yx')
    assert.match(clip.texto, /<break time=/)
    for (const frase of clip.texto.split(/<break[^>]*\/>/)) assert.ok(frase.trim().length <= 135, `${clip.clave}: frase sin pausa`)
    assert.doesNotMatch(clip.texto, /\d+\s*%|\*\*|—/)
    assert.equal(manifest[clip.clave]?.hash, clip.hash, `${clip.clave}: grabación desactualizada`)
    assert.ok(existsSync(new URL(`../public/entrenamiento/${clip.file}`, import.meta.url)), `${clip.clave}: falta el MP3`)
    assert.ok(manifest[clip.clave].segundos > 5)
  }
})

test('el recorrido solo pide abrir ayuda y el servidor corrige su evaluación', () => {
  assert.deepEqual(MODULO_CUMPLIMIENTO.pasos.filter(p => p.tipo === 'hazlo').map(p => p.target), ['cumplimiento.abrir-ayuda'])
  const archivo = readFileSync(new URL('../components/cumplimiento/AyudaCumplimiento.js', import.meta.url), 'utf8')
  assert.doesNotMatch(archivo, /speechSynthesis|saveCumplimiento|app\/actions/)
  assert.match(archivo, /aria-expanded/)
  assert.match(archivo, /aria-labelledby/)
  assert.match(archivo, /preload="none"/)
})
