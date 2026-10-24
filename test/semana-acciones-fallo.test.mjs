import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fallo } from '../lib/errores.js'

// En producción Next.js oculta el mensaje de cualquier throw dentro de un
// Server Action. Las mutaciones de /semana deben devolver { error } y los
// clientes mostrarlo, o el coordinador ve «An error occurred…» y cree que no guarda.

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// Cuerpo de una export async function hasta la siguiente (mismo corte que backend-access-matrix).
function cuerpo(source, name) {
  const start = source.indexOf(`export async function ${name}`)
  assert.notEqual(start, -1, `${name} no existe`)
  const rest = source.slice(start)
  const next = rest.slice(1).search(/\nexport async function\s+/)
  return next === -1 ? rest : rest.slice(0, next + 1)
}

// Carga las acciones sin Next: quita imports, destapa los export y recibe cada
// nombre importado como parámetro. Lo que no se stubea lanza al tocarse.
function cargarAcciones(file, stubs) {
  const source = read(file)
  const nombres = [...source.matchAll(/^import \{([^}]+)\} from .*$/gm)]
    .flatMap((m) => m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean))
  const exportadas = [...source.matchAll(/^export async function\s+([A-Za-z0-9_]+)/gm)].map((m) => m[1])
  const body = source.replace(/^'use server'\n/, '').replace(/^import .* from .*\n/gm, '').replace(/export async function /g, 'async function ')
  const args = nombres.map((n) => n in stubs ? stubs[n] : () => { throw new Error(`stub sin definir: ${n}`) })
  return new Function(...nombres, `${body}\nreturn { ${exportadas.join(', ')} }`)(...args)
}

const MUTANTES_SEMANA = ['actualizarSemanaCentro', 'recalcularSemanaCentro', 'asignarCondicion', 'agregarObjetivo', 'editarObjetivo', 'marcarObjetivo', 'eliminarObjetivo', 'guardarCuotas', 'aprobarCuotas', 'agregarOrden', 'guardarCompromiso', 'verificarObjetivo', 'cambiarAlineamiento', 'programarObjetivoHoy']
const LECTURAS_SEMANA = ['getInformeSemana', 'getSemanaCentro', 'getTableroSemanal', 'getReunionSemanal']
const MUTANTES_JUEGOS = ['guardarJuegoSemana', 'aprobarJuegoSemana']
const LECTURAS_JUEGOS = ['getJuegoSemana']

