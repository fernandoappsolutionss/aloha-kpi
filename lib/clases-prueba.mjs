// Un mismo periodo y los mismos totales CRM para Clases de Prueba y KPI.
export function mesClase(value, timeZone = 'America/Panama') {
  if (!value) throw new Error('La clase de prueba no tiene una fecha válida.')
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('La clase de prueba no tiene una fecha válida.')
  const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(date)
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}`
}

export function mesAnterior(mes) {
  const [year, month] = mes.split('-').map(Number)
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`
}

export function filtrarClasesPorMes(events, mes, timeZone = 'America/Panama') {
  return events.filter(event => mes === 'todos' || mesClase(event.start_date, event.timezone || timeZone) === mes)
}

// El KPI mide clases que ya comenzaron. Borradores y clases canceladas
// quedan disponibles en la agenda, pero no aportan al resultado realizado.
export function filtrarClasesPorMomento(events, momento, now = new Date()) {
  if (momento === 'todas') return events
  const corte = new Date(now).getTime()
  if (!Number.isFinite(corte)) throw new Error('No se pudo determinar la fecha de corte.')
  return events.filter(event => {
    const inicio = new Date(event.start_date).getTime()
    if (!event.start_date || !Number.isFinite(inicio)) throw new Error('La clase de prueba no tiene una fecha válida.')
    if (!['published', 'completed'].includes(event.status)) return false
    return momento === 'realizadas' ? inicio <= corte : inicio > corte
  })
}

export function resumirClases(events = []) {
  const result = { total: 0, attended: 0, not_attended: 0, pending: 0, paid: 0, won: 0, revenue: 0 }
  for (const event of events) {
    const stats = event.stats
    const counts = ['total', 'attended', 'not_attended', 'pending', 'paid', 'won']
    if (!stats || counts.some(key => !Number.isSafeInteger(stats[key]) || stats[key] < 0)
      || stats.attended + stats.not_attended + stats.pending !== stats.total
      || stats.paid > stats.total || stats.won > stats.total || !Number.isFinite(stats.total_revenue) || stats.total_revenue < 0) {
      throw new Error('No se pudieron verificar los totales de Clases de Prueba. Recarga para sincronizar con el CRM.')
    }
    for (const key of counts) result[key] += stats[key]
    result.revenue += stats.total_revenue
  }
  return result
}
