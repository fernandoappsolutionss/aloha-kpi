import { CENTER_LEVELS } from './constants.mjs'
import { percentile } from './metrics.mjs'

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
  if (!match) throw new Error('currentPeriod debe usar el formato YYYY-MM')
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

function scenarioSeries({
  currentChildren,
  currentPeriod,
  expectedNewActives,
  expectedWithdrawals,
  expectedReincorporations,
  pipelineByMonth,
  nextMonthOperational,
  capacityMax,
  horizonMonths,
}) {
  const series = []
  let children = Math.max(0, numberOr(currentChildren))
  const hasCapacity = capacityMax != null && capacityMax !== '' && Number.isFinite(Number(capacityMax))
  const cap = hasCapacity
    ? Math.max(0, Number(capacityMax))
    : Number.POSITIVE_INFINITY

  for (let offset = 1; offset <= horizonMonths; offset += 1) {
    const period = addMonths(currentPeriod, offset)
    const operational = offset === 1 ? nextMonthOperational : null
    const scheduledStarts = Math.max(0, numberOr(
      operational?.scheduledStarts ?? pipelineByMonth?.[period],
    ))
    const newActives = operational
      ? scheduledStarts
      : Math.max(scheduledStarts, Math.max(0, numberOr(expectedNewActives)))
    const projectedFromFutureSales = Math.max(0, newActives - scheduledStarts)
    const withdrawals = Math.max(0, numberOr(
      operational ? operational.announcedDepartures : expectedWithdrawals,
    ))
    const reincorporations = Math.max(0, numberOr(
      operational ? operational.reincorporations : expectedReincorporations,
    ))
    const rawEnd = children + newActives + reincorporations - withdrawals
    const endChildren = round(clamp(rawEnd, 0, cap), 1)

    series.push({
      period,
      startChildren: children,
      scheduledStarts: round(scheduledStarts, 1),
      projectedFromFutureSales: round(projectedFromFutureSales, 1),
      newActives: round(newActives, 1),
      reincorporations: round(reincorporations, 1),
      withdrawals: round(withdrawals, 1),
      endChildren,
      capacityLimited: rawEnd > cap,
    })
    children = endChildren
  }
  return series
}

function summarizeScenario(series, nextLevel, confidence) {
  const first = series[0]
  const last = series[series.length - 1]
  const monthlyNet = first && last
    ? round((last.endChildren - first.startChildren) / series.length, 1)
    : 0
  const reached = nextLevel
    ? series.find((row) => row.endChildren >= nextLevel.threshold)
    : null
  const recognized = nextLevel
    ? series.find((row) => isQuarterEnd(row.period) && row.endChildren >= nextLevel.threshold)
    : null

  let etaReason = null
  if (!nextLevel) etaReason = 'max_level'
  else if (confidence?.level === 'low') etaReason = 'low_confidence'
  else if (monthlyNet <= 0) etaReason = 'non_positive_growth'
  else if (!reached) etaReason = 'beyond_horizon'

  return {
    monthlyNet,
    targetMonth: etaReason ? null : reached.period,
    recognitionQuarter: etaReason ? null : recognized?.period || null,
    etaReason,
    series,
  }
}

function actionRequirements({ nextLevel, metrics, horizonMonths }) {
  if (!nextLevel) {
    return {
      horizonMonths,
      netChildrenPerMonth: 0,
      newActivesPerMonth: 0,
      monthlyInvitations: 0,
      weeklyInvitations: 0,
    }
  }

  const medians = metrics?.medians || {}
  const rates = metrics?.rates || {}
  const netChildrenPerMonth = Math.ceil(nextLevel.gap / horizonMonths)
  const avoidableAttrition = Math.max(0, numberOr(medians.controlledAttrition)) * 0.2
  const actionWithdrawals = Math.max(0, numberOr(medians.realAttrition) - avoidableAttrition)
  const newActivesPerMonth = Math.max(
    0,
    netChildrenPerMonth + actionWithdrawals - numberOr(medians.reincorporations),
  )
  const activePerSale = Math.max(0, numberOr(rates.activePerSale))
  const inviteToEnrollment = Math.max(0, numberOr(rates.inviteToEnrollment))
  const salesNeeded = activePerSale > 0 ? newActivesPerMonth / activePerSale : 0
  const trialSalesNeeded = Math.max(0, salesNeeded - numberOr(medians.nonTrialSales))
  const monthlyInvitations = inviteToEnrollment > 0
    ? Math.ceil(trialSalesNeeded / inviteToEnrollment)
    : null

  return {
    horizonMonths,
    netChildrenPerMonth,
    newActivesPerMonth: round(newActivesPerMonth, 1),
    monthlyInvitations,
    weeklyInvitations: monthlyInvitations == null ? null : Math.ceil(monthlyInvitations / 4.33),
    expectedWithdrawals: round(actionWithdrawals, 1),
    attritionReduction: round(avoidableAttrition, 1),
  }
}

export function projectGrowth({
  currentChildren,
  currentPeriod,
  metrics,
  pipelineByMonth = {},
  nextMonthOperational = null,
  capacityMax = null,
  horizonMonths = 24,
  actionHorizonMonths = 12,
}) {
  parsePeriod(currentPeriod)
  const months = Math.max(1, Math.floor(numberOr(horizonMonths, 24)))
  const actionMonths = Math.max(1, Math.floor(numberOr(actionHorizonMonths, 12)))
  const current = Math.max(0, numberOr(currentChildren))
  const nextLevel = nextCenterLevel(current)
  const medians = metrics?.medians || {}
  const distributions = metrics?.distributions || {}
  const requirements = actionRequirements({ nextLevel, metrics, horizonMonths: actionMonths })

  const baseInputs = {
    expectedNewActives: numberOr(medians.newActives),
    expectedWithdrawals: numberOr(medians.realAttrition),
    expectedReincorporations: numberOr(medians.reincorporations),
  }
  const conservativeInputs = {
    expectedNewActives: percentile(distributions.newActives || [], 0.25),
    expectedWithdrawals: percentile(distributions.realAttrition || [], 0.75),
    expectedReincorporations: percentile(distributions.reincorporations || [], 0.25),
  }
  const historicalCeiling = Math.max(
    baseInputs.expectedNewActives,
    percentile(distributions.newActives || [], 0.9) * 1.25,
  )
  const actionInputs = {
    expectedNewActives: Math.min(
      historicalCeiling || requirements.newActivesPerMonth,
      Math.max(baseInputs.expectedNewActives, requirements.newActivesPerMonth),
    ),
    expectedWithdrawals: requirements.expectedWithdrawals ?? baseInputs.expectedWithdrawals,
    expectedReincorporations: baseInputs.expectedReincorporations,
  }

  const common = {
    currentChildren: current,
    currentPeriod,
    pipelineByMonth,
    nextMonthOperational,
    capacityMax,
    horizonMonths: months,
  }
  const confidence = metrics?.confidence || { level: 'low', score: 0 }
  const build = (inputs) => summarizeScenario(
    scenarioSeries({ ...common, ...inputs }),
    nextLevel,
    confidence,
  )

  return {
    currentChildren: current,
    currentLevel: centerLevelFor(current),
    nextLevel,
    capacityMax: capacityMax != null && capacityMax !== '' && Number.isFinite(Number(capacityMax))
      ? Number(capacityMax)
      : null,
    confidence,
    requirements,
    scenarios: {
      conservative: build(conservativeInputs),
      base: build(baseInputs),
      action: build(actionInputs),
    },
  }
}
