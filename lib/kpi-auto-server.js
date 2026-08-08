import { sql } from './db.js'
import { crmCall } from './crm.js'
import {
  CAMPOS_RESUMEN_AUTO,
  aplicarAjustes,
  crearAjustes,
  fuenteKpiAutomatica,
} from './kpi-auto.mjs'

const intOrZero = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0
}

const emptyMatrix = () => Array.from({ length: 5 }, () => [0, 0, 0, 0, 0])

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

export async function cargarFuenteKpi(centroId, year, month, { query = sql, crm = crmCall } = {}) {
  try {
    const clases = await query`
      SELECT crm_event_id AS id, start_date
      FROM centro_eventos
      WHERE centro_id = ${centroId}
      ORDER BY start_date, crm_event_id
    `

    let registros = []
    if (clases.length > 0) {
      const response = await crm('list_registrations_by_event_ids', {
        event_ids: clases.map((event) => String(event.id)),
      })
      if (response?.error) return { complete: false, error: response.error }
      registros = response?.registrations || []
    }

    const ventas = await query`
      SELECT ee.tipo, ee.fecha, e.crm_registration_id, e.origen_venta
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
  if (existing) return parseJson(existing.ajustes)

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
    if (key === 'ing' || key === 'des') return (value || []).some((week) => week.some((cell) => intOrZero(cell) > 0))
    return intOrZero(value) > 0
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
