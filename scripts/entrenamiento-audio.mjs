// Genera los clips de voz del entrenamiento con ElevenLabs (voz clonada de
// Fernando) y mantiene un manifest con un hash por clip: solo regenera lo que
// cambió de texto (o de voz/formato/settings). Se corre en la Mac; los mp3 se
// commitean en public/entrenamiento/.
//
//   node scripts/entrenamiento-audio.mjs --muestra        # audición: 3 clips de OFICIO
//   node scripts/entrenamiento-audio.mjs --seco           # NO llama a la API: dice qué generaría
//   node scripts/entrenamiento-audio.mjs                  # todo lo que falte o haya cambiado
//   node scripts/entrenamiento-audio.mjs --solo llenado   # un tour
//   node scripts/entrenamiento-audio.mjs --solo of-nor-1  # un módulo de oficio
//   node scripts/entrenamiento-audio.mjs --solo normativa # un curso de oficio entero
//   node scripts/entrenamiento-audio.mjs --solo oficio    # los 40 módulos de oficio
//
// API key: ELEVENLABS_API_KEY en el entorno o en ~/.studio-reels-assembler/credentials.env
//
// ── DOS PISTAS, DOS MANIFESTS ─────────────────────────────────────────────
// TOUR (los 9 recorridos del sistema): un clip por intro y por paso, en
//   lib/entrenamiento/audio-manifest.json. Ese manifest está blindado por un
//   test que rechaza cualquier clave que no sea un paso real de un tour, así
//   que el oficio NO se mezcla ahí.
// OFICIO (los 40 módulos del puesto): UN clip por módulo — su presentación—,
//   en lib/entrenamiento/audio-manifest-oficio.json. Locutar los 40 módulos
//   enteros serían ~90 minutos de audio y un costo de API que no se justifica:
//   el módulo se LEE, la voz solo lo presenta y lo enmarca.
//
// ── CÓMO SE ESCRIBE EL CAMPO `voz` PARA QUE NO SUENE ROBOTIZADA ───────────
// El modelo y los settings ya están del lado humano (stability 0.38 deja que la
// entonación varíe; style 0.45 mete intención). Lo que decide de verdad si
// suena a persona o a lector automático es EL TEXTO. Reglas, en orden de
// impacto:
//
// 1. FRASES CORTAS. Doce, quince palabras. Un punto es una respiración; una
//    coma es un tropiezo. Si la frase no te cabe en un aliento, pártela.
// 2. RESPIRA CON MARCAS. <break time="0.3s"/> donde tú tomarías aire, y
//    <break time="0.5s"/> antes de lo importante. Sin marcas, el modelo lee de
//    corrido y ahí aparece el robot. Dos o tres marcas por cada 40 palabras.
// 3. NADA DE LISTAS LEÍDAS DE CORRIDO. "Uno, dos, tres, cuatro" suena a
//    inventario. Di dos cosas y remata: "El resto lo ves en la pantalla".
// 4. CIFRAS EN PALABRAS Y DE UNA EN UNA. "quince balboas", no "B/.15.00".
//    "ocho por ciento", no "8%". Nunca encadenes cifras en una misma frase:
//    "170, 200, 230, 325 y 410" es ilegible en voz; di una y manda a la tabla.
// 5. SIN MARKDOWN NI SIGLAS CRUDAS. Los ** del texto escrito se leen. Escribe
//    "PFV" solo si quieres que se deletree; si no, "producto final valioso".
// 6. HABLA EN SEGUNDA PERSONA Y EN PRESENTE. "Vas a ver", "esto te sirve
//    para". Es Fernando hablándole a una persona, no una locución institucional.
// 7. LARGO: 30 a 60 segundos. En español son 75 a 150 palabras, 450 a 900
//    caracteres. --seco te dice el estimado de cada clip y te avisa si se pasa.
// 8. MAYÚSCULAS PARA ACENTUAR UNA PALABRA (el modelo las enfatiza), pero una
//    por frase. Tres mayúsculas seguidas suenan a grito.
//
// Mientras un módulo de oficio no tenga `voz`, el clip se ARMA con lo que ya
// existe (título + objetivo o primer párrafo + producto final valioso) y se
// sanea. Sirve para oír el módulo; no reemplaza un texto escrito a mano.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MODULOS } from '../lib/entrenamiento/modulos.js'
import { MODULOS_OFICIO, CURSOS, objetivoDe, pfvAparte } from '../lib/entrenamiento/oficio/catalogo.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST = join(ROOT, 'lib/entrenamiento/audio-manifest.json')
const MANIFEST_OFICIO = join(ROOT, 'lib/entrenamiento/audio-manifest-oficio.json')
const PUB = join(ROOT, 'public/entrenamiento')
const VOICE_ID = 'I0uPgrx2Hf3g0QzMYLnq' // clon profesional de Fernando
const OUTPUT_FORMAT = 'mp3_44100_64'
const SETTINGS = { model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.38, similarity_boost: 0.85, style: 0.45, use_speaker_boost: true, speed: 1.0 } }

