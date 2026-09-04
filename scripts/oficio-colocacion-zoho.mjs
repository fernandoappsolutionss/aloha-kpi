// Colocación determinista de la respuesta correcta — Curso 2, Zoho para Asistentes.
// Herramienta de desarrollo: NO corre en Vercel, no la importa la app.
//
// Es el gemelo de scripts/oficio-colocacion-bloque-a.mjs para el bloque B del
// rol asistente, y REUSA sus funciones (hash32, vf) en vez de copiarlas: cambiar
// el hash re-barajaría todos los quizzes ya publicados, así que la regla tiene
// que ser una sola para los cinco cursos.
//
// DIFERENCIA CON EL DEL BLOQUE A: el emparejamiento módulo↔banco NO se adivina
// por parecido de texto, se declara en ORDEN. En este banco hay respuestas
// correctas idénticas en preguntas distintas ("semanal" en Z5-07 y Z8-01, "La
// Administradora del Centro" en Z8-04 y Z9-06), y hay montos que el módulo
// escribe con la ortografía del HTML auditado ("B/.15,00") y el GIFT en ASCII
// ("15.00"). Con parecido de texto los dos casos dan falsos positivos.
//
// Ejecuta `node scripts/oficio-colocacion-zoho.mjs` para verificar que la clave
// commiteada en lib/entrenamiento/respuestas-oficio/zoho.js sigue siendo la que
// produce la regla sobre el GIFT congelado en docs/entrenamiento/fuente/.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { hash32, vf, antidegenerar, esDegenerado } from './oficio-colocacion-bloque-a.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))

// Qué pregunta del banco es cada pregunta publicada, en orden. Z11-06 queda
// fuera a propósito: el módulo 11 trae 11 preguntas y el tope del quiz es 10.
export const ORDEN = {
  'of-zoh-1': ['Z1-01', 'Z1-02', 'Z1-03', 'Z1-04'],
  'of-zoh-2': ['Z2-01', 'Z2-02', 'Z2-03', 'Z2-04', 'Z2-05', 'Z2-06'],
  'of-zoh-3': ['Z3-01', 'Z3-02', 'Z3-03', 'Z3-04', 'Z3-05', 'Z3-06', 'Z3-07'],
  'of-zoh-4': ['Z4-01', 'Z4-02', 'Z4-03', 'Z4-04'],
  'of-zoh-5': ['Z5-01', 'Z5-02', 'Z5-03', 'Z5-04', 'Z5-05', 'Z5-06', 'Z5-07'],
  'of-zoh-6': ['Z6-01', 'Z6-02', 'Z6-03', 'Z6-04', 'Z6-05'],
  'of-zoh-7': ['Z7-01', 'Z7-02', 'Z7-03', 'Z7-04'],
  'of-zoh-8': ['Z8-01', 'Z8-02', 'Z8-03', 'Z8-04', 'Z8-05', 'Z8-06', 'Z8-07', 'Z8-08', 'Z8-09'],
  'of-zoh-9': ['Z9-01', 'Z9-02', 'Z9-03', 'Z9-04', 'Z9-05', 'Z9-06'],
  'of-zoh-10': ['Z10-01', 'Z10-02', 'Z10-03', 'Z10-04', 'Z10-05', 'Z10-06', 'Z10-07'],
  'of-zoh-11': ['Z11-01', 'Z11-02', 'Z11-03', 'Z11-04', 'Z11-05', 'Z11-07', 'Z11-08', 'Z11-09', 'Z11-10', 'Z11-11'],
  'of-zoh-12': ['Z12-01', 'Z12-02', 'Z12-03', 'Z12-04', 'Z12-05', 'Z12-06'],
  'of-zoh-13': ['Z13-01', 'Z13-02', 'Z13-03', 'Z13-04', 'Z13-05'],
}

// Compara el texto de la opción con el del banco ignorando lo que el módulo
// restauró de la ortografía del HTML auditado y el GIFT no puede escribir:
//   · acentos y negritas
//   · el prefijo B/. y la coma decimal ("B/.15,00" == "15.00")
//   · el ampersand ("F & F Soluciones Integrales" == "F y F Soluciones Integrales")
// La misma normalización se aplica a los dos lados, así que no puede tapar una
// diferencia real de contenido.
const norma = (s) => s
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\*\*/g, '').replace(/b\/\./g, '')
  .replace(/[.,](?=\d)/g, '')
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
  const banco = bancoGift(join(ROOT, 'docs/entrenamiento/fuente/curso-2-zoho-asistentes.gift'))
  const { ZOHO } = await import(join(ROOT, 'lib/entrenamiento/oficio/cursos/zoho.js'))
  const { RESPUESTAS_ZOHO } = await import(join(ROOT, 'lib/entrenamiento/respuestas-oficio/zoho.js'))

  const problemas = []
  let mc = 0
  let verdaderoFalso = 0
  const usadas = new Set()

  for (const mod of ZOHO) {
    const clave = RESPUESTAS_ZOHO[mod.id]
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
  for (const mod of ZOHO) for (const i of RESPUESTAS_ZOHO[mod.id]) reparto[i] = (reparto[i] || 0) + 1
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

if (process.argv[1] && process.argv[1].endsWith('oficio-colocacion-zoho.mjs')) await verificar()
