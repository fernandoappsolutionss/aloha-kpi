import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ERROR_RETIRO_CAMBIO,
  detalleConCorreccion,
  evaluarCorreccionMotivo,
  nombreMes,
  validarRazonCorreccion,
} from '../lib/retiros.mjs'
import { corregirMotivoRetiroEn } from '../lib/motivo-retiro-service.mjs'
import { campoKpiDeMotivo, fuenteKpiAutomatica } from '../lib/kpi-auto.mjs'
import { cuadroDeserciones, motivosParaKpi } from '../lib/cuadro-calc.js'

// Fixtures con los tipos REALES del driver: DATE llega como Date a medianoche
// local, los ids como número y el centro como texto (viene de la URL).
const d = (y, m, dia) => new Date(y, m - 1, dia)
const CENTRO = '5'

// Ivannis (230), David agosto 2026, ANTES del script de limpieza:
// 1128 retiro ECONOMICO → 1129 reincorporación → 1130 retiro GRADUADO.
const fichaIvannis = { id: 230, centro_id: 5, nombre: 'Ivannis', estado: 'retirado', fecha_retiro: d(2026, 8, 15), motivo_retiro: 'GRADUADO' }
const ev1128 = { id: 1128, estudiante_id: 230, centro_id: 5, tipo: 'retiro', year: 2026, month: 8, fecha: d(2026, 8, 15), motivo: 'ECONOMICO', detalle: null }
const ev1129 = { id: 1129, estudiante_id: 230, centro_id: 5, tipo: 'reincorporacion', year: 2026, month: 8, fecha: d(2026, 8, 15), motivo: null, detalle: null }
const ev1130 = { id: 1130, estudiante_id: 230, centro_id: 5, tipo: 'retiro', year: 2026, month: 8, fecha: d(2026, 8, 15), motivo: 'GRADUADO', detalle: null }
const pedido = (extra = {}) => ({ centroId: CENTRO, motivo: 'OTRO', eventoIdEsperado: 1130, motivoEsperado: 'GRADUADO', ...extra })

// ── evaluarCorreccionMotivo ─────────────────────────────────────────────────

test('caso David antes del script: corrige el ÚLTIMO retiro por id y avisa del otro retiro del mes', () => {
  const r = evaluarCorreccionMotivo({ ficha: fichaIvannis, eventos: [ev1130, ev1128, ev1129], ...pedido() })
  assert.equal(r.error, undefined)
  assert.equal(r.evento.id, 1130)
  assert.deepEqual(r.periodo, { year: 2026, month: 8 })
  assert.deepEqual(r.otrosRetirosMismoMes, [1128])
  assert.equal(r.sinCambios, false)
})

test('caso David después del script: un solo retiro, sin avisos', () => {
  const r = evaluarCorreccionMotivo({ ficha: fichaIvannis, eventos: [ev1130], ...pedido() })
  assert.equal(r.evento.id, 1130)
  assert.deepEqual(r.otrosRetirosMismoMes, [])
})

test('Santiago: la reincorporación de septiembre es ANTERIOR (por id) al retiro vigente y no frena', () => {
  const ficha = { id: 284, centro_id: 5, estado: 'retirado', fecha_retiro: '2026-08-24', motivo_retiro: 'OTRO' }
  const eventos = [
    { id: 1171, centro_id: 5, tipo: 'retiro', year: 2026, month: 8, fecha: d(2026, 8, 24), motivo: 'ECONOMICO' },
    { id: 1174, centro_id: 5, tipo: 'reincorporacion', year: 2026, month: 9, fecha: d(2026, 9, 2) },
    { id: 1175, centro_id: 5, tipo: 'retiro', year: 2026, month: 8, fecha: d(2026, 8, 24), motivo: 'OTRO' },
  ]
  const r = evaluarCorreccionMotivo({ ficha, eventos, centroId: CENTRO, motivo: 'HORARIO', eventoIdEsperado: 1175, motivoEsperado: 'OTRO' })
  assert.equal(r.evento.id, 1175)
  assert.deepEqual(r.otrosRetirosMismoMes, [1171])
})

test('fecha Date del evento contra string de la ficha: se comparan normalizadas', () => {
  const r = evaluarCorreccionMotivo({ ficha: { ...fichaIvannis, fecha_retiro: '2026-08-15' }, eventos: [ev1130], ...pedido() })
  assert.equal(r.error, undefined)
})

