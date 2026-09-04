// Colocación determinista de la respuesta correcta — Curso 1, Administración de Centro.
// Herramienta de desarrollo: NO corre en Vercel, no la importa la app.
//
// Es el gemelo de scripts/oficio-colocacion-zoho.mjs para el bloque B del rol
// administradora, y REUSA las funciones de scripts/oficio-colocacion-bloque-a.mjs
// (hash32, vf) en vez de copiarlas: cambiar el hash re-barajaría todos los
// quizzes ya publicados, así que la regla tiene que ser una sola para los cinco
// cursos.
//
// El emparejamiento módulo↔banco se declara en ORDEN, no se adivina por parecido
// de texto: este banco tiene respuestas correctas casi idénticas en preguntas
// distintas (A3-05 y A3-06 sobre la semana de incorporación, A7-07 y A7-10 sobre
// el bono de puntualidad) y montos que el módulo escribe con la ortografía del
// HTML auditado ("B/.25,00") y el GIFT en ASCII ("25.00").
//
// El módulo of-hat-adm NO se verifica aquí: el paquete de hat no trae banco GIFT,
// así que sus seis preguntas se redactaron desde hat-administradora.html y
// curso-1-administradora.html#m0 con ids sintéticos (HADM-01…) y esta misma
// regla de colocación.
//
// Ejecuta `node scripts/oficio-colocacion-centro.mjs` para verificar que la clave
// commiteada en lib/entrenamiento/respuestas-oficio/centro.js sigue siendo la que
// produce la regla sobre el GIFT congelado en docs/entrenamiento/fuente/.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { hash32, vf, antidegenerar, esDegenerado } from './oficio-colocacion-bloque-a.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))

// Qué pregunta del banco es cada pregunta publicada, en orden. Las que faltan
// quedaron fuera a propósito, por tope de 10 o por decir lo mismo que otra:
//   A3-09 (duplica A3-08) · A3-10 · A3-13 (duplica A3-12)
//   A5-05 · A5-07 · A5-10 · A5-12 (duplica A5-11) · A5-15
//   A7-02 (duplica el par de A7-01) · A9-06 · A9-07 · A9-13 · A9-14
//   A11-08 (duplica el par de A11-07) · A11-11
export const ORDEN = {
  'of-cen-1': ['A1-01', 'A1-02', 'A1-03', 'A1-04', 'A1-05', 'A1-06', 'A1-07', 'A1-08'],
  'of-cen-2': ['A2-01', 'A2-02', 'A2-03', 'A2-04', 'A2-05', 'A2-06', 'A2-07', 'A2-08'],
  'of-cen-3': ['A3-01', 'A3-02', 'A3-03', 'A3-04', 'A3-05', 'A3-06', 'A3-07', 'A3-08', 'A3-11', 'A3-12'],
  'of-cen-4': ['A4-01', 'A4-02', 'A4-03', 'A4-04', 'A4-05', 'A4-06', 'A4-07', 'A4-08'],
  'of-cen-5': ['A5-01', 'A5-02', 'A5-03', 'A5-04', 'A5-06', 'A5-08', 'A5-09', 'A5-11', 'A5-13', 'A5-14'],
  'of-cen-6': ['A6-01', 'A6-02', 'A6-03', 'A6-04', 'A6-05', 'A6-06', 'A6-07', 'A6-08'],
  'of-cen-7': ['A7-01', 'A7-03', 'A7-04', 'A7-05', 'A7-06', 'A7-07', 'A7-08', 'A7-09', 'A7-10', 'A7-11'],
  'of-cen-8': ['A8-01', 'A8-02', 'A8-03', 'A8-04', 'A8-05', 'A8-06', 'A8-07', 'A8-08', 'A8-09'],
  'of-cen-9': ['A9-01', 'A9-02', 'A9-03', 'A9-04', 'A9-05', 'A9-08', 'A9-09', 'A9-10', 'A9-11', 'A9-12'],
  'of-cen-10': ['A10-01', 'A10-02', 'A10-03', 'A10-04', 'A10-05', 'A10-06'],
  'of-cen-11': ['A11-01', 'A11-02', 'A11-03', 'A11-04', 'A11-05', 'A11-06', 'A11-07', 'A11-09', 'A11-10', 'A11-12'],
  'of-cen-12': ['A12-01', 'A12-02', 'A12-03', 'A12-04', 'A12-05', 'A12-06', 'A12-07', 'A12-08', 'A12-09'],
  'of-cen-13': ['A13-01', 'A13-02', 'A13-03', 'A13-04', 'A13-05'],
}

// El GIFT está en ASCII sin acentos y sin B/. en los montos; el módulo lleva la
// ortografía del HTML auditado. Se comparan las dos formas normalizadas.
// "memorandums" es la única palabra que el GIFT escribe distinto del HTML del
// curso (§m9 dice "Tres memorandos") y del glosario (entrada "Memorando"): el
// módulo publica la forma auditada y aquí se iguala, igual que B/. y los montos.
const norma = (s) => s
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\*\*/g, '').replace(/b\/\./g, '')
  .replace(/[.,](?=\d)/g, '')
  .replace(/memorand(um|o)s?/g, 'memorando')
  .replace(/\s&\s|\s+y\s+/g, ' ')
  .replace(/[^a-z0-9]/g, '')

