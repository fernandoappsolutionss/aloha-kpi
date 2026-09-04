const PANAMA_TIME_ZONE = 'America/Panama'
const DAY_MS = 24 * 60 * 60 * 1000

const panamaDate = (value) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('Fecha no valida')

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PANAMA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function growthWeekStart(value = new Date()) {
  const localDate = panamaDate(value)
  const cursor = new Date(`${localDate}T12:00:00.000Z`)
  const daysSinceMonday = (cursor.getUTCDay() + 6) % 7
  cursor.setUTCDate(cursor.getUTCDate() - daysSinceMonday)
  return cursor.toISOString().slice(0, 10)
}

export function briefingEligibility({ receipt, now = new Date() }) {
  if (!receipt) return { shouldShow: true, reason: 'first_visit' }
  if (receipt.acknowledgedAt) return { shouldShow: false, reason: 'acknowledged' }

  if (receipt.snoozedUntil) {
    const currentTime = new Date(now).getTime()
    const reminderTime = new Date(receipt.snoozedUntil).getTime()
    if (currentTime < reminderTime) return { shouldShow: false, reason: 'snoozed' }
    return { shouldShow: true, reason: 'reminder' }
  }

  if (receipt.shownAt) return { shouldShow: false, reason: 'already_shown' }
  return { shouldShow: true, reason: 'first_visit' }
}

export function snoozeUntilTomorrow(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('Fecha no valida')
  return new Date(date.getTime() + DAY_MS).toISOString()
}

export function recommendationStatusFor(action) {
  const transitions = {
    complete: 'completed',
    dismiss: 'dismissed',
    postpone: 'postponed',
  }
  if (!transitions[action]) throw new Error('Accion no valida')
  return transitions[action]
}

// Una tarea terminada no es una medición: su objetivo sigue siendo una
// hipótesis del plan, mientras que descartarla o posponerla la excluye.
export function planInterventions(recommendations = []) {
  return recommendations.filter((item) => item && (
    item.status == null || item.status === 'pending' || item.status === 'completed'
  ))
}

export function nextPendingRecommendation(recommendations = []) {
  return recommendations.find((item) => item && (
    item.status == null || item.status === 'pending'
  )) || null
}

// Las fechas de vencimiento son días de calendario, no instantes. Una lectura
// posterior no debe mover una fecha ya asignada ni reiniciar una tarea vencida.
export function dueDateForRecommendation({ createdOn, dueDays, existingDueDate = null }) {
  const asDate = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
  if (existingDueDate != null) return asDate(existingDueDate)
  const date = new Date(`${asDate(createdOn)}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) throw new Error('Fecha de alta no valida')
  const days = Number(dueDays)
  if (!Number.isInteger(days) || days < 0) throw new Error('Plazo no valido')
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
