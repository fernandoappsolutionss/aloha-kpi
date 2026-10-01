import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { ITINERARIOS, NIVEL_MAX, ORIGENES, esOrigenVenta, fechaIso10, requiereOrigenVenta } from '../lib/operaciones.js'
import { ventanaNuevos } from '../lib/llenado.mjs'
import { colocacionInvalida } from '../lib/colocacion.mjs'
import { anclaDeAlta } from '../lib/retiros.mjs'
import {
  buscarFichasCoincidentes, coincidenciasParaPantalla, decidirAlta, leerConfirmacionFichaNueva, mensajeFichaExistente,
  registroEnFichaAnulada,
} from '../lib/ficha-existente.mjs'
import { vincularFichaExistenteCon } from '../lib/ficha-existente-service.mjs'

// «Inscribir» (clase de prueba o directo) ya no crea una segunda ficha para un
// niño que la tiene en el centro. Corre las Server Actions REALES de
// app/actions/estudiantes.js sustituyendo solo sus fronteras de E/S (mismo
// patrón que caja-actions y grupos-repara-fecha).

const SOURCE = readFileSync(new URL('../app/actions/estudiantes.js', import.meta.url), 'utf8')
const HOY = '2026-10-01'
const GRUPO = { id: 136, centro_id: 5, numero: '66', estado: 'activo', itinerario: 'TINY', inscripcion_abierta: true, itinerario_clases: null, fecha_inicio_clases: '2026-09-15' }

// `fichas` = lo que devuelve la búsqueda de candidatas; con una lista de listas
// cada llamada devuelve la siguiente (prechequeo, luego con el candado tomado).
// `fallas` = errores que lanza cada intento de transacción, en orden.
function acciones({ fichas = [], grupo = GRUPO, fallas = [], sesion = { uid: 7, email: 'admin@centro.com' } } = {}) {
  const escrituras = []
  const orden = []
  const llamadas = { outbox: [], meses: 0, candidatas: 0, transacciones: 0 }
  const tandas = Array.isArray(fichas[0]) ? fichas : [fichas]

  const responder = (strings, values) => {
    const texto = strings.join('?').replace(/\s+/g, ' ').trim()
    if (/^SET LOCAL lock_timeout/.test(texto)) { orden.push(['lock_timeout']); return [] }
    if (/pg_advisory_xact_lock/.test(texto)) { orden.push(['candado', values]); return [] }
    if (/^INSERT INTO estudiantes /i.test(texto)) { escrituras.push({ texto, values }); return [{ id: 777 }] }
    if (/^INSERT INTO estudiante_eventos/i.test(texto)) { escrituras.push({ texto, values }); return [] }
    if (/^UPDATE estudiantes/i.test(texto)) {
      escrituras.push({ texto, values })
      return [{ id: values[values.length - 2] }]
    }
    if (/FROM grupos WHERE id = \?/i.test(texto)) return grupo ? [grupo] : []
    if (/^SELECT id, nombre, estado, crm_registration_id, telefono, correo, representante FROM estudiantes WHERE centro_id/i.test(texto)) {
      orden.push(['candidatas'])
      const tanda = tandas[Math.min(llamadas.candidatas, tandas.length - 1)]
      llamadas.candidatas++
      return tanda
    }
    if (/FROM estudiantes e LEFT JOIN grupos g/i.test(texto)) {
      const ids = values.find(Array.isArray).map(Number)
      return tandas.flat().filter((f) => ids.includes(Number(f.id)))
        .map((f) => ({ grupo_numero: f.grupo_id == null ? null : '64', fecha_venta: null, ...f }))
    }
    if (/^SELECT e\.id, e\.nombre, e\.estado, e\.grupo_id/i.test(texto) || /^SELECT \* FROM estudiantes WHERE id = \? AND centro_id = \? FOR UPDATE/i.test(texto)) {
      return tandas.flat().filter((f) => Number(f.id) === Number(values[0]))
    }
    throw new Error(`consulta inesperada en el test: ${texto}`)
  }
  const query = async (strings, ...values) => responder(strings, values)

  const source = SOURCE
    .replace(/^'use server'$/m, '')
    .replace(/^import[\s\S]*?from .*$/gm, '')
    .replace(/export /g, '')
  const contexto = {
    requireCurrentWriteCentro: async () => sesion,
    sql: query,
    withTransaction: async (callback) => {
      const intento = llamadas.transacciones++
      if (fallas[intento]) throw fallas[intento]
      return callback(query)
    },
    ITINERARIOS, NIVEL_MAX, ORIGENES, esOrigenVenta, fechaIso10, requiereOrigenVenta,
    hoyISO: () => HOY,
    ventanaNuevos, colocacionInvalida, anclaDeAlta,
    bloquearMesesEditables: async () => { llamadas.meses++; return null },
    // Copia al realm del test: los arrays nacidos en el vm no son deepStrictEqual.
    encolarSyncCrm: async (ids, motivo) => { llamadas.outbox.push({ ids: [...ids], motivo }) },
    buscarFichasCoincidentes, coincidenciasParaPantalla, decidirAlta, leerConfirmacionFichaNueva, mensajeFichaExistente,
    registroEnFichaAnulada, vincularFichaExistenteCon,
  }
  const exportadas = vm.runInNewContext(`${source}\n;({ inscribirEstudiante, vincularFichaExistente, reincorporarEstudiante })`, contexto)
  return { ...exportadas, escrituras, orden, llamadas }
}

