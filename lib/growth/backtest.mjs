const finite = (value) => {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const dateKey = (value) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value || '').slice(0, 10)
}

const payloadOf = (value) => {
  if (!value) return null
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return null }
  }
  return value
}

const round = (value, digits = 1) => {
  if (!Number.isFinite(value)) return null
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

const monthIndex = (period) => {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(period || ''))
  return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : null
}

function summarize(observations, minSample) {
  const sampleSize = observations.length
  if (!sampleSize) return { sampleSize: 0, engineMae: null, baselineMae: null, engineBias: null,
    improvementPct: null, winRate: null, guardrail: 'insufficient_data', observations: [] }
  const engineMaeRaw = observations.reduce((sum, row) => sum + Math.abs(row.engineError), 0) / sampleSize
  const baselineMaeRaw = observations.reduce((sum, row) => sum + Math.abs(row.baselineError), 0) / sampleSize
  const engineBiasRaw = observations.reduce((sum, row) => sum + row.engineError, 0) / sampleSize
  const wins = observations.filter((row) => Math.abs(row.engineError) < Math.abs(row.baselineError)).length
  const improvementRaw = baselineMaeRaw > 0 ? ((baselineMaeRaw - engineMaeRaw) / baselineMaeRaw) * 100 : null
  return { sampleSize, engineMae: round(engineMaeRaw), baselineMae: round(baselineMaeRaw),
    engineBias: round(engineBiasRaw), improvementPct: round(improvementRaw), winRate: round(wins / sampleSize * 100),
    guardrail: sampleSize < minSample ? 'insufficient_data' : baselineMaeRaw > 0 && engineMaeRaw <= baselineMaeRaw * 0.95 ? 'candidate' : 'hold', observations }
}

// Each scenario/horizon has its own sample. A forecast recorded in the target
// month (or later) cannot validate a prior prediction. Callers can request an
// engineVersion to avoid attributing an older engine's accuracy to a new model.
export function evaluateGrowthForecasts({ snapshots = [], actuals = [], minSample = 6, engineVersion = null } = {}) {
  const actualByTarget = new Map()
  for (const row of actuals) {
    const actual = finite(row.actual)
    if (actual == null || actual < 0 || monthIndex(row.period) == null || row.centro_id == null) continue
    actualByTarget.set(`${row.centro_id}:${row.period}`, actual)
  }
  const latest = new Map()
  for (const row of snapshots) {
    const payload = payloadOf(row.payload)
    if (engineVersion != null && payload?.engineVersion !== engineVersion) continue
    const baseline = finite(payload?.projection?.currentChildren)
    const snapshotDate = dateKey(row.snapshot_date)
    const origin = monthIndex(snapshotDate.slice(0, 7))
    const generatedPeriod = payload?.generatedAt ? monthIndex(dateKey(payload.generatedAt).slice(0, 7)) : origin
    if (row.centro_id == null || baseline == null || origin == null || !/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate)) continue
    for (const [scenario, value] of Object.entries(payload?.projection?.scenarios || {})) {
      if (!['base', 'conservative', 'action'].includes(scenario)) continue
      for (const forecastRow of value?.series || []) {
        const targetIndex = monthIndex(forecastRow?.period)
        const forecast = finite(forecastRow?.endChildren)
        if (targetIndex == null || targetIndex <= origin || generatedPeriod == null || targetIndex <= generatedPeriod || forecast == null || forecast < 0) continue
        const horizon = targetIndex - origin
        const target = `${row.centro_id}:${forecastRow.period}`
        if (!actualByTarget.has(target)) continue
        const key = `${scenario}:${horizon}:${target}`
        const candidate = { centroId: row.centro_id, targetPeriod: forecastRow.period, snapshotDate,
          forecast, baseline, actual: actualByTarget.get(target), scenario, horizon,
          engineVersion: payload?.engineVersion || null }
        const previous = latest.get(key)
        if (!previous || snapshotDate > previous.snapshotDate) latest.set(key, candidate)
      }
    }
  }
  const observations = [...latest.values()]
    .sort((a, b) => a.targetPeriod.localeCompare(b.targetPeriod) || String(a.centroId).localeCompare(String(b.centroId)))
    .map((row) => ({ ...row, engineError: row.forecast - row.actual, baselineError: row.baseline - row.actual }))
  const byScenario = {}
  for (const scenario of ['base', 'conservative', 'action']) {
    const horizons = [...new Set(observations.filter((row) => row.scenario === scenario).map((row) => row.horizon))].sort((a, b) => a - b)
    byScenario[scenario] = Object.fromEntries(horizons.map((horizon) => [horizon, summarize(observations.filter((row) => row.scenario === scenario && row.horizon === horizon), minSample)]))
  }
  return { ...summarize(observations.filter((row) => row.scenario === 'base' && row.horizon === 1), minSample), byScenario, engineVersion }
}
