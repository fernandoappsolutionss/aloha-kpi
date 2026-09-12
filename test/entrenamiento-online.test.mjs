import test from 'node:test'
import assert from 'node:assert/strict'
import { COACH_ONLINE } from '../lib/entrenamiento/oficio/cursos/coach-online.js'
import { RESPUESTAS_COACH_ONLINE } from '../lib/entrenamiento/respuestas-oficio/coach-online.js'
import { MODULOS_OFICIO } from '../lib/entrenamiento/oficio/catalogo.js'
import { GUIA } from '../lib/entrenamiento/oficio/guia.js'

const porId = Object.fromEntries(COACH_ONLINE.map((m) => [m.id, m]))
const textoVisible = (m) => JSON.stringify(m, (k, v) => (k === 'voz' || k === 'fuente' ? undefined : v))
const recursos = Object.fromEntries(COACH_ONLINE.flatMap((m) => (
  m.bloques
    .filter((b) => b.t === 'recursos')
    .flatMap((b) => b.recursos.map((r) => [`${m.id}:${r.titulo}`, r.href]))
)))
const opcionCorrecta = (id, patronPregunta) => {
  const modulo = porId[id]
  const idx = modulo.quiz.findIndex((q) => patronPregunta.test(q.pregunta))
  assert.notEqual(idx, -1, `${id}: pregunta no encontrada ${patronPregunta}`)
  return modulo.quiz[idx].opciones[RESPUESTAS_COACH_ONLINE[id][idx]]
}

test('Online se integra como tres módulos nuevos al final del plan Coach', () => {
  assert.deepEqual(COACH_ONLINE.map((m) => m.id), ['of-coa-12', 'of-coa-13', 'of-coa-14'])
  assert.deepEqual(COACH_ONLINE.map((m) => m.orden), [25, 26, 27])
  assert.deepEqual(COACH_ONLINE.map((m) => m.curso), ['coach', 'coach', 'coach'])
  for (const m of COACH_ONLINE) assert.deepEqual(m.roles, ['coach'])
  assert.deepEqual(porId['of-coa-12'].requiere, ['of-coa-11'])
  assert.deepEqual(porId['of-coa-13'].requiere, ['of-coa-12'])
  assert.deepEqual(porId['of-coa-14'].requiere, ['of-coa-13'])

  const planCoach = MODULOS_OFICIO
    .filter((m) => m.roles.includes('coach'))
    .sort((a, b) => a.orden - b.orden)
    .map((m) => m.id)
  assert.deepEqual(planCoach.slice(-4), ['of-coa-11', 'of-coa-12', 'of-coa-13', 'of-coa-14'])
})

test('Online conserva las reglas exactas auditadas del Manual', () => {
  const entorno = textoVisible(porId['of-coa-12'])
  assert.match(entorno, /cámara encendida durante toda la clase/i)
  assert.match(entorno, /bocinas o audífonos y micrófono/i)
  assert.match(entorno, /activar y desactivar el micrófono/i)
  assert.match(entorno, /antes de la primera clase/i)
  assert.match(entorno, /Historia de la Clase/i)
  assert.match(entorno, /crea una copia/i)
  assert.match(entorno, /fecha y plantilla/i)
  assert.match(entorno, /diapositiva azul de ALOHA/i)
  assert.match(entorno, /Tips para coaches: generales/i)
  assert.match(entorno, /Tips para coaches: kinder/i)

  const clase = textoVisible(porId['of-coa-13'])
  assert.match(clase, /cada segunda clase/i)
  assert.match(clase, /última actividad/i)
  assert.match(clase, /15 minutos/i)
  assert.match(clase, /www\.kahoot\.it/i)
  assert.match(clase, /Búsqueda del Tesoro se realiza una vez por grupo/i)
  assert.match(clase, /repaso y juegos/i)
  assert.match(clase, /Dossier de juegos online/i)
  assert.match(clase, /Brain Gym/i)
  assert.match(clase, /Guía para Brain Gym/i)
  assert.match(clase, /Brain Breaks/i)
  assert.match(clase, /Brain Breaks Flashcards/i)
  assert.match(clase, /Instrucciones para Brain Breaks/i)
  assert.match(clase, /Actividades Cognitivas Kids/i)
  assert.match(clase, /Guía para Actividades Cognitivas Kids/i)
  assert.match(clase, /Actividades Cognitivas Tiny Tots/i)
  assert.match(clase, /Guía para Actividades Cognitivas Tiny Tots/i)
  assert.match(clase, /Preguntas frecuentes de los Coaches/i)
  assert.match(clase, /Preguntas frecuentes de los Padres/i)

  const seguimiento = textoVisible(porId['of-coa-14'])
  assert.match(seguimiento, /formato de Drive/i)
  assert.match(seguimiento, /Class Dojo/i)
  assert.match(seguimiento, /puntos/i)
  assert.match(seguimiento, /2 clases seguidas/i)
  assert.match(seguimiento, /saludo de motivación/i)
  assert.match(seguimiento, /Primera clase/i)
  assert.match(seguimiento, /Segunda clase/i)
  assert.match(seguimiento, /Primer día de la semana siguiente/i)
  assert.match(seguimiento, /cuenta de estudiante/i)
  assert.match(seguimiento, /corrige semanalmente/i)
  assert.match(seguimiento, /sube la retroalimentación semanal a la plataforma de cada niño/i)
})