const ALTA = {
  nombre: 'Luciano Andrés Acosta Sequera', itinerario: 'TINY', nivel: 1, grupo_id: 136,
  origen: 'clase_prueba', origen_venta: 'marketing', crm_registration_id: 'reg-999',
  representante: 'Carmen Sequera', telefono: '+507 6925 0722', correo: '', fecha: '2026-09-25',
}
const insertsDe = (escrituras, tabla) => escrituras.filter((e) => new RegExp(`^INSERT INTO ${tabla} `, 'i').test(e.texto))
const serializacion = () => Object.assign(new Error('could not serialize access'), { code: '40001' })
const deadlock = () => Object.assign(new Error('deadlock detected'), { code: '40P01' })
const lockTimeout = () => Object.assign(new Error('canceling statement due to lock timeout'), { code: '55P03' })
const LUCIANO = { id: 946, nombre: 'Luciano Acosta', estado: 'retirado', grupo_id: null, telefono: '6925-0722', fecha_retiro: '2026-08-31' }

test('coincidencia por crm_registration_id: no crea nada y devuelve la ficha inscrita', async () => {
  const genesis = { id: 923, nombre: 'Genesis Linton', estado: 'activo', grupo_id: 122, crm_registration_id: 'reg-999', fecha_venta: '2026-09-01' }
  const { inscribirEstudiante, escrituras, llamadas } = acciones({ fichas: [genesis] })
  const r = await inscribirEstudiante(5, { ...ALTA, nombre: 'Mamá de Genesis' })
  assert.equal(r.registroYaInscrito, true)
  assert.equal(r.ok, undefined)
  assert.match(r.error, /^Este registro ya fue inscrito: es la ficha de Genesis Linton \(activo, grupo 64\)\./)
  assert.deepEqual(r.coincidencias.map((c) => [c.id, c.motivos, c.fecha_venta, c.tiene_venta]), [[923, ['registro_crm'], '2026-09-01', true]])
  assert.equal(escrituras.length, 0)
  assert.equal(llamadas.transacciones, 0, 'la respuesta es "ya tiene ficha": ni se abre la transacción')

  // Confirmar "es otro niño" no salta el mismo registro de CRM.
  const otra = acciones({ fichas: [genesis] })
  const r2 = await otra.inscribirEstudiante(5, { ...ALTA, ficha_nueva: { descartadas: [923], motivo: 'hermano' } })
  assert.equal(r2.registroYaInscrito, true)
  assert.equal(otra.escrituras.length, 0)
})

