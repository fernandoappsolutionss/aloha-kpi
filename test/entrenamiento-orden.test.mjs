// EL ORDEN ES UN CANDADO. Antes de 2026-09-06 el módulo cerrado se leía igual
// —la pantalla decía "puedes leer este texto igual"— y solo se bloqueaban las
// escrituras. Fernando lo cambió: si no estudiaste el anterior, el módulo no se
// abre y sale "No te saltes el paso".
//
// Este archivo prueba las dos mitades: la regla pura y que las TRES superficies
// por las que se llega al contenido (el módulo, su hoja SOP y el índice del
// plan) la apliquen. Un candado que solo vive en una pantalla no es un candado.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { puertaCerrada } from '../lib/entrenamiento/oficio/guia-pasos.js'

const lee = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const MODULO = '../app/centro/[id]/entrenamiento/oficio/[modulo]/page.js'
const SOP = '../app/centro/[id]/entrenamiento/oficio/[modulo]/sop/page.js'
const INDICE = '../app/centro/[id]/entrenamiento/oficio/page.js'

// ── 1. LA REGLA ───────────────────────────────────────────────────────────

test('puertaCerrada: cierra al alumno con el anterior sin estudiar, y a nadie más', () => {
  // Alumno, módulo cerrado, sin haberlo tocado nunca: la puerta se cierra.
  assert.equal(puertaCerrada(true, false, undefined), true)
  assert.equal(puertaCerrada(true, false, {}), true)
  assert.equal(puertaCerrada(true, false, { quizAprobadoAt: '2026-09-01' }), true,
    'aprobar el cuestionario sin marcar la lección no abre el módulo')

  // El primer módulo del plan (sin requisito) siempre está abierto.
  assert.equal(puertaCerrada(true, true, undefined), false)

  // RED DE PROGRESO: lo que ya marcaste se relee siempre, aunque el anterior
  // se haya reabierto. El candado es para no saltar hacia adelante.
  assert.equal(puertaCerrada(true, false, { tourVistoAt: '2026-09-01' }), false)

  // Quien revisa el plan de otro puesto lee todo: no se está entrenando.
  assert.equal(puertaCerrada(false, false, undefined), false)
  assert.equal(puertaCerrada(false, false, {}), false)
})

test('puertaCerrada es pura: guia-pasos.js sigue sin importar nada', () => {
  const src = sinComentarios(lee('../lib/entrenamiento/oficio/guia-pasos.js'))
  assert.doesNotMatch(src, /\bimport\b/, 'guia-pasos.js viaja al navegador: no puede arrastrar el catálogo')
})