test('cada guarda frena con un mensaje legible', () => {
  const casos = [
    [{ motivo: 'INVENTADO' }, {}, /Motivo de retiro inválido/],
    [{}, { ficha: { ...fichaIvannis, centro_id: 9 } }, /no pertenece a este centro/],
    [{}, { ficha: null }, /no pertenece a este centro/],
    [{}, { ficha: { ...fichaIvannis, estado: 'activo' } }, /no está retirado/],
    [{}, { eventos: [ev1129] }, /no tiene un retiro registrado/],
    [{}, { eventos: [{ ...ev1130, centro_id: 3 }] }, /otro centro\. Avísale a Administración/],
    [{}, { eventos: [ev1130, { ...ev1129, id: 1131 }] }, /reincorporación posterior/],
    [{}, { ficha: { ...fichaIvannis, fecha_retiro: d(2026, 8, 16) } }, /16\/08\/2026[\s\S]*15\/08\/2026[\s\S]*no describen el mismo retiro/],
    [{}, { ficha: { ...fichaIvannis, fecha_retiro: null } }, /^La ficha no tiene fecha de retiro y el retiro registrado es del 15\/08\/2026: no describen el mismo retiro/],
    [{}, { eventos: [{ ...ev1130, fecha: null }] }, /^La ficha dice retiro el 15\/08\/2026 y el retiro registrado no tiene fecha:/],
    [{}, { ficha: { ...fichaIvannis, fecha_retiro: null }, eventos: [{ ...ev1130, fecha: null }] }, /^Ni la ficha ni el retiro registrado tienen fecha:/],
  ]
  for (const [extraPedido, extra, patron] of casos) {
    const r = evaluarCorreccionMotivo({ ficha: fichaIvannis, eventos: [ev1130], ...pedido(extraPedido), ...extra })
    assert.match(r.error || '', patron)
  }
})

test('mes anterior a agosto 2026: captura histórica, se corrige en KPI Mensual', () => {
  const julio = { ...ev1130, year: 2026, month: 7, fecha: d(2026, 7, 20) }
  const r = evaluarCorreccionMotivo({ ficha: { ...fichaIvannis, fecha_retiro: d(2026, 7, 20) }, eventos: [julio], ...pedido() })
  assert.match(r.error, /anteriores a agosto de 2026 conservan su captura histórica/)
})

test('fecha fuera de su year/month: dato roto, no se corrige', () => {
  const roto = { ...ev1130, fecha: d(2026, 9, 1) }
  const r = evaluarCorreccionMotivo({ ficha: { ...fichaIvannis, fecha_retiro: d(2026, 9, 1) }, eventos: [roto], ...pedido() })
  assert.match(r.error, /01\/09\/2026 está anotado en agosto 2026/)
})

test('token: pantalla vieja (otro retiro u otro motivo) se rechaza; sin token también', () => {
  const base = { ficha: fichaIvannis, eventos: [ev1128, ev1129, ev1130] }
  assert.equal(evaluarCorreccionMotivo({ ...base, ...pedido({ eventoIdEsperado: 1128 }) }).error, ERROR_RETIRO_CAMBIO)
  assert.equal(evaluarCorreccionMotivo({ ...base, ...pedido({ motivoEsperado: 'ECONOMICO' }) }).error, ERROR_RETIRO_CAMBIO)
  assert.equal(evaluarCorreccionMotivo({ ...base, ...pedido({ eventoIdEsperado: undefined }) }).error, ERROR_RETIRO_CAMBIO)
})

test('sin cambios va antes del token: el reintento de algo ya guardado responde "ya estaba"', () => {
  const r = evaluarCorreccionMotivo({ ficha: fichaIvannis, eventos: [ev1128, ev1130], ...pedido({ motivo: 'GRADUADO', eventoIdEsperado: 1128, motivoEsperado: 'ECONOMICO' }) })
  assert.equal(r.error, undefined)
  assert.equal(r.sinCambios, true)
  assert.equal(r.eventoCambio, true)
  assert.deepEqual(r.otrosRetirosMismoMes, [1128])
})