// Español locutado ≈ 14,5 caracteres por segundo. Es un estimado para avisar en
// seco, no una medición: la duración real la escribe el manifest con los bytes
// del mp3 que devuelve la API.
const CPS = 14.5
const SEG_MIN = 25
const SEG_MAX = 70

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY
  try {
    const env = readFileSync(join(homedir(), '.studio-reels-assembler/credentials.env'), 'utf8')
    const m = env.match(/^ELEVENLABS_API_KEY=["']?([^"'\n]+)/m)
    if (m) return m[1]
  } catch {}
  throw new Error('Falta ELEVENLABS_API_KEY')
}

// El hash cubre todo lo que cambia el audio resultante: texto, voz, formato y settings.
const hashDe = (texto) => createHash('sha1').update(texto + JSON.stringify(SETTINGS) + VOICE_ID + OUTPUT_FORMAT).digest('hex').slice(0, 12)

// Escritura atómica: nunca dejar el manifest a medias si el proceso muere.
function guardarManifest(ruta, manifest) {
  writeFileSync(`${ruta}.tmp`, JSON.stringify(manifest, null, 2) + '\n')
  renameSync(`${ruta}.tmp`, ruta)
}

const leerManifest = (ruta) => (existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')) : {})

// ── TEXTO ─────────────────────────────────────────────────────────────────

// Lo que se le manda a la API es texto HABLADO: el markdown se lee, "B/.15.00"
// se lee "be barra punto quince punto cero cero" y "8%" se lee "ocho por
// ciento" solo si se lo escribes así. Esto arregla lo que se puede arreglar sin
// adivinar; el resto lo tiene que escribir a mano quien redacte el `voz`.
// ponytail: saneo léxico mínimo (markdown, balboas, porcentajes). Si algún día
// hacen falta números escritos en palabras de verdad (fechas, horas, rangos),
// eso es un normalizador aparte y con pruebas, no más regex aquí.
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

// Las primeras `n` frases de un párrafo. Un módulo abre explicando de qué va;
// esa apertura es justo la presentación que se quiere locutar.
function primerasFrases(texto, n) {
  const frases = String(texto || '').split(/(?<=[.?!])\s+/).filter(Boolean)
  return frases.slice(0, n).join(' ')
}

const enMinuscula = (s) => (s ? s[0].toLowerCase() + s.slice(1) : '')

// Corta en el último punto antes del límite: nunca deja una frase por la mitad.
function recorta(texto, max) {
  if (texto.length <= max) return texto
  const corte = texto.slice(0, max)
  const punto = corte.lastIndexOf('. ')
  return (punto > max * 0.5 ? corte.slice(0, punto + 1) : corte.trim()) + ''
}

// El texto del clip de un módulo de oficio. Si el autor escribió `voz`, esa
// manda tal cual (con sus <break>). Si no, se arma con lo que ya existe: el
// MISMO objetivo que la portada del módulo pinta en pantalla (objetivoDe) más
// su apertura. No se inventa contenido y no se toca el catálogo.
export function textoVozOficio(m) {
  if (m?.voz) return String(m.voz).trim()
  const objetivo = saneaVoz(objetivoDe(m))
  const apertura = saneaVoz(primerasFrases((m?.bloques || []).find((b) => b.t === 'p' && b.texto)?.texto || '', 2))
  // pfvAparte() devuelve '' cuando el objetivo YA es el producto final valioso:
  // así el clip no dice dos veces la misma frase con dos rótulos distintos.
  const pfv = saneaVoz(pfvAparte(m))
  const partes = [`${saneaVoz(m?.titulo || '')}.`]
  if (objetivo) partes.push(`Al terminar este módulo: <break time="0.3s"/> ${enMinuscula(objetivo)}`)
  if (apertura) partes.push(recorta(apertura, 460))
  if (pfv) partes.push(`El producto que sostiene esto: <break time="0.3s"/> ${enMinuscula(pfv)}`)
  return partes.join(' <break time="0.4s"/> ')
}

// ── CLIPS ─────────────────────────────────────────────────────────────────

// Tour: intro del módulo + cada paso. Formato de clave y de archivo intactos:
// TourHost y la página del módulo leen ese manifest tal como está.
export function clipsDeTours(solo = null) {
  const out = []
  for (const m of MODULOS) {
    if (solo && m.id !== solo) continue
    out.push({ pista: 'tour', clave: `${m.id}/intro`, file: `${m.id}/intro.mp3`, texto: m.intro.voz || m.intro.texto })
    for (const p of m.pasos) out.push({ pista: 'tour', clave: `${m.id}/${p.id}`, file: `${m.id}/${p.id}.mp3`, texto: p.voz || p.texto })
  }
  return out
}

// Oficio: UN clip por módulo. `filtro` acepta el id del módulo o el de su curso.
// ponytail: un clip de presentación por módulo, no el módulo locutado. El techo
// es que esto NO es una audioguía: quien quiera oír el módulo entero sigue sin
// poder. Si algún día se pide (accesibilidad, gente que estudia manejando),
// hace falta un clip por bloque, un player con posición y ~90 minutos de audio
// que hay que pagar y versionar; ahí se decide, no antes.
export function clipsDeOficio(filtro = null) {
  return MODULOS_OFICIO
    .filter((m) => !filtro || m.id === filtro || m.curso === filtro)
    .map((m) => ({ pista: 'oficio', clave: `oficio/${m.id}`, file: `oficio/${m.id}.mp3`, texto: textoVozOficio(m), aMano: Boolean(m.voz) }))
}

// Los 3 clips de OFICIO de la audición: uno de método, uno de normativa y uno
// del curso del Centro. Se piden por curso y no por id fijo para que no se
// rompa si el frente de contenido renumera; si algún curso todavía no existe,
// se completa con los primeros del catálogo.
export function seleccionMuestraOficio(clips) {
  const porCurso = (curso) => clips.find((c) => MODULOS_OFICIO.find((m) => `oficio/${m.id}` === c.clave)?.curso === curso)
  const elegidos = ['metodo', 'normativa', 'centro'].map(porCurso).filter(Boolean)
  for (const c of clips) {
    if (elegidos.length >= 3) break
    if (!elegidos.includes(c)) elegidos.push(c)
  }
  return elegidos.slice(0, 3)
}

const MUESTRAS_TOUR = new Set(['meta/intro', 'aperturar/ap-1', 'llenado/ll-3'])

// Valores válidos de --solo: un tour, un módulo de oficio, un curso de oficio,
// o la pista entera ('tour' / 'oficio').
export function resuelveSolo(valor) {
  if (!valor) return null
  if (valor === 'tour' || valor === 'oficio') return { pista: valor, filtro: null }
  if (MODULOS.some((m) => m.id === valor)) return { pista: 'tour', filtro: valor }
  if (MODULOS_OFICIO.some((m) => m.id === valor) || CURSOS[valor]) return { pista: 'oficio', filtro: valor }
  return null
}

const segEstimados = (texto) => Math.round(saneaVoz(texto).replace(/<break[^>]*\/>/g, '').length / CPS)

async function main() {
  const args = process.argv.slice(2)
  const MUESTRA = args.includes('--muestra')
  const SECO = args.includes('--seco')
  const SOLO = args.includes('--solo') ? args[args.indexOf('--solo') + 1] : null
  const objetivo = args.includes('--solo') ? resuelveSolo(SOLO) : { pista: null, filtro: null }
  if (!objetivo) {
    console.error(`✗ --solo ${SOLO || '(sin valor)'}: no existe.`)
    console.error(`  Tours: ${MODULOS.map((m) => m.id).join(', ')}`)
    console.error(`  Cursos de oficio: ${Object.keys(CURSOS).join(', ')}`)
    console.error(`  También: un id de módulo de oficio (of-…), 'tour' u 'oficio'.`)
    process.exit(1)
  }

  const clips = [
    ...(objetivo.pista === 'oficio' ? [] : clipsDeTours(objetivo.pista === 'tour' ? objetivo.filtro : null)),
    ...(objetivo.pista === 'tour' ? [] : clipsDeOficio(objetivo.pista === 'oficio' ? objetivo.filtro : null)),
  ]

  // --muestra: 3 clips de OFICIO para audición + los 3 de tour de siempre (que
  // ya están generados y salen como "sin cambios", sin gastar API).
  const muestraOficio = new Set(seleccionMuestraOficio(clips.filter((c) => c.pista === 'oficio')).map((c) => c.clave))
  const lista = MUESTRA ? clips.filter((c) => MUESTRAS_TOUR.has(c.clave) || muestraOficio.has(c.clave)) : clips

  const manifests = { tour: leerManifest(MANIFEST), oficio: leerManifest(MANIFEST_OFICIO) }
  const rutaManifest = { tour: MANIFEST, oficio: MANIFEST_OFICIO }

  // En seco no se resuelve la key: el objetivo es poder verificar el plan de
  // trabajo en una máquina sin credenciales y sin gastar un carácter de API.
  const KEY = SECO ? null : apiKey()

  let generados = 0, saltados = 0, caracteres = 0
  const avisos = []
  for (const c of lista) {
    const hash = hashDe(c.texto)
    const destino = join(PUB, c.file)
    const manifest = manifests[c.pista]
    if (manifest[c.clave]?.hash === hash && existsSync(destino)) { saltados++; continue }
    const seg = segEstimados(c.texto)
    if (c.pista === 'oficio' && (seg < SEG_MIN || seg > SEG_MAX)) {
      avisos.push(`${c.clave}: ~${seg}s (fuera de ${SEG_MIN}-${SEG_MAX}s)${c.aMano ? '' : ' · sin campo voz, texto armado'}`)
    }
    caracteres += c.texto.length
    if (SECO) { console.log(`· ${c.clave} → ${c.file} · ~${seg}s · ${c.texto.length} caracteres${c.aMano === false ? ' · armado' : ''}`); generados++; continue }
    mkdirSync(dirname(destino), { recursive: true })
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`, {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: c.texto, ...SETTINGS }),
    })
    if (!res.ok) { console.error(`✗ ${c.clave}: ${res.status} ${await res.text()}`); process.exitCode = 1; continue }
    const buf = Buffer.from(await res.arrayBuffer())
    writeFileSync(destino, buf)
    // Duración aproximada: mp3 a 64 kbps → bytes*8/64000 segundos.
    manifest[c.clave] = { hash, file: c.file, seg: Math.round((buf.length * 8) / 64000) }
    guardarManifest(rutaManifest[c.pista], manifest)
    generados++
    console.log(`✓ ${c.clave} (${manifest[c.clave].seg}s)`)
  }
  if (avisos.length) console.log(`\n⚠ Revisa el largo de estos clips:\n  ${avisos.join('\n  ')}`)
  const total = Object.keys(manifests.tour).length + Object.keys(manifests.oficio).length
  console.log(`\n${generados} ${SECO ? 'por generar' : 'generados'} · ${saltados} sin cambios · ${caracteres} caracteres a la API · manifest: ${total} clips`)
  if (SECO) console.log('En seco: no se llamó a la API ni se escribió ningún mp3.')
}

// Solo corre ejecutado directamente (node scripts/entrenamiento-audio.mjs),
// nunca al importarlo desde otro módulo o desde un test.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
