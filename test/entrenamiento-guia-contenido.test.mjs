import test from 'node:test'
import assert from 'node:assert/strict'
import { GUIA, GUIA_GENERAL } from '../lib/entrenamiento/oficio/guia.js'
import { MODULOS_OFICIO } from '../lib/entrenamiento/oficio/catalogo.js'
import { GLOSARIO } from '../lib/entrenamiento/oficio/glosario.js'
import { nombreDeRol, planDeRol } from '../lib/entrenamiento/oficio/progreso.js'

const RANGOS = {
  vista: [150, 450],
  palabras: [200, 600],
  cierre: [150, 500],
  laminas: [150, 450],
  lectura: [150, 450],
  preguntas: [150, 450],
}

const NUMEROS = {
  1: 'una',
  2: 'dos',
  3: 'tres',
  4: 'cuatro',
  5: 'cinco',
  6: 'seis',
  7: 'siete',
  8: 'ocho',
  9: 'nueve',
  10: 'diez',
  11: 'once',
  12: 'doce',
  13: 'trece',
}

const NUMEROS_TITULO = {
  1: 'uno',
  2: 'dos',
  3: 'tres',
  4: 'cuatro',
  5: 'cinco',
  6: 'seis',
  7: 'siete',
  8: 'ocho',
  9: 'nueve',
  10: 'diez',
  11: 'once',
  12: 'doce',
  13: 'trece',
  14: 'catorce',
  15: 'quince',
  16: 'dieciseis',
  17: 'diecisiete',
  18: 'dieciocho',
  19: 'diecinueve',
  20: 'veinte',
  21: 'veintiuno',
  22: 'veintidos',
  23: 'veintitres',
  24: 'veinticuatro',
  25: 'veinticinco',
  26: 'veintiseis',
  27: 'veintisiete',
  28: 'veintiocho',
  29: 'veintinueve',
  30: 'treinta',
  33: 'treinta y tres',
  45: 'cuarenta y cinco',
  46: 'cuarenta y seis',
  88: 'ochenta y ocho',
}

const norm = (s) => String(s)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')

const sinBreaks = (s) => String(s).replace(/<break[^>]*\/>/g, '')

const tituloParaAudio = (titulo) => norm(titulo)
  .replace(/\b(\d+)\s*%\b/g, (_, n) => `${NUMEROS_TITULO[n] || n} por ciento`)
  .replace(/\b(\d+)\b/g, (_, n) => NUMEROS_TITULO[n] || n)
  .replace(/\bkpi\b/g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s+,/g, ',')
  .replace(/,\s+y\b/g, ',')
  .trim()

const VIEJO = [
  /\b(el|tu|su|un|los|mi) hats?\b|\bhatted\b|\bpaquete de hat\b/i,
  /\b(el|los|tu|su|un|mi) drills?\b|\bdrill del\b|\bfirmar el drill\b/i,
  /\bchecksheets?\b/i,
  /\b(la|tu|su) masa\b|\bausencia de masa\b|\bcon la masa\b/i,
  /\bgradientes?\b/i,
  /\bPFV\b|producto final valioso/i,
  /palabras? malentendidas?/i,
  /oficial(es)? de entrenamiento/i,
  /\bHCA\b/,
  /Hubbard/i,
  /tecnolog[ií]a de estudio/i,
]

const DUENO = [
  /\bnavegantes?\b/i,
  /\bsurfistas?\b/i,
  /\bpescador(es)?\b/i,
  /\bcapit[aá]n(a|es|as)?\b/i,
  /\bel faro\b/i,
  /\bbr[uú]julas?\b/i,
  /\bcarta n[aá]utica\b/i,
  /\bprimera ola\b/i,
  /\bGPS\b/,
  /\bNAVE\b/,
  /\bERAC\b/,
  /\bHEARD\b/,
  /diagn[oó]stico brutal/i,
  /puerto seguro/i,
  /OLA empresario/i,
  /primero fundamentos/i,
]