test('coincidencia por teléfono + nombre: no crea; confirmado con motivo crea y deja rastro', async () => {
  const { inscribirEstudiante, escrituras } = acciones({ fichas: [LUCIANO] })
  const r = await inscribirEstudiante(5, ALTA)
  assert.equal(r.requiereConfirmacion, true)
  assert.match(r.error, /^Puede que Luciano Acosta \(retirado\) ya tenga ficha en el centro \(nombre parecido y mismo teléfono\)\./)
  assert.deepEqual(r.coincidencias.map((c) => [c.id, c.estado, c.motivos, c.fuerza, c.fecha_retiro]), [[946, 'retirado', ['nombre_parecido', 'telefono'], 'posible', '2026-08-31']])
  assert.equal(escrituras.length, 0)

  // Sin motivo, la confirmación no vale.
  const sinMotivo = acciones({ fichas: [LUCIANO] })
  const r2 = await sinMotivo.inscribirEstudiante(5, { ...ALTA, ficha_nueva: { descartadas: [946] } })
  assert.equal(r2.error, 'Elige por qué es otro niño.')
  assert.equal(sinMotivo.escrituras.length, 0)

  const confirmada = acciones({ fichas: [LUCIANO] })
  const r3 = await confirmada.inscribirEstudiante(5, { ...ALTA, ficha_nueva: { descartadas: [946], motivo: 'hermano' } })
  assert.equal(r3.ok, true)
  assert.equal(r3.estudianteId, 777)
  assert.equal(insertsDe(confirmada.escrituras, 'estudiantes').length, 1)
  const [venta] = insertsDe(confirmada.escrituras, 'estudiante_eventos')
  assert.deepEqual(JSON.parse(venta.values[venta.values.length - 1]), {
    ficha_nueva_confirmada: { descartadas: [946], motivo: 'hermano', actor: 'admin@centro.com' },
  })
  assert.equal(confirmada.llamadas.outbox.length, 1)
})

test('confirmar habiendo visto solo una ficha: si apareció otra, vuelve a preguntar', async () => {
  const otraFicha = { id: 1030, nombre: 'Luciano Andrés Acosta', estado: 'activo', grupo_id: 136, telefono: '6925-0722' }
  const { inscribirEstudiante, escrituras } = acciones({ fichas: [LUCIANO, otraFicha] })
  const r = await inscribirEstudiante(5, { ...ALTA, ficha_nueva: { descartadas: [946], motivo: 'hermano' } })
  assert.equal(r.requiereConfirmacion, true)
  assert.deepEqual(r.coincidencias.map((c) => c.id).sort((a, b) => a - b), [946, 1030])
  assert.equal(escrituras.length, 0)
})

test('sin coincidencia crea normal: ficha, venta canónica y outbox', async () => {
  // Hermano con el mismo teléfono y otro primer nombre: no es el mismo niño.
  const hermano = { id: 950, nombre: 'Mateo Acosta Sequera', estado: 'activo', grupo_id: 136, telefono: '6925-0722' }
  const { inscribirEstudiante, escrituras, llamadas } = acciones({ fichas: [hermano] })
  const r = await inscribirEstudiante(5, ALTA)
  assert.deepEqual({ ...r }, { ok: true, estudianteId: 777, pendiente: false })
  const [ficha] = insertsDe(escrituras, 'estudiantes')
  assert.ok(ficha.values.includes('Luciano Andrés Acosta Sequera'))
  assert.ok(ficha.values.includes('reg-999'))
  const [venta] = insertsDe(escrituras, 'estudiante_eventos')
  assert.match(venta.texto, /'inscripcion'/)
  assert.ok(venta.values.includes('2026-09-25'), 'la venta queda con la fecha del formulario (PR #150)')
  assert.equal(venta.values[venta.values.length - 1], null, 'sin rastro de confirmación')
  assert.deepEqual(llamadas.outbox, [{ ids: [136], motivo: 'inscripcion' }])
  assert.equal(llamadas.meses, 1)
})

test('con el candado del centro tomado se busca otra vez: la ficha que nació entre medio frena el alta', async () => {
  const gemela = { id: 1030, nombre: 'Luciano Andrés Acosta Sequera', estado: 'activo', grupo_id: 136, telefono: '6925-0722' }
  // Prechequeo: nada. Ya con el candado: la ficha que otra pestaña acaba de crear.
  const { inscribirEstudiante, escrituras, orden } = acciones({ fichas: [[], [gemela]] })
  const r = await inscribirEstudiante(5, ALTA)
  assert.equal(r.requiereConfirmacion, true)
  assert.deepEqual(r.coincidencias.map((c) => c.id), [1030])
  assert.equal(escrituras.length, 0)
  // Orden: prechequeo, tope de espera, candado (centro 5) y recién ahí la búsqueda que manda.
  assert.deepEqual(orden.map(([paso]) => paso), ['candidatas', 'lock_timeout', 'candado', 'candidatas'])
  assert.deepEqual(orden[2][1].map(Number), [20261001, 5])
})

