import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MODULOS } from '../lib/entrenamiento/modulos.js'
import { MODULOS_OFICIO, CURSOS } from '../lib/entrenamiento/oficio/catalogo.js'
import { GUIA, GUIA_GENERAL } from '../lib/entrenamiento/oficio/guia.js'
import * as audio from '../scripts/entrenamiento-audio.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const DIGITALES = MODULOS_OFICIO.filter((m) => m.roles.length > 0)
const PAPEL = MODULOS_OFICIO.filter((m) => m.roles.length === 0)
const SLOTS_GUIA = ['vista', 'palabras', 'cierre']
const SLOTS_GENERALES = ['laminas', 'lectura', 'preguntas']

const json = (ruta) => JSON.parse(readFileSync(ruta, 'utf8'))
const legacyHash = (texto, receta) => createHash('sha1')
  .update(texto + JSON.stringify(receta.settings) + receta.voiceId + receta.format)
  .digest('hex')
  .slice(0, 12)

function rutasTemporales(seed = {}) {
  const root = mkdtempSync(join(tmpdir(), 'aloha-audio-'))
  const lib = join(root, 'lib/entrenamiento')
  mkdirSync(lib, { recursive: true })
  const manifestTour = join(lib, 'audio-manifest.json')
  const manifestOficio = join(lib, 'audio-manifest-oficio.json')
  const manifestGuia = join(lib, 'audio-manifest-guia.json')
  writeFileSync(manifestTour, seed.tour ?? '{}\n')
  writeFileSync(manifestOficio, seed.oficio ?? '{}\n')
  writeFileSync(manifestGuia, seed.guia ?? '{}\n')
  return {
    root,
    manifestTour,
    manifestOficio,
    manifestGuia,
    publicDir: join(root, 'public/entrenamiento'),
    muestraDir: join(root, '.muestra'),
  }
}

function archivosBajo(dir) {
  if (!existsSync(dir)) return []
  const out = []
  const walk = (actual) => {
    for (const nombre of readdirSync(actual)) {
      const ruta = join(actual, nombre)
      if (statSync(ruta).isDirectory()) walk(ruta)
      else out.push(relative(dir, ruta))
    }
  }
  walk(dir)
  return out.sort()
}

function fetchOk(calls, bytes = [77, 80, 51, 10]) {
  return async (url, options = {}) => {
    calls.push({
      url: String(url),
      headers: options.headers || {},
      body: JSON.parse(options.body || '{}'),
    })
    const cuerpo = Uint8Array.from(bytes)
    return {
      ok: true,
      status: 200,
      async arrayBuffer() { return cuerpo.buffer },
      async text() { return '' },
    }
  }
}

function fetchProhibido() {
  return async () => {
    throw new Error('este test no debe llamar fetch')
  }
}

test('RECETAS fija identidad aprobada y hash legacy por familia', () => {
  assert.deepEqual(Object.keys(audio.RECETAS).sort(), ['guia', 'oficio', 'tour'])
  assert.equal(audio.RECETAS.tour.voiceId, 'I0uPgrx2Hf3g0QzMYLnq')
  for (const pista of ['oficio', 'guia']) {
    assert.equal(audio.RECETAS[pista].voiceId, 'MUPKcfGINNwjsSaWv8yx')
    assert.equal(audio.RECETAS[pista].format, 'mp3_44100_64')
    assert.deepEqual(audio.RECETAS[pista].settings, {
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.38,
        similarity_boost: 0.85,
        style: 0.45,
        use_speaker_boost: true,
        speed: 1.0,
      },
    })
  }
  assert.equal(audio.hashDe('Texto estable.', audio.RECETAS.guia), legacyHash('Texto estable.', audio.RECETAS.guia))
})

test('clipsDeGuia produce 64x3 más tres generales y respeta filtros', () => {
  const todos = audio.clipsDeGuia()
  assert.equal(todos.length, DIGITALES.length * 3 + 3)
  assert.deepEqual(
    todos.map((c) => c.clave).sort(),
    [
      ...DIGITALES.flatMap((m) => SLOTS_GUIA.map((slot) => `guia/${m.id}/${slot}`)),
      ...SLOTS_GENERALES.map((slot) => `guia/general/${slot}`),
    ].sort(),
  )
  for (const c of todos) {
    assert.equal(c.pista, 'guia')
    assert.match(c.file, /^guia\/.+\.mp3$/)
    assert.ok(c.texto.length > 80, `${c.clave}: texto vacío o demasiado corto`)
  }
  assert.deepEqual(
    audio.clipsDeGuia('of-met-1').map((c) => c.clave),
    SLOTS_GUIA.map((slot) => `guia/of-met-1/${slot}`),
  )
  assert.deepEqual(
    audio.clipsDeGuia('general').map((c) => c.clave),
    SLOTS_GENERALES.map((slot) => `guia/general/${slot}`),
  )
  assert.deepEqual(audio.clipsDeGuia(PAPEL[0].id), [])
})

