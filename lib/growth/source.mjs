import { balanceMensual, iniciosClase, retirosActivosMes } from '../inicios-clase.mjs'
import { classifyTrialSales } from '../trial-enrollments.mjs'

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

export function buildGrowthHistory({ summaries = [], states = [], weekly = [], reincorporations = [], students = [], events = [] }) {
  const stateByMonth = new Map(states.map((row) => [keyOf(row), row.estado]))
  const weeklyByMonth = new Map(weekly.map((row) => [keyOf(row), row]))
  const reincorporationsByMonth = new Map(reincorporations.map((row) => [keyOf(row), row]))
  const studentById = new Map(students.map((student) => [String(student.id), student]))
  const canonical = new Map()
  for (const event of events.filter((item) => item.tipo === 'inscripcion').sort((a, b) =>
    String(iso10(a.fecha) || '').localeCompare(String(iso10(b.fecha) || '')) || Number(a.id) - Number(b.id)
  )) {
    if (!canonical.has(String(event.estudiante_id))) canonical.set(String(event.estudiante_id), event)
  }
  const salesByMonth = new Map()
  for (const event of canonical.values()) {
    const date = iso10(event.fecha)
    if (!date || date.slice(0, 7) !== keyOf(event) || event.origen === 'traslado') continue
    const key = keyOf(event)
    const sales = salesByMonth.get(key) || []
    sales.push({ ...event, crm_registration_id: studentById.get(String(event.estudiante_id))?.crm_registration_id })
    salesByMonth.set(key, sales)
  }

  return summaries
    .map((summary) => {
      const key = keyOf(summary)
      const declared = weeklyByMonth.get(key) || {}
      const rejoined = reincorporationsByMonth.get(key) || {}
      const sales = numberOr(declared.nuevos_ingresos_venta ?? declared.ventas)
      const classified = classifyTrialSales(salesByMonth.get(key) || [])
      const reliable = weeklyByMonth.has(key) && classified.reliable && classified.totalSales === sales
      const hasOverride = summary.cp_matriculados_override != null
      const useDerived = reliable && !hasOverride
      const declaredTrial = numberOr(summary.cp_matriculados)
      const coverage = sales > 0 ? Math.min(1, classified.classifiedSales / sales) : (reliable ? 1 : 0)
      const issues = []
      if (!reliable) issues.push({
        code: 'cp_classification_incomplete', severity: 'warning',
        message: 'La clasificación de ventas no cubre todo el cierre; se conserva la matrícula declarada.',
      })
      if (reliable && declaredTrial !== classified.trialEnrollments) issues.push({
        code: 'cp_enrollment_conflict', severity: 'warning',
        period: key, resolved: useDerived, affectsProjection: !useDerived,
        message: `Matrícula de prueba declarada: ${declaredTrial}; ventas clasificadas de prueba: ${classified.trialEnrollments}.`,
      })
      return {
        ...summary,
        closed: stateByMonth.get(key) === 'cerrado',
        ventas: sales,
        retiros: numberOr(declared.total_desercion ?? declared.retiros),
        reincorporados: numberOr(rejoined.total ?? rejoined.reincorporados),
        ...(summary.cp_matriculados != null ? {
          cp_matriculados: useDerived ? classified.trialEnrollments : declaredTrial,
          cp_matriculados_declared: declaredTrial,
        } : {}),
        trialFunnel: { ...classified, coverage, reliable, declared: declaredTrial,
          derived: classified.trialEnrollments, source: useDerived ? 'classified_sales' : 'declared_summary',
          explicitOverride: hasOverride },
        issues,
      }
    })
    .sort((a, b) => (Number(a.year) * 12 + Number(a.month)) - (Number(b.year) * 12 + Number(b.month)))
}