function bancoGift(ruta) {
  const src = readFileSync(ruta, 'utf8')
  const out = new Map()
  for (const m of src.matchAll(/::([A-Z0-9]+-\d+)::\s*([\s\S]*?)\{([\s\S]*?)\}/g)) {
    const cuerpo = m[3].trim()
    const vfLit = cuerpo === 'T' || cuerpo === 'F'
    const lineas = cuerpo.split('\n').map((l) => l.trim()).filter(Boolean)
    out.set(m[1], {
      id: m[1],
      vf: vfLit,
      enunciado: m[2].trim(),
      correcta: vfLit ? (cuerpo === 'T' ? 'Verdadero' : 'Falso') : (lineas.find((l) => l.startsWith('=')) || '').slice(1).trim(),
      distractores: vfLit ? [] : lineas.filter((l) => l.startsWith('~')).map((l) => l.slice(1).trim()),
    })
  }
  return out
}

async function verificar() {
  const banco = bancoGift(join(ROOT, 'docs/entrenamiento/fuente/curso-1-administradora.gift'))
  const { CENTRO } = await import(join(ROOT, 'lib/entrenamiento/oficio/cursos/centro.js'))
  const { RESPUESTAS_CENTRO } = await import(join(ROOT, 'lib/entrenamiento/respuestas-oficio/centro.js'))

  const problemas = []
  let mc = 0
  let verdaderoFalso = 0
  const usadas = new Set()

  for (const mod of CENTRO) {
    const clave = RESPUESTAS_CENTRO[mod.id]
    const ids = ORDEN[mod.id]
    if (!ids) { problemas.push(`${mod.id}: sin mapeo en ORDEN`); continue }
    if (ids.length !== mod.quiz.length) problemas.push(`${mod.id}: ORDEN tiene ${ids.length} ids y el quiz ${mod.quiz.length} preguntas`)

    const esperados = []
    const nOpciones = mod.quiz.map((q) => q.opciones.length)

    mod.quiz.forEach((q, i) => {
      const b = banco.get(ids[i])
      if (!b) { problemas.push(`${mod.id} q${i + 1}: ${ids[i]} no está en el banco`); esperados.push(clave[i]); return }
      usadas.add(b.id)
      const idx = clave[i]
      const mia = q.opciones[idx]

      // 1. la opción marcada es la correcta del banco
      if (norma(mia) !== norma(b.correcta)) {
        problemas.push(`${mod.id} q${i + 1} (${b.id}): marcada "${mia}", el banco dice "${b.correcta}"`)
      }
      // 2. la posición base que da la regla (antes del desempate)
      if (b.vf) {
        verdaderoFalso++
        esperados.push(vf(b.correcta === 'Verdadero').correcta)
      } else {
        mc++
        esperados.push(hash32(b.id) % q.opciones.length)
        // 3. las demás opciones son los distractores del banco, en su orden
        const mios = q.opciones.filter((_, j) => j !== idx).map(norma)
        const suyos = b.distractores.map(norma)
        if (mios.join('|') !== suyos.join('|')) {
          problemas.push(`${mod.id} q${i + 1} (${b.id}): los distractores no son los del banco o cambiaron de orden`)
        }
      }
    })

    // 4. la clave publicada es la de la regla YA pasada por antidegenerar().
    const final = antidegenerar(esperados, nOpciones)
    final.forEach((esperado, i) => {
      if (clave[i] !== esperado) problemas.push(`${mod.id} q${i + 1} (${ids[i]}): índice ${clave[i]}, la regla da ${esperado}`)
    })
    if (esDegenerado(clave)) problemas.push(`${mod.id}: se aprueba eligiendo siempre la misma opción`)
  }

  const sinUsar = [...banco.keys()].filter((id) => !usadas.has(id))
  const reparto = {}
  for (const mod of CENTRO) for (const i of RESPUESTAS_CENTRO[mod.id]) reparto[i] = (reparto[i] || 0) + 1
  console.log(`banco: ${banco.size} preguntas · publicadas: ${mc + verdaderoFalso} (${mc} de opción múltiple, ${verdaderoFalso} de verdadero/falso)`)
  console.log('reparto del índice correcto:', reparto)
  console.log('fuera del quiz:', sinUsar.length ? sinUsar.join(', ') : 'ninguna')
  if (problemas.length) {
    console.error(`\n${problemas.length} problema(s):\n  ${problemas.join('\n  ')}`)
    process.exitCode = 1
  } else {
    console.log('\nla clave commiteada es exactamente la que produce esta regla sobre el GIFT congelado')
  }
}

if (process.argv[1] && process.argv[1].endsWith('oficio-colocacion-centro.mjs')) await verificar()