test('manifest de guía: toda entrada apunta a un clip real y a un mp3 en disco', () => {
  const rutaManifest = join(ROOT, 'lib/entrenamiento/audio-manifest-guia.json')
  assert.ok(existsSync(rutaManifest), 'falta el manifest de guía')
  const guia = json(rutaManifest)
  const tour = json(join(ROOT, 'lib/entrenamiento/audio-manifest.json'))
  const oficio = json(join(ROOT, 'lib/entrenamiento/audio-manifest-oficio.json'))
  const validas = new Set(audio.clipsDeGuia().map((c) => c.clave))
  for (const [k, v] of Object.entries(guia)) {
    assert.ok(validas.has(k), `clave huérfana en el manifest de guía: ${k}`)
    assert.ok(v?.hash && v?.file, `${k}: entrada sin hash o sin archivo`)
    assert.ok(existsSync(join(ROOT, 'public/entrenamiento', v.file)), `falta el mp3 de ${k}: public/entrenamiento/${v.file}`)
    assert.equal(k in tour, false, `${k} no puede estar en el manifest de tours`)
    assert.equal(k in oficio, false, `${k} no puede estar en el manifest de oficio`)
  }
})

const manifestGuiaReal = existsSync(join(ROOT, 'lib/entrenamiento/audio-manifest-guia.json'))
  ? json(join(ROOT, 'lib/entrenamiento/audio-manifest-guia.json'))
  : {}
test('manifest de guía: 195 clips completos cuando empieza la generación', {
  skip: Object.keys(manifestGuiaReal).length === 0
    ? 'audio de guía pendiente de generar: npm run entrenamiento:audio -- --solo guia'
    : false,
}, () => {
  assert.deepEqual(
    Object.keys(manifestGuiaReal).sort(),
    audio.clipsDeGuia().map((c) => c.clave).sort(),
    'faltan clips de guía por generar: corre npm run entrenamiento:audio -- --solo guia',
  )
})

test('clips de oficio y guía cubren los mismos 64 módulos digitales, sin papel', () => {
  assert.deepEqual(audio.clipsDeOficio().map((c) => c.clave).sort(), DIGITALES.map((m) => `oficio/${m.id}`).sort())
  assert.deepEqual(Object.keys(GUIA).sort(), DIGITALES.map((m) => m.id).sort())
  assert.deepEqual(Object.keys(GUIA_GENERAL).sort(), SLOTS_GENERALES.sort())
  for (const curso of Object.keys(CURSOS)) {
    assert.equal(audio.clipsDeOficio(curso).length, DIGITALES.filter((m) => m.curso === curso).length)
  }
})

test('tours congelados recalculan el hash actual y --solo tour no usa red ni credenciales', async () => {
  const manifest = json(join(ROOT, 'lib/entrenamiento/audio-manifest.json'))
  const clips = new Map(audio.clipsDeTours().map((c) => [c.clave, c]))
  assert.equal(Object.keys(manifest).length, 66)
  for (const [clave, entrada] of Object.entries(manifest)) {
    assert.equal(audio.hashDe(clips.get(clave)?.texto, audio.RECETAS.tour), entrada.hash, `${clave}: hash de tour cambió`)
  }
  const result = await audio.ejecutarAudio({ args: ['--solo', 'tour'], env: {}, fetchImpl: fetchProhibido() })
  assert.equal(result.exitCode, 0)
  assert.equal(result.generados, 0)
  assert.equal(result.fetches, 0)
})

test('una discrepancia de tour sale no cero antes de pedir credencial o llamar fetch', async () => {
  const paths = rutasTemporales({
    tour: JSON.stringify({ 'meta/intro': { hash: '000000000000', file: 'meta/intro.mp3' } }, null, 2) + '\n',
  })
  mkdirSync(dirname(join(paths.publicDir, 'meta/intro.mp3')), { recursive: true })
  writeFileSync(join(paths.publicDir, 'meta/intro.mp3'), 'mp3')
  const result = await audio.ejecutarAudio({ args: ['--solo', 'tour'], env: {}, fetchImpl: fetchProhibido(), paths })
  assert.equal(result.exitCode, 1)
  assert.equal(result.fetches, 0)
  assert.ok(result.errores.some((e) => /meta\/intro/.test(e)))
})

