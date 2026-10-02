import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { grupoIniciado, clavesNoPermitidasPostInicio } from '../lib/plan-grupo.mjs'
import { periodosAfectadosCambioInicioGrupo, ninosReestrenadosPorFechaGrupo } from '../lib/inicios-clase.mjs'
import { ITINERARIOS, fechaIso10 } from '../lib/operaciones.js'

// Rama `reparaFechaNull` de actualizarGrupo (app/actions/grupos.js): un grupo
// veterano con fecha NULL puede registrar su fecha de inicio, pero no una que
// re-estrene a sus niños (los centros escribieron ahí la fecha de su NIVEL y el
// KPI de agosto 2026 contó a los veteranos como nuevos). Corre la Server Action
// real sustituyendo solo sus fronteras de E/S (mismo patrón que caja-actions).

const SOURCE = readFileSync(new URL('../app/actions/grupos.js', import.meta.url), 'utf8')
const HOY = '2026-10-01'

function acciones({ grupo, grupos = [grupo], estudiantes = [], eventos = [], errorMes = null }) {
  const consultas = []
  const escrituras = []
  const llamadas = { meses: [], candado: 0 }

  const responder = (strings) => {
    const texto = strings.join('?').replace(/\s+/g, ' ').trim()
    consultas.push(texto)
    if (/^UPDATE grupos/i.test(texto)) { escrituras.push(texto); return [] }
    if (/FROM grupos WHERE id = \?/i.test(texto)) return [grupo]
    if (/FROM grupos/i.test(texto)) return grupos
    if (/FROM estudiantes/i.test(texto)) return estudiantes
    if (/FROM estudiante_eventos/i.test(texto)) return eventos
    if (/FROM grupo_horarios/i.test(texto)) return []
    throw new Error(`consulta inesperada en el test: ${texto}`)
  }
  const query = async (strings) => responder(strings)

  const source = SOURCE
    .replace(/^'use server'$/m, '')
    .replace(/^import[\s\S]*?from .*$/gm, '')
    .replace(/export /g, '')
  const { actualizarGrupo } = vm.runInNewContext(`${source}\n;({ actualizarGrupo })`, {
    requireCurrentWriteCentro: async () => ({ id: 1 }),
    sql: query,
    withTransaction: async (callback) => callback(query),
    ITINERARIOS,
    fechaIso10,
    hoyISO: () => HOY,
    grupoIniciado,
    clavesNoPermitidasPostInicio,
    periodosAfectadosCambioInicioGrupo,
    ninosReestrenadosPorFechaGrupo: (args) => { llamadas.candado++; return ninosReestrenadosPorFechaGrupo(args) },
    bloquearMesesEditables: async (_query, _centroId, periodos) => { llamadas.meses.push(periodos); return errorMes },
  })
  return { actualizarGrupo, consultas, escrituras, llamadas }
}

const grupoVeterano = (overrides = {}) => ({
  id: 67,
  centro_id: 1,
  numero: '36',
  itinerario: 'KIDS',
  es_online: false,
  coach_id: null,
  estado: 'activo',
  fecha_inicio_clases: null,
  itinerario_clases: null,
  notas: null,
  created_at: '2026-08-01T15:27:47.441Z',
  ...overrides,
})
// Veteranos del cargue masivo: vendidos el 1-jun, sin asistencia marcada.
const nino = (id, overrides = {}) => ({
  id, nombre: `Niño ${id}`, grupo_id: 67, estado: 'activo', fecha_inscripcion: '2026-06-01', ultima_asistencia: null, ...overrides,
})
const venta = (id, overrides = {}) => ({
  id: 900 + id, estudiante_id: id, tipo: 'inscripcion', fecha: '2026-06-01', a_grupo_id: 67, ...overrides,
})

test('reparar la fecha con la del nivel re-estrena a los veteranos: se rechaza y no se escribe nada', async () => {
  const { actualizarGrupo, escrituras, llamadas } = acciones({
    grupo: grupoVeterano(),
    estudiantes: [nino(1), nino(2)],
    eventos: [venta(1), venta(2)],
  })
  const r = await actualizarGrupo(1, 67, { fecha_inicio_clases: '2026-08-03' })
  assert.match(r.error, /^Este grupo ya tenía 2 niños antes del 03\/08\/2026: esa fecha es el inicio de su nivel actual, no la apertura del grupo\./)
  assert.match(r.error, /Cárgala en «Itinerario del grupo» \(nivel y fecha de inicio del nivel\)\./)
  assert.match(r.error, /Si no sabes cuándo abrió el grupo, deja vacía la fecha de inicio de clases: así cuenta como grupo que ya venía dando clases\.$/)
  assert.equal(r.ok, undefined)
  assert.equal(escrituras.length, 0, 'ni la fecha ni updated_at')
  assert.equal(llamadas.meses.length, 0, 'el candado responde antes de tocar los meses')
})

test('con un solo niño afectado el mensaje va en singular', async () => {
  const { actualizarGrupo } = acciones({
    grupo: grupoVeterano(), estudiantes: [nino(1)], eventos: [venta(1)],
  })
  const r = await actualizarGrupo(1, 67, { fecha_inicio_clases: '2026-08-03' })
  assert.match(r.error, /^Este grupo ya tenía 1 niño antes del 03\/08\/2026:/)
})

