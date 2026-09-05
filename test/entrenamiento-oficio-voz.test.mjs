// PIPELINE DE VOZ DEL OFICIO — scripts/entrenamiento-audio.mjs.
// Importar el script no genera nada: main() solo corre si el archivo se ejecuta
// directamente. Aquí se prueban sus piezas puras y el contrato de los dos
// manifests, que es lo que evita regenerar audio (y pagar API) sin necesidad.
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MODULOS } from '../lib/entrenamiento/modulos.js'
import { MODULOS_OFICIO, CURSOS } from '../lib/entrenamiento/oficio/catalogo.js'
import {
  saneaVoz, textoVozOficio, clipsDeTours, clipsDeOficio, seleccionMuestraOficio, resuelveSolo,
} from '../scripts/entrenamiento-audio.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'))

test('saneaVoz: lo que se manda a la API es texto hablado, no texto escrito', () => {
  assert.equal(saneaVoz('El **producto** final'), 'El producto final')
  assert.equal(saneaVoz('Son B/.15.00 por niño'), 'Son 15 balboas por niño')
  assert.equal(saneaVoz('Deserción bajo 8%'), 'Deserción bajo 8 por ciento')
  assert.equal(saneaVoz('  dos   espacios\n y salto '), 'dos espacios y salto')
  assert.equal(saneaVoz(null), '')
})

test('un clip por módulo de oficio, con clave propia que no choca con la de los tours', () => {
  const oficio = clipsDeOficio()
  assert.equal(oficio.length, MODULOS_OFICIO.length, 'un clip por módulo: ni uno por bloque ni el módulo entero locutado')
  const tours = clipsDeTours()
  const claves = new Set()
  for (const c of [...tours, ...oficio]) {
    assert.equal(claves.has(c.clave), false, `clave repetida: ${c.clave}`)
    claves.add(c.clave)
  }
  for (const c of oficio) {
    assert.match(c.clave, /^oficio\/of-/)
    assert.equal(c.file, `${c.clave}.mp3`)
    assert.ok(c.texto && c.texto.length > 40, `${c.clave}: texto vacío o de una línea`)
  }
  // --solo acepta tour, módulo de oficio, curso o pista entera; nada más.
  assert.deepEqual(resuelveSolo(MODULOS[0].id), { pista: 'tour', filtro: MODULOS[0].id })
  assert.deepEqual(resuelveSolo('normativa'), { pista: 'oficio', filtro: 'normativa' })
  assert.deepEqual(resuelveSolo('oficio'), { pista: 'oficio', filtro: null })
  assert.equal(resuelveSolo('no-existe'), null)
  assert.equal(resuelveSolo(''), null)
  assert.equal(clipsDeOficio('zoho').length, MODULOS_OFICIO.filter((m) => m.curso === 'zoho').length)
})

test('--muestra deja 3 clips de OFICIO para audición, de cursos distintos', () => {
  const muestra = seleccionMuestraOficio(clipsDeOficio())
  assert.equal(muestra.length, 3)
  const cursoDe = (c) => MODULOS_OFICIO.find((m) => `oficio/${m.id}` === c.clave)?.curso
  assert.equal(new Set(muestra.map(cursoDe)).size, 3, 'tres cursos distintos: una audición de un solo curso no dice nada')
  for (const c of muestra) assert.ok(CURSOS[cursoDe(c)], `curso desconocido en la muestra: ${c.clave}`)
})

test('textoVozOficio: manda el campo voz si existe; si no, arma con lo que ya hay', () => {
  const conVoz = { id: 'of-x', voz: 'Esto lo escribió una persona. <break time="0.3s"/> Y se respeta tal cual.' }
  assert.equal(textoVozOficio(conVoz), conVoz.voz)
  const armado = textoVozOficio({
    titulo: 'Cobranza del mes',
    pfv: 'Cierras el mes sin una sola factura vencida sin gestionar.',
    bloques: [{ t: 'p', texto: 'La **cobranza** se hace todos los días. No es una tarea de fin de mes.' }],
  })
  assert.match(armado, /Cobranza del mes/)
  assert.match(armado, /<break time="0\.4s"\/>/, 'el texto armado también respira')
  assert.doesNotMatch(armado, /\*\*/, 'el markdown no se locuta')
  assert.match(armado, /cierras el mes/i, 'el producto final valioso cierra el clip')
  // Nunca vacío, aunque el módulo venga pelado.
  assert.ok(textoVozOficio({ titulo: 'Solo título' }).length > 5)
})

// La regla se mide sobre textoVozOficio(), que es EXACTAMENTE lo que se le
// manda a la API — no sobre el campo `voz`. Filtrar por `.voz` dejaba fuera
// justo a los módulos sin guion escrito, que son los que peor sonaban: el clip
// derivado de of-met-1 y of-hat-asi quedaba por debajo del piso de 300
// caracteres (299 y 277 ≈ 20 segundos), por debajo del SEG_MIN del propio
// script, y ninguna prueba lo veía.
//
// TRAMO: lo que el modelo lee de corrido entre dos <break>. Ahí es donde
// aparece el robot. La cabecera del script pide frases de doce o quince
// palabras y dos o tres marcas por cada cuarenta; el curso `centro` lo cumple
// (tramos de 68 a 101 caracteres) y `normativa` no lo cumplía (hasta 204, con
// cuatro oraciones seguidas sin una sola pausa).
const TRAMO_MAX = 135

