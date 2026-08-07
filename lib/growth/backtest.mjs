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

export function evaluateGrowthForecasts({ snapshots = [], actuals = [], minSample = 6 } = {}) {
  const actualByTarget = new Map()
  for (const row of actuals) {
    const actual = finite(row.actual)
    if (actual == null || !row.period || row.centro_id == null) continue
    actualByTarget.set(`${row.centro_id}:${row.period}`, actual)
  }

  const latestForecasts = new Map()
  for (const row of snapshots) {
    const payload = payloadOf(row.payload)
    const firstMonth = payload?.projection?.scenarios?.base?.series?.[0]
    const forecast = finite(firstMonth?.endChildren)
    const baseline = finite(payload?.projection?.currentChildren)
    if (row.centro_id == null || !firstMonth?.period || forecast == null || baseline == null) continue

    const target = `${row.centro_id}:${firstMonth.period}`
    if (!actualByTarget.has(target)) continue
    const candidate = {
      centroId: row.centro_id,
      targetPeriod: firstMonth.period,
      snapshotDate: dateKey(row.snapshot_date),
      forecast,
      baseline,
      actual: actualByTarget.get(target),
    }
    const previous = latestForecasts.get(target)
    if (!previous || candidate.snapshotDate > previous.snapshotDate) latestForecasts.set(target, candidate)
  }

  const observations = [...latestForecasts.values()]
    .sort((a, b) => a.targetPeriod.localeCompare(b.targetPeriod) || String(a.centroId).localeCompare(String(b.centroId)))
    .map((row) => ({
      ...row,
      engineError: row.forecast - row.actual,
      baselineError: row.baseline - row.actual,
    }))

  const sampleSize = observations.length
  if (!sampleSize) {
    return {
      sampleSize: 0,
      engineMae: null,
      baselineMae: null,
      engineBias: null,
      improvementPct: null,
      winRate: null,
      guardrail: 'insufficient_data',
      observations: [],
    }
  }

  const engineMaeRaw = observations.reduce((sum, row) => sum + Math.abs(row.engineError), 0) / sampleSize
  const baselineMaeRaw = observations.reduce((sum, row) => sum + Math.abs(row.baselineError), 0) / sampleSize
  const engineBiasRaw = observations.reduce((sum, row) => sum + row.engineError, 0) / sampleSize
  const wins = observations.filter((row) => Math.abs(row.engineError) < Math.abs(row.baselineError)).length
  const improvementRaw = baselineMaeRaw > 0
    ? ((baselineMaeRaw - engineMaeRaw) / baselineMaeRaw) * 100
    : null

  let guardrail = 'insufficient_data'
  if (sampleSize >= minSample) {
    guardrail = baselineMaeRaw > 0 && engineMaeRaw <= baselineMaeRaw * 0.95
      ? 'candidate'
      : 'hold'
  }

  return {
    sampleSize,
    engineMae: round(engineMaeRaw),
    baselineMae: round(baselineMaeRaw),
    engineBias: round(engineBiasRaw),
    improvementPct: round(improvementRaw),
    winRate: round((wins / sampleSize) * 100),
    guardrail,
    observations,
  }
}
