import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {clipsActualizados} from '../scripts/entrenamiento-audio-actualizaciones.mjs'
test('las encuestas y el nombre KPI Mensual tienen guías naturales y grabaciones vigentes',()=>{
  const clips=clipsActualizados()
  assert.equal(clips.length,8)
  assert.equal(clips.filter(c=>c.clave.startsWith('encuestas/')).length,7)
  const manifest=JSON.parse(readFileSync(new URL('../lib/entrenamiento/audio-manifest-actualizaciones.json',import.meta.url),'utf8'))
  for(const c of clips) {
    assert.equal(c.receta.voiceId,'MUPKcfGINNwjsSaWv8yx')
    assert.match(c.texto,/<break time=/)
    assert.doesNotMatch(c.texto,/\d+\s*%|\*\*|—/)
    for(const tramo of c.texto.split(/<break[^>]*\/>/))assert.ok(tramo.trim().length<=135,`${c.clave}: frase sin respiración`)
    assert.equal(manifest[c.clave]?.hash,c.hash,`${c.clave}: falta grabación actual`)
    assert.ok(existsSync(new URL(`../public/entrenamiento/${c.file}`,import.meta.url)))
  }
})
