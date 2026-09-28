// Curso `fiscal`: solo Los Naranjos lo estudia y solo Los Naranjos (o
// gerencia) descarga la carta de la contadora.
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { MODULOS_OFICIO } from '../lib/entrenamiento/oficio/catalogo.js'
import { planDeRol, esDelPlan } from '../lib/entrenamiento/oficio/progreso.js'
import { CENTRO_LOS_NARANJOS, FISCAL, puedeVerMaterialFiscal } from '../lib/entrenamiento/oficio/cursos/fiscal.js'

const FIS = FISCAL.map((m) => m.id)
const tieneFiscal = (plan) => plan.some((m) => FIS.includes(m.id))

test('fiscal: entra al plan de administradora y asistente SOLO en Los Naranjos', () => {
  for (const rol of ['administradora', 'asistente']) {
    const naranjos = planDeRol(rol, MODULOS_OFICIO, CENTRO_LOS_NARANJOS)
    assert.deepEqual(naranjos.slice(-2).map((m) => m.id), FIS, `${rol}: los dos fiscales cierran su plan en Los Naranjos`)
    assert.equal(tieneFiscal(planDeRol(rol, MODULOS_OFICIO, 3)), false, `${rol}: otro centro no lo recibe`)
    assert.equal(tieneFiscal(planDeRol(rol, MODULOS_OFICIO)), false, `${rol}: sin centro, fuera (fail-closed)`)
    // El resto del plan no cambia por el centro.
    assert.equal(naranjos.length, planDeRol(rol, MODULOS_OFICIO, 3).length + 2)
  }
  for (const rol of ['coach', 'coordinador']) {
    assert.equal(tieneFiscal(planDeRol(rol, MODULOS_OFICIO, CENTRO_LOS_NARANJOS)), false, `${rol} no lleva fiscal`)
  }
  const m = FISCAL[0]
  assert.equal(esDelPlan(m, 'asistente', CENTRO_LOS_NARANJOS), true)
  assert.equal(esDelPlan(m, 'asistente', String(CENTRO_LOS_NARANJOS)), true, 'centro_id puede venir como texto')
  assert.equal(esDelPlan(m, 'asistente', 3), false)
  assert.equal(esDelPlan(m, 'asistente', null), false)
})

test('fiscal: la carta se descarga solo desde Los Naranjos o con admin master', () => {
  assert.equal(puedeVerMaterialFiscal({ rol: 'asistente', centro_id: CENTRO_LOS_NARANJOS }), true)
  assert.equal(puedeVerMaterialFiscal({ rol: 'coordinador', centro_id: null, centros: [4, CENTRO_LOS_NARANJOS] }), true)
  assert.equal(puedeVerMaterialFiscal({ rol: 'administradora', centro_id: 3, centros: [] }), false)
  assert.equal(puedeVerMaterialFiscal({ rol: 'admin_master', email: 'otro@x.com', centro_id: null }), false, 'admin_master sin el correo del dueño no es master')
  assert.equal(puedeVerMaterialFiscal(null), false)
})

test('fiscal: la carta existe en el repo y viaja al bundle de su ruta', () => {
  assert.ok(existsSync('lib/entrenamiento/material/informacion-fiscal-ff-soluciones.docx'))
  assert.ok(!existsSync('public/entrenamiento/informacion-fiscal-ff-soluciones.docx'), 'no va en public/: es interna')
  assert.match(readFileSync('next.config.js', 'utf8'), /'\/api\/entrenamiento\/fiscal\/documento': \['\.\/lib\/entrenamiento\/material\/\*\.docx'\]/)
  assert.match(readFileSync('app/api/entrenamiento/fiscal/documento/route.js', 'utf8'), /puedeVerMaterialFiscal\(u\)/)
})