const IMAGEN = /\b(mar|mares|olas?|remar|rema|remas|reman|remando|nadar|nades|nadan|nadando|tim[oó]n|barcos?|botes?|bordo|cubierta|puertos?|mareas?|vientos?|velas?|n[aá]utic\w*|surf\w*|capit[aá]n\w*|faros?|br[uú]julas?|n[aá]ufrag\w*|orillas?|tormentas?|navegantes?|navega\w*|pescador\w*|zarpar|singladura|derrotero|aparejo)\b|\baguas (arriba|abajo)\b|\b(a flote|hacer agua|viento en popa|contra ?corriente)\b/gi

const BRAND = [
  'Antes de remar, mirar.',
  'No nades más fuerte. Mira mejor.',
  'caos disfrazado',
  'Imperfecto pero en movimiento.',
]

const MODULOS_EN_PANTALLA = MODULOS_OFICIO.filter((m) => m.roles.length > 0)

function assertLocucion(id, paso, texto) {
  assert.equal(typeof texto, 'string', `${id}/${paso}: guion vacío`)
  const hablado = sinBreaks(texto)
  const [min, max] = RANGOS[paso]
  assert.ok(
    hablado.length >= min && hablado.length <= max,
    `${id}/${paso}: ${hablado.length} caracteres; rango ${min}-${max}`,
  )
  assert.match(texto, /<break time="0\.\ds"\/>/, `${id}/${paso}: falta respiración`)
  assert.equal(texto.match(/<(?!break time="0\.\ds"\/>)[^>]*>/g), null, `${id}/${paso}: etiqueta no permitida`)
  for (const tramo of texto.split(/<break[^>]*\/>/).map((x) => x.trim()).filter(Boolean)) {
    assert.ok(tramo.length <= 135, `${id}/${paso}: tramo de ${tramo.length} sin respirar: "${tramo.slice(0, 70)}…"`)
  }
  assert.doesNotMatch(hablado, /\d/, `${id}/${paso}: los números se escriben en letras`)
  assert.doesNotMatch(texto, /%|B\/\.|\*\*|__|—|[\u{1F300}-\u{1FAFF}]/u, `${id}/${paso}: símbolo que se lee mal en voz`)
  assert.doesNotMatch(texto, /\n/, `${id}/${paso}: no debe tener saltos de línea`)
  const sinNombreDelMetodo = texto.replace(/Entrenamiento en Cubierta/gi, '').replace(/\ben cubierta\b/gi, '')
  assert.equal(sinNombreDelMetodo.match(IMAGEN), null, `${id}/${paso}: imagen marítima fuera del nombre del método`)
  for (const re of VIEJO) assert.doesNotMatch(texto, re, `${id}/${paso}: vocabulario viejo`)
  for (const re of DUENO) assert.doesNotMatch(texto, re, `${id}/${paso}: marca o metáfora de otro producto`)
  for (const linea of BRAND) assert.equal(texto.includes(linea), false, `${id}/${paso}: línea gastada del brand kit`)
  assert.doesNotMatch(texto, /maniobra de (la |el )?(cobranza|matr[ií]cula|n[oó]mina|facturaci[oó]n|inscripci[oó]n|retiro|caja|pago|cierre)\b/i, `${id}/${paso}: "maniobra de <proceso>"`)
  assert.doesNotMatch(texto, /moodle|\bKPI\b|hermes|inteligencia artificial/i, `${id}/${paso}: menciona una herramienta que no debe narrarse`)
}

function itemsDeVista(m, guia) {
  const texto = norm(guia.vista)
  return (m.masa || []).filter((item) => norm(item)
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length >= 5)
    .some((w) => texto.includes(w)))
}

function terminosNombrados(m, guia) {
  const texto = norm(guia.palabras)
  return (m.palabras || [])
    .map((slug) => GLOSARIO[slug]?.termino)
    .filter(Boolean)
    .filter((termino) => texto.includes(norm(termino)))
}

