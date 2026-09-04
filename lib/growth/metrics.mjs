const numberOr = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))

export function median(values) {
  const sorted = (values || []).map((value) => numberOr(value)).sort((a, b) => a - b)
  if (!sorted.length) return 0
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function percentile(values, p) {
  const sorted = (values || []).map((value) => numberOr(value)).sort((a, b) => a - b)
  if (!sorted.length) return 0
  const index = clamp(numberOr(p), 0, 1) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

const valueFrom = (row, ...keys) => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] != null) return row[key]
  }
  return 0
}

const hasValue = (row, ...keys) => keys.some((key) =>
  Object.prototype.hasOwnProperty.call(row, key) && row[key] != null && row[key] !== '' && Number.isFinite(Number(row[key]))
)

const periodIndex = (year, month) => Number(year) * 12 + Number(month) - 1
const periodName = (index) => `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`
const validPeriod = (period) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(period || ''))

export function normalizeGrowthMonth(row) {
  const sales = numberOr(valueFrom(row, 'ventas', 'sales'))
  const withdrawals = numberOr(valueFrom(row, 'retiros', 'withdrawals'))
  const graduates = numberOr(valueFrom(row, 'mot_graduado', 'graduates'))
  const controlledAttrition =
    numberOr(valueFrom(row, 'mot_perdida_clase', 'classLoss')) +
    numberOr(valueFrom(row, 'mot_tecnica', 'technique')) +
    numberOr(valueFrom(row, 'mot_horario', 'schedule'))
  const realAttrition = Math.max(0, withdrawals - graduates)
  const referred = numberOr(valueFrom(row, 'orig_referido', 'referred'))
  const center = numberOr(valueFrom(row, 'orig_centro', 'center'))
  const activations = numberOr(valueFrom(row, 'orig_activaciones', 'activations'))
  const marketing = numberOr(valueFrom(row, 'orig_marketing', 'marketing'))
  const media = numberOr(valueFrom(row, 'orig_medios', 'media'))
  const trialEnrollments = numberOr(valueFrom(row, 'cp_matriculados', 'trialEnrollments'))

  return {
    issues: Array.isArray(row.issues) ? row.issues : [],
    trialFunnel: row.trialFunnel || null,
    year: numberOr(valueFrom(row, 'year')),
    month: numberOr(valueFrom(row, 'month')),
    closed: row.closed !== false,
    startChildren: numberOr(valueFrom(row, 'ninos_inicio_mes', 'startChildren')),
    endChildren: numberOr(valueFrom(row, 'ninos_final_mes', 'endChildren')),
    activeGroups: numberOr(valueFrom(row, 'grupos_activos', 'activeGroups')),
    newActives: numberOr(valueFrom(row, 'nuevos_activos_mes', 'newActives')),
    sales,
    withdrawals,
    reincorporations: numberOr(valueFrom(row, 'reincorporados', 'reincorporations')),
    invited: numberOr(valueFrom(row, 'cp_invitados', 'invited')),
    attended: numberOr(valueFrom(row, 'cp_asistieron', 'attended')),
    trialEnrollments,
    nonTrialSales: Math.max(0, sales - trialEnrollments),
    graduates,
    realAttrition,
    controlledAttrition: Math.min(realAttrition, controlledAttrition),
    controllableOrigins: referred + center + activations,
    allOrigins: referred + center + activations + marketing + media,
    origins: { referred, center, activations, marketing, media },
    causes: {
      classLoss: numberOr(valueFrom(row, 'mot_perdida_clase', 'classLoss')),
      technique: numberOr(valueFrom(row, 'mot_tecnica', 'technique')),
      schedule: numberOr(valueFrom(row, 'mot_horario', 'schedule')),
      economic: numberOr(valueFrom(row, 'mot_economico', 'economic')),
      other: numberOr(valueFrom(row, 'mot_otro', 'other')),
    },
    completeness: [
      hasValue(row, 'ninos_inicio_mes', 'startChildren'),
      hasValue(row, 'ninos_final_mes', 'endChildren'),
      hasValue(row, 'nuevos_activos_mes', 'newActives'),
      hasValue(row, 'ventas', 'sales'),
      hasValue(row, 'retiros', 'withdrawals'),
      hasValue(row, 'cp_invitados', 'invited'),
      hasValue(row, 'cp_asistieron', 'attended'),
      hasValue(row, 'cp_matriculados', 'trialEnrollments'),
    ].filter(Boolean).length / 8,
  }
}

