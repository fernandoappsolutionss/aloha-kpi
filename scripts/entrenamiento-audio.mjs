// Genera los clips de voz del entrenamiento con ElevenLabs y mantiene manifests
// separados. Los tours se validan contra su manifest congelado y nunca se
// regeneran; oficio y guía se generan incrementalmente por hash.
//
//   node scripts/entrenamiento-audio.mjs --muestra
//   node scripts/entrenamiento-audio.mjs --seco
//   node scripts/entrenamiento-audio.mjs --solo tour
//   node scripts/entrenamiento-audio.mjs --solo oficio
//   node scripts/entrenamiento-audio.mjs --solo of-nor-1
//   node scripts/entrenamiento-audio.mjs --solo normativa
//   node scripts/entrenamiento-audio.mjs --solo guia
//   node scripts/entrenamiento-audio.mjs --solo guia:of-met-1
//   node scripts/entrenamiento-audio.mjs --solo general
//   node scripts/entrenamiento-audio.mjs --concurrencia 3
//
// API key: ELEVENLABS_API_KEY en el entorno o en
// ~/.studio-reels-assembler/credentials.env. La key solo se exige cuando hay
// clips nuevos por generar en una corrida real.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MODULOS } from '../lib/entrenamiento/modulos.js'
import { MODULOS_OFICIO, CURSOS, objetivoDe, pfvAparte } from '../lib/entrenamiento/oficio/catalogo.js'
import { GUIA, GUIA_GENERAL } from '../lib/entrenamiento/oficio/guia.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST = join(ROOT, 'lib/entrenamiento/audio-manifest.json')
const MANIFEST_OFICIO = join(ROOT, 'lib/entrenamiento/audio-manifest-oficio.json')
const MANIFEST_GUIA = join(ROOT, 'lib/entrenamiento/audio-manifest-guia.json')
const PUB = join(ROOT, 'public/entrenamiento')
const MUESTRA_DIR = join(ROOT, '.muestra')

const SETTINGS_APROBADOS = {
  model_id: 'eleven_multilingual_v2',
  voice_settings: {
    stability: 0.38,
    similarity_boost: 0.85,
    style: 0.45,
    use_speaker_boost: true,
    speed: 1.0,
  },
}

export const RECETAS = {
  tour: {
    voiceId: 'I0uPgrx2Hf3g0QzMYLnq',
    settings: SETTINGS_APROBADOS,
    format: 'mp3_44100_64',
  },
  oficio: {
    voiceId: 'MUPKcfGINNwjsSaWv8yx',
    settings: SETTINGS_APROBADOS,
    format: 'mp3_44100_64',
  },
  guia: {
    voiceId: 'MUPKcfGINNwjsSaWv8yx',
    settings: SETTINGS_APROBADOS,
    format: 'mp3_44100_64',
  },
}

// Español locutado ≈ 14,5 caracteres por segundo. Es un estimado para avisar
// en seco, no una medición: la duración real la escribe el manifest con los
// bytes del mp3 que devuelve la API.
const CPS = 14.5
const SEG_MIN = 25
const SEG_MAX = 70
const SLOTS_GUIA = ['vista', 'palabras', 'cierre']
const SLOTS_GENERALES = ['laminas', 'lectura', 'preguntas']
const CURSOS_MUESTRA = ['metodo', 'normativa', 'centro']

const MODULOS_DIGITALES = () => MODULOS_OFICIO.filter((m) => m.roles.length > 0)

function rutasReales() {
  return {
    manifestTour: MANIFEST,
    manifestOficio: MANIFEST_OFICIO,
    manifestGuia: MANIFEST_GUIA,
    publicDir: PUB,
    muestraDir: MUESTRA_DIR,
    credentialsFile: join(homedir(), '.studio-reels-assembler/credentials.env'),
  }
}

function normalizaPaths(paths = {}) {
  return { ...rutasReales(), ...paths }
}

