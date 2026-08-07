import { iniciosClase } from '../inicios-clase.mjs'

const numberOr = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const keyOf = (row) => `${Number(row?.year)}-${String(Number(row?.month)).padStart(2, '0')}`

const monthEnd = (period) => {
  const [year, month] = period.split('-').map(Number)
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${period}-${String(day).padStart(2, '0')}`
}

const addMonth = (period) => {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(Date.UTC(year, month, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

const iso10 = (value) => {
  if (!value) return null
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
}

const OPERATIONAL_START_DATE = '2026-08-01'

export function buildGrowthHistory({ summaries = [], states = [], weekly = [], reincorporations = [] }) {
  const stateByMonth = new Map(states.map((row) => [keyOf(row), row.estado]))
  const weeklyByMonth = new Map(weekly.map((row) => [keyOf(row), row]))
  const reincorporationsByMonth = new Map(reincorporations.map((row) => [keyOf(row), row]))

  return summaries
    .map((summary) => {
      const key = keyOf(summary)
      const declared = weeklyByMonth.get(key) || {}
      const rejoined = reincorporationsByMonth.get(key) || {}
      return {
        ...summary,
        closed: stateByMonth.get(key) === 'cerrado',
        ventas: numberOr(declared.nuevos_ingresos_venta ?? declared.ventas),
        retiros: numberOr(declared.total_desercion ?? declared.retiros),
        reincorporados: numberOr(rejoined.total ?? rejoined.reincorporados),
      }
    })
    .sort((a, b) => (Number(a.year) * 12 + Number(a.month)) - (Number(b.year) * 12 + Number(b.month)))
}

export function buildOperationalGrowth({ today, students = [], groups = [], events = [], salons = [] }) {
  const currentPeriod = String(today).slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(currentPeriod)) throw new Error('today debe usar el formato YYYY-MM-DD')
  const currentMonthEnd = monthEnd(currentPeriod)
  const nextPeriod = addMonth(currentPeriod)
  const validStates = new Set(['activo', 'baja_potencial'])
  const blockedGroupStates = new Set(['cerrado', 'fusionado'])
  const groupById = new Map(groups.map((group) => [String(group.id), group]))
  const starts = iniciosClase(students, groups, events)
  const startByStudent = new Map(starts.map((start) => [String(start.estudianteId), start]))

  const eligible = students.filter((student) => {
    if (!validStates.has(student.estado)) return false
    const group = student.grupo_id == null ? null : groupById.get(String(student.grupo_id))
    return !group || !blockedGroupStates.has(group.estado)
  })
  const undatedStudents = eligible.filter((student) => {
    const start = startByStudent.get(String(student.id))
    return !start?.fechaInicio && iso10(student.created_at) >= OPERATIONAL_START_DATE
  })
  const undatedIds = new Set(undatedStudents.map((student) => String(student.id)))
  const currentStudents = eligible.filter((student) => {
    const start = startByStudent.get(String(student.id))
    if (!start?.fechaInicio) return !undatedIds.has(String(student.id))
    return start.fechaInicio <= currentMonthEnd
  })
  const pipeline = eligible
    .map((student) => startByStudent.get(String(student.id)))
    .filter((start) => start?.fechaInicio && start.fechaInicio > currentMonthEnd)

  const pipelineByMonth = {}
  for (const start of pipeline) {
    const period = start.fechaInicio.slice(0, 7)
    pipelineByMonth[period] = (pipelineByMonth[period] || 0) + 1
  }

  const activeSalons = salons.filter((salon) => salon.activo !== false).length
  const announcedDepartures = currentStudents.filter((student) => student.estado === 'baja_potencial').length

  return {
    currentPeriod,
    currentMonthEnd,
    currentChildren: currentStudents.length,
    announcedDepartures,
    pipeline,
    pipelineByMonth,
    pipelineTotal: pipeline.length,
    pipelineDated: pipeline.filter((start) => Boolean(start.fechaInicio)).length,
    undatedStarts: undatedStudents.length,
    pipelineTotalWithUndated: pipeline.length + undatedStudents.length,
    trackedPopulation: currentStudents.length + pipeline.length + undatedStudents.length,
    capacityMax: activeSalons > 0 ? activeSalons * 10 * 10 : null,
    nextMonthOperational: {
      scheduledStarts: numberOr(pipelineByMonth[nextPeriod]),
      announcedDepartures,
      reincorporations: 0,
    },
  }
}

export function selectCurrentPopulation({
  operationalChildren,
  trackedPopulation,
  latestSummaryChildren,
  minimumCoverage = 0.75,
}) {
  const operational = Math.max(0, numberOr(operationalChildren))
  const tracked = Math.max(0, numberOr(trackedPopulation))
  const summary = Math.max(0, numberOr(latestSummaryChildren))
  const coverage = summary > 0 ? Number((tracked / summary).toFixed(2)) : 1

  if (summary > 0 && coverage < minimumCoverage) {
    return { currentChildren: summary, source: 'monthly_summary_fallback', coverage }
  }
  return { currentChildren: operational, source: 'operational', coverage }
}