const sum = (rows, key) => rows.reduce((total, row) => total + numberOr(row[key]), 0)

function confidenceFor(rows, { pipelineTotal = 0, pipelineDated = 0 } = {}, issues = []) {
  const months = rows.length
  const completeness = months
    ? rows.reduce((total, row) => total + row.completeness, 0) / months
    : 0
  const totalPipeline = Math.max(0, numberOr(pipelineTotal))
  const pipelineCoverage = totalPipeline
    ? clamp(numberOr(pipelineDated) / totalPipeline)
    : 1
  const historyScore = clamp(months / 6)
  const score = (historyScore * 0.4) + (completeness * 0.4) + (pipelineCoverage * 0.2)
  const reasons = []
  if (months < 3) reasons.push('Menos de 3 meses cerrados con datos.')
  else if (months < 6) reasons.push('Menos de 6 meses cerrados para una tendencia estable.')
  if (completeness < 0.9) reasons.push('Hay indicadores historicos incompletos.')
  if (pipelineCoverage < 0.9) reasons.push('Faltan fechas de inicio en el pipeline.')
  reasons.push(...issues.map((issue) => issue.message).filter(Boolean))

  let level = 'low'
  if (months >= 6 && completeness >= 0.9 && pipelineCoverage >= 0.9) level = 'high'
  else if (months >= 3 && completeness >= 0.6 && pipelineCoverage >= 0.5) level = 'medium'
  if (issues.some((issue) => issue.resolved !== true && (issue.severity !== 'warning' || /balance|discontinuity|mismatch|conflict|invalid|duplicate/.test(issue.code)))) level = 'low'
  else if (issues.length && level === 'high') level = 'medium'

  const qualityScore = Math.min(score, level === 'low' ? 0.49 : level === 'medium' ? 0.79 : 1)
  return { level, score: qualityScore, coverageScore: score, months, completeness, pipelineCoverage, reasons: [...new Set(reasons)], kind: 'data_quality' }
}

// Data coverage and contradictory numbers are different. Declared legacy
// figures can support a clearly conditional hypothesis; impossible ratios or
// an unresolved trial/sales conflict cannot support a numeric acquisition gain.
export function acquisitionModelStatus(metrics = {}) {
  const rates = metrics.rates || {}
  const issues = metrics.issues || []
  const relevant = issues.filter((issue) => /funnel|enrollment|cp_/.test(issue.code))
  const invalidRates = ['attendance', 'enrollment', 'inviteToEnrollment'].some((key) => rates[key] != null && (!Number.isFinite(Number(rates[key])) || Number(rates[key]) < 0 || Number(rates[key]) > 1))
  const activePerSale = Number(rates.activePerSale)
  const invalidActivation = !Number.isFinite(activePerSale) || activePerSale <= 0 || activePerSale > 1
  const unresolved = relevant.some((issue) => issue.resolved !== true && (issue.code === 'invalid_funnel' || issue.code === 'cp_enrollment_conflict' || issue.affectsProjection === true || issue.severity === 'error'))
  return { blocked: invalidRates || invalidActivation || unresolved,
    provisional: relevant.length > 0,
    reasons: [...new Set([
      ...relevant.map((issue) => issue.message).filter(Boolean),
      ...(invalidRates ? ['Las tasas del embudo no son válidas.'] : []),
      ...(invalidActivation ? ['No hay conversión a activos verificable.'] : []),
    ])] }
}