test('evento sin motivo y ficha con motivo: elegir el de la ficha SÍ corrige el evento', () => {
  const ficha = { ...fichaIvannis, motivo_retiro: 'HORARIO' }
  const r = evaluarCorreccionMotivo({ ficha, eventos: [{ ...ev1130, motivo: null }], ...pedido({ motivo: 'HORARIO', motivoEsperado: null }) })
  assert.equal(r.error, undefined)
  assert.equal(r.sinCambios, false)
})

test('nombreMes', () => {
  assert.equal(nombreMes(2026, 8), 'agosto 2026')
  assert.equal(nombreMes('2026', '12'), 'diciembre 2026')
})

// ── razón y detalle ─────────────────────────────────────────────────────────

test('la razón es obligatoria y corta', () => {
  assert.match(validarRazonCorreccion(''), /por qué/)
  assert.match(validarRazonCorreccion('   '), /por qué/)
  assert.match(validarRazonCorreccion(undefined), /por qué/)
  assert.match(validarRazonCorreccion({}), /por qué/)
  assert.match(validarRazonCorreccion('a'.repeat(501)), /500/)
  assert.equal(validarRazonCorreccion('Se cargó Económico por error.'), null)
})

test('detalleConCorreccion conserva claves, apila correcciones y no pisa lo ilegible', () => {
  const entrada = { motivo_nuevo: 'GRADUADO' }
  assert.deepEqual(detalleConCorreccion(null, entrada).detalle, { correcciones_motivo: [entrada] })
  const previo = { override_asistencia: { actor: 'master' }, correcciones_motivo: [{ motivo_nuevo: 'OTRO' }] }
  const r = detalleConCorreccion(previo, entrada).detalle
  assert.deepEqual(r.override_asistencia, { actor: 'master' })
  assert.deepEqual(r.correcciones_motivo, [{ motivo_nuevo: 'OTRO' }, entrada])
  assert.deepEqual(previo.correcciones_motivo, [{ motivo_nuevo: 'OTRO' }], 'no muta el detalle original')
  assert.deepEqual(detalleConCorreccion('{"origen":"cron_retiro_programado"}', entrada).detalle, { origen: 'cron_retiro_programado', correcciones_motivo: [entrada] })
  for (const raro of ['no es json', 'null', '[1]', [1, 2], 7, { correcciones_motivo: 'texto' }]) {
    assert.match(detalleConCorreccion(raro, entrada).error || '', /no se puede leer/)
  }
})

test('campoKpiDeMotivo usa el mismo reparto del KPI (lo que no tiene campo propio es Otro)', () => {
  assert.equal(campoKpiDeMotivo('GRADUADO'), 'mot_graduado')
  assert.equal(campoKpiDeMotivo('economico'), 'mot_economico')
  assert.equal(campoKpiDeMotivo('PERDIDA_CLASES'), 'mot_perdida_clase')
  for (const m of ['NO_CONFIRMO', 'INASISTENCIA', 'CAMBIO_CENTRO', 'OTRO', null, undefined]) assert.equal(campoKpiDeMotivo(m), 'mot_otro')
})

test('los números leen el motivo del EVENTO: corregir solo la ficha no cambiaría el KPI', () => {
  const ficha = { id: 230, itinerario: 'KIDS', nivel: 3, nombre: 'Ivannis', estado: 'retirado', motivo_retiro: 'ECONOMICO' }
  const corregido = { ...ev1130, motivo: 'GRADUADO' }
  const motivos = motivosParaKpi(cuadroDeserciones([ficha], [corregido]))
  assert.equal(motivos.mot_graduado, 1)
  assert.equal(motivos.mot_economico, 0)
  const fuente = fuenteKpiAutomatica({ year: 2026, month: 8, retiros: [corregido] })
  assert.equal(fuente.mot_graduado, 1)
  assert.equal(fuente.mot_economico, 0)
})

// ── servicio transaccional con query falso ──────────────────────────────────