test('un 40001 o un deadlock se reintentan con foto nueva; si se repiten, sale un mensaje y no un error crudo', async () => {
  const una = acciones({ fallas: [serializacion()] })
  const r = await una.inscribirEstudiante(5, ALTA)
  assert.equal(r.ok, true)
  assert.equal(una.llamadas.transacciones, 2)

  const trabada = acciones({ fallas: [deadlock()] })
  assert.equal((await trabada.inscribirEstudiante(5, ALTA)).ok, true)
  assert.equal(trabada.llamadas.transacciones, 2)

  // lock_timeout: no se reintenta (otra alta del centro sigue trabada), se avisa.
  const espera = acciones({ fallas: [lockTimeout()] })
  assert.match((await espera.inscribirEstudiante(5, ALTA)).error, /^El centro tuvo varios cambios al mismo tiempo/)
  assert.equal(espera.llamadas.transacciones, 1)

  const siempre = acciones({ fallas: [serializacion(), serializacion(), serializacion()] })
  const r2 = await siempre.inscribirEstudiante(5, ALTA)
  assert.match(r2.error, /^El centro tuvo varios cambios al mismo tiempo/)
  assert.equal(siempre.llamadas.transacciones, 3)
})

test('la inscripción directa también se frena (sin registro de CRM)', async () => {
  const angela = { id: 915, nombre: 'Angela Maquensi', estado: 'activo', grupo_id: 134, representante: 'Norelvys Gonzalez' }
  const { inscribirEstudiante, escrituras } = acciones({ fichas: [angela] })
  const r = await inscribirEstudiante(5, {
    nombre: 'Ángela Maquensi', itinerario: 'TINY', nivel: 1, grupo_id: 136, origen: 'directo',
    origen_venta: 'centro', representante: 'Norelvys González', fecha: '2026-08-28',
  })
  assert.equal(r.requiereConfirmacion, true)
  assert.deepEqual(r.coincidencias[0].motivos, ['mismo_nombre', 'representante'])
  assert.equal(r.coincidencias[0].fuerza, 'fuerte')
  assert.equal(escrituras.length, 0)
})

test('el registro de CRM de una matrícula anulada: venta nueva, sin ese registro', async () => {
  const anulada = { id: 30, nombre: 'Luciano Andrés Acosta Sequera', estado: 'matricula_anulada', grupo_id: null, crm_registration_id: 'reg-999', telefono: '6925-0722' }
  const { inscribirEstudiante, escrituras } = acciones({ fichas: [anulada] })
  const r = await inscribirEstudiante(5, ALTA)
  assert.equal(r.ok, true)
  const [ficha] = insertsDe(escrituras, 'estudiantes')
  assert.ok(!ficha.values.includes('reg-999'), 'el índice único no admite dos fichas con el mismo registro')
})

test('vincularFichaExistente: vincula el registro a la ficha viva sin crear nada', async () => {
  const valeria = { id: 907, nombre: 'Valeria Alejandra Gantes Ortíz', estado: 'activo', grupo_id: 121, crm_registration_id: null, fecha_venta: '2026-09-01' }
  const { vincularFichaExistente, escrituras } = acciones({ fichas: [valeria] })
  const r = await vincularFichaExistente(5, 907, { crm_registration_id: 'reg-1029' })
  assert.deepEqual({ ...r }, { ok: true, vinculado: true, aviso: null, reincorporado: false, movido: false, fechaCorregida: false })
  assert.equal(escrituras.length, 1)
  assert.match(escrituras[0].texto, /^UPDATE estudiantes SET crm_registration_id = \?.*AND crm_registration_id IS NULL RETURNING id$/)

  assert.equal((await vincularFichaExistente(5, 907, { fecha_venta: '25/09/2026' })).error, 'Fecha de venta inválida (AAAA-MM-DD).')
  assert.equal((await vincularFichaExistente(5, 907, { fecha_venta: '2026-10-02' })).error, 'La fecha de venta no puede ser futura.')
  // Pasar la venta a un mes POSTERIOR no va por aquí.
  assert.match((await vincularFichaExistente(5, 907, { fecha_venta: '2026-10-01' })).error, /usa «Editar niño»/)
  assert.equal((await vincularFichaExistente(5, 907, { origen_venta: 'tiktok' })).error, 'Origen comercial inválido.')
})

