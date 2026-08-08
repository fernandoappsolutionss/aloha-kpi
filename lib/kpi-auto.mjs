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

const emptyMatrix = () => Array.from({ length: 5 }, () => [0, 0, 0, 0, 0])

function emptySource() {
  const source = { ing: emptyMatrix(), des: emptyMatrix() }
  for (const key of CAMPOS_RESUMEN_AUTO) source[key] = 0
  return source
}

function isoDate(value) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] || null
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

export function celdaSemanal(value) {
  const date = isoDate(value)
  if (!date) return null
  const dayOfMonth = Number(date.slice(8, 10))
  const weekDay = new Date(`${date}T12:00:00.000Z`).getUTCDay()
  return {
    semana: Math.min(5, Math.floor((dayOfMonth - 1) / 7) + 1),
    dia: weekDay === 0 || weekDay === 6 ? 5 : weekDay,
  }
}

function incrementCell(matrix, value) {
  const cell = celdaSemanal(value)
  if (!cell) return
  matrix[cell.semana - 1][cell.dia - 1] += 1
}

export function fuenteKpiAutomatica({ year, month, clases = [], registros = [], movimientos = [] }) {
  const source = emptySource()
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

  for (const movement of movimientos) {
    const date = isoDate(movement.fecha)
    if (!isMonth(date, year, month)) continue

    if (movement.tipo === 'inscripcion') {
      incrementCell(source.ing, date)
      if (movement.crm_registration_id) source.cp_matriculados += 1
      const originKey = ORIGIN_KEYS[String(movement.origen_venta || '').toLowerCase()]
      source[originKey || 'orig_por_clasificar'] += 1
    } else if (movement.tipo === 'retiro') {
      incrementCell(source.des, date)
      const motiveKey = MOTIVE_KEYS[String(movement.motivo || '').toUpperCase()]
      source[motiveKey || 'mot_otro'] += 1
    }
  }

  return source
}

function difference(saved, source) {
  return Math.max(0, intOrZero(saved) - intOrZero(source))
}

function matrixTotal(matrix = []) {
  return (matrix || []).reduce(
    (total, week) => total + (week || []).reduce((sum, value) => sum + intOrZero(value), 0),
    0,
  )
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

function normalizeOrigins(result) {
  let remaining = matrixTotal(result.ing)
  for (const key of ORIGIN_FIELDS.filter((field) => field !== 'orig_por_clasificar')) {
    const amount = Math.min(remaining, intOrZero(result[key]))
    result[key] = amount
    remaining -= amount
  }
  result.orig_por_clasificar = remaining
}

function applyOriginAdjustments(result, source, adjustments) {
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
  let positiveBudget = matrixTotal(adjustments.ing) + removed
  for (const key of ORIGIN_FIELDS) {
    const requested = Math.max(0, intSigned(adjustments[key]))
    const amount = Math.min(positiveBudget, requested)
    values[key] += amount
    positiveBudget -= amount
  }

  for (const key of ORIGIN_FIELDS) result[key] = values[key]
  normalizeOrigins(result)
}

export function crearAjustes(saved = {}, source = {}) {
  const adjustments = { ing: emptyMatrix(), des: emptyMatrix() }
  for (const key of CAMPOS_RESUMEN_AUTO) adjustments[key] = difference(saved[key], source[key])
  for (const type of ['ing', 'des']) {
    for (let week = 0; week < 5; week++) {
      for (let day = 0; day < 5; day++) {
        adjustments[type][week][day] = difference(saved[type]?.[week]?.[day], source[type]?.[week]?.[day])
      }
    }
  }
  const target = targetOrigins(saved, source, matrixTotal(adjustments.ing) + matrixTotal(source.ing))
  for (const key of ORIGIN_FIELDS) {
    adjustments[key] = intOrZero(target[key]) - intOrZero(source[key])
  }
  return adjustments
}

export function aplicarAjustes(source = {}, adjustments = {}) {
  const result = emptySource()
  for (const key of CAMPOS_RESUMEN_AUTO) {
    if (ORIGIN_FIELDS.includes(key)) continue
    result[key] = intOrZero(source[key]) + intOrZero(adjustments[key])
  }
  for (const type of ['ing', 'des']) {
    for (let week = 0; week < 5; week++) {
      for (let day = 0; day < 5; day++) {
        result[type][week][day] = intOrZero(source[type]?.[week]?.[day]) + intOrZero(adjustments[type]?.[week]?.[day])
      }
    }
  }
  applyOriginAdjustments(result, source, adjustments)
  return result
}
