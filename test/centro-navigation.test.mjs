import test from 'node:test'
import assert from 'node:assert/strict'
import { hrefKpiMensual, seccionesCentro } from '../components/centro-navigation.mjs'
import { hrefActivo } from '../components/nav-activo.mjs'

test('KPI Mensual reúne sus cuatro pantallas dentro del centro seleccionado', () => {
  const links = seccionesCentro(21)
  assert.deepEqual(links.map(({ label }) => label), ['KPI Mensual', 'Cumplimiento', 'FODA', 'Historial'])
  const menu = ['/centro/21', '/centro/21/kpi', '/centro/21/grupos', '/centro/21/entrenamiento']
  for (const { href } of links) {
    assert.equal(hrefKpiMensual(href), '/centro/21/kpi')
    assert.equal(hrefActivo(href, menu), '/centro/21/kpi')
  }
  assert.equal(hrefActivo('/centro/2/foda', menu), null)
  assert.equal(hrefActivo('/centro/21/entrenamiento/oficio/of-coa-1', menu), '/centro/21/entrenamiento')
  assert.equal(hrefActivo('/centro/21/entrenamiento/firmas', menu), '/centro/21/entrenamiento')
  for (const path of ['/dashboard/historial', '/centro/21/historial-extra', '/centro/21/grupos', '', null]) {
    assert.equal(hrefKpiMensual(path), null)
  }
})

test('cada puesto sigue encontrando su plan dentro de Entrenamiento', () => {
  for (const rol of ['administradora', 'asistente', 'coach', 'coordinador']) {
    const links = seccionesCentro(2, 'entrenamiento', rol)
    assert.ok(links.some(({ label, href }) => label === 'Mi plan de puesto' && href === '/centro/2/entrenamiento/oficio'), rol)
    assert.equal(links.some(({ label }) => label === 'Firmas de maniobra'), ['administradora', 'coordinador'].includes(rol), rol)
  }
  for (const rol of ['admin_general', 'supervisor']) {
    const links = seccionesCentro(2, 'entrenamiento', rol)
    assert.ok(links.some(({ label }) => label === 'Planes de puestos'))
    assert.ok(links.some(({ label }) => label === 'Firmas de maniobra'))
    assert.equal(links.some(({ label }) => label === 'Mi plan de puesto'), false)
  }
  assert.deepEqual(seccionesCentro(2, 'entrenamiento', null), [])
  assert.deepEqual(seccionesCentro(2, 'entrenamiento', 'desconocido'), [])
  assert.deepEqual(seccionesCentro(null), [])
})