function siguientesDerivables() {
  const porModulo = new Map()
  for (const rol of ['administradora', 'asistente', 'coach', 'coordinador']) {
    const plan = planDeRol(rol, MODULOS_OFICIO)
    for (let i = 0; i < plan.length; i += 1) {
      const m = plan[i]
      const siguiente = plan[i + 1]?.titulo || ''
      const set = porModulo.get(m.id) || new Set()
      set.add(siguiente)
      porModulo.set(m.id, set)
    }
  }
  return new Map([...porModulo.entries()].filter(([, titulos]) => titulos.size === 1))
}

test('guía hablada: cobertura exacta para los módulos en pantalla y tres clips generales', () => {
  assert.deepEqual(
    Object.keys(GUIA).sort(),
    MODULOS_EN_PANTALLA.map((m) => m.id).sort(),
  )
  for (const guion of Object.values(GUIA)) {
    assert.deepEqual(Object.keys(guion).sort(), ['cierre', 'palabras', 'vista'])
  }
  assert.deepEqual(Object.keys(GUIA_GENERAL).sort(), ['laminas', 'lectura', 'preguntas'])
})

test('guía hablada: todos los clips cumplen las reglas de locución', () => {
  for (const [paso, texto] of Object.entries(GUIA_GENERAL)) assertLocucion('general', paso, texto)
  for (const m of MODULOS_EN_PANTALLA) {
    for (const paso of ['vista', 'palabras', 'cierre']) assertLocucion(m.id, paso, GUIA[m.id][paso])
  }
})

test('guía hablada: cada vista nombra lo que va a la vista y cada glosario dice su cantidad', () => {
  for (const m of MODULOS_EN_PANTALLA) {
    const guion = GUIA[m.id]
    const items = itemsDeVista(m, guion)
    assert.ok(items.length >= Math.min(2, (m.masa || []).length), `${m.id}: vista nombra ${items.length} ítems de lo que va a la vista`)
    const cantidad = NUMEROS[m.palabras.length]
    assert.ok(cantidad, `${m.id}: cantidad de palabras fuera del mapa de números: ${m.palabras.length}`)
    assert.match(norm(guion.palabras), new RegExp(`\\b${cantidad}\\b`), `${m.id}: palabras no dice "${cantidad} palabras"`)
    assert.ok(terminosNombrados(m, guion).length >= 1, `${m.id}: palabras no nombra ningún término literal del glosario`)
  }
})

test('guía hablada: el cierre manda maniobra cuando toca y nombra el siguiente módulo derivable', () => {
  const siguientes = siguientesDerivables()
  for (const m of MODULOS_EN_PANTALLA) {
    const cierre = GUIA[m.id].cierre
    if ((m.drills || []).length > 0) {
      assert.match(cierre, /maniobra/i, `${m.id}: tiene maniobra y el cierre no la manda`)
      if (m.roles.length === 1) {
        const jefe = nombreDeRol({ administradora: 'coordinador', asistente: 'administradora', coach: 'administradora', coordinador: 'supervisor' }[m.roles[0]])
        assert.match(norm(cierre), new RegExp(`\\b${norm(jefe).split(' ')[0]}\\b`), `${m.id}: no nombra al jefe entrenador esperado (${jefe})`)
      }
    }
    const [siguiente] = [...(siguientes.get(m.id) || [])]
    if (siguiente) {
      const esperado = tituloParaAudio(siguiente).slice(0, 18)
      assert.ok(norm(cierre).includes(esperado), `${m.id}: cierre no nombra el siguiente módulo "${siguiente}"`)
    } else if (siguiente === '') {
      assert.match(cierre, /cierras tu plan|no hay módulo siguiente/i, `${m.id}: cierre final no dice que el plan queda cerrado`)
    }
  }
})
