// Plumbing server-only del KPI automático de RESUMEN (clase de prueba, motivos
// y origen comercial). Las filas ing_*/des_* NO se calculan aquí: se piden a
// calcularKpiAutoMes (lib/kpi-semanal-service) — este módulo solo consume las
// ventas canónicas y los retiros operativos que ese motor ya contó, para que
// orígenes y matriculados cuadren con las ventas del KPI semanal sin recorrer
// eventos por segunda vez.
import { sql, withTransaction } from './db.js'
import { crmAccountForCentro, crmCall } from './crm.js'
import { calcularKpiAutoMes } from './kpi-semanal-service.js'
import {
  CAMPOS_RESUMEN_AUTO,
  ajustesOrigenIdentificados,
  aplicarAjustes,
  crearAjustes,
  fuenteKpiAutomatica,
} from './kpi-auto.mjs'

const intOrZero = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0
}

const CRM_EVENT_BATCH_SIZE = 500

function parseJson(value, fallback = {}) {
  if (!value) return fallback
  if (typeof value === 'object') return value
  try { return JSON.parse(value) } catch { return fallback }
}

// La foto guardada de los campos que este módulo concilia. Las semanas NO
// entran: ing/des son del motor semanal y no se concilian con lo capturado.
export function formaKpiGuardada(resumen = {}) {
  const saved = {}
  for (const key of CAMPOS_RESUMEN_AUTO) saved[key] = intOrZero(resumen?.[key])
  return saved
}

export function mezclarResumenAutomatico(resumen = [], year, month, automatic = {}) {
  return (resumen || []).map((row) => {
    if (Number(row.year) !== Number(year) || Number(row.month) !== Number(month)) return row
    const fields = Object.fromEntries(
      CAMPOS_RESUMEN_AUTO.map((key) => [key, intOrZero(automatic[key])]),
    )
    if (row.cp_matriculados_override != null) fields.cp_matriculados = intOrZero(row.cp_matriculados_override)
    return { ...row, ...fields }
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

const CRM_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/
const CRM_ATTENDANCE_STATUSES = new Set(['registered', 'confirmed', 'attended', 'no_show', 'cancelled'])

function fechaCrmValida(value) {
  if (typeof value !== 'string') return false
  const match = value.match(CRM_DATETIME_RE)
  if (!match) return false
  const [, year, month, day, hour, minute, second] = match.map(Number)
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (month < 1 || month > 12 || day < 1 || day > maxDay || hour > 23 || minute > 59 || second > 59) {
    return false
  }
  return !Number.isNaN(Date.parse(value))
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
    // UNA sola derivación de ventas y retiros: la del motor semanal. Si falla
    // (fecha rota, lectura caída) la fuente de resumen falla con él — nunca se
    // inventa un conteo paralelo.
    const auto = await calcularKpiAutoMes(centroId, Number(year), Number(month), query)
    if (auto?.estado === 'fallo') return { complete: false, error: auto.mensaje }
    if (auto?.estado !== 'auto') {
      return { complete: false, error: 'El KPI automático no aplica a este mes.' }
    }

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

    return {
      complete: true,
      auto,
      source: fuenteKpiAutomatica({
        year,
        month,
        clases,
        registros,
        ventas: auto.ventas,
        retiros: auto.retiros,
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
    if (!ajustesOrigenIdentificados(actuales)) {
      throw new Error('El ajuste legado no tiene identidad por venta y requiere conciliación segura antes de continuar.')
    }
    return actuales
  }

  const [resumen] = await query`
    SELECT * FROM resumen_mes
    WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}
  `
  const adjustments = crearAjustes(formaKpiGuardada(resumen), source)
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
    return Number(value) !== 0
  })
}

export async function fotoKpiAutomatica(centroId, year, month, options = {}) {
  const sourceQuery = options.query || sql
  const loaded = await cargarFuenteKpi(centroId, year, month, { query: sourceQuery, crm: options.crm || crmCall })
  if (!loaded.complete) return loaded
  const conciliar = async (query) => {
    const adjustments = await inicializarAjustesKpi(centroId, year, month, loaded.source, query)
    // Leer el total guardado también cuando el ajuste legado ya existe. La
    // clasificación parcial no permite reconstruirlo sumando aquel ajuste.
    const [saved] = await query`
      SELECT cp_matriculados, cp_matriculados_override FROM resumen_mes
      WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}
    `
    return {
      complete: true,
      auto: loaded.auto,
      source: loaded.source,
      adjustments,
      adjusted: hasAdjustment(adjustments),
      data: aplicarAjustes(loaded.source, adjustments, saved),
    }
  }
  try {
    if (options.query) return await conciliar(options.query)
    return await withTransaction(async (query) => {
      await query`
        INSERT INTO mes_kpi (centro_id, year, month, estado, cerrado_at)
        VALUES (${centroId}, ${year}, ${month}, 'abierto', NULL)
        ON CONFLICT (centro_id, year, month) DO NOTHING
      `
      const [mes] = await query`
        SELECT estado FROM mes_kpi
        WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}
        FOR UPDATE
      `
      if (mes?.estado !== 'abierto') {
        return { complete: false, error: 'El mes dejó de estar abierto durante la sincronización. Recarga la pantalla.' }
      }
      return await conciliar(query)
    })
  } catch (error) {
    console.error('[kpi-auto] no se pudo conciliar la fuente:', error)
    return { complete: false, error: error?.message || 'No se pudo conciliar el KPI.' }
  }
}
