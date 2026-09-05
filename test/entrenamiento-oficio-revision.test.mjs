// REVISIÓN DEL OFICIO — gerencia y coordinador leyendo el entrenamiento de su
// gente. Fernando entró como admin_general y no veía NADA del oficio: el carril
// devolvía null y la página del hat era un callejón sin salida.
//
// Lo que este archivo blinda: que ganar lectura NO abrió el filtrado real (una
// asistente sigue sin ver el curso de la administradora) y que el permiso lo
// decide el servidor, no la pantalla ni la URL.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MODULOS_OFICIO } from '../lib/entrenamiento/oficio/catalogo.js'
import { planDeRol, rolesQueFirma, rolesQueRevisa } from '../lib/entrenamiento/oficio/progreso.js'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const leer = (p) => readFileSync(join(ROOT, p), 'utf8')

// LA REGLA ES UNA SOLA: si le firmas el hat a alguien, puedes leer ese hat.
// Antes había un segundo corte —"quien tiene plan propio no revisa"— que con el
// Coordinador Operativo teniendo sus propios módulos le habría quitado justo a
// él la lectura de los planes que su puesto existe para auditar, y a la
// Administradora el plan del Coach al que le firma. El candado real nunca fue
// "tiene plan": es rolesQueFirma.
test('rolesQueRevisa es exactamente rolesQueFirma, tenga o no plan propio', () => {
  for (const rol of ['admin_general', 'supervisor', 'coordinador', 'administradora', 'asistente', 'coach']) {
    assert.deepEqual(rolesQueRevisa(rol, MODULOS_OFICIO), rolesQueFirma(rol), `${rol}: revisar y firmar tienen que ser la misma lista`)
  }
  // Quien no le firma a nadie no lee nada ajeno. Este es el candado.
  assert.deepEqual(rolesQueRevisa('asistente', MODULOS_OFICIO), [])
  assert.deepEqual(rolesQueRevisa('coach', MODULOS_OFICIO), [])
  assert.deepEqual(rolesQueRevisa('rol_que_no_existe', MODULOS_OFICIO), [])
  // Gerencia sigue SIN plan propio: firma, no se entrena.
  for (const rol of ['admin_general', 'supervisor']) {
    assert.deepEqual(planDeRol(rol, MODULOS_OFICIO), [], `${rol} no debe ganar plan propio`)
    assert.ok(rolesQueRevisa(rol, MODULOS_OFICIO).length > 0, `${rol} tiene que poder leer los planes que firma`)
  }
})

// Los DOS carriles viajan juntos, y `modo` solo dice cuál es el principal. Si
// la action volviera a elegir uno, el Coordinador pierde la lectura de los
// planes que audita el día que tenga los suyos.
test('la action manda su plan Y los planes que revisa en la misma respuesta', () => {
  const src = leer('app/actions/entrenamiento-oficio.js')
  const cargar = src.slice(src.indexOf('export async function cargarOficio'), src.indexOf('export async function marcarEstudiado'))
  assert.match(cargar, /planesDeRevision\(s\.rol, \{ conPlan: true \}\)/, 'cargarOficio calcula la revisión SIEMPRE, no solo cuando el plan propio está vacío')
  assert.doesNotMatch(cargar, /if \(plan\.length === 0\) \{\s*const revision/, 'la revisión no puede volver a colgar de "no tengo plan"')
  // El carril del índice también: `revision` viaja en las DOS formas, y en la
  // de 'entrenamiento' sale junto a las barras de avance del plan propio.
  const resumen = src.slice(src.indexOf('export async function resumenOficio'), src.indexOf('export async function marcarEstudiado'))
  assert.ok(resumen.length > 200, 'no se encontró resumenOficio')
  const carrilPropio = resumen.slice(resumen.indexOf("modo: 'entrenamiento'"))
  assert.match(carrilPropio, /\brevision,/, 'el carril de quien SÍ se entrena tiene que traer también lo que revisa')
})

test('la lectura de gerencia no abre el filtrado real: la asistente no ve el curso del Centro', () => {
  const delCentro = MODULOS_OFICIO.filter((m) => m.curso === 'centro')
  // Regla de lectura del sistema: tu plan, o el de alguien a quien le firmas.
  const puedeLeer = (rol, m) => m.roles.includes(rol) || rolesQueFirma(rol).some((r) => m.roles.includes(r))
  for (const m of delCentro) {
    assert.equal(puedeLeer('asistente', m), false, `${m.id}: la asistente no puede leer el curso de la administradora`)
  }
  for (const m of MODULOS_OFICIO.filter((m) => m.curso === 'zoho')) {
    // La administradora SÍ: es la Oficial de Entrenamiento de la asistente.
    assert.equal(puedeLeer('administradora', m), true, `${m.id}: quien firma el drill tiene que poder leerlo`)
    assert.equal(puedeLeer('admin_general', m), true, `${m.id}: gerencia revisa`)
  }
})

test('el permiso de revisión se decide en el servidor, no en la pantalla ni en la URL', () => {
  const actions = leer('app/actions/entrenamiento-oficio.js')
  assert.match(actions, /^\s*'use server'/m)
  assert.match(actions, /rolesQueRevisa\(/, 'la action tiene que derivar el permiso de rolesQueRevisa')
  // La página no puede inventarse su propia lista de roles con lectura: en su
  // CÓDIGO (los comentarios sí los nombran) no aparece un solo nombre de rol.
  const pagina = leer('app/centro/[id]/entrenamiento/oficio/page.js')
  const codigo = pagina.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
  assert.doesNotMatch(codigo, /['"](?:admin_general|supervisor|coordinador)['"]/, 'la página no decide el permiso por nombre de rol')
  // El ?revisar= de la URL solo elige entre lo que ya mandó el servidor.
  assert.match(pagina, /revision\s*\|\|\s*\[\]\)\.find\(\(r\) => r\.rol === sp\?\.revisar\)/)
})

test('el carril del índice ya no devuelve null para gerencia y dice que es lectura', () => {
  const carril = leer('components/entrenamiento/CarrilOficio.js')
  assert.match(carril, /modo === 'revision'/, 'el carril tiene que atender el modo revisión')
  assert.match(carril, /revisa/i)
  // Nada de "tu entrenamiento" en el carril de revisión: no es suyo.
  const bloque = carril.slice(carril.indexOf("if (estado === 'revision')"), carril.indexOf("if (estado !== 'listo')"))
  assert.ok(bloque.length > 200, 'no se encontró el bloque de revisión del carril')
  assert.doesNotMatch(bloque, /Tu oficio|Continuar mi oficio|Ver mi hat/, 'la revisión no puede hablarle como si fuera su plan')
  assert.doesNotMatch(bloque, /ent-start__progress/, 'la revisión no lleva barras de avance: no acumula progreso')
})

test('en revisión no se estudia ni se firma: las actions de escritura siguen pidiendo que el módulo sea del puesto', () => {
  const src = leer('app/actions/entrenamiento-oficio.js')
  for (const nombre of ['marcarEstudiado', 'responderQuizOficio']) {
    const start = src.indexOf(`export async function ${nombre}`)
    const cuerpo = src.slice(start, src.indexOf('export ', start + 1))
    assert.match(cuerpo, /m\.roles\.includes\(u\.rol\)/, `${nombre}: gerencia no puede escribir progreso de un módulo ajeno`)
  }
})