test('cada mutación de semana y juegos devuelve { error } con fallo() en vez de lanzar', () => {
  for (const [file, mutantes, lecturas] of [['app/actions/semana.js', MUTANTES_SEMANA, LECTURAS_SEMANA], ['app/actions/juegos-semana.js', MUTANTES_JUEGOS, LECTURAS_JUEGOS]]) {
    const source = read(file)
    assert.match(source, /^import \{ fallo \} from '\.\.\/\.\.\/lib\/errores\.js'$/m, `${file} importa fallo`)
    const exportadas = [...source.matchAll(/^export async function\s+([A-Za-z0-9_]+)/gm)].map((m) => m[1]).sort()
    assert.deepEqual(exportadas, [...mutantes, ...lecturas].sort(), `${file}: hay una acción nueva sin clasificar en esta prueba`)
    for (const name of mutantes) {
      const body = cuerpo(source, name)
      assert.match(body, /\{\n  try \{\n/, `${name} envuelve su cuerpo en try desde la primera línea`)
      assert.ok(body.includes(`} catch (e) { return fallo('${name}', e) }`), `${name} termina en fallo('${name}', e)`)
    }
    // Las lecturas siguen lanzando: cada pantalla que las llama ya tiene su catch
    // con mensaje propio (TableroSemanal, InformeSemana, ruta-nivel, ranking…).
    for (const name of lecturas) assert.doesNotMatch(cuerpo(source, name), /fallo\(/, `${name} es lectura y no se envuelve`)
  }
})

test('aprobarCuotas fuera de la semana abierta devuelve el mensaje del servicio', async (t) => {
  t.mock.method(console, 'error', () => {}) // fallo() registra el detalle en el log; aquí sobra
  const acciones = cargarAcciones('app/actions/semana.js', {
    fallo,
    requireCurrentCoordinacion: async () => ({ id: 7 }),
    guardarCuotasEn: async () => { throw new Error('Las cuotas solo se guardan para la semana abierta.') },
  })
  assert.deepEqual(await acciones.aprobarCuotas(1, '2026-10-16', { ninos_activos: 10 }), { error: 'Las cuotas solo se guardan para la semana abierta.' })
})

test('la guarda de acceso también llega como { error } legible', async (t) => {
  t.mock.method(console, 'error', () => {})
  const acciones = cargarAcciones('app/actions/semana.js', {
    fallo,
    requireCurrentCoordinacion: async () => { throw new Error('No autorizado para este centro') },
  })
  assert.deepEqual(await acciones.agregarOrden(1, '2026-10-16', { texto: 'Llamar a las familias' }), { error: 'Tu usuario no tiene acceso a este centro.' })
})

test('con éxito la acción devuelve lo del servicio sin tocarlo', async () => {
  const acciones = cargarAcciones('app/actions/semana.js', {
    fallo,
    requireCurrentCoordinacion: async () => ({ id: 7 }),
    guardarCuotasEn: async (centroId, semanaFin, cuotas, opciones) => ({ ok: true, centroId, semanaFin, cuotas, ...opciones }),
  })
  assert.deepEqual(await acciones.aprobarCuotas(1, '2026-10-23', { ninos_activos: 10 }), { ok: true, centroId: 1, semanaFin: '2026-10-23', cuotas: { ninos_activos: 10 }, actorId: 7, aprobar: true })
})

test('guardarJuegoSemana devuelve { error } cuando el rol no puede proponer', async (t) => {
  t.mock.method(console, 'error', () => {})
  const acciones = cargarAcciones('app/actions/juegos-semana.js', {
    fallo,
    requireCurrentWriteCentro: async () => ({ id: 3, rol: 'asistente' }),
    puedeCerrarMes: () => false,
  })
  assert.deepEqual(await acciones.guardarJuegoSemana(1, '2026-10-23', {}), { error: 'La propuesta del juego corresponde a la administradora o a coordinación.' })
})

test('los clientes tratan { error } como fallo y muestran el mensaje del servidor', () => {
  const plan = read('components/semana/PlanSemana.js')
  assert.match(plan, /async function ejecutar\(work\) \{[\s\S]*?const r = await work\(\); if \(r\?\.error\) throw new Error\(r\.error\)/)
  assert.match(plan, /e\?\.message \|\| 'No se pudo guardar el plan\.'/)
  const cuotas = read('components/semana/CuotasSemana.js')
  assert.match(cuotas, /const r = aprobar \? await aprobarCuotas\(centroId, semanaFin, payload\) : await guardarCuotas\(centroId, semanaFin, payload\)\n\s*if \(r\?\.error\) throw new Error\(r\.error\)/)
  assert.match(cuotas, /cause\?\.message \|\| 'No se pudieron guardar las cuotas\.'/)
  const compromiso = read('components/semana/CompromisoMensual.js')
  assert.match(compromiso, /const r = await guardarCompromiso\(centroId, \{ periodo, metas, diagnostico: form\.get\('diagnostico'\) \}\)\n\s*if \(r\?\.error\) throw new Error\(r\.error\)/)
  const juegos = read('components/semana/JuegosSemana.js')
  // Un { error } nunca debe quedar guardado como si fuera el juego.
  assert.match(juegos, /const r = await work\(\); if \(r\?\.error\) throw new Error\(r\.error\); setJuego\(r\)/)
  assert.doesNotMatch(juegos, /setJuego\(await work\(\)\)/)
  const reunion = read('app/dashboard/reunion-semanal/page.js')
  assert.match(reunion, /const r = await work\(\); if \(r\?\.error\) throw new Error\(r\.error\); await cargar\(\)/)
  const pagina = read('app/centro/[id]/semana/page.js')
  assert.match(pagina, /const result = await actualizarSemanaCentro\(id\); if \(turno === solicitud\.current\) \{ if \(result\?\.error\) setError\(result\.error\); else setDatos\(result\) \}/)
})

test('PlanSemana.ejecutar muestra el mensaje del servidor y no refresca si la acción devuelve { error }', async () => {
  const body = read('components/semana/PlanSemana.js').match(/async function ejecutar\(work\) \{([\s\S]*?)\n  \}\n/)[1]
  const estado = { error: null, refrescos: 0 }
  const ejecutar = new Function('setOcupado', 'setError', 'setMensaje', 'onRefresh', `return async function ejecutar(work) {${body}\n}`)(
    () => {}, (m) => { estado.error = m }, () => {}, async () => { estado.refrescos++ })
  assert.equal(await ejecutar(async () => ({ error: 'Las cuotas solo se guardan para la semana abierta.' })), false)
  assert.equal(estado.error, 'Las cuotas solo se guardan para la semana abierta.')
  assert.equal(estado.refrescos, 0)
  assert.equal(await ejecutar(async () => ({ ok: true })), true)
  assert.equal(estado.refrescos, 1)
})