test('vincularFichaExistente: con la venta como Date (así la entrega el driver) el freno de mes posterior funciona', async () => {
  const valeria = { id: 907, nombre: 'Valeria', estado: 'activo', grupo_id: 121, crm_registration_id: null, fecha_venta: new Date('2026-09-01T00:00:00Z') }
  const { vincularFichaExistente, escrituras } = acciones({ fichas: [valeria] })
  const r = await vincularFichaExistente(5, 907, { crm_registration_id: 'reg-1029', fecha_venta: '2026-10-01' })
  assert.equal(r.error, 'Su venta es del 2026-09-01: para pasarla a un mes posterior usa «Editar niño».')
  assert.equal(escrituras.length, 0)
})

test('reincorporar NO frena por la matriz Tiny/Kids: la ficha del retirado puede tener el itinerario de cuando se fue', async () => {
  // Regla de main, a propósito: un Tiny que vuelve con edad de Kids no tiene
  // cómo cambiar su itinerario antes de volver. Frenarlo lo empujaría a «Es
  // otro niño» (venta falsa). La pantalla avisa; se corrige con «Editar niño».
  const luciano = { id: 946, nombre: 'Luciano Acosta', estado: 'retirado', grupo_id: null, itinerario: 'TINY', nivel: 4, centro_id: 5 }
  const kids = { ...GRUPO, id: 140, numero: '70', itinerario: 'KIDS' }
  const { reincorporarEstudiante } = acciones({ fichas: [luciano], grupo: kids })
  assert.equal((await reincorporarEstudiante(5, 946, { grupoId: 140 })).ok, true)
})

// ── Orquestación de "es este niño" (dependencias inyectadas) ────────────────
function deps({ mover = { ok: true }, corregir = { ok: true }, reincorporar = { ok: true }, vincular = { ok: true } } = {}) {
  const orden = []
  return {
    orden,
    moverAGrupo: async (id, grupoId, extra = {}) => { orden.push(['mover', id, grupoId, extra]); return mover },
    corregirFechaVenta: async (id, fecha) => { orden.push(['corregir', id, fecha]); return corregir },
    reincorporar: async (id, grupoId) => { orden.push(['reincorporar', id, grupoId]); return reincorporar },
    vincularRegistro: async (id, crm) => { orden.push(['vincular', id, crm]); return vincular },
  }
}
test('vincular: el pendiente sin venta se coloca con su fecha y origen en la MISMA llamada, y luego se corrige la venta', async () => {
  const d = deps()
  const pendiente = { id: 980, estado: 'activo', grupo_id: null, itinerario: 'TINY', nivel: 1, fecha_venta: null, origen_venta: null }
  const r = await vincularFichaExistenteCon({ ficha: pendiente, crmId: 'reg-1', fechaVenta: '2026-09-25', grupoId: 136, origenVenta: 'marketing' }, d)
  assert.deepEqual(d.orden, [
    ['mover', 980, 136, { fecha_inscripcion: '2026-09-25', origen_venta: 'marketing' }],
    ['corregir', 980, '2026-09-25'],
    ['vincular', 980, 'reg-1'],
  ])
  assert.equal(r.movido, true)
  assert.equal(r.fechaCorregida, true)

  // «Hoy, al colocarlo»: solo la colocación; el origen que ya tenía se respeta.
  const hoy = deps()
  await vincularFichaExistenteCon({ ficha: { ...pendiente, origen_venta: 'referido' }, crmId: 'reg-1', grupoId: 136, origenVenta: 'marketing' }, hoy)
  assert.deepEqual(hoy.orden, [['mover', 980, 136, {}], ['vincular', 980, 'reg-1']])

  // Ya colocado, si la fecha no se pudo corregir (mes cerrado) queda dicho
  // dónde quedó la venta (sin mandar a «Editar niño», que fallaría igual).
  const mesCerrado = deps({ corregir: { error: 'Ese mes está cerrado. Los meses históricos no admiten modificaciones.' } })
  const r2 = await vincularFichaExistenteCon({ ficha: pendiente, crmId: 'reg-1', fechaVenta: '2026-09-25', grupoId: 136 }, mesCerrado)
  assert.equal(r2.ok, true)
  assert.equal(r2.fechaCorregida, false)
  assert.equal(r2.aviso, 'Quedó en el grupo, pero su venta no se pasó al 2026-09-25: Ese mes está cerrado. Los meses históricos no admiten modificaciones. Su venta quedó con la fecha de hoy, la de la colocación.')

  // Con venta (traslado), la venta sigue en su fecha.
  const conVenta = deps({ corregir: { error: 'Ese mes está cerrado. Los meses históricos no admiten modificaciones.' } })
  const r3 = await vincularFichaExistenteCon({ ficha: { ...pendiente, grupo_id: 121, fecha_venta: new Date('2026-09-10T00:00:00Z') }, crmId: 'reg-1', fechaVenta: '2026-09-05', grupoId: 136 }, conVenta)
  assert.match(r3.aviso, /Su venta sigue el 2026-09-10\.$/)
})

