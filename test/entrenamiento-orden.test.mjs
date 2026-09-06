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
