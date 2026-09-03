import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { soloDeMisCentros } from '../lib/current-user.mjs'

const fuente = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8')

test('soloDeMisCentros recorta al alcance del coordinador', () => {
  const filas = [{ centro_id: 10, n: 1 }, { centro_id: 11, n: 2 }, { centro_id: 12, n: 3 }]
  assert.deepEqual(soloDeMisCentros(filas, [10, 12]).map((f) => f.n), [1, 3])
  // Gerencia (null) no se recorta; un coordinador sin centros no ve nada.
  assert.equal(soloDeMisCentros(filas, null).length, 3)
  assert.equal(soloDeMisCentros(filas, []).length, 0)
})

test('el panel de gerencia sale del alcance, no de todos los centros', () => {
  const body = fuente('../app/actions/dashboard.js')
  assert.doesNotMatch(body, /requireAdmin\(\)/)
  assert.doesNotMatch(body, /SELECT id, nombre FROM centros/) // la lista viene de alcancePanel
  assert.match(body, /alcancePanel\(\)/)
  const growth = fuente('../app/actions/growth.js')
  assert.match(growth, /alcancePanel\(\)/)
  assert.doesNotMatch(growth, /requireAdmin\(\)/)
})

test('cerrar y reabrir el mes exigen un rol que pueda hacerlo', () => {
  const body = fuente('../app/actions/kpi.js')
  const cerrar = body.slice(body.indexOf('export async function cerrarMes'))
  assert.match(cerrar.slice(0, 400), /requireCurrentPuedeCerrarMes\(centroId\)/)
  const reabrir = body.slice(body.indexOf('export async function reabrirMes'))
  assert.match(reabrir.slice(0, 400), /requireCurrentPuedeCerrarMes\(centroId\)/)
})

test('las eliminaciones del centro exigen un rol que pueda eliminar', () => {
  for (const [ruta, fn] of [
    ['../app/actions/cuadro.js', 'deletePedido'],
    ['../app/actions/eventos.js', 'eliminarEvento'],
    ['../app/actions/reservas.js', 'eliminarReserva'],
  ]) {
    const body = fuente(ruta)
    const trozo = body.slice(body.indexOf(`export async function ${fn}`))
    assert.match(trozo.slice(0, 300), /requireCurrentPuedeEliminar\(centroId\)/, `${fn} sin guarda`)
  }
})

test('Gestión de usuarios usa actor fresco y servicio; centros sigue solo en gerencia', () => {
  const usuarios = fuente('../app/actions/usuarios.js')
  assert.match(usuarios, /requireSession\(\)/)
  assert.match(usuarios, /createUsuariosService/)
  assert.doesNotMatch(usuarios, /requireAdmin\(\)/)
  assert.doesNotMatch(usuarios, /SELECT\s|INSERT\s|UPDATE\s|DELETE\s/i)

  const page = fuente('../app/dashboard/usuarios/page.js')
  assert.doesNotMatch(page, /['"]use client['"]/)
  assert.match(page, /getUsuariosPageData/)
  assert.match(page, /UsuariosClient/)

  const sidebar = fuente('../components/Sidebar.js')
  assert.doesNotMatch(sidebar, /aloha_rol/)
  assert.doesNotMatch(sidebar, /localStorage\.getItem\(['"]aloha_rol/)
  assert.match(sidebar, /viewUsers/)
  assert.match(sidebar, /viewCenters/)

  const centros = fuente('../app/actions/centros.js')
  assert.match(centros.slice(centros.indexOf('export async function createCentro')).slice(0, 240), /requireAdmin\(\)/)
})

test('la página conserva props frescas, una sola mutación y la confirmación de acceso', () => {
  const client = fuente('../app/dashboard/usuarios/UsuariosClient.js')
  assert.match(client, /const EMPTY_FORM\s*=\s*\{[^}]*centros:\s*\[\]/s)
  assert.match(client, /function resetEditor\(\)/)
  assert.match(client, /setAccessResult\(/)
  assert.match(client, /initialData\.users\.filter/)
  assert.match(client, /pendingRef\.current/)
  assert.doesNotMatch(client, /useState\(initialData\.users\)/)
  assert.doesNotMatch(client, /listCentros/)
})

test('navegación usa usuario fresco y evita consulta global para alcance vacío', () => {
  const navigation = fuente('../app/actions/navigation.js')
  assert.match(navigation, /requireCurrentUser\(\)/)
  assert.match(navigation, /scope\.length\s*===\s*0\s*\?\s*\[\]/)
  assert.match(navigation, /viewUsers/)
  assert.match(navigation, /viewCenters/)
})