test('vincular: sin grupo pero CON venta, colocarlo no toca la venta salvo que el centro elija la fecha', async () => {
  const legacy = { id: 981, estado: 'activo', grupo_id: null, fecha_venta: new Date('2026-08-10T00:00:00Z'), origen_venta: null }
  const d = deps()
  await vincularFichaExistenteCon({ ficha: legacy, crmId: 'reg-2', grupoId: 136, origenVenta: 'marketing' }, d)
  assert.deepEqual(d.orden, [['mover', 981, 136, {}], ['vincular', 981, 'reg-2']])
  // Nunca a un mes posterior, aunque la venta llegue como Date.
  const adelante = deps()
  assert.match((await vincularFichaExistenteCon({ ficha: legacy, crmId: 'reg-2', fechaVenta: '2026-09-25', grupoId: 136 }, adelante)).error, /usa «Editar niño»/)
  assert.deepEqual(adelante.orden, [])
})

test('vincular: el que estaba en otro grupo pasa al del formulario (traslado) solo si se pide', async () => {
  const valeria = { id: 907, estado: 'activo', grupo_id: 121, itinerario: 'TINY', nivel: 1, fecha_venta: '2026-09-01' }
  const sigue = deps()
  await vincularFichaExistenteCon({ ficha: valeria, crmId: 'reg-1029' }, sigue)
  assert.deepEqual(sigue.orden, [['vincular', 907, 'reg-1029']])

  const pasa = deps()
  const r = await vincularFichaExistenteCon({ ficha: valeria, crmId: 'reg-1029', grupoId: 136 }, pasa)
  assert.deepEqual(pasa.orden, [['mover', 907, 136, {}], ['vincular', 907, 'reg-1029']])
  assert.equal(r.movido, true)

  // Sin semana equivalente en el destino el traslado no se aplica y no se toca nada más.
  const sinSemana = deps({ mover: { error: 'El traslado no se aplicó: el horario del grupo 66 no tiene una semana equivalente.' } })
  const r2 = await vincularFichaExistenteCon({ ficha: valeria, crmId: 'reg-1029', fechaVenta: '2026-08-28', grupoId: 136 }, sinSemana)
  assert.match(r2.error, /^El traslado no se aplicó/)
  assert.deepEqual(sinSemana.orden, [['mover', 907, 136, {}]])
})

test('vincular: la fecha de venta se corrige con el camino de «Editar niño» antes de vincular, nunca a un mes posterior', async () => {
  const valeria = { id: 907, estado: 'activo', grupo_id: 121, fecha_venta: '2026-09-01' }
  const d = deps()
  const r = await vincularFichaExistenteCon({ ficha: valeria, crmId: 'reg-1', fechaVenta: '2026-08-28' }, d)
  assert.deepEqual(d.orden, [['corregir', 907, '2026-08-28'], ['vincular', 907, 'reg-1']])
  assert.equal(r.fechaCorregida, true)

  const mesCerrado = deps({ corregir: { error: 'El mes 08/2026 está cerrado.' } })
  assert.deepEqual(await vincularFichaExistenteCon({ ficha: valeria, crmId: 'reg-1', fechaVenta: '2026-08-28' }, mesCerrado), { error: 'El mes 08/2026 está cerrado.' })
  assert.deepEqual(mesCerrado.orden, [['corregir', 907, '2026-08-28']])

  const adelante = deps()
  const r3 = await vincularFichaExistenteCon({ ficha: valeria, crmId: 'reg-1', fechaVenta: '2026-10-01' }, adelante)
  assert.match(r3.error, /usa «Editar niño»/)
  assert.deepEqual(adelante.orden, [])
})

