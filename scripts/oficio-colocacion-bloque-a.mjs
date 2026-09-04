// Colocación determinista de la respuesta correcta — Bloque A (método, normativa
// y los dos hats). Herramienta de desarrollo: NO corre en Vercel, no la importa
// la app.
//
// POR QUÉ EXISTE. En el banco GIFT la correcta va SIEMPRE primera (`=`). Si se
// conservara ese orden, todo el quiz se aprobaría eligiendo siempre la opción 1.
// Aquí la correcta se coloca en una posición derivada del id de pregunta del
// banco, de forma que el resultado sea reproducible y auditable: cualquiera
// puede volver a correr esto y obtener exactamente la clave que está commiteada
// en lib/entrenamiento/respuestas-oficio/normativa.js.
//
// Ejecuta `node scripts/oficio-colocacion-bloque-a.mjs` para verificar:
//   · normativa, contra el GIFT congelado en
//     docs/entrenamiento/fuente/curso-3-normativa.gift;
//   · metodo y los dos hats, cuyas fuentes (00-como-se-estudia.html,
//     hat-administradora.html, hat-asistente.html) NO traen banco GIFT: sus 36
//     preguntas se redactaron desde el texto con ids sintéticos, declarados en
//     IDS_SINTETICOS al final de este archivo.
//
// OJO CON EL HASH. Cambiarlo re-baraja todos los quizzes ya publicados. Si algún
// día existe scripts/oficio-importar.mjs (el importador general de los cinco
// cursos), debe absorber estas funciones tal cual — hash32, vf, colocar y
// antidegenerar.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const ROOT = fileURLToPath(new URL('../', import.meta.url))

// FNV-1a de 32 bits sobre el id de la pregunta del banco ('N6-01', 'HCA3-04').
export function hash32(s) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

// Inserta la correcta en hash % n; los distractores conservan su orden del GIFT.
export function colocar(id, correcta, distractores) {
  const n = distractores.length + 1
  const pos = hash32(id) % n
  const opciones = [...distractores]
  opciones.splice(pos, 0, correcta)
  return { opciones, correcta: pos }
}

// Verdadero/Falso no se baraja: invertirlo en pantalla es antinatural y el banco
// ya trae de los dos tipos, así que la posición se reparte sola.
export const vf = (valor) => ({ opciones: ['Verdadero', 'Falso'], correcta: valor ? 0 : 1 })

export const minimoAprobacion = (n) => Math.max(2, Math.min(n - 1, Math.ceil(n * 0.8)))

// ── ANTIDEGENERACIÓN ────────────────────────────────────────────────────────
// Colocar por hash reparte bien en el total (48/56/57/59 en las 220 de opción
// múltiple del oficio), pero no garantiza nada DENTRO de un módulo: como las
// V/F conservan Verdadero(0)/Falso(1) y el banco tiene más afirmaciones
// verdaderas que falsas, un módulo corto puede quedar con el mínimo de
// respuestas en el índice 0 y aprobarse eligiendo siempre la opción 1 sin
// haber leído nada. Pasó en of-zoh-7: 4 preguntas, mínimo 3, clave [2,0,0,0].
//
// Regla de desempate, determinista y auditable: mientras alguna opción fija
// alcance el mínimo del módulo, se rota +1 la posición de la ÚLTIMA pregunta de
// opción múltiple que todavía no se haya rotado. Las V/F no se tocan.
export function esDegenerado(indices) {
  const minimo = minimoAprobacion(indices.length)
  const cuenta = {}
  for (const i of indices) cuenta[i] = (cuenta[i] || 0) + 1
  return Object.values(cuenta).some((c) => c >= minimo)
}

export function antidegenerar(indices, nOpciones) {
  const out = [...indices]
  const multiples = out.map((_, i) => i).filter((i) => nOpciones[i] > 2)
  for (let k = multiples.length - 1; k >= 0 && esDegenerado(out); k--) {
    const i = multiples[k]
    for (let giro = 1; giro < nOpciones[i] && esDegenerado(out); giro++) {
      out[i] = (indices[i] + giro) % nOpciones[i]
    }
  }
  return out
}

// ── Verificación ────────────────────────────────────────────────────────────
// Empareja cada pregunta publicada con la del banco por solapamiento de
// palabras de la respuesta correcta (el GIFT está en ASCII sin acentos, el
// módulo lleva la ortografía del HTML auditado), y comprueba el índice.
const tokens = (s) => new Set(
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/\*\*/g, '').replace(/[^a-z0-9@. ]/g, ' ').split(/\s+/).filter(Boolean),
)

function bancoGift(ruta) {
  const src = readFileSync(ruta, 'utf8')
  const out = []
  for (const m of src.matchAll(/^::([A-Z0-9]+-\d+):: ([^{]*)\{([^}]*)\}/gms)) {
    const cuerpo = m[3].trim()
    const vfLit = cuerpo === 'T' || cuerpo === 'F'
    out.push({
      id: m[1],
      vf: vfLit,
      enunciado: m[2].trim(),
      correcta: vfLit ? (cuerpo === 'T' ? 'Verdadero' : 'Falso') : (cuerpo.match(/^=(.*)$/m) || [])[1] || '',
    })
  }
  return out
}

