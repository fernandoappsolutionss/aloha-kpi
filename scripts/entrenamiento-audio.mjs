// Genera los clips de voz del entrenamiento con ElevenLabs (voz clonada de
// Fernando) y mantiene lib/entrenamiento/audio-manifest.json con un hash por
// clip: solo regenera lo que cambió de texto. Se corre en la Mac; los mp3 se
// commitean en public/entrenamiento/.
//   node scripts/entrenamiento-audio.mjs --muestra      # 3 clips de audición
//   node scripts/entrenamiento-audio.mjs                # todo lo que falte/cambió
//   node scripts/entrenamiento-audio.mjs --solo llenado # un módulo
// API key: ELEVENLABS_API_KEY en el entorno o en ~/.studio-reels-assembler/credentials.env
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MODULOS } from '../lib/entrenamiento/modulos.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST = join(ROOT, 'lib/entrenamiento/audio-manifest.json')
const PUB = join(ROOT, 'public/entrenamiento')
const VOICE_ID = 'I0uPgrx2Hf3g0QzMYLnq' // clon profesional de Fernando
const SETTINGS = { model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.38, similarity_boost: 0.85, style: 0.45, use_speaker_boost: true, speed: 1.0 } }

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY
  try {
    const env = readFileSync(join(homedir(), '.studio-reels-assembler/credentials.env'), 'utf8')
    const m = env.match(/^ELEVENLABS_API_KEY=["']?([^"'\n]+)/m)
    if (m) return m[1]
  } catch {}
  throw new Error('Falta ELEVENLABS_API_KEY')
}

const args = process.argv.slice(2)
const MUESTRA = args.includes('--muestra')
const SOLO = args.includes('--solo') ? args[args.indexOf('--solo') + 1] : null

// Clips a producir: intro de cada módulo + cada paso.
const clips = []
for (const m of MODULOS) {
  if (SOLO && m.id !== SOLO) continue
  clips.push({ clave: `${m.id}/intro`, file: `${m.id}/intro.mp3`, texto: m.intro.voz || m.intro.texto })
  for (const p of m.pasos) clips.push({ clave: `${m.id}/${p.id}`, file: `${m.id}/${p.id}.mp3`, texto: p.voz || p.texto })
}
const MUESTRAS = new Set(['meta/intro', 'aperturar/ap-1', 'llenado/ll-3'])
const lista = MUESTRA ? clips.filter((c) => MUESTRAS.has(c.clave)) : clips

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {}
const hashDe = (texto) => createHash('sha1').update(texto + JSON.stringify(SETTINGS)).digest('hex').slice(0, 12)

let generados = 0, saltados = 0
for (const c of lista) {
  const hash = hashDe(c.texto)
  const destino = join(PUB, c.file)
  if (manifest[c.clave]?.hash === hash && existsSync(destino)) { saltados++; continue }
  mkdirSync(dirname(destino), { recursive: true })
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: c.texto, ...SETTINGS }),
  })
  if (!res.ok) { console.error(`✗ ${c.clave}: ${res.status} ${await res.text()}`); process.exitCode = 1; continue }
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(destino, buf)
  // Duración aproximada: mp3 a 64 kbps → bytes*8/64000 segundos.
  manifest[c.clave] = { hash, file: c.file, seg: Math.round((buf.length * 8) / 64000) }
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
  generados++
  console.log(`✓ ${c.clave} (${manifest[c.clave].seg}s)`)
}
console.log(`\n${generados} generados · ${saltados} sin cambios · manifest: ${Object.keys(manifest).length} clips`)