test('vincular: el retirado vuelve como reincorporado; su venta no se toca', async () => {
  const sinGrupo = deps()
  const r = await vincularFichaExistenteCon({ ficha: { id: 946, estado: 'retirado', itinerario: 'TINY', nivel: 4 }, crmId: 'reg-999', fechaVenta: '2026-09-25' }, sinGrupo)
  assert.match(r.error, /reincorporación/)
  assert.deepEqual(sinGrupo.orden, [])

  const d = deps()
  const r2 = await vincularFichaExistenteCon({ ficha: { id: 946, estado: 'retirado', itinerario: 'TINY', nivel: 4 }, crmId: 'reg-999', fechaVenta: '2026-09-25', grupoId: 136 }, d)
  assert.deepEqual(d.orden, [['reincorporar', 946, 136], ['vincular', 946, 'reg-999']])
  assert.equal(r2.reincorporado, true)
  assert.equal(r2.fechaCorregida, false)

  // El error de la reincorporación (p. ej. grupo cerrado) sale tal cual y no vincula.
  const cerrado = deps({ reincorporar: { error: 'El grupo 70 está cerrado a inscripciones: ya no entra nadie.' } })
  const r3 = await vincularFichaExistenteCon({ ficha: { id: 946, estado: 'retirado' }, crmId: 'reg-999', grupoId: 140 }, cerrado)
  assert.match(r3.error, /El grupo 70 está cerrado/)
  assert.deepEqual(cerrado.orden, [['reincorporar', 946, 140]])
})

test('vincular: nunca pisa otro registro, no vincula una anulada y avisa si el registro ya es de otra ficha', async () => {
  const otro = deps()
  const r = await vincularFichaExistenteCon({ ficha: { id: 923, estado: 'activo', crm_registration_id: 'reg-A' }, crmId: 'reg-B' }, otro)
  assert.equal(r.vinculado, false)
  assert.match(r.aviso, /ya estaba vinculada a otro registro/)
  assert.deepEqual(otro.orden, [])

  const mismo = deps()
  const r2 = await vincularFichaExistenteCon({ ficha: { id: 923, estado: 'activo', crm_registration_id: 'reg-A' }, crmId: 'reg-A' }, mismo)
  assert.equal(r2.vinculado, true)
  assert.deepEqual(mismo.orden, [])

  const anulada = deps()
  const r3 = await vincularFichaExistenteCon({ ficha: { id: 30, estado: 'matricula_anulada' }, crmId: 'reg-A' }, anulada)
  assert.match(r3.error, /anulada/)
  assert.deepEqual(anulada.orden, [])

  const usado = deps({ vincular: { yaUsado: true } })
  const r4 = await vincularFichaExistenteCon({ ficha: { id: 907, estado: 'activo' }, crmId: 'reg-A' }, usado)
  assert.equal(r4.ok, true)
  assert.match(r4.aviso, /ya está vinculado a otra ficha/)

  assert.deepEqual(await vincularFichaExistenteCon({ ficha: null, crmId: 'reg-A' }, deps()), { error: 'La ficha no pertenece a este centro.' })
})

test('app/actions/estudiantes.js importa la búsqueda y la orquestación desde lib/', () => {
  // Los tests corren la acción con dependencias inyectadas: este contrato de
  // texto evita que un import borrado pase desapercibido.
  assert.match(SOURCE, /import \{[^}]*\bbuscarFichasCoincidentes\b[^}]*\} from '\.\.\/\.\.\/lib\/ficha-existente\.mjs'/)
  assert.match(SOURCE, /import \{[^}]*\bvincularFichaExistenteCon\b[^}]*\} from '\.\.\/\.\.\/lib\/ficha-existente-service\.mjs'/)
  // Dentro de la transacción: primero el candado de altas del centro y luego la
  // búsqueda con la conexión de afuera (sin locks de predicado sobre las fichas).
  const cuerpo = SOURCE.slice(SOURCE.indexOf('return await withTransaction(async (query) => {'), SOURCE.indexOf('INSERT INTO estudiantes ('))
  assert.ok(cuerpo.indexOf('pg_advisory_xact_lock') >= 0 && cuerpo.indexOf('pg_advisory_xact_lock') < cuerpo.indexOf('fichaExistenteEn(sql,'))
  assert.ok(cuerpo.indexOf("SET LOCAL lock_timeout") >= 0 && cuerpo.indexOf("SET LOCAL lock_timeout") < cuerpo.indexOf('pg_advisory_xact_lock'))
  assert.doesNotMatch(cuerpo, /fichaExistenteEn\(query,/)
})