test('Online no incorpora anexos ni reglas generales fuera del bloque auditado', () => {
  const t = COACH_ONLINE.map(textoVisible).join('\n')
  assert.doesNotMatch(t, /NEE|Necesidades Especiales|PROTOCOLOS DE NEE/i)
  assert.doesNotMatch(t, /Tiendita|ALOHA Dólares|Mental Day/i)
  assert.doesNotMatch(t, /clase de reforzamiento|clase de reposición/i)
  assert.match(t, /puede adjuntarse, pero no es requisito/i)
})

test('Online trae respuestas servidor y guía hablada para los tres módulos', () => {
  assert.deepEqual(Object.keys(RESPUESTAS_COACH_ONLINE).sort(), COACH_ONLINE.map((m) => m.id).sort())
  for (const m of COACH_ONLINE) {
    assert.equal(RESPUESTAS_COACH_ONLINE[m.id].length, m.quiz.length)
    assert.deepEqual(Object.keys(GUIA[m.id]).sort(), ['cierre', 'palabras', 'vista'])
  }
  assert.equal(opcionCorrecta('of-coa-13', /quince minutos incluyendo conexión/i), 'Que la conexión a www.kahoot.it cuenta dentro del bloque')
  assert.equal(opcionCorrecta('of-coa-14', /imagen tomada durante la clase/i), 'Verdadero')
})

test('Online expone los enlaces oficiales del anexo sin inventar contenido Drive', () => {
  const esperados = [
    ['of-coa-12:Requerimientos para el coach', 'https://drive.google.com/file/d/1n9mp_z549oSSnEAwNY_f3Zd061hLBgeQ/view?usp=sharing'],
    ['of-coa-12:Requerimientos para el alumno', 'https://drive.google.com/file/d/1rlrv-M8nVIDOezS51ClqBvCgtMXq_RwW/view?usp=sharing'],
    ['of-coa-12:Tips para coaches: generales', 'https://drive.google.com/file/d/1fe8K7pVZ3IHav5N1QBR3mqIAxbiW_C7I/view?usp=sharing'],
    ['of-coa-12:Tips para coaches: kinder', 'https://drive.google.com/file/d/1i4nviYqVi54ZkES-8QhsFjToMXcP97Yp/view?usp=sharing'],
    ['of-coa-12:Estructura de presentación de clase', 'https://drive.google.com/file/d/1wo5lVTJg20pQSDtlkz8Mp0Nt-bfyLdYd/view?usp=sharing'],
    ['of-coa-13:Estructura de clase (texto y tiempo)', 'https://drive.google.com/file/d/1zdixSsdSRSTNzSFIG6hV1hMRBPe830b3/view?usp=sharing'],
    ['of-coa-13:Estructura de presentación de clase', 'https://drive.google.com/file/d/1wo5lVTJg20pQSDtlkz8Mp0Nt-bfyLdYd/view?usp=sharing'],
    ['of-coa-13:Cierre de Nivel - Búsqueda del Tesoro', 'https://drive.google.com/drive/folders/1WLBMiw2fWWVr6Z4yp6nnvM6arEoNGBPy?usp=sharing'],
    ['of-coa-13:Dossier de juegos online', 'https://drive.google.com/file/d/1qEn-O4kmpV3Lu44dw-8OdD0rnOZeBWK6/view?usp=sharing'],
    ['of-coa-13:Brain Gym', 'https://drive.google.com/file/d/1XrBP-X6MFDjInGokzLCqyrPckag95rK6/view?usp=sharing'],
    ['of-coa-13:Guía para Brain Gym', 'https://drive.google.com/file/d/1d70hVlbV7Carp8jHfWjcAgnoNDP4ihIP/view?usp=sharing'],
    ['of-coa-13:Brain Breaks', 'https://drive.google.com/file/d/12BIzQPgtNlNKGSDfOP_TjgG2MVF78lgo/view?usp=sharing'],
    ['of-coa-13:Brain Breaks Flashcards', 'https://drive.google.com/file/d/117fm3A3XOMTc5hXkYBOjk8jYHszLUATO/view?usp=sharing'],
    ['of-coa-13:Instrucciones para Brain Breaks', 'https://drive.google.com/file/d/1VnVU_rUd2Hy8nLl18hGWUAxeHingaPKr/view?usp=sharing'],
    ['of-coa-13:Actividades Cognitivas Kids', 'https://drive.google.com/file/d/1iJvm-hNbzSJkIqv4oX_kL6WXVD3pgSUi/view?usp=sharing'],
    ['of-coa-13:Guía para Actividades Cognitivas Kids', 'https://drive.google.com/file/d/1iFJfh8AVa1lOm7p--jPrWkLYSAg39u-c/view?usp=sharing'],
    ['of-coa-13:Actividades Cognitivas Tiny Tots', 'https://drive.google.com/file/d/1KS8d6PXy5lH_fC2pBQj_QV0kXf2kc0Ol/view?usp=sharing'],
    ['of-coa-13:Guía para Actividades Cognitivas Tiny Tots', 'https://drive.google.com/file/d/1zdDcpee-S8kicgHaWIV1U-q647sGBBW4/view?usp=sharing'],
    ['of-coa-14:Plantilla de Retroalimentación', 'https://drive.google.com/file/d/149joytvqCavEh_rLcS5ecoU74z1xf1AF/view?usp=sharing'],
    ['of-coa-13:Preguntas frecuentes de los Coaches', 'https://drive.google.com/file/d/1tw7ZFVr5VTAu0bDyxRW1UrrtnQMFmkh1/view?usp=sharing'],
    ['of-coa-13:Preguntas frecuentes de los Padres', 'https://drive.google.com/file/d/1TWayV-AfZlGbTihDZ27N3NVWBE9katSi/view?usp=sharing'],
  ]
  for (const [titulo, href] of esperados) assert.equal(recursos[titulo], href)
})