async function verificar() {
  const banco = bancoGift(join(ROOT, 'docs/entrenamiento/fuente/curso-3-normativa.gift'))
  const { NORMATIVA } = await import(join(ROOT, 'lib/entrenamiento/oficio/cursos/normativa.js'))
  const { RESPUESTAS_NORMATIVA } = await import(join(ROOT, 'lib/entrenamiento/respuestas-oficio/normativa.js'))

  const problemas = []
  let mc = 0
  let verdaderoFalso = 0
  for (const mod of NORMATIVA) {
    const clave = RESPUESTAS_NORMATIVA[mod.id]
    const esperados = []
    const nOpciones = mod.quiz.map((q) => q.opciones.length)
    mod.quiz.forEach((q, i) => {
      const idx = clave[i]
      const mia = q.opciones[idx]
      // Dos preguntas del banco pueden compartir la respuesta correcta
      // ("El Administrador del Centro" está en N3-05 y en N9-01), así que el
      // emparejamiento pesa también el enunciado.
      const solape = (a, b) => {
        const A = tokens(a); const B = tokens(b)
        if (!A.size || !B.size) return 0
        return [...A].filter((w) => B.has(w)).length / Math.max(A.size, B.size)
      }
      let mejor = { puntaje: 0 }
      for (const b of banco) {
        const puntaje = 0.6 * solape(mia, b.correcta) + 0.4 * solape(q.pregunta, b.enunciado)
        if (puntaje > mejor.puntaje) mejor = { puntaje, ...b }
      }
      if (solape(mia, mejor.correcta) < 0.85) {
        problemas.push(`${mod.id} q${i + 1}: no encuentro su pregunta en el banco → "${mia}"`)
        esperados.push(idx)
        return
      }
      if (q.opciones.length === 2) {
        verdaderoFalso++
        esperados.push(vf(mia === 'Verdadero').correcta)
      } else {
        mc++
        esperados.push(hash32(mejor.id) % q.opciones.length)
      }
    })
    // La clave publicada es la de la regla YA pasada por antidegenerar().
    const final = antidegenerar(esperados, nOpciones)
    final.forEach((esperado, i) => {
      if (clave[i] !== esperado) problemas.push(`${mod.id} q${i + 1}: índice ${clave[i]}, la regla da ${esperado}`)
    })
    if (esDegenerado(clave)) problemas.push(`${mod.id}: se aprueba eligiendo siempre la misma opción`)
  }

  const total = mc + verdaderoFalso
  const reparto = {}
  for (const mod of NORMATIVA) for (const i of RESPUESTAS_NORMATIVA[mod.id]) reparto[i] = (reparto[i] || 0) + 1
  console.log(`banco: ${banco.length} preguntas · publicadas: ${total} (${mc} de opción múltiple, ${verdaderoFalso} de verdadero/falso)`)
  console.log('reparto del índice correcto:', reparto)
  problemas.push(...await verificarSinBanco())
  if (problemas.length) {
    console.error(`\n${problemas.length} problema(s):\n  ${problemas.join('\n  ')}`)
    process.exitCode = 1
  } else {
    console.log('\nla clave commiteada es exactamente la que produce esta regla sobre el GIFT congelado')
  }
}

// ── Los cursos SIN banco GIFT: metodo y los dos hats ────────────────────────
// 00-como-se-estudia.html, hat-administradora.html y hat-asistente.html no
// traen banco, así que sus 36 preguntas se redactaron desde el propio texto de
// la fuente con IDS SINTÉTICOS y la misma regla de colocación. Los ids se
// declaran aquí y en la cabecera de cada archivo de respuestas: sin esto, esas
// 36 claves no las puede reproducir nadie desde el repo.
export const IDS_SINTETICOS = {
  'of-met-1': 'HCA1-',
  'of-met-2': 'HCA2-',
  'of-met-3': 'HCA3-',
  'of-hat-adm': 'HADM-',
  'of-hat-asi': 'HA-',
}

export async function verificarSinBanco() {
  const { METODO } = await import(join(ROOT, 'lib/entrenamiento/oficio/cursos/metodo.js'))
  const { HAT } = await import(join(ROOT, 'lib/entrenamiento/oficio/cursos/hat.js'))
  const { RESPUESTAS_METODO } = await import(join(ROOT, 'lib/entrenamiento/respuestas-oficio/metodo.js'))
  const { RESPUESTAS_HAT } = await import(join(ROOT, 'lib/entrenamiento/respuestas-oficio/hat.js'))

  const problemas = []
  let n = 0
  for (const [modulos, claves] of [[METODO, RESPUESTAS_METODO], [HAT, RESPUESTAS_HAT]]) {
    for (const mod of modulos) {
      const prefijo = IDS_SINTETICOS[mod.id]
      const clave = claves[mod.id]
      if (!prefijo) { problemas.push(`${mod.id}: sin prefijo de id sintético en IDS_SINTETICOS`); continue }
      if (!Array.isArray(clave) || clave.length !== mod.quiz.length) { problemas.push(`${mod.id}: la clave no tiene el largo del quiz`); continue }
      const nOpciones = mod.quiz.map((q) => q.opciones.length)
      // V/F conserva Verdadero(0)/Falso(1): la posición sale de cuál es la
      // correcta, que aquí se lee de la propia clave commiteada.
      const esperados = mod.quiz.map((q, i) => (
        q.opciones.length === 2
          ? vf(q.opciones[clave[i]] === 'Verdadero').correcta
          : hash32(`${prefijo}${String(i + 1).padStart(2, '0')}`) % q.opciones.length
      ))
      antidegenerar(esperados, nOpciones).forEach((esperado, i) => {
        n++
        if (clave[i] !== esperado) problemas.push(`${mod.id} q${i + 1} (${prefijo}${String(i + 1).padStart(2, '0')}): índice ${clave[i]}, la regla da ${esperado}`)
      })
      if (esDegenerado(clave)) problemas.push(`${mod.id}: se aprueba eligiendo siempre la misma opción`)
    }
  }
  console.log(`sin banco GIFT (ids sintéticos): ${n} preguntas verificadas en metodo y los dos hats`)
  return problemas
}

if (process.argv[1] && process.argv[1].endsWith('oficio-colocacion-bloque-a.mjs')) await verificar()