function escenario({
  ficha = fichaIvannis, eventos = [ev1128, ev1129, ev1130], fichaBloqueada, eventoBloqueado,
  errorMes = null, estadoMes = 'abierto', ajustes = [{ ajustes: { mot_graduado: 0 } }], resumen = [],
  filasUpdateEvento = 1, filasUpdateFicha = 1,
} = {}) {
  const log = []
  const query = async (strings, ...values) => {
    const texto = Array.from(strings).join('?').replace(/\s+/g, ' ').trim()
    log.push({ texto, values })
    if (/^UPDATE estudiante_eventos/.test(texto)) return Array.from({ length: filasUpdateEvento }, () => ({ id: 1130 }))
    if (/^UPDATE estudiantes/.test(texto)) return Array.from({ length: filasUpdateFicha }, () => ({ id: 230 }))
    if (/FROM estudiantes .*FOR UPDATE/.test(texto)) return fichaBloqueada === undefined ? [ficha] : [fichaBloqueada].filter(Boolean)
    if (/FROM estudiante_eventos WHERE id = .*FOR UPDATE/.test(texto)) {
      const ultimo = [...eventos].filter((e) => e.tipo === 'retiro').sort((a, b) => a.id - b.id).at(-1)
      return eventoBloqueado === undefined ? [ultimo] : [eventoBloqueado].filter(Boolean)
    }
    if (/FROM estudiantes/.test(texto)) return ficha ? [ficha] : []
    if (/FROM estudiante_eventos/.test(texto)) return eventos
    if (/FROM mes_kpi/.test(texto)) return [{ estado: estadoMes }]
    if (/FROM kpi_auto_ajustes/.test(texto)) return ajustes
    if (/FROM resumen_mes/.test(texto)) return resumen
    throw new Error(`consulta no esperada: ${texto}`)
  }
  const bloquearMesesEditables = async (q, centroId, periodos) => {
    assert.equal(q, query, 'el candado corre con la conexión de la transacción')
    log.push({ texto: 'BLOQUEAR_MES', values: [centroId, periodos] })
    return errorMes
  }
  return { query, log, deps: { bloquearMesesEditables } }
}
const args = (extra = {}) => ({
  centroId: CENTRO, estudianteId: '230', motivo: 'ECONOMICO', razon: '  La familia avisó que fue por costo.  ',
  eventoIdEsperado: 1130, motivoEsperado: 'GRADUADO',
  actor: { uid: 9, email: 'admin@centro.test', nombre: 'Admin David' }, ahora: '2026-10-01T15:00:00.000Z', ...extra,
})
const textos = (log) => log.map((l) => l.texto)
const escrituras = (log) => log.filter((l) => /^(UPDATE|INSERT|DELETE)/.test(l.texto) && !/mes_kpi/.test(l.texto))

test('servicio: orden mes → ficha → evento, dos UPDATE con la misma conexión y ningún INSERT/DELETE de eventos', async () => {
  const { query, log, deps } = escenario({ ficha: { ...fichaIvannis }, eventos: [ev1130], resumen: [{ guardado: 1 }] })
  const r = await corregirMotivoRetiroEn(query, args(), deps)
  assert.equal(r.ok, true)
  assert.equal(r.eventoId, 1130)
  assert.equal(r.motivoAnterior, 'GRADUADO')
  assert.equal(r.motivo, 'ECONOMICO')
  assert.equal(r.mismoCampoKpi, false)
  assert.equal(r.requiereGuardar, true)
  assert.deepEqual([r.year, r.month], [2026, 8])
  const pasos = textos(log)
  const i = (re) => pasos.findIndex((t) => re.test(t))
  assert.ok(i(/^BLOQUEAR_MES$/) > i(/FROM estudiante_eventos WHERE estudiante_id/), 'lee antes de bloquear')
  assert.ok(i(/FROM estudiantes .*FOR UPDATE/) > i(/^BLOQUEAR_MES$/), 'mes antes que ficha')
  assert.ok(i(/FROM estudiante_eventos WHERE id = .*FOR UPDATE/) > i(/FROM estudiantes .*FOR UPDATE/), 'ficha antes que evento')
  assert.ok(i(/^UPDATE estudiante_eventos/) > i(/FROM resumen_mes/), 'escribe al final')
  assert.ok(i(/^UPDATE estudiantes/) > i(/^UPDATE estudiante_eventos/))
  assert.deepEqual(log.find((l) => l.texto === 'BLOQUEAR_MES').values, [5, [{ year: 2026, month: 8 }]])
  assert.equal(pasos.filter((t) => /^(INSERT|DELETE)/.test(t)).length, 0, 'sin eventos nuevos ni borrados')
  const upEvento = log.find((l) => /^UPDATE estudiante_eventos/.test(l.texto))
  assert.match(upEvento.texto, /SET motivo = \?, detalle = \?/)
  assert.match(upEvento.texto, /tipo = 'retiro'/)
  assert.equal(upEvento.values[0], 'ECONOMICO')
  const detalle = JSON.parse(upEvento.values[1])
  assert.deepEqual(detalle.correcciones_motivo, [{
    motivo_anterior: 'GRADUADO', motivo_ficha_anterior: 'GRADUADO', motivo_nuevo: 'ECONOMICO',
    razon: 'La familia avisó que fue por costo.', actor: { uid: 9, email: 'admin@centro.test', nombre: 'Admin David' },
    corregido_at: '2026-10-01T15:00:00.000Z', evento_id: 1130, year: 2026, month: 8,
  }])
  const upFicha = log.find((l) => /^UPDATE estudiantes/.test(l.texto))
  assert.match(upFicha.texto, /SET motivo_retiro = \?, updated_at = \?/)
  assert.match(upFicha.texto, /estado = 'retirado'/)
  assert.deepEqual(upFicha.values.slice(0, 2), ['ECONOMICO', '2026-10-01T15:00:00.000Z'])
})

