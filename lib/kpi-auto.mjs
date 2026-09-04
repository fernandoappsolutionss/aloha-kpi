// Derivados de RESUMEN del KPI automático (complemento de lib/kpi-semanal-auto).
//
// Reparto de responsabilidades — una sola fuente por dato:
//   - ing_* / des_* / traslados / el bucket de día hábil viven EXCLUSIVAMENTE en
//     lib/kpi-semanal-auto.mjs (R4, g1-16/g1-18). Este módulo NO los deriva ni
//     los toca: recibe ya contadas las ventas canónicas y los retiros
//     operativos que ese motor eligió.
//   - Aquí se derivan los campos de `resumen_mes` que el motor semanal no
//     cubre: el embudo de Clase de Prueba (cp_invitados / cp_asistieron, desde
//     el CRM), cp_matriculados, los motivos de deserción y el origen comercial
//     de cada venta.
//   - `crearAjustes` / `aplicarAjustes` conservan lo que cada centro ya había
//     declarado a mano en agosto de 2026 para ESOS campos; ing/des jamás se
//     concilian: en mes abierto la tabla dejó de ser su fuente.
import { classifyTrialSales } from './trial-enrollments.mjs'

export const KPI_AUTO_DESDE = 202608

export const CAMPOS_RESUMEN_AUTO = [
  'cp_invitados',
  'cp_asistieron',
  'cp_matriculados',
  'mot_tecnica',
  'mot_perdida_clase',
  'mot_economico',
  'mot_horario',
  'mot_graduado',
  'mot_otro',
  'orig_referido',
  'orig_marketing',
  'orig_centro',
  'orig_activaciones',
  'orig_medios',
  'orig_por_clasificar',
]

const ORIGIN_KEYS = {
  referido: 'orig_referido',
  marketing: 'orig_marketing',
  centro: 'orig_centro',
  activaciones: 'orig_activaciones',
  medios: 'orig_medios',
}

const ORIGIN_FIELDS = [
  'orig_referido',
  'orig_marketing',
  'orig_centro',
  'orig_activaciones',
  'orig_medios',
  'orig_por_clasificar',
]
const ORIGIN_RECONCILIATION_KEY = '_origin_reconciliation'

const MOTIVE_KEYS = {
  TECNICA: 'mot_tecnica',
  PERDIDA_CLASES: 'mot_perdida_clase',
  ECONOMICO: 'mot_economico',
  HORARIO: 'mot_horario',
  GRADUADO: 'mot_graduado',
}

const intOrZero = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0
}

const intSigned = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.trunc(number) : 0
}

function emptySource() {
  const source = { ventasTotal: 0 }
  for (const key of CAMPOS_RESUMEN_AUTO) source[key] = 0
  return source
}

function panamaDate(value) {
  if (!value) return null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Panama',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function isMonth(date, year, month) {
  return date?.startsWith(`${Number(year)}-${String(Number(month)).padStart(2, '0')}`) || false
}

export function usaKpiAutomatico(year, month, estado) {
  return Number(year) * 100 + Number(month) >= KPI_AUTO_DESDE && estado === 'abierto'
}

export function poblacionKpiAutomatica({ arrastrado = null, operacion = {} } = {}) {
  const inicioArrastrado = arrastrado && typeof arrastrado === 'object'
    ? arrastrado.valor
    : arrastrado
  return {
    ninosInicio: inicioArrastrado === null || inicioArrastrado === undefined
      ? intOrZero(operacion.inicio)
      : intOrZero(inicioArrastrado),
    gruposActivos: intOrZero(operacion.grupos),
    nuevosActivos: intOrZero(operacion.nuevos),
  }
}