test('CLI selecciona familias y rechaza papel, inválidos y mezcla muestra/solo', async () => {
  const casos = [
    { args: ['--seco', '--solo', 'oficio'], n: 64, primera: 'oficio/' },
    { args: ['--seco', '--solo', 'of-met-1'], claves: ['oficio/of-met-1'] },
    { args: ['--seco', '--solo', 'metodo'], n: DIGITALES.filter((m) => m.curso === 'metodo').length, primera: 'oficio/' },
    { args: ['--seco', '--solo', 'guia'], n: 195, primera: 'guia/' },
    { args: ['--seco', '--solo', 'guia:of-met-1'], claves: SLOTS_GUIA.map((slot) => `guia/of-met-1/${slot}`) },
    { args: ['--seco', '--solo', 'general'], claves: SLOTS_GENERALES.map((slot) => `guia/general/${slot}`) },
    { args: ['--seco', '--solo', MODULOS[0].id], n: MODULOS[0].pasos.length + 1, primera: `${MODULOS[0].id}/`, realPaths: true },
  ]
  for (const c of casos) {
    const result = await audio.ejecutarAudio({ args: c.args, env: {}, fetchImpl: fetchProhibido(), paths: c.realPaths ? undefined : rutasTemporales() })
    assert.equal(result.exitCode, 0, c.args.join(' '))
    if (c.claves) assert.deepEqual(result.seleccion.map((x) => x.clave), c.claves)
    else {
      assert.equal(result.seleccion.length, c.n, c.args.join(' '))
      assert.ok(result.seleccion[0].clave.startsWith(c.primera), c.args.join(' '))
    }
  }

  for (const args of [
    ['--solo', PAPEL[0].id],
    ['--solo', `guia:${PAPEL[0].id}`],
    ['--solo', 'no-existe'],
    ['--muestra', '--solo', 'oficio'],
  ]) {
    const result = await audio.ejecutarAudio({ args, env: {}, fetchImpl: fetchProhibido(), paths: rutasTemporales() })
    assert.equal(result.exitCode, 1, args.join(' '))
    assert.equal(result.fetches, 0, args.join(' '))
  }
})

test('--seco no pide key, no llama red y no escribe manifests ni mp3', async () => {
  const paths = rutasTemporales()
  const antes = [paths.manifestTour, paths.manifestOficio, paths.manifestGuia].map((p) => readFileSync(p, 'utf8'))
  const result = await audio.ejecutarAudio({ args: ['--seco', '--solo', 'guia'], env: {}, fetchImpl: fetchProhibido(), paths })
  assert.equal(result.exitCode, 0)
  assert.equal(result.seleccion.length, 195)
  assert.equal(result.fetches, 0)
  assert.deepEqual([paths.manifestTour, paths.manifestOficio, paths.manifestGuia].map((p) => readFileSync(p, 'utf8')), antes)
  assert.deepEqual(archivosBajo(paths.publicDir), [])
})

test('--muestra genera cuatro mp3 en .muestra y deja byte-idénticos manifests y public', async () => {
  const paths = rutasTemporales({
    tour: '{\"sentinel\":\"tour\"}\n',
    oficio: '{\"sentinel\":\"oficio\"}\n',
    guia: '{\"sentinel\":\"guia\"}\n',
  })
  const antes = [paths.manifestTour, paths.manifestOficio, paths.manifestGuia].map((p) => readFileSync(p, 'utf8'))
  const calls = []
  const result = await audio.ejecutarAudio({
    args: ['--muestra'],
    env: { ELEVENLABS_API_KEY: 'test-key' },
    fetchImpl: fetchOk(calls),
    paths,
  })
  assert.equal(result.exitCode, 0)
  assert.equal(result.generados, 4)
  assert.equal(calls.length, 4)
  assert.deepEqual([paths.manifestTour, paths.manifestOficio, paths.manifestGuia].map((p) => readFileSync(p, 'utf8')), antes)
  assert.deepEqual(archivosBajo(paths.publicDir), [])
  const muestra = archivosBajo(paths.muestraDir)
  assert.equal(muestra.length, 4)
  assert.ok(muestra.includes('guia/of-met-1/vista.mp3'))
  for (const f of muestra) assert.match(f, /\.mp3$/)
})

