import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pasosDe, hechosDe, pasoActual, validarConcepto, EFIMEROS } from '../lib/entrenamiento/oficio/guia-pasos.js'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const lee = (ruta) => readFileSync(join(ROOT, ruta), 'utf8')
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const descriptorCompleto = {
  vista: 3,
  palabras: 6,
  laminas: 4,
  preguntas: 5,
  drills: 1,
}

test('pasosDe omite slots vacíos y conserva el orden progresivo del módulo', () => {
  assert.deepEqual(EFIMEROS, ['portada', 'vista', 'laminas'])
  assert.deepEqual(
    pasosDe(descriptorCompleto).map((p) => p.id),
    ['portada', 'vista', 'palabras', 'laminas', 'lectura', 'preguntas', 'cierre'],
  )
  assert.deepEqual(
    pasosDe({ vista: 0, palabras: 0, laminas: 0, preguntas: 0, drills: 0 }).map((p) => p.id),
    ['portada', 'lectura', 'cierre'],
  )
})

test('hechosDe infiere evidencia durable sin regalar lectura ni palabras desde quiz viejo', () => {
  const palabras = ['a', 'b', 'c']
  assert.deepEqual([...hechosDe({}, {}, palabras, [])], [])
  assert.deepEqual([...hechosDe({}, { a: 'texto' }, palabras, [])], ['portada', 'vista'])
  assert.deepEqual([...hechosDe({}, { a: 'uno', b: 'dos', c: 'tres' }, palabras, [])], ['portada', 'vista', 'palabras'])
  assert.deepEqual(
    [...hechosDe({ tourVistoAt: '2026-09-05T00:00:00.000Z' }, {}, palabras, [])],
    ['portada', 'vista', 'palabras', 'laminas', 'lectura'],
  )
  assert.deepEqual(
    [...hechosDe({ quizAprobadoAt: '2026-09-05T00:00:00.000Z' }, {}, palabras, [])],
    ['portada', 'vista', 'laminas', 'preguntas'],
  )
  assert.deepEqual([...hechosDe({}, {}, palabras, ['portada', 'basura', 'lectura'])], ['portada'])
})

test('pasoActual cubre progreso nuevo, parcial e histórico', () => {
  const pasos = pasosDe(descriptorCompleto)
  const hechos = (p, conceptos = {}, efimeros = []) => hechosDe(p, conceptos, ['a', 'b', 'c', 'd', 'e', 'f'], efimeros)
  assert.equal(pasoActual(pasos, hechos({}, {}, [])), 'portada')
  assert.equal(pasoActual(pasos, hechos({}, {}, ['portada'])), 'vista')
  assert.equal(pasoActual(pasos, hechos({}, { a: 'uno', b: 'dos', c: 'tres' }, [])), 'palabras')
  assert.equal(pasoActual(pasos, hechos({}, { a: '1', b: '2', c: '3', d: '4', e: '5', f: '6' }, [])), 'laminas')
  assert.equal(pasoActual(pasos, hechos({}, { a: '1', b: '2', c: '3', d: '4', e: '5', f: '6' }, ['laminas'])), 'lectura')
  assert.equal(pasoActual(pasos, hechos({ tourVistoAt: 'x' }, {}, [])), 'preguntas')
  assert.equal(pasoActual(pasos, hechos({ tourVistoAt: 'x', quizAprobadoAt: 'y' }, {}, [])), 'cierre')
  assert.equal(pasoActual(pasos, hechos({ quizAprobadoAt: 'y' }, {}, [])), 'palabras')
  assert.equal(pasoActual(pasos, hechos({ quizAprobadoAt: 'y' }, { a: '1', b: '2', c: '3', d: '4', e: '5', f: '6' }, [])), 'lectura')
  assert.equal(
    pasoActual(pasosDe({ vista: true, palabras: true, laminas: false, preguntas: true }), hechosDe({}, {}, ['puesto'], [])),
    'portada',
  )
})

test('validarConcepto rechaza entradas flojas, repetidas o copiadas con mensajes exactos', () => {
  const ficha = {
    termino: 'Factura vencida',
    que: 'Es la factura que ya pasó su fecha límite y todavía mantiene saldo pendiente de pago.',
    ejemplo: 'Si venció el cinco de septiembre y el padre no pagó, entra en gestión de cobro.',
    noConfundir: 'No es una factura anulada ni una promesa verbal de pago.',
  }
  assert.equal(validarConcepto(null, ficha, []).error, 'Escribe al menos una frase completa: qué es y para qué sirve.')
  assert.equal(validarConcepto('pago tarde', ficha, []).error, 'Escribe al menos una frase completa: qué es y para qué sirve.')
  assert.equal(validarConcepto('uno uno uno uno uno uno uno uno', ficha, []).error, 'Eso no explica nada todavía.')
  assert.equal(
    validarConcepto('Esta factura sigue pendiente y requiere seguimiento diario con el representante responsable.', ficha, [
      'Esta factura sigue pendiente y requiere seguimiento diario con el representante responsable.',
    ]).error,
    'Ya usaste ese mismo texto para otra palabra.',
  )
  assert.equal(
    validarConcepto('Es la factura que ya pasó su fecha límite y todavía mantiene saldo pendiente de pago.', ficha, []).error,
    'Eso está copiado del glosario. Dilo con tus palabras, aunque salga torcido.',
  )
  assert.equal(
    validarConcepto('Es la factura que ya pasó su fecha límite y todavía mantiene saldo pendiente para cobrar.', ficha, []).error,
    'Eso está copiado del glosario. Dilo con tus palabras, aunque salga torcido.',
  )
  assert.equal(validarConcepto(`${'palabra '.repeat(120)}extra`, ficha, []).error, 'Con dos o tres frases alcanza.')
  assert.deepEqual(
    validarConcepto('Aquí describo mi responsabilidad concreta y explico cómo ayuda diariamente al equipo.', ficha, []),
    { ok: true, texto: 'Aquí describo mi responsabilidad concreta y explico cómo ayuda diariamente al equipo.' },
  )
})