test('una apertura real anterior a todas las ventas se registra y protege los meses', async () => {
  const { actualizarGrupo, escrituras, llamadas } = acciones({
    grupo: grupoVeterano(),
    estudiantes: [nino(1), nino(2)],
    eventos: [venta(1), venta(2)],
  })
  const r = await actualizarGrupo(1, 67, { fecha_inicio_clases: '2025-03-01' })
  assert.equal(r.error, undefined)
  assert.equal(r.ok, true)
  assert.equal(escrituras.filter((texto) => /^UPDATE grupos SET fecha_inicio_clases/.test(texto)).length, 1)
  assert.equal(llamadas.meses.length, 1, 'bloquearMesesEditables sigue cuidando los meses afectados')
})

test('un grupo veterano sin niños que re-estrenar acepta la fecha', async () => {
  // Venta posterior a la fecha nueva: su inicio es su venta, no se mueve.
  const { actualizarGrupo, escrituras } = acciones({
    grupo: grupoVeterano(),
    estudiantes: [nino(1, { fecha_inscripcion: '2026-09-10' })],
    eventos: [venta(1, { fecha: '2026-09-10' })],
  })
  const r = await actualizarGrupo(1, 67, { fecha_inicio_clases: '2026-08-03' })
  assert.equal(r.ok, true)
  assert.equal(escrituras.filter((texto) => /^UPDATE grupos SET fecha_inicio_clases/.test(texto)).length, 1)
})

test('la rama trae de la base lo que iniciosClase necesita para decidir', async () => {
  // Si falta una columna o un tipo de evento el candado no falla: decide mal en silencio.
  const { actualizarGrupo, consultas } = acciones({
    grupo: grupoVeterano(), estudiantes: [nino(1)], eventos: [venta(1)],
  })
  await actualizarGrupo(1, 67, { fecha_inicio_clases: '2026-08-03' })
  const de = (tabla) => consultas.find((texto) => /^SELECT/.test(texto) && new RegExp(`FROM ${tabla} WHERE centro_id`).test(texto))
  const estudiantes = de('estudiantes')
  for (const columna of ['id', 'nombre', 'grupo_id', 'estado', 'fecha_inscripcion', 'ultima_asistencia']) {
    assert.match(estudiantes, new RegExp(`\\b${columna}\\b`), `estudiantes sin ${columna}`)
  }
  const grupos = de('grupos')
  for (const columna of ['id', 'fecha_inicio_clases', 'itinerario_clases']) {
    assert.match(grupos, new RegExp(`\\b${columna}\\b`), `grupos sin ${columna}`)
  }
  const eventos = de('estudiante_eventos')
  for (const tipo of ['inscripcion', 'cambio_grupo', 'retiro']) {
    assert.match(eventos, new RegExp(`'${tipo}'`), `eventos sin ${tipo}`)
  }
  for (const columna of ['id', 'estudiante_id', 'tipo', 'fecha', 'a_grupo_id']) {
    assert.match(eventos, new RegExp(`\\b${columna}\\b`), `eventos sin ${columna}`)
  }
})

test('pre-inicio no cambia: un grupo en llenado mueve su fecha sin pasar por el candado', async () => {
  // Ahí mover la apertura SÍ debe mover las ventas anticipadas.
  const { actualizarGrupo, escrituras, llamadas } = acciones({
    grupo: grupoVeterano({ id: 5, fecha_inicio_clases: '2026-12-01' }),
    estudiantes: [nino(1, { grupo_id: 5 })],
    eventos: [venta(1, { a_grupo_id: 5, fecha: '2026-09-20' })],
  })
  const r = await actualizarGrupo(1, 5, { fecha_inicio_clases: '2026-12-10' })
  assert.equal(r.error, undefined)
  assert.equal(r.ok, true)
  assert.equal(llamadas.candado, 0)
  assert.equal(llamadas.meses.length, 1)
  assert.equal(escrituras.filter((texto) => /fecha_inicio_clases/.test(texto)).length, 1)
})

test('un grupo iniciado con fecha ya cargada no admite otra: la reparación solo existe con la fecha en NULL', async () => {
  const { actualizarGrupo, escrituras, llamadas } = acciones({
    grupo: grupoVeterano({ fecha_inicio_clases: '2026-08-03' }),
    estudiantes: [nino(1)],
    eventos: [venta(1)],
  })
  const r = await actualizarGrupo(1, 67, { fecha_inicio_clases: '2026-08-10' })
  assert.equal(r.error, 'El grupo ya inició clases: solo se pueden cambiar horario y coach. Quita del cambio: fecha_inicio_clases.')
  assert.equal(escrituras.length, 0)
  assert.equal(llamadas.candado, 0)
})

test('app/actions/grupos.js importa el candado desde lib/inicios-clase.mjs', () => {
  // El test corre la acción con sus dependencias inyectadas: este contrato de
  // texto evita que un import borrado pase desapercibido.
  assert.match(
    SOURCE,
    /import \{[^}]*\bninosReestrenadosPorFechaGrupo\b[^}]*\} from '\.\.\/\.\.\/lib\/inicios-clase\.mjs'/,
  )
})