export function buildOperationalGrowth({ today, students = [], groups = [], events = [], groupCapacity = null }) {
  const asOfDate = iso10(today)
  const currentPeriod = String(today).slice(0, 7)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate || '')) throw new Error('today debe usar el formato YYYY-MM-DD')
  const currentMonthEnd = monthEnd(currentPeriod)
  const nextPeriod = addMonth(currentPeriod)
  const issues = []
  const validStates = new Set(['activo', 'baja_potencial'])
  const blockedGroupStates = new Set(['cerrado', 'fusionado'])
  const groupById = new Map(groups.map((group) => [String(group.id), group]))
  const recordedStarts = iniciosClase(students, groups, events)
  const startByStudent = new Map(recordedStarts.map((start) => [String(start.estudianteId), start]))
  // Una venta cuyo retiro programado ocurre antes de su primera clase no
  // llegará a ser alumnado: no es un inicio futuro ni una salida de población.
  // La igualdad conserva ambos movimientos, igual que retirosActivosMes.
  const cancelledBeforeStart = new Set(students.filter((student) => {
    const retirement = iso10(student.retiro_programado_para)
    const start = startByStudent.get(String(student.id))?.fechaInicio
    return retirement && start && retirement < start
  }).map((student) => String(student.id)))
  const starts = recordedStarts.filter((start) => !cancelledBeforeStart.has(String(start.estudianteId)))

  const activeStudents = students.filter((student) => validStates.has(student.estado))
  const blockedStudents = activeStudents.filter((student) =>
    blockedGroupStates.has(groupById.get(String(student.grupo_id))?.estado)
  )
  if (blockedStudents.length) issues.push({
    code: 'active_students_in_blocked_groups', severity: 'warning', count: blockedStudents.length,
    message: `${blockedStudents.length} fichas activas siguen asignadas a grupos cerrados o fusionados.`,
  })
  const eligible = activeStudents.filter((student) => {
    if (cancelledBeforeStart.has(String(student.id))) return false
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
  const todayStudents = currentStudents.filter((student) => {
    const start = startByStudent.get(String(student.id))
    return !start?.fechaInicio || start.fechaInicio <= asOfDate
  })
  const pipeline = eligible
    .map((student) => startByStudent.get(String(student.id)))
    .filter((start) => start?.fechaInicio && start.fechaInicio > asOfDate)
    .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
  const monthStarts = starts.filter((start) => start.fechaInicio?.startsWith(currentPeriod))
  const currentMonthStarts = monthStarts.length
  const currentMonthStartsToDate = monthStarts.filter((start) => start.fechaInicio <= asOfDate).length
  // La fecha efectiva determina el corte; year/month solo respaldan movimientos
  // históricos sin fecha. Esos movimientos no permiten afirmar un saldo diario.
  const effectiveEvents = events.map((event) => {
    const date = iso10(event.fecha)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return { ...event, fecha: null }
    const year = Number(date.slice(0, 4))
    const month = Number(date.slice(5, 7))
    if (['retiro', 'reincorporacion'].includes(event.tipo) && event.year != null && event.month != null
      && (Number(event.year) !== year || Number(event.month) !== month)) {
      issues.push({ code: 'movement_period_mismatch', severity: 'warning',
        message: 'Un movimiento tiene una fecha efectiva distinta del periodo declarado.' })
    }
    return { ...event, fecha: date, year, month }
  })
  const uniqueMovements = (rows) => {
    const seen = new Set()
    return rows.filter((event) => {
      // Un alumno puede retirarse y reincorporarse varias veces en un día.
      // Solo una identidad repetida prueba que es el mismo evento.
      if (event.id == null) return true
      const key = String(event.id)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
  const withdrawalsFor = (period) => {
    const [year, month] = period.split('-').map(Number)
    return uniqueMovements(retirosActivosMes(students, groups, effectiveEvents, year, month))
  }
  const rejoinedFor = (period) => uniqueMovements(effectiveEvents.filter((event) =>
    event.tipo === 'reincorporacion' && keyOf(event) === period
  ))
  const monthWithdrawals = withdrawalsFor(currentPeriod)
  const monthRejoined = rejoinedFor(currentPeriod)
  const toDate = (rows) => rows.filter((event) => event.fecha && event.fecha <= asOfDate).length
  const remaining = (rows) => rows.filter((event) => event.fecha && event.fecha > asOfDate).length
  const undated = (rows) => rows.filter((event) => !event.fecha).length
  const currentMonthWithdrawalsUndated = undated(monthWithdrawals)
  const currentMonthReincorporationsUndated = undated(monthRejoined)
  if (currentMonthWithdrawalsUndated + currentMonthReincorporationsUndated > 0) issues.push({
    code: 'undated_movements', severity: 'warning',
    count: currentMonthWithdrawalsUndated + currentMonthReincorporationsUndated,
    message: 'Hay movimientos del mes sin fecha: el saldo al día requiere conciliación.',
  })

  const recordedWithdrawals = new Set(effectiveEvents.filter((event) => event.tipo === 'retiro')
    .map((event) => `${event.estudiante_id}:${event.fecha}`))
  const scheduledEvents = eligible.filter((student) => iso10(student.retiro_programado_para))
    .map((student) => {
      const fecha = iso10(student.retiro_programado_para)
      return { estudiante_id: student.id, tipo: 'retiro', fecha,
        year: Number(fecha.slice(0, 4)), month: Number(fecha.slice(5, 7)), scheduled: true }
    })
    .filter((item) => !recordedWithdrawals.has(`${item.estudiante_id}:${item.fecha}`))
  const scheduledDepartures = []
  for (const period of new Set(scheduledEvents.map(keyOf))) {
    const [year, month] = period.split('-').map(Number)
    // Mismo criterio que el retiro ejecutado, incluida una venta sin grupo:
    // solo puede salir de población quien llegó a iniciar clases.
    const operational = retirosActivosMes(students, groups, [...effectiveEvents, ...scheduledEvents], year, month)
    for (const item of operational.filter((event) => event.scheduled)) {
      scheduledDepartures.push({ estudianteId: item.estudiante_id, fecha: item.fecha })
    }
  }
  const overdue = scheduledDepartures.filter((item) => item.fecha <= asOfDate)
  if (overdue.length) issues.push({
    code: 'overdue_scheduled_withdrawals', severity: 'warning', count: overdue.length,
    message: 'Hay retiros programados vencidos todavía sin retiro ejecutado.',
  })
  const monthScheduled = scheduledDepartures.filter((item) => item.fecha.startsWith(currentPeriod))
  const scheduledWithdrawalsRemainingMonth = monthScheduled.filter((item) => item.fecha > asOfDate).length

  const pipelineByMonth = {}
  for (const start of pipeline) {
    const period = start.fechaInicio.slice(0, 7)
    pipelineByMonth[period] = (pipelineByMonth[period] || 0) + 1
  }

  const announcedDepartures = currentStudents.filter((student) => student.estado === 'baja_potencial').length
  const activeGroups = groups.filter((group) => group.estado === 'activo').length
  const perGroup = Number(groupCapacity) > 0 ? Number(groupCapacity) : null
  issues.push({ code: 'capacity_unverified', severity: 'warning',
    message: 'La capacidad física disponible no está verificada por horarios, grupos y coaches.' })

  return {
    asOfDate,
    currentPeriod,
    currentMonthEnd,
    // Compatibilidad: el padrón del mes no reemplaza el balance oficial.
    currentChildren: currentStudents.length,
    todayChildren: todayStudents.length,
    expectedMonthEndChildren: Math.max(0, currentStudents.length - monthScheduled.length),
    announcedDepartures,
    pipeline,
    pipelineByMonth,
    pipelineTotal: pipeline.length,
    pipelineDated: pipeline.filter((start) => Boolean(start.fechaInicio)).length,
    undatedStarts: undatedStudents.length,
    pipelineTotalWithUndated: pipeline.length + undatedStudents.length,
    trackedPopulation: todayStudents.length + pipeline.length + undatedStudents.length,
    currentMonthStarts,
    currentMonthStartsToDate,
    remainingMonthStarts: currentMonthStarts - currentMonthStartsToDate,
    currentMonthWithdrawals: monthWithdrawals.length,
    currentMonthWithdrawalsToDate: toDate(monthWithdrawals),
    currentMonthWithdrawalsUndated,
    scheduledWithdrawalsRemainingMonth,
    remainingMonthWithdrawals: remaining(monthWithdrawals) + scheduledWithdrawalsRemainingMonth,
    expectedMonthWithdrawals: monthWithdrawals.length + monthScheduled.length,
    currentMonthReincorporations: monthRejoined.length,
    currentMonthReincorporationsToDate: toDate(monthRejoined),
    currentMonthReincorporationsUndated,
    remainingMonthReincorporations: remaining(monthRejoined),
    scheduledDepartures,
    scheduledCancellationsBeforeStart: cancelledBeforeStart.size,
    undatedAnnouncedDepartures: currentStudents.filter((student) =>
      student.estado === 'baja_potencial' && !iso10(student.retiro_programado_para)
    ).length,
    reconciliation: {
      activeInBlockedGroups: blockedStudents.length,
      blockedGroupStudentIds: blockedStudents.map((student) => student.id),
    },
    capacityMax: null,
    capacityEstimate: {
      basis: 'active_groups', groups: activeGroups, perGroup,
      total: perGroup == null ? null : activeGroups * perGroup,
      verified: false, label: 'Cupo teórico de grupos activos; horarios y coaches sin verificar',
    },
    issues,
    nextMonthOperational: {
      scheduledStarts: numberOr(pipelineByMonth[nextPeriod]),
      announcedDepartures: scheduledDepartures.filter((item) => item.fecha.startsWith(nextPeriod)).length
        + withdrawalsFor(nextPeriod).length,
      reincorporations: rejoinedFor(nextPeriod).length,
    },
  }
}

export function currentPopulationFromHistory(history = [], {
  currentPeriod,
  currentMonthStarts = null,
  currentMonthWithdrawals = null,
  currentMonthReincorporations = null,
} = {}) {
  const rows = history.filter((row) => keyOf(row) <= currentPeriod)
  const current = rows.at(-1)
  if (!current) return null
  if (keyOf(current) !== currentPeriod) {
    if (addMonth(keyOf(current)) !== currentPeriod) return null
    if (currentMonthStarts == null && currentMonthWithdrawals == null && currentMonthReincorporations == null) {
      return Math.max(0, numberOr(current.ninos_final_mes))
    }
    return Math.max(0, balanceMensual({
      inicio: numberOr(current.ninos_final_mes),
      nuevosActivos: numberOr(currentMonthStarts),
      reincorporados: numberOr(currentMonthReincorporations),
      retirados: numberOr(currentMonthWithdrawals),
    }))
  }
  if (current.closed) {
    return Math.max(0, numberOr(current.ninos_final_mes))
  }

  const previous = rows.at(-2)
  const previousIsAdjacent = previous && addMonth(keyOf(previous)) === currentPeriod
  const inicio = previousIsAdjacent
    ? numberOr(previous.ninos_final_mes)
    : numberOr(current.ninos_inicio_mes)

  return Math.max(0, balanceMensual({
    inicio,
    nuevosActivos: currentMonthStarts ?? numberOr(current.nuevos_activos_mes),
    reincorporados: currentMonthReincorporations ?? numberOr(current.reincorporados),
    retirados: currentMonthWithdrawals ?? numberOr(current.retiros),
  }))
}

export function selectCurrentPopulation({
  operationalChildren,
  trackedPopulation,
  latestSummaryChildren,
  minimumCoverage = 0.75,
}) {
  const operational = Math.max(0, numberOr(operationalChildren))
  const tracked = Math.max(0, numberOr(trackedPopulation))
  const hasSummary = latestSummaryChildren != null && Number.isFinite(Number(latestSummaryChildren))
  const summary = Math.max(0, numberOr(latestSummaryChildren))
  const coverage = summary > 0 ? Number((tracked / summary).toFixed(2)) : (tracked > 0 ? 0 : 1)

  if (hasSummary) {
    return {
      currentChildren: summary,
      source: coverage < minimumCoverage ? 'monthly_summary_fallback' : 'monthly_kpi',
      coverage,
    }
  }
  return { currentChildren: operational, source: 'operational', coverage }
}