// Los derivados de resumen del mes. `ventas` y `retiros` NO se recalculan
// aquí: llegan tal cual los contó calcularKpiSemanalAuto (ventas canónicas sin
// traslados, retiros operativos del mes), así el total de orígenes cuadra
// exactamente con el total de ing_* y nunca hay dos criterios de "venta".
export function fuenteKpiAutomatica({ year, month, clases = [], registros = [], ventas = [], retiros = [] }) {
  const source = emptySource()
  source._origin_sales = []
  source.ventasTotal = ventas.length
  source._trial_funnel = classifyTrialSales(ventas)
  source.cp_matriculados = source._trial_funnel.trialEnrollments
  const classesById = new Map(clases.map((event) => [String(event.id), event]))
  const seenRegistrations = new Set()

  for (const registration of registros) {
    const id = String(registration?.id || '')
    const eventId = String(registration?.event_id || '')
    if (
      !id || !eventId || !classesById.has(eventId) ||
      seenRegistrations.has(id) || registration.attendance_status === 'cancelled'
    ) continue
    seenRegistrations.add(id)

    if (isMonth(panamaDate(registration.registered_at), year, month)) source.cp_invitados += 1
    if (registration.attendance_status === 'attended') {
      const event = classesById.get(String(registration.event_id))
      const attendanceDate = registration.checked_in_at
        ? panamaDate(registration.checked_in_at)
        : panamaDate(event?.start_date)
      if (isMonth(attendanceDate, year, month)) source.cp_asistieron += 1
    }
  }

  for (const [ventaIndex, venta] of ventas.entries()) {
    const originKey = ORIGIN_KEYS[String(venta.origen_venta || '').toLowerCase()]
    const origin = originKey || 'orig_por_clasificar'
    source[origin] += 1
    const rawId = venta.id ?? venta.estudiante_id ?? venta.crm_registration_id
    source._origin_sales.push({
      id: rawId == null || rawId === '' ? `posicion:${ventaIndex}` : String(rawId),
      origin,
    })
  }

  for (const retiro of retiros) {
    const motiveKey = MOTIVE_KEYS[String(retiro.motivo || '').toUpperCase()]
    source[motiveKey || 'mot_otro'] += 1
  }

  return source
}

function difference(saved, source) {
  return Math.max(0, intOrZero(saved) - intOrZero(source))
}

function targetOrigins(saved, source, salesTotal) {
  const target = Object.fromEntries(ORIGIN_FIELDS.map((key) => [key, 0]))
  let remaining = intOrZero(salesTotal)
  const classified = ORIGIN_FIELDS.filter((key) => key !== 'orig_por_clasificar')
  const allocate = (values, keys) => {
    for (const key of keys) {
      const amount = Math.min(remaining, intOrZero(values?.[key]))
      target[key] += amount
      remaining -= amount
    }
  }

  // La clasificación manual ya declarada manda sobre la fuente automática
  // para las ventas que se solapan. Lo que quede se completa con el origen
  // operativo y, al final, con "por clasificar".
  allocate(saved, classified)
  allocate(source, classified)
  allocate(saved, ['orig_por_clasificar'])
  allocate(source, ['orig_por_clasificar'])
  target.orig_por_clasificar += remaining
  return target
}

function normalizeOrigins(result, ventasTotal) {
  let remaining = intOrZero(ventasTotal)
  for (const key of ORIGIN_FIELDS.filter((field) => field !== 'orig_por_clasificar')) {
    const amount = Math.min(remaining, intOrZero(result[key]))
    result[key] = amount
    remaining -= amount
  }
  result.orig_por_clasificar = remaining
}

function validOriginSales(source) {
  if (!Array.isArray(source?._origin_sales)) return null
  if (source._origin_sales.length !== intOrZero(source.ventasTotal)) return null
  const ids = new Set()
  const counts = Object.fromEntries(ORIGIN_FIELDS.map((key) => [key, 0]))
  const sales = []
  for (const sale of source._origin_sales) {
    const id = String(sale?.id || '')
    const origin = ORIGIN_FIELDS.includes(sale?.origin) ? sale.origin : null
    if (!id || !origin || ids.has(id)) return null
    ids.add(id)
    counts[origin] += 1
    sales.push({ id, origin })
  }
  if (ORIGIN_FIELDS.some((key) => counts[key] !== intOrZero(source[key]))) return null
  return sales
}

function createOriginReconciliation(source, target) {
  const sales = validOriginSales(source)
  if (!sales) return null
  const remaining = Object.fromEntries(ORIGIN_FIELDS.map((key) => [key, intOrZero(target[key])]))
  const assigned = new Map()

  // Mantiene primero las ventas cuya clasificación ya coincide; solo después
  // distribuye las reclasificaciones heredadas de la captura manual de agosto.
  for (const sale of sales) {
    if (remaining[sale.origin] <= 0) continue
    assigned.set(sale.id, sale.origin)
    remaining[sale.origin] -= 1
  }
  for (const sale of sales) {
    if (assigned.has(sale.id)) continue
    const targetOrigin = ORIGIN_FIELDS.find((key) => remaining[key] > 0) || 'orig_por_clasificar'
    assigned.set(sale.id, targetOrigin)
    remaining[targetOrigin] = Math.max(0, remaining[targetOrigin] - 1)
  }

  return {
    version: 1,
    sales: sales.map((sale) => ({
      id: sale.id,
      sourceOrigin: sale.origin,
      targetOrigin: assigned.get(sale.id),
    })),
    manual: remaining,
  }
}

export function ajustesOrigenIdentificados(adjustments = {}) {
  return adjustments?.[ORIGIN_RECONCILIATION_KEY]?.version === 1
}