export function buildGrowthMetrics(sourceRows, options = {}) {
  const source = Array.isArray(sourceRows) ? sourceRows : []
  const normalized = source.map(normalizeGrowthMonth)
    .filter((row) => Number.isInteger(row.year) && row.year > 0 && Number.isInteger(row.month) && row.month >= 1 && row.month <= 12)
  const fallback = normalized.length ? Math.max(...normalized.map((row) => periodIndex(row.year, row.month))) + 1 : null
  const current = validPeriod(options.currentPeriod)
    ? periodIndex(...options.currentPeriod.split('-'))
    : fallback
  const windowRows = normalized.filter((row) => current != null && periodIndex(row.year, row.month) >= current - 6 && periodIndex(row.year, row.month) < current)
  const issues = [...(Array.isArray(options.issues) ? options.issues : [])]
  for (const row of windowRows) issues.push(...row.issues)
  const chronological = [...windowRows].sort((a, b) => periodIndex(a.year, a.month) - periodIndex(b.year, b.month))
  for (let i = 1; i < chronological.length; i += 1) {
    const before = chronological[i - 1], row = chronological[i]
    if (!before.closed && row.closed && periodIndex(row.year, row.month) === periodIndex(before.year, before.month) + 1 && Math.abs(row.startChildren - before.endChildren) > 0.1) issues.push({ code: 'open_month_discontinuity', year: row.year, month: row.month, message: `El mes anterior sigue abierto y su saldo no concilia con el inicio de ${row.year}-${String(row.month).padStart(2, '0')}.`, severity: 'error' })
  }
  const unique = new Map()
  for (const row of windowRows.filter((row) => row.closed)) {
    const key = periodName(periodIndex(row.year, row.month))
    if (unique.has(key)) issues.push({ code: 'duplicate_month', message: `El mes ${key} tiene más de un cierre.`, severity: 'error' })
    else unique.set(key, row)
  }
  const rows = [...unique.values()].sort((a, b) => periodIndex(a.year, a.month) - periodIndex(b.year, b.month))
  const periods = rows.map((row) => periodName(periodIndex(row.year, row.month)))
  const missingPeriods = current == null ? [] : Array.from({ length: 6 }, (_, i) => periodName(current - 6 + i)).filter((period) => !unique.has(period))
  if (missingPeriods.length) issues.push({ code: 'missing_closed_months', message: `Faltan cierres en la ventana: ${missingPeriods.join(', ')}.`, severity: 'warning' })
  const window = { currentPeriod: current == null ? null : periodName(current), startPeriod: current == null ? null : periodName(current - 6), endPeriod: current == null ? null : periodName(current - 1), expectedMonths: 6, months: rows.length, periods, closedPeriods: periods, missingPeriods }
  for (const row of rows) {
    if (row.attended > row.invited || row.trialEnrollments > row.attended) {
      issues.push({
        code: 'invalid_funnel',
        year: row.year,
        month: row.month,
        message: 'El embudo no respeta invitados >= asistentes >= matriculados.',
      })
    }
    if (Math.abs(row.endChildren - (row.startChildren + row.newActives + row.reincorporations - row.withdrawals)) > 0.1) {
      issues.push({ code: 'stock_balance', year: row.year, month: row.month, message: `El saldo de ${row.year}-${String(row.month).padStart(2, '0')} no coincide con entradas y salidas.`, severity: 'error' })
    }
    if (['startChildren', 'endChildren', 'newActives', 'withdrawals', 'reincorporations', 'invited', 'attended', 'trialEnrollments', 'sales', 'graduates'].some((key) => row[key] < 0) || row.graduates > row.withdrawals) {
      issues.push({ code: 'invalid_counts', message: 'Hay cantidades negativas o graduaciones superiores a las salidas.', severity: 'error' })
    }
  }
  for (let i = 1; i < rows.length; i += 1) {
    const before = rows[i - 1], row = rows[i]
    if (periodIndex(row.year, row.month) === periodIndex(before.year, before.month) + 1 && Math.abs(row.startChildren - before.endChildren) > 0.1) issues.push({ code: 'stock_discontinuity', year: row.year, month: row.month, message: `El inicio de ${row.year}-${String(row.month).padStart(2, '0')} difiere del cierre anterior.`, severity: 'error' })
  }

  const invited = sum(rows, 'invited')
  const attended = sum(rows, 'attended')
  const trialEnrollments = sum(rows, 'trialEnrollments')
  const sales = sum(rows, 'sales')
  const newActives = sum(rows, 'newActives')
  const realAttrition = sum(rows, 'realAttrition')
  const controlledAttrition = sum(rows, 'controlledAttrition')
  const controllableOrigins = sum(rows, 'controllableOrigins')
  const allOrigins = sum(rows, 'allOrigins')
  const latest = rows[rows.length - 1] || null

  const distributions = {
    sales: rows.map((row) => row.sales),
    newActives: rows.map((row) => row.newActives),
    withdrawals: rows.map((row) => row.withdrawals),
    graduates: rows.map((row) => row.graduates),
    realAttrition: rows.map((row) => row.realAttrition),
    controlledAttrition: rows.map((row) => row.controlledAttrition),
    reincorporations: rows.map((row) => row.reincorporations),
    invitations: rows.map((row) => row.invited),
    trialEnrollments: rows.map((row) => row.trialEnrollments),
    nonTrialSales: rows.map((row) => row.nonTrialSales),
    controllableOrigins: rows.map((row) => row.controllableOrigins),
    referred: rows.map((row) => row.origins.referred),
    center: rows.map((row) => row.origins.center),
    activations: rows.map((row) => row.origins.activations),
    classLoss: rows.map((row) => row.causes.classLoss),
    technique: rows.map((row) => row.causes.technique),
    schedule: rows.map((row) => row.causes.schedule),
  }

  const confidence = confidenceFor(rows, options, issues)
  return {
    window,
    quality: confidence,
    precision: { status: 'unvalidated', sampleSize: 0 },
    monthsUsed: rows.length,
    currentChildren: latest?.endChildren || 0,
    currentGroups: latest?.activeGroups || 0,
    medians: {
      sales: median(distributions.sales),
      newActives: median(distributions.newActives),
      withdrawals: median(distributions.withdrawals),
      graduates: median(distributions.graduates),
      realAttrition: median(distributions.realAttrition),
      controlledAttrition: median(distributions.controlledAttrition),
      reincorporations: median(distributions.reincorporations),
      invitations: median(distributions.invitations),
      trialEnrollments: median(distributions.trialEnrollments),
      nonTrialSales: median(distributions.nonTrialSales),
      controllableOrigins: median(distributions.controllableOrigins),
    },
    rates: {
      attendance: invited > 0 ? attended / invited : 0,
      enrollment: attended > 0 ? trialEnrollments / attended : 0,
      inviteToEnrollment: invited > 0 ? trialEnrollments / invited : 0,
      activePerSale: sales > 0 ? clamp(newActives / sales) : 0,
    },
    controls: {
      acquisitionCount: controllableOrigins,
      acquisitionShare: allOrigins > 0 ? controllableOrigins / allOrigins : 0,
      attritionCount: controlledAttrition,
      attritionShare: realAttrition > 0 ? controlledAttrition / realAttrition : 0,
    },
    originMedians: {
      referred: median(distributions.referred),
      center: median(distributions.center),
      activations: median(distributions.activations),
    },
    causeMedians: {
      classLoss: median(distributions.classLoss),
      technique: median(distributions.technique),
      schedule: median(distributions.schedule),
    },
    totals: {
      invited,
      attended,
      trialEnrollments,
      sales,
      newActives,
      realAttrition,
      controlledAttrition,
      controllableOrigins,
      allOrigins,
    },
    distributions,
    confidence,
    issues,
    months: rows,
  }
}
