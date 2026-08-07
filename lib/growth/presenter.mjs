import { CENTER_LEVELS } from './constants.mjs'

const MONTHS_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const parsePeriod = (period) => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(period || ''))
  if (!match) return null
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return { year: Number(match[1]), month }
}

export function formatGrowthPeriod(period, short = false) {
  const parsed = parsePeriod(period)
  if (!parsed) return 'Sin fecha'
  const months = short ? MONTHS_SHORT : MONTHS_FULL
  return `${months[parsed.month - 1]} ${parsed.year}`
}

export function growthStageProgress({ currentChildren, currentLevel, nextLevel }) {
  if (!nextLevel) return 100
  const current = Math.max(0, Number(currentChildren) || 0)
  const lower = CENTER_LEVELS.find((level) => level.level === Number(currentLevel))?.threshold || 0
  const span = Math.max(1, Number(nextLevel.threshold) - lower)
  return Math.max(0, Math.min(100, Math.round(((current - lower) / span) * 100)))
}

export function confidenceMeta(level) {
  if (level === 'high') return { label: 'Confianza alta', tone: 'ok' }
  if (level === 'medium') return { label: 'Confianza media', tone: 'warn' }
  return { label: 'Confianza baja', tone: 'bad' }
}

export function scenarioChartRows(projection) {
  const scenarios = projection?.scenarios || {}
  const maps = Object.fromEntries(
    ['conservative', 'base', 'action'].map((key) => [
      key,
      new Map((scenarios[key]?.series || []).map((row) => [row.period, row.endChildren])),
    ]),
  )
  const periods = [...new Set(
    Object.values(maps).flatMap((map) => [...map.keys()]),
  )].sort()

  return periods.map((period) => ({
    period,
    label: formatGrowthPeriod(period, true),
    conservative: maps.conservative.get(period) ?? null,
    base: maps.base.get(period) ?? null,
    action: maps.action.get(period) ?? null,
    target: projection?.nextLevel?.threshold ?? null,
  }))
}