function apiKey(env, paths) {
  if (env?.ELEVENLABS_API_KEY) return env.ELEVENLABS_API_KEY
  try {
    const archivo = readFileSync(paths.credentialsFile, 'utf8')
    const m = archivo.match(/^ELEVENLABS_API_KEY=["']?([^"'\n]+)/m)
    if (m) return m[1]
  } catch {}
  throw new Error('Falta ELEVENLABS_API_KEY')
}

// El hash cubre exactamente lo que cambia el audio resultante: texto, settings,
// voz y formato, en el mismo orden legacy de los 66 tours ya generados.
export const hashDe = (texto, receta) => createHash('sha1')
  .update(String(texto ?? '') + JSON.stringify(receta.settings) + receta.voiceId + receta.format)
  .digest('hex')
  .slice(0, 12)

// Escritura atómica: nunca dejar el manifest a medias si el proceso muere.
function guardarManifest(ruta, manifest) {
  mkdirSync(dirname(ruta), { recursive: true })
  writeFileSync(`${ruta}.tmp`, JSON.stringify(manifest, null, 2) + '\n')
  renameSync(`${ruta}.tmp`, ruta)
}

const leerManifest = (ruta) => (existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')) : {})

// ── TEXTO ─────────────────────────────────────────────────────────────────

// Lo que se le manda a la API es texto hablado: el markdown se lee, "B/.15.00"
// se lee "be barra punto quince punto cero cero" y "8%" se lee "ocho por
// ciento" solo si se lo escribes así.
export function saneaVoz(texto) {
  return String(texto ?? '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/B\/\.\s*([\d.,]+)/g, (_, n) => `${String(n).replace(/[.,]00$/, '')} balboas`)
    .replace(/(\d)\s*%/g, '$1 por ciento')
    .replace(/\s+/g, ' ')
    .trim()
}

function primerasFrases(texto, n) {
  const frases = String(texto || '').split(/(?<=[.?!])\s+/).filter(Boolean)
  return frases.slice(0, n).join(' ')
}

const enMinuscula = (s) => (s ? s[0].toLowerCase() + s.slice(1) : '')

function recorta(texto, max) {
  if (texto.length <= max) return texto
  const corte = texto.slice(0, max)
  const punto = corte.lastIndexOf('. ')
  return (punto > max * 0.5 ? corte.slice(0, punto + 1) : corte.trim()) + ''
}

export function textoVozOficio(m) {
  if (m?.voz) return String(m.voz).trim()
  const objetivo = saneaVoz(objetivoDe(m))
  const apertura = saneaVoz(primerasFrases((m?.bloques || []).find((b) => b.t === 'p' && b.texto)?.texto || '', 2))
  const pfv = saneaVoz(pfvAparte(m))
  const partes = [`${saneaVoz(m?.titulo || '')}.`]
  if (objetivo) partes.push(`Al terminar este módulo: <break time="0.3s"/> ${enMinuscula(objetivo)}`)
  if (apertura) partes.push(recorta(apertura, 460))
  if (pfv) partes.push(`El producto que sostiene esto: <break time="0.3s"/> ${enMinuscula(pfv)}`)
  return partes.join(' <break time="0.4s"/> ')
}

// ── CLIPS ─────────────────────────────────────────────────────────────────

export function clipsDeTours(solo = null) {
  const out = []
  for (const m of MODULOS) {
    if (solo && m.id !== solo) continue
    out.push({
      pista: 'tour',
      clave: `${m.id}/intro`,
      file: `${m.id}/intro.mp3`,
      texto: m.intro.voz || m.intro.texto,
      receta: RECETAS.tour,
    })
    for (const p of m.pasos) {
      out.push({
        pista: 'tour',
        clave: `${m.id}/${p.id}`,
        file: `${m.id}/${p.id}.mp3`,
        texto: p.voz || p.texto,
        receta: RECETAS.tour,
      })
    }
  }
  return out
}

export function clipsDeOficio(filtro = null) {
  return MODULOS_DIGITALES()
    .filter((m) => !filtro || m.id === filtro || m.curso === filtro)
    .map((m) => ({
      pista: 'oficio',
      clave: `oficio/${m.id}`,
      file: `oficio/${m.id}.mp3`,
      texto: textoVozOficio(m),
      receta: RECETAS.oficio,
      aMano: Boolean(m.voz),
    }))
}

export function clipsDeGuia(filtro = null) {
  const out = []
  const digitales = MODULOS_DIGITALES()
  if (filtro !== 'general') {
    for (const m of digitales) {
      if (filtro && m.id !== filtro) continue
      const guion = GUIA[m.id]
      if (!guion) continue
      for (const slot of SLOTS_GUIA) {
        out.push({
          pista: 'guia',
          clave: `guia/${m.id}/${slot}`,
          file: `guia/${m.id}/${slot}.mp3`,
          texto: guion[slot],
          receta: RECETAS.guia,
        })
      }
    }
  }
  if (!filtro || filtro === 'general') {
    for (const slot of SLOTS_GENERALES) {
      out.push({
        pista: 'guia',
        clave: `guia/general/${slot}`,
        file: `guia/general/${slot}.mp3`,
        texto: GUIA_GENERAL[slot],
        receta: RECETAS.guia,
      })
    }
  }
  return out
}

export function seleccionMuestraOficio(clips) {
  const porCurso = (curso) => clips.find((c) => MODULOS_DIGITALES().find((m) => `oficio/${m.id}` === c.clave)?.curso === curso)
  const elegidos = CURSOS_MUESTRA.map(porCurso).filter(Boolean)
  for (const c of clips) {
    if (elegidos.length >= 3) break
    if (!elegidos.includes(c)) elegidos.push(c)
  }
  return elegidos.slice(0, 3)
}

export function resuelveSolo(valor) {
  if (!valor) return null
  if (valor === 'tour' || valor === 'oficio') return { pista: valor, filtro: null }
  if (valor === 'guia') return { pista: 'guia', filtro: null }
  if (valor === 'general') return { pista: 'guia', filtro: 'general' }
  if (valor.startsWith('guia:')) {
    const filtro = valor.slice('guia:'.length)
    if (MODULOS_DIGITALES().some((m) => m.id === filtro)) return { pista: 'guia', filtro }
    return null
  }
  if (MODULOS.some((m) => m.id === valor)) return { pista: 'tour', filtro: valor }
  if (MODULOS_DIGITALES().some((m) => m.id === valor)) return { pista: 'oficio', filtro: valor }
  if (CURSOS[valor]) return { pista: 'oficio', filtro: valor }
  return null
}

const segEstimados = (texto) => Math.round(saneaVoz(texto).replace(/<break[^>]*\/>/g, '').length / CPS)

function parseArgs(argsEntrada) {
  const args = Array.from(argsEntrada || [])
  const a = args[1]?.endsWith?.('entrenamiento-audio.mjs') || args[1]?.includes?.('/scripts/entrenamiento-audio.mjs')
    ? args.slice(2)
    : args
  const soloIndex = a.indexOf('--solo')
  const concurrenciaIndex = a.indexOf('--concurrencia')
  return {
    args: a,
    muestra: a.includes('--muestra'),
    seco: a.includes('--seco'),
    solo: soloIndex >= 0 ? a[soloIndex + 1] : null,
    tieneSolo: soloIndex >= 0,
    concurrenciaArg: concurrenciaIndex >= 0 ? Number(a[concurrenciaIndex + 1]) : null,
  }
}

function objetivoSeleccion(parsed) {
  return parsed.tieneSolo ? resuelveSolo(parsed.solo) : { pista: null, filtro: null }
}

function clipsToursDeObjetivo(objetivo) {
  return objetivo.pista === 'oficio' || objetivo.pista === 'guia'
    ? []
    : clipsDeTours(objetivo.pista === 'tour' ? objetivo.filtro : null)
}

function clipsGenerablesDeObjetivo(objetivo) {
  return [
    ...(objetivo.pista === 'tour' || objetivo.pista === 'guia' ? [] : clipsDeOficio(objetivo.pista === 'oficio' ? objetivo.filtro : null)),
    ...(objetivo.pista === 'tour' || objetivo.pista === 'oficio' ? [] : clipsDeGuia(objetivo.pista === 'guia' ? objetivo.filtro : null)),
  ]
}

function clipsSeleccionados(parsed) {
  if (parsed.muestra) {
    const oficio = seleccionMuestraOficio(clipsDeOficio())
    const guiaVista = clipsDeGuia('of-met-1').find((c) => c.clave === 'guia/of-met-1/vista')
    return [...oficio, guiaVista].filter(Boolean)
  }
  const objetivo = objetivoSeleccion(parsed)
  if (!objetivo) return null
  return [...clipsToursDeObjetivo(objetivo), ...clipsGenerablesDeObjetivo(objetivo)]
}

function validarTours(clips, manifest, publicDir) {
  const errores = []
  for (const c of clips) {
    const esperado = hashDe(c.texto, RECETAS.tour)
    const entrada = manifest[c.clave]
    if (!entrada) {
      errores.push(`${c.clave}: falta en manifest de tours`)
      continue
    }
    if (entrada.hash !== esperado) errores.push(`${c.clave}: hash ${entrada.hash} != ${esperado}`)
    if (!entrada.file) errores.push(`${c.clave}: entrada sin file`)
    else if (!existsSync(join(publicDir, entrada.file))) errores.push(`${c.clave}: falta public/entrenamiento/${entrada.file}`)
  }
  return errores
}

async function cadaConLimite(items, limite, worker) {
  let siguiente = 0
  const n = Math.max(1, Math.min(Number(limite) || 1, 3, items.length || 1))
  await Promise.all(Array.from({ length: n }, async () => {
    while (siguiente < items.length) {
      const idx = siguiente
      siguiente += 1
      await worker(items[idx], idx)
    }
  }))
}

function loggerDe(logger) {
  return {
    log: (msg) => { if (logger?.log) logger.log(msg) },
    error: (msg) => { if (logger?.error) logger.error(msg) },
  }
}

function errorSeguro(err, key = '') {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  let msg = raw.replace(/\s+/g, ' ').trim() || 'error desconocido'
  if (key) msg = msg.split(key).join('[api-key]')
  if (msg.length > 500) msg = `${msg.slice(0, 497)}...`
  return msg
}

function registrarFalloClip({ clip, result, out, detalle }) {
  const msg = `x ${clip.clave}: ${detalle}`
  result.exitCode = 1
  result.errores.push(msg)
  out.error(msg)
  return false
}

export async function ejecutarAudio({ args = [], env = process.env, fetchImpl = globalThis.fetch, paths: pathsEntrada = {}, concurrencia = null, logger = null } = {}) {
  const paths = normalizaPaths(pathsEntrada)
  const parsed = parseArgs(args)
  const out = loggerDe(logger)
  const result = {
    exitCode: 0,
    seleccion: [],
    generados: 0,
    saltados: 0,
    caracteres: 0,
    fetches: 0,
    errores: [],
    avisos: [],
  }

  if (parsed.muestra && parsed.tieneSolo) {
    result.exitCode = 1
    result.errores.push('--muestra es incompatible con --solo.')
    out.error(`x ${result.errores[0]}`)
    return result
  }

  if (parsed.muestra) {
    const seleccion = clipsSeleccionados(parsed)
    result.seleccion = seleccion
    return ejecutarMuestra({ seleccion, parsed, env, fetchImpl, paths, result, out, concurrencia: concurrencia ?? parsed.concurrenciaArg })
  }

  const objetivo = objetivoSeleccion(parsed)
  if (!objetivo) {
    result.exitCode = 1
    result.errores.push(`--solo ${parsed.solo || '(sin valor)'}: no existe o no es digital.`)
    out.error(`x ${result.errores[0]}`)
    return result
  }

  const manifests = {
    tour: leerManifest(paths.manifestTour),
    oficio: {},
    guia: {},
  }
  const rutaManifest = {
    tour: paths.manifestTour,
    oficio: paths.manifestOficio,
    guia: paths.manifestGuia,
  }

  const tours = clipsToursDeObjetivo(objetivo)
  if (tours.length) {
    const erroresTour = validarTours(tours, manifests.tour, paths.publicDir)
    if (erroresTour.length) {
      result.exitCode = 1
      result.errores.push(...erroresTour)
      for (const e of erroresTour) out.error(`x ${e}`)
      return result
    }
  }

  const generables = clipsGenerablesDeObjetivo(objetivo)
  const seleccion = [...tours, ...generables]
  result.seleccion = seleccion
  manifests.oficio = leerManifest(paths.manifestOficio)
  manifests.guia = leerManifest(paths.manifestGuia)
  const pendientes = []
  for (const c of generables) {
    const hash = hashDe(c.texto, c.receta)
    const destino = join(paths.publicDir, c.file)
    const manifest = manifests[c.pista]
    if (manifest[c.clave]?.hash === hash && existsSync(destino)) {
      result.saltados += 1
      continue
    }
    const seg = segEstimados(c.texto)
    if (c.pista === 'oficio' && (seg < SEG_MIN || seg > SEG_MAX)) {
      result.avisos.push(`${c.clave}: ~${seg}s (fuera de ${SEG_MIN}-${SEG_MAX}s)${c.aMano ? '' : ' · sin campo voz, texto armado'}`)
    }
    result.caracteres += c.texto.length
    pendientes.push({ ...c, hash, destino, seg })
  }

  if (parsed.seco) {
    result.generados = pendientes.length
    for (const c of pendientes) {
      out.log(`· ${c.clave} -> ${c.file} · ~${c.seg}s · ${c.texto.length} caracteres${c.aMano === false ? ' · armado' : ''}`)
    }
    out.log('En seco: no se llamó a la API ni se escribió ningún mp3.')
    return result
  }

  if (!pendientes.length) {
    out.log(`0 generados · ${result.saltados} sin cambios · manifest: ${Object.keys(manifests.tour).length + Object.keys(manifests.oficio).length + Object.keys(manifests.guia).length} clips`)
    return result
  }

  let key
  try {
    key = apiKey(env, paths)
  } catch (err) {
    result.exitCode = 1
    result.errores.push(err.message)
    out.error(`x ${err.message}`)
    return result
  }

  await cadaConLimite(pendientes, concurrencia ?? parsed.concurrenciaArg ?? 1, async (c) => {
    const ok = await generarClip({ clip: c, key, fetchImpl, baseDir: paths.publicDir, result, out })
    if (!ok) return
    const manifest = manifests[c.pista]
    manifest[c.clave] = { hash: c.hash, file: c.file, seg: c.segReal }
    guardarManifest(rutaManifest[c.pista], manifest)
  })

  if (result.avisos.length) out.log(`\nRevisa el largo de estos clips:\n  ${result.avisos.join('\n  ')}`)
  out.log(`\n${result.generados} generados · ${result.saltados} sin cambios · ${result.caracteres} caracteres a la API · manifest: ${Object.keys(manifests.tour).length + Object.keys(manifests.oficio).length + Object.keys(manifests.guia).length} clips`)
  return result
}

async function ejecutarMuestra({ seleccion, parsed, env, fetchImpl, paths, result, out, concurrencia }) {
  const pendientes = seleccion.map((c) => ({
    ...c,
    hash: hashDe(c.texto, c.receta),
    destino: join(paths.muestraDir, c.file),
    seg: segEstimados(c.texto),
  }))
  result.caracteres = pendientes.reduce((acc, c) => acc + c.texto.length, 0)
  if (parsed.seco) {
    result.generados = pendientes.length
    out.log('Muestra en seco: no se llamó a la API ni se escribió ningún mp3.')
    return result
  }

  let key
  try {
    key = apiKey(env, paths)
  } catch (err) {
    result.exitCode = 1
    result.errores.push(err.message)
    out.error(`x ${err.message}`)
    return result
  }

  await cadaConLimite(pendientes, concurrencia ?? 1, async (c) => {
    await generarClip({ clip: c, key, fetchImpl, baseDir: paths.muestraDir, result, out })
  })
  out.log(`${result.generados} muestras generadas en ${paths.muestraDir}`)
  return result
}

async function generarClip({ clip, key, fetchImpl, baseDir, result, out }) {
  if (!fetchImpl) {
    return registrarFalloClip({ clip, result, out, detalle: 'No hay fetch disponible para generar audio.' })
  }
  const receta = clip.receta
  try {
    mkdirSync(dirname(join(baseDir, clip.file)), { recursive: true })
    result.fetches += 1
    const res = await fetchImpl(`https://api.elevenlabs.io/v1/text-to-speech/${receta.voiceId}?output_format=${receta.format}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clip.texto, ...receta.settings }),
    })
    if (!res.ok) {
      let body = ''
      try {
        body = errorSeguro(await res.text(), key)
      } catch (err) {
        body = `no se pudo leer respuesta: ${errorSeguro(err, key)}`
      }
      return registrarFalloClip({ clip, result, out, detalle: `${res.status} ${body}`.trim() })
    }
    const buf = Buffer.from(await res.arrayBuffer())
    writeFileSync(join(baseDir, clip.file), buf)
    clip.segReal = Math.round((buf.length * 8) / 64000)
    result.generados += 1
    out.log(`ok ${clip.clave} (${clip.segReal}s)`)
    return true
  } catch (err) {
    return registrarFalloClip({ clip, result, out, detalle: errorSeguro(err, key) })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await ejecutarAudio({ args: process.argv.slice(2), env: process.env, fetchImpl: fetch, logger: console })
  process.exitCode = result.exitCode
}