function applyOriginReconciliation(result, source, adjustments) {
  const metadata = adjustments?.[ORIGIN_RECONCILIATION_KEY]
  const sales = validOriginSales(source)
  if (metadata?.version !== 1 || !sales || !Array.isArray(metadata.sales)) return false
  const baseline = new Map(metadata.sales.map((sale) => [String(sale.id), sale]))
  const values = Object.fromEntries(
    ORIGIN_FIELDS.map((key) => [key, intOrZero(metadata.manual?.[key])]),
  )

  for (const sale of sales) {
    const previous = baseline.get(sale.id)
    // Si la venta base cambió en su ficha, la clasificación viva manda. Si no
    // cambió, se conserva la reclasificación manual que se hizo al migrar agosto.
    const origin = previous && sale.origin === previous.sourceOrigin && ORIGIN_FIELDS.includes(previous.targetOrigin)
      ? previous.targetOrigin
      : sale.origin
    values[origin] += 1
  }
  for (const key of ORIGIN_FIELDS) result[key] = values[key]
  normalizeOrigins(result, source.ventasTotal)
  return true
}

function applyOriginAdjustments(result, source, adjustments) {
  if (applyOriginReconciliation(result, source, adjustments)) return
  if (validOriginSales(source)) {
    throw new Error('El ajuste de orígenes no tiene identidad por venta.')
  }
  const values = Object.fromEntries(ORIGIN_FIELDS.map((key) => [key, intOrZero(source[key])]))
  let removed = 0

  for (const key of ORIGIN_FIELDS) {
    const requested = Math.max(0, -intSigned(adjustments[key]))
    const amount = Math.min(values[key], requested)
    values[key] -= amount
    removed += amount
  }

  // Los positivos contienen dos cosas distintas: ventas manuales preservadas
  // y reclasificaciones de categorías automáticas. Una reclasificación solo se
  // reaplica si todavía pudo retirar su categoría de origen; así una venta nueva
  // del CRM conserva el origen que trae en vez de ser absorbida por un ajuste viejo.
  let positiveBudget = removed
  for (const key of ORIGIN_FIELDS) {
    const requested = Math.max(0, intSigned(adjustments[key]))
    const amount = Math.min(positiveBudget, requested)
    values[key] += amount
    positiveBudget -= amount
  }

  for (const key of ORIGIN_FIELDS) result[key] = values[key]
  normalizeOrigins(result, source.ventasTotal)
}

// El ajuste inicial de conciliación: lo que un centro ya había declarado a mano
// por encima de la fuente automática. ing/des NO entran (g1-16: en mes abierto
// la tabla dejó de ser su fuente y el motor semanal manda siempre).
export function crearAjustes(saved = {}, source = {}) {
  const adjustments = {}
  for (const key of CAMPOS_RESUMEN_AUTO) adjustments[key] = difference(saved[key], source[key])
  const target = targetOrigins(saved, source, source.ventasTotal)
  for (const key of ORIGIN_FIELDS) {
    adjustments[key] = intOrZero(target[key]) - intOrZero(source[key])
  }
  const metadata = createOriginReconciliation(source, target)
  if (metadata) adjustments[ORIGIN_RECONCILIATION_KEY] = metadata
  return adjustments
}

export function aplicarAjustes(source = {}, adjustments = {}, saved = {}) {
  const result = emptySource()
  result.ventasTotal = intOrZero(source.ventasTotal)
  for (const key of CAMPOS_RESUMEN_AUTO) {
    if (ORIGIN_FIELDS.includes(key)) continue
    result[key] = intOrZero(source[key]) + intOrZero(adjustments[key])
  }
  applyOriginAdjustments(result, source, adjustments)
  if (source._trial_funnel) {
    result._trial_funnel = {
      ...source._trial_funnel,
      legacyAdjustmentIgnored: intOrZero(adjustments.cp_matriculados),
    }
    const override = saved?.cp_matriculados_override
    const hasOverride = override !== undefined && override !== null && override !== ''
    if (hasOverride) {
      result.cp_matriculados = intOrZero(override)
      result._trial_funnel.valueSource = 'manual_override'
    } else if (source._trial_funnel.reliable) {
      result.cp_matriculados = intOrZero(source.cp_matriculados)
      result._trial_funnel.valueSource = 'derived'
    } else if (saved?.cp_matriculados != null) {
      // El ajuste legado se calculó contra otro criterio de CP (vínculo CRM).
      // Una base parcial nueva no puede sumarle aquel delta ni reemplazar el
      // último total declarado: se conserva hasta clasificar todas las ventas.
      result.cp_matriculados = intOrZero(saved.cp_matriculados)
      result._trial_funnel.valueSource = 'declared'
    } else {
      result.cp_matriculados = intOrZero(source.cp_matriculados)
      result._trial_funnel.valueSource = 'partial_source'
    }
  }
  return result
}
