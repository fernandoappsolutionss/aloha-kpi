// PRESUPUESTO DE MARCA DEL ENTRENAMIENTO A BORDO.
//
// Por qué existe. Las reglas de prosa se erosionan solas: hoy el reparto de
// imágenes marítimas está en su sitio, pero nada impide que el redactor que
// llegue en marzo escriba "navega hacia el éxito" en un módulo de cobranza. Sin
// este archivo, a los seis meses el entrenamiento lee a folleto de crucero.
//
// Mide tres cosas, y ninguna es de gusto:
//   1. El CUPO de imaginería marítima por módulo (1 en los de método, 0 en los
//      otros 37). VOCABULARIO ≠ METÁFORA: "puesto", "maniobra", "plan" o "lo
//      que va a la vista" son términos con ficha de glosario y no gastan cupo;
//      lo que gasta cupo es una IMAGEN en movimiento ("antes de remar, mirar").
//   2. Que las cuatro líneas del brand kit aparezcan UNA vez cada una en todo
//      el corpus, y que lo que tiene dueño (Primera OLA, La Brújula, Carta
//      Náutica, el Faro, navegante…) no aparezca nunca.
//   3. Que no quede vocabulario viejo a la vista. Este assert existe porque el
//      barrido dejó fuera app/actions/entrenamiento-oficio.js y la persona veía
//      "Firmar la maniobra" en el botón y "no se le puede tomar el drill" en el
//      error del mismo clic. Por eso barre TAMBIÉN los archivos de UI, no solo
//      los módulos.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MODULOS_OFICIO } from '../lib/entrenamiento/oficio/catalogo.js'

// ── Qué cuenta como texto visible ──────────────────────────────────────────
// Se serializa el módulo entero menos las claves que la persona NO ve: ids,
// slugs, anclas de la fuente congelada y los índices del quiz. Si mañana se
// agrega un campo visible, entra solo: la lista negra es corta a propósito.
const INVISIBLES = new Set([
  'id', 'curso', 'orden', 'roles', 'requiere', 'fuente', 'duracionMin',
  'palabras', 't', 'correcta', 'repasa', 'codigo',
])

function visiblesDe(modulo) {
  const out = []
  const walk = (valor, clave) => {
    if (valor == null) return
    if (typeof valor === 'string') { if (!INVISIBLES.has(clave)) out.push(valor); return }
    if (Array.isArray(valor)) { valor.forEach((v) => walk(v, clave)); return }
    if (typeof valor === 'object') {
      for (const [k, v] of Object.entries(valor)) if (!INVISIBLES.has(k)) walk(v, k)
    }
  }
  walk(modulo, 'raiz')
  return out
}

const textoDe = (modulo) => visiblesDe(modulo).join('\n')
const CORPUS = MODULOS_OFICIO.map(textoDe).join('\n')

// ── EXCEPCIONES DECLARADAS ─────────────────────────────────────────────────
// Se descuentan ANTES de contar. Cada una lleva escrito por qué: quien quiera
// ampliar esta lista tiene que justificar la suya igual, y eso es el punto.
const EXCEPCIONES = [
  // El NOMBRE del método no es una imagen: es dónde estás parado. Aparece en la
  // portada de cada módulo y en la línea del pie, por diseño.
  [/Entrenamiento a Bordo/gi, ''],
  [/\ba bordo\b/gi, ''],
  // "velar por" = cuidar de. Nada que ver con las velas de un barco; es como el
  // Manual describe la función del Asistente.
  [/\bvela(n)? por(que)?\b/gi, ''],
  // "queda cubierta" = queda contemplada. of-cen-13 lo usa para las reglas del
  // calendario del mes.
  [/\bqued(a|an)\s+cubierta(s)?\b/gi, ''],
]

const sinExcepciones = (t) => EXCEPCIONES.reduce((s, [re, x]) => s.replace(re, x), t)

