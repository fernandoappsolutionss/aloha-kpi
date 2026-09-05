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

test('rolesQueRevisa: gerencia y coordinador leen los dos planes; quien se entrena, ninguno', () => {
  for (const rol of ['admin_general', 'supervisor', 'coordinador']) {
    assert.deepEqual(rolesQueRevisa(rol, MODULOS_OFICIO).sort(), ['administradora', 'asistente'], `${rol} tiene que poder revisar los dos planes`)
    // Y sigue SIN plan propio: revisar no es entrenarse.
    assert.deepEqual(planDeRol(rol, MODULOS_OFICIO), [], `${rol} no debe ganar plan propio`)
  }
  // Quien tiene plan propio revisa estudiando el suyo, no leyendo por encima.
  assert.deepEqual(rolesQueRevisa('administradora', MODULOS_OFICIO), [])
  assert.deepEqual(rolesQueRevisa('asistente', MODULOS_OFICIO), [])
  // No es una lista nueva de roles: sale de OFICIAL_DE, la misma de las firmas.
  for (const rol of ['admin_general', 'supervisor', 'coordinador']) {
    assert.deepEqual(rolesQueRevisa(rol, MODULOS_OFICIO), rolesQueFirma(rol))
  }
  assert.deepEqual(rolesQueRevisa('rol_que_no_existe', MODULOS_OFICIO), [])
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
