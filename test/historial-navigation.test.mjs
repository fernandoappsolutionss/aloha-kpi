import test from 'node:test'
import assert from 'node:assert/strict'
import { esRutaHistorial, seccionesHistorial } from '../components/historial-navigation.mjs'
import { hrefActivo } from '../components/nav-activo.mjs'

test('Historial reúne las cuatro secciones y conserva sus rutas', () => {
  for (const role of ['admin_general', 'supervisor']) {
    const links = seccionesHistorial({ actor: { role }, capabilities: { viewMetas: true } })
    assert.deepEqual(links.map(({ label, href }) => [label, href]), [
      ['Historial', '/dashboard/historial'],
      ['Metas', '/dashboard/metas'],
      ['Alertas', '/dashboard/alertas'],
      ['Reportes', '/dashboard/reporte'],
    ])
  }
})

test('el coordinador mantiene sus tres secciones sin acceso a Metas', () => {
  const links = seccionesHistorial({ actor: { role: 'coordinador' }, capabilities: { viewMetas: false } })
  assert.deepEqual(links.map(({ label }) => label), ['Historial', 'Alertas', 'Reportes'])
  assert.equal(seccionesHistorial({ actor: { role: 'admin_general' } }).some(({ label }) => label === 'Metas'), false)
  for (const role of ['administradora', 'asistente', 'coach', 'desconocido']) {
    assert.deepEqual(seccionesHistorial({ actor: { role }, capabilities: { viewMetas: true } }), [])
  }
  assert.deepEqual(seccionesHistorial(null), [])
})

test('abrir cualquier sección deja Historial como único acceso activo del menú', () => {
  const menu = ['/dashboard', '/dashboard/crecimiento', '/dashboard/historial', '/dashboard/entrenamiento', '/perfil']
  for (const path of ['/dashboard/historial', '/dashboard/metas', '/dashboard/alertas', '/dashboard/reporte', '/dashboard/reporte/detalle']) {
    assert.equal(esRutaHistorial(path), true)
    assert.equal(hrefActivo(path, menu), '/dashboard/historial')
  }
  for (const path of ['/dashboard/metas-extra', '/dashboard/reportes', '/centro/2/historial', '/dashboard/crecimiento', '', null]) {
    assert.equal(esRutaHistorial(path), false)
  }
  assert.equal(hrefActivo('/centro/2/historial', ['/centro/2', '/centro/2/historial']), '/centro/2/historial')
  assert.equal(hrefActivo('/dashboard/metas', ['/centro/2', '/centro/2/historial']), null)
  assert.equal(hrefActivo('/dashboard/entrenamiento', menu), '/dashboard/entrenamiento')
})