test('servicio: mes cerrado ⇒ mensaje con el mes y cero escrituras ni locks de ficha', async () => {
  const { query, log, deps } = escenario({ eventos: [ev1130], errorMes: 'Ese mes está cerrado. Los meses históricos no admiten modificaciones.', estadoMes: 'cerrado' })
  const r = await corregirMotivoRetiroEn(query, args(), deps)
  assert.match(r.error, /^Agosto 2026 está cerrado\. .*reabrirlo en KPI Mensual, corregir y volver a cerrarlo/)
  assert.equal(escrituras(log).length, 0)
  assert.equal(textos(log).some((t) => /FOR UPDATE/.test(t)), false)
})

test('servicio: mes cerrándose ⇒ el mensaje base del candado', async () => {
  const { query, log, deps } = escenario({ eventos: [ev1130], errorMes: 'El mes se está cerrando. Intenta de nuevo en unos segundos.', estadoMes: 'cerrando' })
  assert.equal((await corregirMotivoRetiroEn(query, args(), deps)).error, 'El mes se está cerrando. Intenta de nuevo en unos segundos.')
  assert.equal(escrituras(log).length, 0)
})

test('servicio: ajuste manual en el campo destino frena (doble conteo); en el campo de origen no', async () => {
  const bloqueado = escenario({ eventos: [ev1130], ajustes: [{ ajustes: { mot_economico: 2 } }] })
  const r = await corregirMotivoRetiroEn(bloqueado.query, args(), bloqueado.deps)
  assert.match(r.error, /En agosto 2026 el KPI tiene 2 retiro\(s\) «Económico» declarados a mano/)
  assert.equal(escrituras(bloqueado.log).length, 0)
  const origen = escenario({ eventos: [ev1130], ajustes: [{ ajustes: { mot_graduado: 3 } }] })
  assert.equal((await corregirMotivoRetiroEn(origen.query, args(), origen.deps)).ok, true)
  // El ajuste llega como texto JSON en algunos drivers: se lee igual.
  const texto = escenario({ eventos: [ev1130], ajustes: [{ ajustes: '{"mot_economico":"1"}' }] })
  assert.match((await corregirMotivoRetiroEn(texto.query, args(), texto.deps)).error, /declarados a mano/)
  const ilegible = escenario({ eventos: [ev1130], ajustes: [{ ajustes: [1, 2] }] })
  assert.match((await corregirMotivoRetiroEn(ilegible.query, args(), ilegible.deps)).error, /ajuste del KPI de agosto 2026 no se puede leer/)
  assert.equal(escrituras(ilegible.log).length, 0)
})

test('servicio: KPI guardado sin ajuste conciliado ⇒ pide Guardar primero (si no, quedaría un retiro fantasma)', async () => {
  const sinAjuste = escenario({ eventos: [ev1130], ajustes: [], resumen: [{ guardado: 1 }] })
  const r = await corregirMotivoRetiroEn(sinAjuste.query, args(), sinAjuste.deps)
  assert.match(r.error, /Abre KPI Mensual de agosto 2026, pulsa Guardar y después corrige el motivo/)
  assert.equal(escrituras(sinAjuste.log).length, 0)
  const nada = escenario({ eventos: [ev1130], ajustes: [], resumen: [] })
  const ok = await corregirMotivoRetiroEn(nada.query, args(), nada.deps)
  assert.equal(ok.ok, true)
  assert.equal(ok.requiereGuardar, false)
})

