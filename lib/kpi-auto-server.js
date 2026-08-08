import { sql } from './db.js'
import { crmAccountForCentro, crmCall } from './crm.js'
import {
  CAMPOS_RESUMEN_AUTO,
  aplicarAjustes,
  crearAjustes,
  enriquecerAjustesOrigen,
  fuenteKpiAutomatica,
} from './kpi-auto.mjs'

const intOrZero = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0
}

const emptyMatrix = () => Array.from({ length: 5 }, () => [0, 0, 0, 0, 0])
const CRM_EVENT_BATCH_SIZE = 500

function parseJson(value, fallback = {}) {
  if (!value) return fallback
  if (typeof value === 'object') return value
  try { return JSON.parse(value) } catch { return fallback }
}

export function formaKpiGuardada(resumen = {}, semanas = []) {
  const saved = { ing: emptyMatrix(), des: emptyMatrix() }
  for (const key of CAMPOS_RESUMEN_AUTO) saved[key] = intOrZero(resumen?.[key])
  for (const row of semanas || []) {
    const week = Number(row.semana) - 1
    if (week < 0 || week > 4) continue
    for (let day = 1; day <= 5; day++) {
      saved.ing[week][day - 1] = intOrZero(row[`ing_d${day}`])
      saved.des[week][day - 1] = intOrZero(row[`des_d${day}`])
    }
  }
  return saved
}

export function mezclarSemanasAutomaticas(semanas = [], automatic = {}) {
  const byWeek = new Map((semanas || []).map((row) => [Number(row.semana), row]))
  return Array.from({ length: 5 }, (_, index) => {
    const week = index + 1
    const current = byWeek.get(week) || {}
    const row = { ...current, semana: week }
    for (let day = 1; day <= 5; day++) {
      row[`cob_d${day}`] = intOrZero(current[`cob_d${day}`])
      row[`ing_d${day}`] = intOrZero(automatic.ing?.[index]?.[day - 1])
      row[`des_d${day}`] = intOrZero(automatic.des?.[index]?.[day - 1])
    }
    return row
  })
}

export function filtrarClasesVigentesCrm(clases = [], eventosCrm = []) {
  const vigentes = new Set((eventosCrm || []).map((event) => String(event?.id || '')).filter(Boolean))
  return (clases || []).filter((event) => vigentes.has(String(event?.id || '')))
}

export function validarEventosCrm(eventos, accountId) {
  if (!Array.isArray(eventos)) {
    return { complete: false, error: 'Respuesta inválida del CRM: falta la lista de clases de prueba.' }
  }
  const vistos = new Set()
  for (const evento of eventos) {
    const id = typeof evento?.id === 'string' ? evento.id.trim() : ''
    const cuenta = typeof evento?.account_id === 'string' ? evento.account_id.trim() : ''
    if (!id || !cuenta || cuenta !== String(accountId) || vistos.has(id)) {
      return { complete: false, error: 'Respuesta inválida del CRM: hay una clase de prueba incompleta o ajena al centro.' }
    }
    vistos.add(id)
  }
  return { complete: true }
}

const CRM_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/
const CRM_ATTENDANCE_STATUSES = new Set(['registered', 'confirmed', 'attended', 'no_show', 'cancelled'])

function fechaCrmValida(value) {
  return typeof value === 'string' && CRM_DATETIME_RE.test(value) && !Number.isNaN(Date.parse(value))
}

function validarRegistroCrm(registro, idsPermitidos, idsVistos) {
  const id = typeof registro?.id === 'string' ? registro.id.trim() : ''
  const eventId = typeof registro?.event_id === 'string' ? registro.event_id.trim() : ''
  const asistencia = registro?.attendance_status
  const tieneAsistencia = Object.prototype.hasOwnProperty.call(registro || {}, 'attendance_status')
  const tieneCheckIn = Object.prototype.hasOwnProperty.call(registro || {}, 'checked_in_at')
  if (
    !id || idsVistos.has(id) || !eventId || !idsPermitidos.has(eventId) ||
    !fechaCrmValida(registro?.registered_at) ||
    !tieneAsistencia || !(asistencia === null || CRM_ATTENDANCE_STATUSES.has(asistencia)) ||
    !tieneCheckIn || !(registro.checked_in_at === null || fechaCrmValida(registro.checked_in_at))
  ) return false
  idsVistos.add(id)
  return true
}

export async function cargarRegistrosPorLotes(eventIds = [], crm = crmCall) {
  const ids = [...new Set((eventIds || []).map(String).filter(Boolean))]
  const registrations = []
  const registrationIds = new Set()

  for (let index = 0; index < ids.length; index += CRM_EVENT_BATCH_SIZE) {
    const response = await crm('list_registrations_by_event_ids', {
      event_ids: ids.slice(index, index + CRM_EVENT_BATCH_SIZE),
    })
    if (response?.error) {
      return { complete: false, error: response.error }
    }
    if (!Array.isArray(response?.registrations)) {
      return { complete: false, error: 'Respuesta inválida del CRM: falta la lista de registros.' }
    }
    const idsDelLote = new Set(ids.slice(index, index + CRM_EVENT_BATCH_SIZE))
    if (response.registrations.some((registro) => !validarRegistroCrm(registro, idsDelLote, registrationIds))) {
      return { complete: false, error: 'Respuesta inválida del CRM: hay un registro incompleto, duplicado o ajeno a la clase solicitada.' }
    }
    registrations.push(...response.registrations)
  }

  return { complete: true, registrations }
}