test('schema y migración crean entrenamiento_conceptos aislado por usuario, módulo y slug', () => {
  const schema = lee('db/schema.sql')
  const migracionRuta = 'db/migrations/2026-09-05-entrenamiento-conceptos.sql'
  assert.ok(existsSync(join(ROOT, migracionRuta)), 'falta la migración de conceptos')
  for (const src of [schema, lee(migracionRuta)]) {
    assert.match(src, /CREATE TABLE IF NOT EXISTS entrenamiento_conceptos/)
    assert.match(src, /usuario_id\s+INTEGER NOT NULL REFERENCES usuarios\(id\) ON DELETE CASCADE/)
    assert.match(src, /modulo\s+TEXT NOT NULL/)
    assert.match(src, /slug\s+TEXT NOT NULL/)
    assert.match(src, /texto\s+TEXT NOT NULL/)
    assert.match(src, /UNIQUE \(usuario_id, modulo, slug\)/)
  }
})

test('actions de conceptos usan usuario fresco, slugs vivos, ReadCommitted y candados servidor', () => {
  const src = sinComentarios(lee('app/actions/entrenamiento-oficio.js'))
  assert.match(src, /import \{ sql, withTransaction \} from ['"]\.\.\/\.\.\/lib\/db['"]/)
  assert.match(src, /function palabrasVivas\(m\)/)

  const cargar = src.slice(src.indexOf('export async function cargarConceptos'), src.indexOf('export async function guardarConcepto'))
  assert.match(cargar, /requireCurrentUser\(\)/)
  assert.match(cargar, /MODULO_IDS_OFICIO\.has\(modulo\)/)
  assert.match(cargar, /m\.roles\.includes\(u\.rol\)/)
  assert.match(cargar, /usuario_id = \$\{u\.id\}/)
  assert.match(cargar, /modulo = \$\{modulo\}/)
  assert.match(cargar, /slug = ANY\(\$\{vivos\}\)/)

  const guardar = src.slice(src.indexOf('export async function guardarConcepto'), src.indexOf('export async function marcarEstudiado'))
  assert.match(guardar, /requireCurrentUser\(\)/)
  assert.match(guardar, /withTransaction\([\s\S]*\{ isolationLevel: 'ReadCommitted' \}\)/)
  assert.match(guardar, /pg_advisory_xact_lock\(hashtext\('conceptos:' \|\| \$\{u\.id\} \|\| ':' \|\| \$\{modulo\}\)\)/)
  assert.match(guardar, /ec\.slug <> \$\{slug\}/)
  assert.match(guardar, /validarConcepto\(/)
  assert.match(guardar, /ON CONFLICT \(usuario_id, modulo, slug\) DO UPDATE/)
  assert.match(guardar, /COUNT\(DISTINCT slug\)::int AS n/)
  assert.match(guardar, /completo/)
  assert.match(guardar, /faltan/)

  const marcar = src.slice(src.indexOf('export async function marcarEstudiado'), src.indexOf('export async function responderQuizOficio'))
  assert.match(marcar, /previo\[modulo\]\?\.tourVistoAt[\s\S]*return \{ ok: true \}/)
  assert.match(marcar, /COUNT\(DISTINCT slug\)::int AS n/)
  assert.match(marcar, /Antes de marcar este módulo escribe con tus palabras las \$\{faltan\} palabras que faltan\./)

  const quiz = src.slice(src.indexOf('export async function responderQuizOficio'), src.indexOf('async function alumnoDe'))
  const iTour = quiz.indexOf('tourVistoAt')
  const iPayload = quiz.indexOf('Respuestas inválidas')
  const iWrite = quiz.indexOf('INSERT INTO entrenamiento_progreso')
  assert.ok(iTour >= 0 && iPayload >= 0 && iWrite >= 0)
  assert.ok(iTour < iPayload, 'la lección marcada se exige antes de validar payload')
  assert.ok(iTour < iWrite, 'la lección marcada se exige antes de escribir intento')
  assert.match(quiz, /Antes de responder marca la lección como realizada\./)
})

test('página de módulo usa la guía solo para alumno abierto y revisión allowlisted domina módulos compartidos', () => {
  const src = sinComentarios(lee('app/centro/[id]/entrenamiento/oficio/[modulo]/page.js'))
  assert.match(src, /import GuiaModulo/)
  assert.match(src, /import ConceptosOficio/)
  assert.match(src, /import MarcarEstudiado/)
  assert.match(src, /import manifestGuia/)
  assert.match(src, /cargarConceptos\(m\.id\)/)
  assert.match(src, /revisionSolicitada[\s\S]*r\.rol === sp\?\.revisar[\s\S]*r\.plan/)
  assert.match(src, /const modoRevision = Boolean\(revisionSolicitada\)/)
  assert.match(src, /const esAlumno = !modoRevision && m\.roles\.includes\(oficio\.rol\)/)
  assert.match(src, /const esOficial = Boolean\(revisionSolicitada \|\| revisionDisponible\)/)
  assert.match(src, /esAlumno && abierto[\s\S]*<GuiaModulo/)
  assert.doesNotMatch(src, /puedeLeerComoOficial/, 'la página no debe conservar el permiso paralelo anterior')
  assert.doesNotMatch(src, /m\.roles\.includes\(sp\?\.revisar\)/, 'la URL sola no activa revisión')
})

test('GuiaModulo no regala pasos durables locales, cierra al avanzar y no abre el cierre hasta el final', () => {
  const src = sinComentarios(lee('components/entrenamiento/GuiaModulo.js'))
  assert.match(src, /const EFIMEROS_SET = new Set\(EFIMEROS\)/)
  assert.match(src, /filtra\(parsed, validos, \{ soloEfimeros: true \}\)/, 'localStorage solo debe aceptar efímeros')
  assert.match(src, /const disponible = paso\.id === actual \|\| cumplido/, 'cierre solo queda disponible cuando es el paso actual')
  assert.doesNotMatch(src, /id === 'cierre'[\s\S]{0,80}disponible/, 'el cierre no puede quedar clicable por excepción')
  assert.match(src, /setAbiertos\(\(prev\) => conservarAbiertos \? prev\.filter[\s\S]*: \[\]\)/, 'al avanzar se cierran pasos anteriores')
  assert.match(src, /new Set\(\[\.\.\.hechosRef\.current, \.\.\.durable\]\)/, 'las props nuevas se reconcilian por unión')
  assert.match(src, /\}, \[clave\]\)/, 'el reset completo queda ligado a usuario:módulo')
  assert.match(src, /removeAttribute\('src'\)[\s\S]*a\.load\(\)/, 'un cambio de paso o mute resetea el único reproductor')
  assert.match(src, /tieneClipActual \? 'Con la voz de Fernando' : 'Sin voz todavía'/)
  assert.match(src, /disabled=\{mute \|\| !tieneClipActual\}/)
})

test('ConceptosOficio distingue borrador de texto guardado', () => {
  const src = sinComentarios(lee('components/entrenamiento/ConceptosOficio.js'))
  assert.match(src, /const \[confirmados, setConfirmados\]/)
  assert.match(src, /valores\[t\.slug\] === confirmados\[t\.slug\]/)
  assert.match(src, /setConfirmados\(\(v\) => \(\{ \.\.\.v, \[slug\]: r\.texto \|\| '' \}\)\)/)
  assert.match(src, /function editar\(slug, value\)[\s\S]*setEstado\(\(s\) => \(\{ \.\.\.s, \[slug\]: \{\} \}\)\)/)
  assert.match(src, /conceptos guardados\./)
})

test('islas cliente no importan prosa de oficio ni guia.js, salvo guia-pasos puro', () => {
  const rutas = [
    'components/entrenamiento/GuiaModulo.js',
    'components/entrenamiento/ConceptosOficio.js',
    'components/entrenamiento/MasaOficio.js',
    'components/entrenamiento/QuizOficio.js',
    'components/entrenamiento/MarcarEstudiado.js',
  ]
  for (const ruta of rutas) {
    const src = sinComentarios(lee(ruta))
    assert.match(src, /^\s*['"]use client['"]/m, `${ruta}: debe ser isla cliente`)
    assert.doesNotMatch(src, /['"][^'"]*entrenamiento\/oficio\/(catalogo|cursos|glosario|guia\.js|guia['"])/, `${ruta}: mete prosa del oficio al bundle`)
  }
  assert.match(sinComentarios(lee('components/entrenamiento/GuiaModulo.js')), /oficio\/guia-pasos/)
})

test('TourHost se desmonta por completo en rutas de entrenamiento de oficio', () => {
  const src = sinComentarios(lee('components/tour/TourHost.js'))
  assert.match(src, /usePathname\(\)/)
  assert.match(src, /pathname\?\.includes\(['"]\/entrenamiento\/oficio['"]\)[\s\S]*return null/)
})