test('servicio: dentro de «Otro» no hay efecto en números: ni ajustes ni resumen se consultan', async () => {
  const ficha = { ...fichaIvannis, motivo_retiro: 'OTRO' }
  const evento = { ...ev1130, motivo: 'OTRO' }
  const s = escenario({ ficha, eventos: [evento], ajustes: [{ ajustes: { mot_otro: 9 } }], resumen: [{ guardado: 1 }] })
  const r = await corregirMotivoRetiroEn(s.query, args({ motivo: 'NO_CONFIRMO', motivoEsperado: 'OTRO' }), s.deps)
  assert.equal(r.ok, true)
  assert.equal(r.mismoCampoKpi, true)
  assert.equal(r.requiereGuardar, false, 'el resumen guardado sigue siendo correcto')
  assert.equal(textos(s.log).some((t) => /kpi_auto_ajustes|resumen_mes/.test(t)), false)
  assert.equal(escrituras(s.log).length, 2)
})

test('servicio: sin cambios no bloquea el mes ni escribe, y devuelve el aviso de otros retiros', async () => {
  const { query, log, deps } = escenario()
  const r = await corregirMotivoRetiroEn(query, args({ motivo: 'GRADUADO', eventoIdEsperado: 1128, motivoEsperado: 'ECONOMICO' }), deps)
  assert.deepEqual(r, { ok: true, sinCambios: true, eventoId: 1130, eventoCambio: true, motivo: 'GRADUADO', year: 2026, month: 8, otrosRetirosMismoMes: [1128] })
  assert.equal(textos(log).includes('BLOQUEAR_MES'), false)
  assert.equal(escrituras(log).length, 0)
})

test('servicio: razón o ids inválidos no tocan la base', async () => {
  for (const extra of [{ razon: '' }, { razon: 'x'.repeat(501) }, { estudianteId: 'abc' }, { centroId: 0 }, { estudianteId: -3 }]) {
    const { query, log, deps } = escenario()
    const r = await corregirMotivoRetiroEn(query, args(extra), deps)
    assert.ok(r.error, JSON.stringify(extra))
    assert.equal(log.length, 0)
  }
})

test('servicio: la re-evaluación con filas bloqueadas frena si la ficha o el evento ya no son los mismos', async () => {
  const reincorporado = escenario({ eventos: [ev1130], fichaBloqueada: { ...fichaIvannis, estado: 'activo' } })
  assert.match((await corregirMotivoRetiroEn(reincorporado.query, args(), reincorporado.deps)).error, /no está retirado/)
  assert.equal(escrituras(reincorporado.log).length, 0)
  const sinEvento = escenario({ eventos: [ev1130], eventoBloqueado: null })
  assert.equal((await corregirMotivoRetiroEn(sinEvento.query, args(), sinEvento.deps)).error, ERROR_RETIRO_CAMBIO)
  const otroMotivo = escenario({ eventos: [ev1130], eventoBloqueado: { ...ev1130, motivo: 'HORARIO' } })
  assert.equal((await corregirMotivoRetiroEn(otroMotivo.query, args(), otroMotivo.deps)).error, ERROR_RETIRO_CAMBIO)
  assert.equal(escrituras(otroMotivo.log).length, 0)
})

test('servicio: detalle ilegible frena ANTES de escribir; un UPDATE sin fila lanza (aborta todo)', async () => {
  const ilegible = escenario({ eventos: [ev1130], eventoBloqueado: { ...ev1130, detalle: [1] } })
  assert.match((await corregirMotivoRetiroEn(ilegible.query, args(), ilegible.deps)).error, /no se puede leer/)
  assert.equal(escrituras(ilegible.log).length, 0)
  const sinFilaEvento = escenario({ eventos: [ev1130], filasUpdateEvento: 0 })
  await assert.rejects(corregirMotivoRetiroEn(sinFilaEvento.query, args(), sinFilaEvento.deps), /no encontró el retiro bloqueado/)
  const sinFilaFicha = escenario({ eventos: [ev1130], filasUpdateFicha: 0 })
  await assert.rejects(corregirMotivoRetiroEn(sinFilaFicha.query, args(), sinFilaFicha.deps), /no encontró la ficha bloqueada/)
})
