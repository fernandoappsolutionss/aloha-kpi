import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {audioDisponible} from '../lib/entrenamiento/audio-disponible.mjs'
import {clipsActualizados} from '../scripts/entrenamiento-audio-actualizaciones.mjs'
test('las encuestas y el nombre KPI Mensual tienen guías naturales y grabaciones vigentes',()=>{
  const clips=clipsActualizados().filter(c=>c.clave.startsWith('encuestas/')||c.clave==='cierre/ci-3')
  assert.equal(clips.length,8)
  assert.equal(clips.filter(c=>c.clave.startsWith('encuestas/')).length,7)
  const manifest=JSON.parse(readFileSync(new URL('../lib/entrenamiento/audio-manifest-actualizaciones.json',import.meta.url),'utf8'))
  for(const c of clips) {
    assert.equal(c.receta.voiceId,'MUPKcfGINNwjsSaWv8yx')
    assert.match(c.texto,/<break time=/)
    assert.doesNotMatch(c.texto,/\d+\s*%|\*\*|—/)
    for(const tramo of c.texto.split(/<break[^>]*\/>/))assert.ok(tramo.trim().length<=135,`${c.clave}: frase sin respiración`)
    if (manifest[c.clave]?.deshabilitado) {
      assert.ok(['encuestas/intro','encuestas/en-3','encuestas/en-5'].includes(c.clave))
      assert.notEqual(manifest[c.clave].hash,c.hash)
      assert.equal(audioDisponible(manifest[c.clave]),null)
      continue
    }
    assert.equal(manifest[c.clave]?.hash,c.hash,`${c.clave}: falta grabación actual`)
    assert.ok(existsSync(new URL(`../public/entrenamiento/${c.file}`,import.meta.url)))
  }
})

test('solo las cinco locuciones con la meta anterior se retiran hasta regenerar',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../lib/entrenamiento/audio-manifest-actualizaciones.json',import.meta.url),'utf8'))
  const afectadas=new Set(['encuestas/intro','encuestas/en-3','encuestas/en-5','cumplimiento/cu-5','cumplimiento-ayuda/encuestas_satisfaccion'])
  for(const clip of clipsActualizados()) {
    const entrada=manifest[clip.clave]
    if(entrada?.deshabilitado) {
      assert.ok(afectadas.has(clip.clave),`audio ajeno deshabilitado: ${clip.clave}`)
      assert.equal(audioDisponible(entrada),null)
      assert.match(entrada.motivo,/30%.*pendiente regenerar/)
      assert.notEqual(entrada.hash,clip.hash)
      assert.ok(existsSync(new URL(`../public/entrenamiento/${entrada.file}`,import.meta.url)))
    } else {
      assert.equal(entrada.hash,clip.hash)
      assert.equal(audioDisponible(entrada),entrada)
    }
  }
  const ayuda=readFileSync(new URL('../components/cumplimiento/AyudaCumplimiento.js',import.meta.url),'utf8')
  const catalogo=readFileSync(new URL('../lib/entrenamiento/audio-catalogo.js',import.meta.url),'utf8')
  assert.match(ayuda,/audioDisponible\(audios/)
  assert.match(catalogo,/audioDisponible\(entrada\)/)
})
