import { CENTER_LEVELS } from './constants.mjs'
import { acquisitionModelStatus, median, percentile } from './metrics.mjs'

const numberOr = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const round = (value, decimals = 1) => {
  const factor = 10 ** decimals
  return Math.round((numberOr(value) + Number.EPSILON) * factor) / factor
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const parsePeriod = (period) => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(period || ''))
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) throw new Error('currentPeriod debe usar el formato YYYY-MM')
  return { year: Number(match[1]), month: Number(match[2]) }
}

const addMonths = (period, amount) => {
  const { year, month } = parsePeriod(period)
  const date = new Date(Date.UTC(year, month - 1 + amount, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

const isQuarterEnd = (period) => [3, 6, 9, 12].includes(Number(period.slice(5, 7)))

export function centerLevelFor(children) {
  const current = [...CENTER_LEVELS]
    .reverse()
    .find((level) => numberOr(children) >= level.threshold)
  return current?.level || 0
}

export function nextCenterLevel(children) {
  const current = Math.max(0, numberOr(children))
  const next = CENTER_LEVELS.find((level) => current < level.threshold)
  return next
    ? { level: next.level, threshold: next.threshold, gap: next.threshold - current }
    : null
}

// Departures are proportional to the remaining population, not an absolute
// loss repeated after a center empties. Admissions are the capacity-limited flow;
// existing students never disappear merely because capacity was reconfigured.
function scenarioSeries({ currentChildren, currentPeriod, expectedNewActives,
  expectedWithdrawals, expectedReincorporations, referencePopulation,
  pipelineByMonth, nextMonthOperational, capacityMax, horizonMonths }) {
  const series = []
  let children = Math.max(0, numberOr(currentChildren))
  const cap = capacityMax != null && capacityMax !== '' && Number.isFinite(Number(capacityMax))
    ? Math.max(0, Number(capacityMax)) : Infinity
  const reference = Math.max(0, numberOr(referencePopulation, currentChildren))
  const departureRate = reference > 0 ? clamp(numberOr(expectedWithdrawals) / reference, 0, 1) : 0
  for (let offset = 1; offset <= horizonMonths; offset += 1) {
    const period = addMonths(currentPeriod, offset)
    const operational = offset === 1 ? nextMonthOperational : null
    const scheduled = Math.max(0, numberOr(operational?.scheduledStarts ?? pipelineByMonth?.[period]))
    const desiredNew = operational ? scheduled : Math.max(scheduled, Math.max(0, numberOr(expectedNewActives)))
    const desiredReinc = Math.max(0, numberOr(operational ? operational.reincorporations : expectedReincorporations))
    const withdrawals = round(Math.min(children, Math.max(0, numberOr(operational ? operational.announcedDepartures : children * departureRate))))
    const remaining = round(children - withdrawals)
    const slots = Math.max(0, cap - remaining)
    const newActives = round(Math.min(desiredNew, slots))
    const reincorporations = round(Math.min(desiredReinc, Math.max(0, slots - newActives)))
    const endChildren = round(remaining + newActives + reincorporations)
    const scheduledStarts = round(Math.min(scheduled, newActives))
    series.push({ period, startChildren: children, scheduledStarts,
      projectedFromFutureSales: round(Math.max(0, newActives - scheduledStarts)),
      newActives, reincorporations, withdrawals, endChildren,
      capacityLimited: desiredNew + desiredReinc > slots,
      capacityBlocked: round(Math.max(0, desiredNew + desiredReinc - newActives - reincorporations)),
    })
    children = endChildren
  }
  return series
}

function summarizeScenario(series, nextLevel, confidence, hasOperationalMonth, assumptions = []) {
  const recurrent = series[hasOperationalMonth && series.length > 1 ? 1 : 0]
  const monthlyNet = recurrent ? round(recurrent.endChildren - recurrent.startChildren) : 0
  const reached = nextLevel ? series.find((row) => row.endChildren >= nextLevel.threshold) : null
  const recognized = nextLevel ? series.find((row) => isQuarterEnd(row.period) && row.endChildren >= nextLevel.threshold) : null
  let etaReason = null
  if (!nextLevel) etaReason = 'max_level'
  else if (confidence?.level === 'low') etaReason = 'low_confidence'
  else if (!reached) etaReason = monthlyNet <= 0 ? 'non_positive_growth' : 'beyond_horizon'
  return { monthlyNet, monthlyNetDefinition: 'first_recurring_month_balance',
    monthlyNetPeriod: recurrent?.period || null,
    targetMonth: etaReason ? null : reached.period,
    recognitionQuarter: etaReason ? null : recognized?.period || null,
    etaReason, assumptions, series }
}

function invitationRequirement(sales, rates, nonTrialSales) {
  if (sales == null) return { salesPerMonth: null, monthlyInvitations: null, weeklyInvitations: null }
  const trialSales = Math.max(0, sales - nonTrialSales)
  const conversion = numberOr(rates.inviteToEnrollment)
  const monthlyInvitations = trialSales === 0 ? 0 : conversion > 0 && conversion <= 1 ? Math.ceil(trialSales / conversion) : null
  return { salesPerMonth: round(sales), monthlyInvitations,
    weeklyInvitations: monthlyInvitations == null ? null : Math.ceil(monthlyInvitations / 4.33) }
}

function actionRequirements({ nextLevel, metrics, horizonMonths, monthlySalesTarget }) {
  const m = metrics?.medians || {}, rates = metrics?.rates || {}
  const netChildrenPerMonth = nextLevel ? Math.ceil(nextLevel.gap / horizonMonths) : 0
  const expectedWithdrawals = Math.max(0, numberOr(m.withdrawals, numberOr(m.realAttrition)))
  const newActivesPerMonth = nextLevel ? Math.max(0, netChildrenPerMonth + expectedWithdrawals - numberOr(m.reincorporations)) : 0
  const activePerSale = numberOr(rates.activePerSale)
  const minimumSales = newActivesPerMonth === 0 ? 0 : activePerSale > 0 && activePerSale <= 1 ? newActivesPerMonth / activePerSale : null
  const nonTrial = Math.max(0, numberOr(m.nonTrialSales))
  const minimumForLevel = { newActivesPerMonth: round(newActivesPerMonth), ...invitationRequirement(minimumSales, rates, nonTrial) }
  const target = monthlySalesTarget != null && monthlySalesTarget !== '' && Number.isFinite(Number(monthlySalesTarget)) ? Math.max(0, Number(monthlySalesTarget)) : null
  const commercial = { monthlySalesTarget: target, ...invitationRequirement(target, rates, nonTrial) }
  const selected = minimumSales == null ? null : Math.max(minimumSales, target || 0)
  const selectedRequirements = invitationRequirement(selected, rates, nonTrial)
  return { horizonMonths, netChildrenPerMonth, newActivesPerMonth: round(newActivesPerMonth),
    monthlySalesTarget: target, minimumForLevel, commercial,
    monthlyInvitations: selectedRequirements.monthlyInvitations,
    weeklyInvitations: selectedRequirements.weeklyInvitations,
    expectedWithdrawals: round(expectedWithdrawals), attritionReduction: 0,
    conversionEstimable: minimumSales != null,
  }
}

function interventionInputs(metrics, base, interventions) {
  const supported = new Set(['invitations', 'attendance', 'enrollment', 'activations', 'class_loss', 'technique', 'schedule'])
  const eligible = (Array.isArray(interventions) ? interventions : []).filter((item) => item && supported.has(item.kind)
    && (item.status == null || item.status === 'pending' || item.status === 'completed')
    && item.target != null && Number.isFinite(Number(item.target)) && item.baseline != null && Number.isFinite(Number(item.baseline)))
  // Repeated versions of the same objective must not multiply its impact.
  const byKind = new Map()
  for (const item of eligible) if (!byKind.has(item.kind)) byKind.set(item.kind, item)
  const applied = [...byKind.values()].map((item) => ({ ...item, evidence: 'hypothesis' }))
  const m = metrics?.medians || {}, rates = metrics?.rates || {}
  const ratio = (kind, current) => byKind.has(kind)
    ? clamp(numberOr(byKind.get(kind).targetRatio, numberOr(byKind.get(kind).target) / 100), 0, 1) : clamp(numberOr(current), 0, 1)
  const invitations = Math.max(0, numberOr(m.invitations))
  const targetInvitations = byKind.has('invitations') ? Math.max(invitations, numberOr(byKind.get('invitations').target)) : invitations
  const attendance = clamp(numberOr(rates.attendance), 0, 1)
  const enrollment = clamp(numberOr(rates.enrollment), 0, 1)
  const funnelBefore = invitations * attendance * enrollment
  const funnelAfter = targetInvitations * Math.max(attendance, ratio('attendance', attendance)) * Math.max(enrollment, ratio('enrollment', enrollment))
  const activation = byKind.get('activations')
  const activationDelta = activation ? Math.max(0, numberOr(activation.target) - numberOr(activation.baseline)) : 0
  const acquisitionModel = acquisitionModelStatus(metrics)
  const conversion = numberOr(rates.activePerSale)
  // Activation-origin students can also attend a trial: use the larger modeled
  // increment, not their sum, until cohort attribution proves disjointness.
  const acquisitionDelta = !acquisitionModel.blocked && conversion > 0 && conversion <= 1
    ? Math.max(0, funnelAfter - funnelBefore, activationDelta) * conversion : 0
  let savedDepartures = 0
  for (const kind of ['class_loss', 'technique', 'schedule']) {
    const item = byKind.get(kind)
    if (item) savedDepartures += Math.max(0, numberOr(item.baseline) - Math.max(0, numberOr(item.target)))
  }
  savedDepartures = Math.min(savedDepartures, Math.max(0, numberOr(m.realAttrition)), base.expectedWithdrawals)
  return { applied, acquisitionModel, inputs: { ...base,
    expectedNewActives: base.expectedNewActives + acquisitionDelta,
    expectedWithdrawals: Math.max(0, base.expectedWithdrawals - savedDepartures) },
    assumptions: ['Las intervenciones son hipótesis; completarlas no demuestra impacto.',
      'Los objetivos de invitaciones, asistencia y matrícula se aplican juntos al mismo embudo.',
      'Activaciones y clases de prueba pueden solaparse; sus incrementos no se suman.',
      ...(acquisitionModel.blocked ? ['Las mejoras de captación no se proyectan mientras el embudo sea inconsistente.'] : []),
      ...(acquisitionModel.provisional && !acquisitionModel.blocked ? ['El plan usa valores declarados o corregidos con trazabilidad; el efecto sigue condicionado a validarlos.'] : []),
      ...(conversion <= 0 ? ['Sin conversión a activos verificable no se inventan incorporaciones del plan.'] : [])] }
}

export function projectGrowth({ currentChildren, currentPeriod, metrics, pipelineByMonth = {},
  nextMonthOperational = null, capacityMax = null, horizonMonths = 12, actionHorizonMonths = 12,
  interventions = [], monthlySalesTarget = null }) {
  parsePeriod(currentPeriod)
  const months = Math.max(1, Math.floor(numberOr(horizonMonths, 12)))
  const actionMonths = Math.max(1, Math.floor(numberOr(actionHorizonMonths, 12)))
  const current = Math.max(0, numberOr(currentChildren))
  const nextLevel = nextCenterLevel(current)
  const medians = metrics?.medians || {}
  const history = (metrics?.months || []).filter((row) => Number.isFinite(Number(row.startChildren)) && row.startChildren > 0)
  const referencePopulation = history.length ? median(history.map((row) => row.startChildren)) : current
  const baseInputs = { expectedNewActives: Math.max(0, numberOr(medians.newActives)),
    expectedWithdrawals: Math.max(0, numberOr(medians.withdrawals, numberOr(medians.realAttrition))),
    expectedReincorporations: Math.max(0, numberOr(medians.reincorporations)), referencePopulation }
  const net = (row) => numberOr(row.newActives) + numberOr(row.reincorporations) - numberOr(row.withdrawals)
  const p25 = percentile(history.map(net), 0.25)
  const adverseMonth = [...history].sort((a, b) => Math.abs(net(a) - p25) - Math.abs(net(b) - p25) || net(a) - net(b))[0]
  const conservativeInputs = adverseMonth ? { expectedNewActives: numberOr(adverseMonth.newActives),
    expectedWithdrawals: numberOr(adverseMonth.withdrawals), expectedReincorporations: numberOr(adverseMonth.reincorporations),
    referencePopulation: adverseMonth.startChildren } : baseInputs
  const confidence = metrics?.confidence || { level: 'low', score: 0 }
  const assumptions = ['Las salidas incluyen graduaciones y se ajustan a la población restante.',
    'El primer mes usa movimientos programados cuando están disponibles; los siguientes usan la ventana histórica.',
    ...(capacityMax == null ? ['No hay un límite físico de capacidad verificado.'] : [])]
  const common = { currentChildren: current, currentPeriod, pipelineByMonth, nextMonthOperational, capacityMax, horizonMonths: months }
  const build = (inputs, notes = assumptions) => summarizeScenario(scenarioSeries({ ...common, ...inputs }), nextLevel, confidence, Boolean(nextMonthOperational), notes)
  const plan = interventionInputs(metrics, baseInputs, interventions)
  const base = build(baseInputs)
  return { currentChildren: current, currentLevel: centerLevelFor(current), nextLevel,
    capacityMax: capacityMax != null && capacityMax !== '' && Number.isFinite(Number(capacityMax)) ? Math.max(0, Number(capacityMax)) : null,
    confidence, quality: metrics?.quality || confidence, precision: metrics?.precision || { status: 'unvalidated', sampleSize: 0 },
    assumptions, appliedInterventions: plan.applied, acquisitionModel: plan.acquisitionModel,
    conservativeMethod: { method: 'observed_month_nearest_p25_net', referencePeriod: adverseMonth ? `${adverseMonth.year}-${String(adverseMonth.month).padStart(2, '0')}` : null },
    requirements: actionRequirements({ nextLevel, metrics, horizonMonths: actionMonths, monthlySalesTarget }),
    scenarios: { conservative: build(conservativeInputs, [...assumptions, 'Escenario adverso basado en un mes observado; no es un intervalo probabilístico.']),
      base, action: plan.applied.length ? build(plan.inputs, [...assumptions, ...plan.assumptions]) : base },
  }
}