// Imágenes marítimas. Se cuentan palabras que solo pueden venir del mar: "nada"
// y "nadie" quedan fuera a propósito (son "ninguna cosa", no el verbo nadar),
// igual que "mar" dentro de "marca" o "margen" — de eso se encargan los
// límites de palabra.
// "agua" a secas NO entra: un Centro tiene dispensador y baños, y prohibir la
// palabra sería absurdo. Entran los MODISMOS náuticos, que es donde se cuela la
// decoración ("el problema está aguas arriba" ya se coló una vez, en of-cen-13).
const IMAGEN = /\b(mar|mares|olas?|remar|rema|remas|reman|remando|nadar|nades|nadan|nadando|tim[oó]n|barcos?|botes?|bordo|cubierta|puertos?|mareas?|vientos?|velas?|n[aá]utic\w*|surf\w*|capit[aá]n\w*|faros?|br[uú]julas?|n[aá]ufrag\w*|orillas?|tormentas?|navegantes?|navega\w*|pescador\w*|zarpar|singladura|derrotero|aparejo)\b|\baguas (arriba|abajo)\b|\b(a flote|hacer agua|viento en popa|contra ?corriente)\b/gi

test('presupuesto de metáfora: 1 imagen marítima en los módulos de método, 0 en los operativos', () => {
  for (const m of MODULOS_OFICIO) {
    const cupo = /^of-met-/.test(m.id) ? 1 : 0
    const hits = sinExcepciones(textoDe(m)).match(IMAGEN) || []
    assert.ok(
      hits.length <= cupo,
      `${m.id}: cupo ${cupo} imagen(es) marítima(s), encontradas ${hits.length} → ${hits.join(', ')}. ` +
      'Una imagen que enseña el mecanismo se queda; una que adorna se borra. ' +
      'Un módulo de cobranza no lleva mar.',
    )
  }
})

test('las cuatro líneas del brand kit aparecen UNA vez cada una en todo el corpus', () => {
  // No se repiten "para reforzar": repetirlas las gasta.
  for (const linea of [
    'Antes de remar, mirar.',
    'No nades más fuerte. Mira mejor.',
    'caos disfrazado',
    'Imperfecto pero en movimiento.',
  ]) {
    const veces = CORPUS.split(linea).length - 1
    assert.equal(veces, 1, `"${linea}" aparece ${veces} veces en el corpus; tiene que aparecer exactamente 1`)
  }
})

test('lo que tiene dueño no entra: ni el nombre ni una variante', () => {
  // Son productos y frameworks de OLAempresario con nombre propio, o etiquetas
  // de persona que aquí serían humillación en vez de diagnóstico. El registro
  // del entrenamiento es jefa→empleada, no coach→dueño-que-paga.
  const CONDUEÑO = {
    'navegante': /\bnavegantes?\b/i,
    'surfista': /\bsurfistas?\b/i,
    'pescador (como etiqueta de persona)': /\bpescador(es)?\b/i,
    'Capitán / Capitana': /\bcapit[aá]n(a|es|as)?\b/i,
    'El Faro': /\bel faro\b/i,
    'La Brújula': /\bbr[uú]julas?\b/i,
    'Carta Náutica': /\bcarta n[aá]utica\b/i,
    'Primera OLA': /\bprimera ola\b/i,
    'GPS': /\bGPS\b/,
    'NAVE': /\bNAVE\b/,
    'ERAC': /\bERAC\b/,
    'HEARD': /\bHEARD\b/,
    'diagnóstico brutal': /diagn[oó]stico brutal/i,
    'puerto seguro': /puerto seguro/i,
    'OLA empresario (saludo insignia)': /OLA empresario/i,
    // "escalar" aquí significa "escalar el caso a la Administradora": por eso
    // la línea "primero fundamentos, después escalar" está prohibida.
    'primero fundamentos, después escalar': /primero fundamentos/i,
  }
  for (const [nombre, re] of Object.entries(CONDUEÑO)) {
    for (const m of MODULOS_OFICIO) {
      assert.ok(!re.test(textoDe(m)), `${m.id}: usa "${nombre}", que tiene dueño y producto en OLAempresario`)
    }
  }
})

// ── R4 · "maniobra" nombra el EJERCICIO y nada más ─────────────────────────
test('los títulos de maniobra solo usan "Maniobra N" o "Maniobra del puesto"', () => {
  const FORMA = /^Maniobra (\d+(-[A-Z])?|del puesto)\b/
  for (const m of MODULOS_OFICIO) {
    for (const d of m.drills || []) {
      assert.match(
        d.titulo, FORMA,
        `${m.id}: "${d.titulo}" no es una forma autorizada. Solo "Maniobra N" y "Maniobra del puesto": ` +
        '"Maniobra de <proceso>" se lee como trapicheo, justo en los módulos donde se habla de dinero ajeno.',
      )
    }
  }
})