// EL HUECO QUE SE VIO EN EL NAVEGADOR. of-met-3 está en el plan de la
// Administradora Y en el de la Asistente, y la Administradora le firma a la
// Asistente. Con `?revisar=asistente` la página la trataba como revisora
// —`esAlumno` en false— y le abría un módulo que ella todavía no puede estudiar.
// Se saltaba su propio orden con un parámetro en la URL.
//
// La regla: para la PUERTA no importa si estás revisando, importa si el módulo
// está en TU plan. Leerlo como jefa entrenadora no es excusa: te toca
// estudiarlo igual, y en orden.
test('el candado mira si el módulo es tuyo, no si vienes en modo revisión', () => {
  const src = sinComentarios(lee(MODULO))
  const i = src.indexOf('puertaCerrada(')
  const llamada = src.slice(i, i + 120)
  assert.doesNotMatch(llamada, /\besAlumno\b/,
    'la puerta no puede depender de esAlumno: ?revisar= lo apaga y abre el módulo propio')
  assert.match(src, /const esSuyo = m\.roles\.includes\(/,
    'la puerta se decide con "el módulo está en mi plan", que ningún parámetro de URL cambia')
})

// ── 2. LAS TRES PUERTAS ───────────────────────────────────────────────────

test('la página del módulo cierra ANTES de renderizar o cargar nada del módulo', () => {
  const src = lee(MODULO)
  assert.match(src, /puertaCerrada\(/, 'la página tiene que usar la regla, no reimplementarla')
  const corte = sinComentarios(src).indexOf('puertaCerrada(')
  assert.ok(corte > 0)
  const despues = sinComentarios(src).slice(corte)
  // Lo caro y lo sensible va DESPUÉS de la guarda: si la puerta está cerrada no
  // se consultan los conceptos del alumno ni se arma el contenido del módulo.
  for (const senal of ['cargarConceptos(', 'BloquesOficio', 'QuizOficio', 'GuiaModulo']) {
    assert.ok(despues.includes(senal), `${senal} tiene que quedar después de la guarda de la puerta`)
  }
  assert.match(src, /No te saltes el paso/, 'la puerta la nombra Fernando con esas palabras')
  assert.match(src, /data-page-state=\{[^}]*\}|data-page-state="bloqueado"|'bloqueado'/,
    'la puerta declara su estado de página para poder verificarla sin depender del texto')
})

test('la hoja del proceso aplica el mismo candado que el módulo', () => {
  const src = sinComentarios(lee(SOP))
  assert.match(src, /puertaCerrada\(/, 'sin esto, el candado se esquiva escribiendo /sop en la URL')
  assert.match(src, /gradienteAbierto\(/)
})

test('el índice del plan marca los módulos que todavía no se abren', () => {
  const src = lee(INDICE)
  assert.match(src, /ofi-fila--bloqueada/, 'la fila bloqueada se ve distinta: el candado no se descubre al entrar')
  assert.match(sinComentarios(src), /gradienteAbierto\(/, 'el índice usa la misma regla del servidor, no una copia')
  assert.match(src, /Se abre con el anterior/)
})

test('el CSS pinta la fila bloqueada de verdad', () => {
  const css = lee('../app/globals.css')
  assert.match(css, /\.ofi-fila--bloqueada/)
  assert.match(css, /\.ofi-puerta/)
})

// ── 3. LO QUE YA NO SE DICE ───────────────────────────────────────────────
// La promesa vieja era explícita y ahora sería mentira: si queda una sola copia
// de esa frase, la pantalla contradice al sistema.

test('ninguna pantalla promete que se puede leer un módulo cerrado', () => {
  for (const ruta of [MODULO, SOP, INDICE]) {
    const src = lee(ruta)
    assert.doesNotMatch(src, /no te proh[ií]be mirar/i, `${ruta}: la promesa vieja quedó viva`)
    assert.doesNotMatch(src, /Leer siempre se puede/i, `${ruta}: la promesa vieja quedó viva`)
  }
})

// ── 4. EL SERVIDOR SIGUE SIENDO LA RED ────────────────────────────────────
// La puerta es de pantalla. Las actions son públicas: si alguien las llama a
// mano, el gradiente tiene que seguir rechazando. Esto no cambia con la puerta,
// y por eso se prueba aquí: es la mitad que no se ve.

test('las tres actions siguen comprobando el orden en el servidor', () => {
  const src = sinComentarios(lee('../app/actions/entrenamiento-oficio.js'))
  for (const fn of ['marcarEstudiado', 'responderQuizOficio', 'guardarConcepto']) {
    const i = src.indexOf(`export async function ${fn}`)
    assert.ok(i > 0, `falta ${fn}`)
    const cuerpo = src.slice(i, i + 2200)
    assert.match(cuerpo, /gradienteAbierto\(/, `${fn} dejó de comprobar el orden`)
  }
})

// ── 5. EL COPY DE LA PUERTA, BAJO LAS MISMAS REGLAS QUE EL RESTO ──────────
// El barrido de marca (entrenamiento-marca-oficio.test.mjs) solo mira literales
// de string de una línea, y el copy de la puerta es texto JSX suelto: se le
// escapa. Aquí se mide ese texto directamente.

test('la puerta habla como el resto del entrenamiento', () => {
  const jsx = [MODULO, SOP].map(lee).join('\n')
  // El texto entre > y < de los dos archivos: es lo que la persona lee. Se
  // descartan los tramos con sintaxis (`const navegacion = (` cae entre el `<>`
  // y el `</>` de un fragmento y no es texto de nadie).
  const visible = (jsx.match(/>[^<>{}]{15,}</g) || [])
    .filter((t) => !/[=;()]|\bconst\b|\breturn\b/.test(t))
    .join('\n')
  assert.ok(visible.includes('No te saltes el paso'), 'el extractor perdió el copy que tiene que medir')
  const VIEJO = {
    hat: /\b(el|tu|su|un|los|mi) hats?\b|\bhatted\b/i,
    drill: /\b(el|los|tu|su|un|mi) drills?\b/i,
    checksheet: /\bchecksheets?\b/i,
    masa: /\b(la|tu|su) masa\b/i,
    gradiente: /\bgradientes?\b/i,
    PFV: /\bPFV\b|producto final valioso/i,
    'palabra malentendida': /palabras? malentendidas?/i,
    'oficial de entrenamiento': /oficial(es)? de entrenamiento/i,
  }
  for (const [nombre, re] of Object.entries(VIEJO)) {
    assert.ok(!re.test(visible), `la puerta dice "${nombre}", que es vocabulario viejo`)
  }
  // Imagen marítima: cupo cero. "en cubierta" es el NOMBRE del método y no cuenta.
  const sinMetodo = visible.replace(/Entrenamiento en Cubierta/gi, '').replace(/\ben cubierta\b/gi, '')
  assert.doesNotMatch(
    sinMetodo,
    /\b(mar|olas?|remar|nadar|tim[oó]n|barcos?|puertos?|mareas?|velas?|n[aá]utic\w*|faros?|br[uú]julas?|navega\w*|zarpar)\b/i,
    'el copy de la puerta trae una imagen marítima: cupo cero fuera del nombre del método',
  )
})

// ── 6. QUE EL CANDADO NO SE VUELVA UN MURO ────────────────────────────────
// Un `requiere` que apunte a un módulo que NO está en el plan de alguno de sus
// roles deja ese módulo —y todo lo que dependa de él— cerrado PARA SIEMPRE, sin
// forma de abrirlo desde la aplicación. Antes eso solo estorbaba un aviso; ahora
// es una pared. Se recorre cada plan en orden, acumulando lo estudiado, y se
// exige que todos los módulos lleguen a abrirse.
test('recorriendo cada plan en orden, ningún módulo queda encerrado', async () => {
  const { MODULOS_OFICIO } = await import('../lib/entrenamiento/oficio/catalogo.js')
  const { planDeRol, gradienteAbierto } = await import('../lib/entrenamiento/oficio/progreso.js')
  const roles = [...new Set(MODULOS_OFICIO.flatMap((m) => m.roles || []))].sort()
  assert.ok(roles.length >= 2, 'sin roles no se está probando nada')
  for (const rol of roles) {
    const plan = planDeRol(rol, MODULOS_OFICIO)
    const progreso = {}
    for (const m of plan) {
      assert.equal(
        gradienteAbierto(m, progreso), true,
        `${rol}: "${m.titulo}" (${m.id}) no abre ni estudiando todo lo anterior de su plan. ` +
        `Requiere ${JSON.stringify(m.requiere)}, que no está antes en este plan: con el candado duro es una pared.`,
      )
      progreso[m.id] = { tourVistoAt: '2026-01-01', quizAprobadoAt: '2026-01-01' }
    }
  }
})