export async function cargarFuenteKpi(centroId, year, month, { query = sql, crm = crmCall } = {}) {
  try {
    let clases = await query`
      SELECT crm_event_id AS id, start_date
      FROM centro_eventos
      WHERE centro_id = ${centroId}
      ORDER BY start_date, crm_event_id
    `

    if (clases.length) {
      const accountId = crmAccountForCentro(centroId)
      if (!accountId) return { complete: false, error: 'El centro no tiene una cuenta CRM configurada.' }
      const eventosCrm = await crm('list_events', { account_id: accountId })
      if (eventosCrm?.error) return { complete: false, error: eventosCrm.error }
      const validacionEventos = validarEventosCrm(eventosCrm?.events, accountId)
      if (!validacionEventos.complete) return validacionEventos
      // Un evento borrado directamente en el CRM puede conservar un espejo
      // local. Se excluye antes del lote: no tiene registros recuperables y no
      // debe bloquear las demás clases vigentes del centro.
      clases = filtrarClasesVigentesCrm(clases, eventosCrm.events)
    }

    const registrations = await cargarRegistrosPorLotes(clases.map((event) => event.id), crm)
    if (!registrations.complete) return registrations
    const registros = registrations.registrations

    const ventas = await query`
      SELECT ee.id AS movimiento_id, ee.tipo, ee.fecha, e.id AS estudiante_id,
        e.crm_registration_id, e.origen_venta
      FROM estudiante_eventos ee
      JOIN estudiantes e ON e.id = ee.estudiante_id
      WHERE ee.centro_id = ${centroId}
        AND ee.year = ${year}
        AND ee.month = ${month}
        AND ee.tipo = 'inscripcion'
      ORDER BY ee.fecha, ee.id
    `
    const { calcularCuadro } = await import('./cuadro-snapshot.js')
    const cuadro = await calcularCuadro(centroId, Number(year), Number(month), query)
    const retiros = (cuadro?.deserciones || []).map((row) => ({
      tipo: 'retiro',
      fecha: row.fechaRetiro,
      motivo: row.motivo,
    }))

    return {
      complete: true,
      source: fuenteKpiAutomatica({
        year,
        month,
        clases,
        registros,
        movimientos: [...ventas, ...retiros],
      }),
    }
  } catch (error) {
    console.error('[kpi-auto] no se pudo cargar la fuente:', error)
    return { complete: false, error: error?.message || 'No se pudo sincronizar el KPI.' }
  }
}

export async function inicializarAjustesKpi(centroId, year, month, source, query = sql) {
  const [existing] = await query`
    SELECT ajustes FROM kpi_auto_ajustes
    WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}
  `
  if (existing) {
    const actuales = parseJson(existing.ajustes)
    const enriched = enriquecerAjustesOrigen(actuales, source)
    if (JSON.stringify(enriched) !== JSON.stringify(actuales)) {
      const json = JSON.stringify(enriched)
      await query`
        UPDATE kpi_auto_ajustes SET ajustes = ${json}::jsonb
        WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}
      `
    }
    return enriched
  }

  const [resumen] = await query`
    SELECT * FROM resumen_mes
    WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}
  `
  const semanas = await query`
    SELECT * FROM kpi_semanas
    WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}
    ORDER BY semana
  `
  const adjustments = crearAjustes(formaKpiGuardada(resumen, semanas), source)
  const json = JSON.stringify(adjustments)
  await query`
    INSERT INTO kpi_auto_ajustes (centro_id, year, month, ajustes)
    VALUES (${centroId}, ${year}, ${month}, ${json}::jsonb)
    ON CONFLICT (centro_id, year, month) DO NOTHING
  `
  const [stored] = await query`
    SELECT ajustes FROM kpi_auto_ajustes
    WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}
  `
  return parseJson(stored?.ajustes, adjustments)
}

function hasAdjustment(adjustments) {
  return Object.entries(adjustments || {}).some(([key, value]) => {
    if (key.startsWith('_')) return false
    if (key === 'ing' || key === 'des') return (value || []).some((week) => week.some((cell) => Number(cell) !== 0))
    return Number(value) !== 0
  })
}

export async function fotoKpiAutomatica(centroId, year, month, options = {}) {
  const query = options.query || sql
  const loaded = await cargarFuenteKpi(centroId, year, month, { query, crm: options.crm || crmCall })
  if (!loaded.complete) return loaded
  try {
    const adjustments = await inicializarAjustesKpi(centroId, year, month, loaded.source, query)
    return {
      complete: true,
      source: loaded.source,
      adjustments,
      adjusted: hasAdjustment(adjustments),
      data: aplicarAjustes(loaded.source, adjustments),
    }
  } catch (error) {
    console.error('[kpi-auto] no se pudo conciliar la fuente:', error)
    return { complete: false, error: error?.message || 'No se pudo conciliar el KPI.' }
  }
}