test('los guiones de voz cumplen la guía: cortos, con respiración y sin markdown', () => {
  for (const m of MODULOS_OFICIO) {
    const voz = textoVozOficio(m)
    assert.equal(typeof voz, 'string', `${m.id}: voz tiene que ser un string`)
    const largo = voz.replace(/<break[^>]*\/>/g, '').length
    assert.ok(largo >= 300 && largo <= 1200, `${m.id}: ${largo} caracteres — el clip debe durar entre 30 y 60 segundos`)
    assert.match(voz, /<break time="0\.\ds"\/>/, `${m.id}: sin una sola marca de respiración suena a lector automático`)
    assert.doesNotMatch(voz, /\*\*|__/, `${m.id}: el markdown se lee en voz alta`)
    assert.doesNotMatch(voz, /B\/\./, `${m.id}: escribe "quince balboas", no "B/.15.00"`)
    assert.doesNotMatch(voz, /\d+\s*%/, `${m.id}: escribe "ocho por ciento", no "8%"`)
    // Raya larga: el modelo no la respira, la lee pegada. Se parte en dos
    // frases o se cambia por dos puntos.
    assert.doesNotMatch(voz, /—/, `${m.id}: la raya larga no se locuta; parte la frase`)
    for (const tramo of voz.split(/<break[^>]*\/>/).map((t) => t.trim()).filter(Boolean)) {
      assert.ok(
        tramo.length <= TRAMO_MAX,
        `${m.id}: ${tramo.length} caracteres seguidos sin respirar (máx ${TRAMO_MAX}) → "${tramo.slice(0, 70)}…"`,
      )
    }
  }
})

test('los 40 módulos traen su guion escrito a mano', () => {
  const derivados = MODULOS_OFICIO.filter((m) => !m.voz).map((m) => m.id)
  assert.deepEqual(
    derivados, [],
    'un clip derivado suena a rúbrica leída ("Al terminar este módulo: puedes decir el producto final valioso…"): escríbele el `voz`',
  )
})

// OJO CON EL VERDE DE ESTE ARCHIVO. El manifest del oficio está hoy en `{}`
// —los mp3 no se han generado— y un test que recorre sus entradas pasa en vacío
// sin comprobar nada. Por eso son dos: este valida cada entrada que EXISTA, y el
// siguiente exige la cobertura completa y se declara SALTADO mientras no haya
// una sola. El pendiente se ve en la salida de `npm test`, no se esconde.
const RUTA_MANIFEST = 'lib/entrenamiento/audio-manifest-oficio.json'

test('manifest de oficio: toda entrada apunta a un módulo real y a un mp3 en disco', () => {
  assert.ok(existsSync(join(ROOT, RUTA_MANIFEST)), 'falta el manifest del oficio')
  const oficio = json(RUTA_MANIFEST)
  const tour = json('lib/entrenamiento/audio-manifest.json')
  const validas = new Set(MODULOS_OFICIO.map((m) => `oficio/${m.id}`))
  for (const [k, v] of Object.entries(oficio)) {
    assert.ok(validas.has(k), `clave huérfana en el manifest de oficio (módulo renombrado o borrado): ${k}`)
    assert.ok(v?.hash && v?.file, `${k}: entrada sin hash o sin archivo`)
    assert.ok(existsSync(join(ROOT, 'public/entrenamiento', v.file)), `falta el mp3 de ${k}: public/entrenamiento/${v.file}`)
  }
  // Las dos pistas viven en manifests separados a propósito: el de los tours
  // rechaza por test cualquier clave que no sea un paso de un tour.
  for (const k of Object.keys(oficio)) assert.equal(k in tour, false, `${k} no puede estar en el manifest de los tours`)
})

// Se salta mientras el manifest esté vacío (locución pendiente de generar) y
// pasa a exigir los 40 en cuanto exista el primer clip: una pista locutada a
// medias es peor que ninguna, porque el alumno no sabe cuáles tienen audio.
const manifestOficio = existsSync(join(ROOT, RUTA_MANIFEST)) ? json(RUTA_MANIFEST) : {}
test('manifest de oficio: un clip por módulo, sin dejar ninguno mudo', {
  skip: Object.keys(manifestOficio).length === 0
    ? 'audio de oficio pendiente de generar: npm run entrenamiento:audio -- --solo oficio'
    : false,
}, () => {
  assert.deepEqual(
    Object.keys(manifestOficio).sort(),
    MODULOS_OFICIO.map((m) => `oficio/${m.id}`).sort(),
    'faltan clips por generar: corre npm run entrenamiento:audio -- --solo oficio',
  )
})
