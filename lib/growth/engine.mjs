import { GROWTH_ENGINE_VERSION } from './constants.mjs'
import { buildGrowthMetrics } from './metrics.mjs'
import { growthWeekStart } from './notifications.mjs'
import { projectGrowth } from './projector.mjs'
import { buildGrowthRecommendations } from './recommendations.mjs'
import { sanitizeGrowthPayload } from './serialize.mjs'
import { buildGrowthHistory, buildOperationalGrowth, currentPopulationFromHistory, selectCurrentPopulation } from './source.mjs'

const iso = value => value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '').slice(0, 10)
const periodOf = row => `${row.year}-${String(row.month).padStart(2, '0')}`

export async function refreshAfterRecommendationUpdate(updated, reload) {
  try { return { ...updated, growth: await reload() } }
  catch { return { ...updated, growth: null, refreshError: 'La decisión se guardó. Falta actualizar el escenario; vuelve a cargarlo sin repetir la acción.' } }
}

function recommendationState(item, states, today) {
  const week = growthWeekStart(`${today}T12:00:00Z`)
  const postponed = states.find(row => row.kind === item.kind && row.status === 'postponed' && iso(row.due_date) > today)
  const current = postponed || states.find(row => row.kind === item.kind && iso(row.generated_for) === week)
  if (!current) return { ...item, status: 'pending' }
  const status = current.status === 'postponed' && iso(current.due_date) <= today ? 'pending' : current.status
  return { ...item, id: current.id, status, due_date: current.due_date, completed_at: current.completed_at }
}

export function projectPayloadWithRecommendations(payload, recommendations) {
  return projectGrowth({
    currentChildren: payload.population.expectedMonthEndChildren,
    currentPeriod: payload.operational.currentPeriod,
    metrics: payload.metrics,
    pipelineByMonth: payload.operational.pipelineByMonth,
    nextMonthOperational: payload.operational.nextMonthOperational,
    capacityMax: payload.operational.capacityMax,
    monthlySalesTarget: payload.monthlySalesTarget,
    interventions: recommendations,
  })
}

// Pure boundary: the same input and recommendation decisions produce the same
// population, scenarios and cards. Server persistence never invents outcomes.
export function buildGrowthPayload(input, { recommendationStates = [] } = {}) {
  const history = buildGrowthHistory(input)
  const operational = buildOperationalGrowth({
    today: input.today, students: input.students, groups: input.groups,
    events: input.events, salons: input.salons, groupCapacity: input.metas?.cupo_max_grupo,
  })
  const monthlyReincorporations = operational.currentMonthReincorporations ?? Number(input.reincorporations?.find(row => periodOf(row) === operational.currentPeriod)?.total || 0)
  const expected = currentPopulationFromHistory(history, {
    currentPeriod: operational.currentPeriod,
    currentMonthStarts: operational.currentMonthStarts,
    currentMonthWithdrawals: operational.expectedMonthWithdrawals ?? operational.currentMonthWithdrawals,
    currentMonthReincorporations: monthlyReincorporations,
  })
  const chosen = selectCurrentPopulation({
    operationalChildren: operational.expectedMonthEndChildren ?? operational.currentChildren,
    trackedPopulation: operational.expectedMonthEndChildren ?? operational.currentChildren,
    latestSummaryChildren: expected,
  })
  const unknownDailyMovements = (operational.currentMonthWithdrawalsUndated || 0) + (operational.currentMonthReincorporationsUndated || 0)
  const todayBalance = unknownDailyMovements ? null : currentPopulationFromHistory(history, {
    currentPeriod: operational.currentPeriod,
    currentMonthStarts: operational.currentMonthStartsToDate,
    currentMonthWithdrawals: operational.currentMonthWithdrawalsToDate,
    currentMonthReincorporations: operational.currentMonthReincorporationsToDate,
  })
  const rosterExpected = operational.expectedMonthEndChildren ?? operational.currentChildren
  const population = {
    today: input.today,
    todayChildren: unknownDailyMovements ? null : (todayBalance ?? operational.todayChildren),
    operationalTodayChildren: operational.todayChildren,
    expectedMonthEndChildren: chosen.currentChildren,
    operationalMonthEndChildren: rosterExpected,
    difference: chosen.currentChildren - rosterExpected,
    source: chosen.source,
  }
  const issues = [...(operational.issues || [])]
  if (population.difference !== 0) issues.push({
    code: 'population_mismatch', severity: 'error',
    count: Math.abs(population.difference),
    // "en 1 niños" es lo que leía la administradora del centro con una sola
    // ficha descuadrada; el mensaje se lee entero en la alerta de higiene.
    message: `El saldo mensual (${population.expectedMonthEndChildren}) difiere del padrón elegible (${rosterExpected}) en ${Math.abs(population.difference)} ${Math.abs(population.difference) === 1 ? 'niño' : 'niños'}. Revisa grupos y movimientos.`,
  })
  if (unknownDailyMovements) issues.push({
    code: 'undated_current_movements', severity: 'error',
    message: `${unknownDailyMovements} movimientos de este mes no tienen fecha diaria; falta conciliar los activos al día.`,
  })
  const current = new Date(`${operational.currentPeriod}-01T12:00:00Z`)
  current.setUTCMonth(current.getUTCMonth() - 6)
  const startPeriod = current.toISOString().slice(0, 7)
  for (let index = 1; index < history.length; index++) {
    const row = history[index], previous = history[index - 1]
    const previousPeriod = new Date(`${periodOf(previous)}-01T12:00:00Z`)
    previousPeriod.setUTCMonth(previousPeriod.getUTCMonth() + 1)
    if (periodOf(row) < startPeriod || periodOf(row) >= operational.currentPeriod || previousPeriod.toISOString().slice(0, 7) !== periodOf(row)) continue
    if (previous.ninos_final_mes != null && row.ninos_inicio_mes != null && Number(previous.ninos_final_mes) !== Number(row.ninos_inicio_mes)) issues.push({
      code: 'history_continuity', severity: 'error', period: periodOf(row),
      message: `El resumen de ${periodOf(previous)} termina en ${previous.ninos_final_mes} y ${periodOf(row)} empieza en ${row.ninos_inicio_mes}. Revisa la conciliación histórica.`,
    })
  }
  const metrics = buildGrowthMetrics(history, {
    currentPeriod: operational.currentPeriod,
    pipelineTotal: operational.pipelineTotalWithUndated,
    pipelineDated: operational.pipelineDated,
    issues,
  })
  const monthlySalesTarget = input.metas?.meta_nuevos_ingresos_mes == null ? null : Number(input.metas.meta_nuevos_ingresos_mes)
  const benchmarks = { attendance: 0.6, enrollment: Number(input.metas?.cp_conversion ?? 50) / 100 }
  const payload = {
    generatedAt: input.generatedAt || `${input.today}T12:00:00Z`,
    snapshotDate: input.today, engineVersion: GROWTH_ENGINE_VERSION,
    center: input.center, dataSource: chosen.source, populationCoverage: chosen.coverage,
    population, metrics, operational, benchmarks, monthlySalesTarget,
  }
  const baseProjection = projectPayloadWithRecommendations(payload, [])
  const recommendations = buildGrowthRecommendations({ metrics, projection: baseProjection, benchmarks })
    .map(item => recommendationState(item, recommendationStates, input.today))
  return sanitizeGrowthPayload({
    ...payload, recommendations,
    projection: projectPayloadWithRecommendations(payload, recommendations),
  })
}