test('generar guía usa voz aprobada, settings exactos y actualiza solo manifest guía', async () => {
  const paths = rutasTemporales({
    tour: '{\"sentinel\":\"tour\"}\n',
    oficio: '{\"sentinel\":\"oficio\"}\n',
  })
  const antesTour = readFileSync(paths.manifestTour, 'utf8')
  const antesOficio = readFileSync(paths.manifestOficio, 'utf8')
  const calls = []
  const result = await audio.ejecutarAudio({
    args: ['--solo', 'guia:of-met-1'],
    env: { ELEVENLABS_API_KEY: 'test-key' },
    fetchImpl: fetchOk(calls, [1, 2, 3, 4, 5, 6, 7, 8]),
    paths,
    concurrencia: 3,
  })
  const claves = SLOTS_GUIA.map((slot) => `guia/of-met-1/${slot}`)
  assert.equal(result.exitCode, 0)
  assert.deepEqual(result.seleccion.map((c) => c.clave), claves)
  assert.equal(calls.length, 3)
  for (const call of calls) {
    assert.match(call.url, new RegExp(`/text-to-speech/${audio.RECETAS.guia.voiceId}\\?output_format=${audio.RECETAS.guia.format}$`))
    assert.equal(call.headers['xi-api-key'], 'test-key')
    assert.equal(call.body.model_id, audio.RECETAS.guia.settings.model_id)
    assert.deepEqual(call.body.voice_settings, audio.RECETAS.guia.settings.voice_settings)
  }
  assert.equal(readFileSync(paths.manifestTour, 'utf8'), antesTour)
  assert.equal(readFileSync(paths.manifestOficio, 'utf8'), antesOficio)
  const manifest = json(paths.manifestGuia)
  assert.deepEqual(Object.keys(manifest).sort(), claves.sort())
  for (const clip of result.seleccion) {
    assert.equal(manifest[clip.clave].hash, legacyHash(clip.texto, audio.RECETAS.guia))
    assert.ok(existsSync(join(paths.publicDir, manifest[clip.clave].file)), `${clip.clave}: no escribió mp3`)
  }
})

test('un fallo de clip no aborta la tanda y la reanudación omite los exitosos', async () => {
  const paths = rutasTemporales()
  const clips = audio.clipsDeGuia('of-met-1')
  const falla = clips.find((c) => c.clave === 'guia/of-met-1/palabras')
  const calls = []
  const logsError = []
  const fetchConFallo = async (url, options = {}) => {
    const body = JSON.parse(options.body || '{}')
    const clip = clips.find((c) => c.texto === body.text)
    calls.push(clip?.clave || String(url))
    return {
      ok: true,
      status: 200,
      async arrayBuffer() {
        if (clip?.clave === falla.clave) throw new Error('arrayBuffer falló con test-key')
        return Uint8Array.from([9, 8, 7, calls.length]).buffer
      },
      async text() { return '' },
    }
  }

  const result = await audio.ejecutarAudio({
    args: ['--solo', 'guia:of-met-1'],
    env: { ELEVENLABS_API_KEY: 'test-key' },
    fetchImpl: fetchConFallo,
    paths,
    concurrencia: 3,
    logger: { error: (msg) => logsError.push(msg) },
  })

  assert.equal(result.exitCode, 1)
  assert.equal(result.fetches, 3)
  assert.equal(result.generados, 2)
  assert.ok(result.errores.some((e) => e.includes(falla.clave) && e.includes('arrayBuffer falló')))
  assert.equal(logsError.length, 1)
  assert.ok(logsError[0].includes(falla.clave))
  assert.ok(logsError[0].includes('[api-key]'))
  assert.equal(logsError[0].includes('test-key'), false)
  let manifest = json(paths.manifestGuia)
  assert.deepEqual(Object.keys(manifest).sort(), clips.filter((c) => c.clave !== falla.clave).map((c) => c.clave).sort())
  assert.deepEqual(archivosBajo(paths.publicDir).sort(), clips.filter((c) => c.clave !== falla.clave).map((c) => c.file).sort())

  const retryCalls = []
  const retry = await audio.ejecutarAudio({
    args: ['--solo', 'guia:of-met-1'],
    env: { ELEVENLABS_API_KEY: 'test-key' },
    fetchImpl: fetchOk(retryCalls),
    paths,
    concurrencia: 3,
  })

  assert.equal(retry.exitCode, 0)
  assert.equal(retry.saltados, 2)
  assert.equal(retry.fetches, 1)
  assert.equal(retry.generados, 1)
  assert.equal(retryCalls.length, 1)
  assert.equal(retryCalls[0].body.text, falla.texto)
  manifest = json(paths.manifestGuia)
  assert.deepEqual(Object.keys(manifest).sort(), clips.map((c) => c.clave).sort())
})