test('nunca "la maniobra de <proceso operativo>"', () => {
  const PROCESOS = /maniobra de (la |el )?(cobranza|matr[ií]cula|n[oó]mina|facturaci[oó]n|inscripci[oó]n|retiro|caja|pago|cierre)\b/i
  for (const m of MODULOS_OFICIO) {
    assert.ok(!PROCESOS.test(textoDe(m)), `${m.id}: "maniobra de <proceso>" está prohibido; "maniobra" nombra el ejercicio`)
  }
})

// ── El assert que habría cazado la media traducción ────────────────────────
const VIEJO = {
  hat: /\b(el|tu|su|un|los|mi) hats?\b|\bhatted\b|\bpaquete de hat\b/i,
  drill: /\b(el|los|tu|su|un|mi) drills?\b|\bdrill del\b|\bfirmar el drill\b/i,
  checksheet: /\bchecksheets?\b/i,
  masa: /\b(la|tu|su) masa\b|\bausencia de masa\b|\bcon la masa\b/i,
  gradiente: /\bgradientes?\b/i,
  PFV: /\bPFV\b|producto final valioso/i,
  'palabra malentendida': /palabras? malentendidas?/i,
  'Oficial de Entrenamiento': /oficial(es)? de entrenamiento/i,
  HCA: /\bHCA\b/,
  Hubbard: /Hubbard/i,
  'Tecnología de Estudio': /tecnolog[ií]a de estudio/i,
}

test('no queda vocabulario viejo en el texto visible de los 40 módulos', () => {
  for (const m of MODULOS_OFICIO) {
    const t = textoDe(m)
    for (const [nombre, re] of Object.entries(VIEJO)) {
      assert.ok(!re.test(t), `${m.id}: todavía dice "${nombre}" donde la persona lo lee`)
    }
  }
})

// Los archivos que pintan la pantalla. Se miden los STRINGS, no los comentarios
// ni los identificadores: `drill_firmado_at`, `avanceDrills`, GLOSARIO['hat'] y
// las clases CSS `ofi-masa`/`ofi-drill` son código y se quedan como están.
const UI = [
  '../app/actions/entrenamiento-oficio.js',
  '../components/entrenamiento/PanelDrill.js',
  '../components/entrenamiento/MasaOficio.js',
  '../components/entrenamiento/QuizOficio.js',
  '../components/entrenamiento/SopHoja.js',
  '../components/entrenamiento/PortadaModulo.js',
  '../components/entrenamiento/CarrilOficio.js',
  '../components/entrenamiento/GlosarioOficio.js',
]

// Solo los literales de texto de UNA línea: así se miran las frases que se
// pintan y no los identificadores ni las rutas de import. La restricción a una
// línea importa — en JSX las comillas invertidas están tan separadas que un
// literal multilínea se traga medio archivo, identificadores incluidos, y el
// test empieza a acusar al campo `pfv` de ser la sigla PFV.
function frasesDe(src) {
  const sinComentarios = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  return (sinComentarios.match(/'[^'\n]{12,}'|"[^"\n]{12,}"|`[^`\n]{12,}`/g) || [])
    // Dentro de una plantilla, `${…}` es CÓDIGO: ahí viven `c.hatted`,
    // `avanceDrills` y demás identificadores, que no se renombran y no son lo
    // que la persona lee. Se mira la prosa que los rodea, no ellos.
    .map((s) => s.replace(/\$\{[^}]*\}/g, ' '))
    .filter((s) => /\s/.test(s))
    .join('\n')
}

test('los rótulos de pantalla tampoco arrastran vocabulario viejo', () => {
  for (const ruta of UI) {
    const frases = frasesDe(readFileSync(new URL(ruta, import.meta.url), 'utf8'))
    for (const [nombre, re] of Object.entries(VIEJO)) {
      assert.ok(
        !re.test(frases),
        `${ruta}: un string visible todavía dice "${nombre}". La persona lee "maniobra" en 40 módulos ` +
        'y no puede encontrarse "drill" en el mensaje de la firma.',
      )
    }
  }
})
