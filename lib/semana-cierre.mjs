// Semana civil viernes..jueves; las operaciones de fecha no usan la zona del servidor.
const DIA_MS = 86_400_000
const ISO = /^\d{4}-\d{2}-\d{2}$/

function ms(iso) {
  if (!ISO.test(iso || '')) throw new Error(`Fecha inválida: ${iso}`)
  const [y, m, d] = iso.split('-').map(Number)
  const value = Date.UTC(y, m - 1, d)
  if (new Date(value).toISOString().slice(0, 10) !== iso) throw new Error(`Fecha inválida: ${iso}`)
  return value
}

const iso = (value) => new Date(value).toISOString().slice(0, 10)

export function sumarDias(fecha, dias) { return iso(ms(fecha) + dias * DIA_MS) }

export function juevesDeCierre(fecha) {
  const value = ms(fecha)
  return iso(value + ((4 - new Date(value).getUTCDay() + 7) % 7) * DIA_MS)
}

export function rangoSemana(semanaFin) {
  if (juevesDeCierre(semanaFin) !== semanaFin) throw new Error(`${semanaFin} no es jueves de cierre`)
  return { desde: sumarDias(semanaFin, -6), hasta: semanaFin }
}

export function ultimasSemanas(semanaFin, n = 12) {
  rangoSemana(semanaFin)
  return Array.from({ length: n }, (_, i) => sumarDias(semanaFin, -7 * (n - i - 1)))
}

export function diaDeSemana(fecha) { return 7 - (ms(juevesDeCierre(fecha)) - ms(fecha)) / DIA_MS }

export function fechaCivil(now = new Date(), timeZone = 'America/Panama') {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now))
  const get = (type) => parts.find((part) => part.type === type).value
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function semanaAbierta(now = new Date(), timeZone = 'America/Panama') {
  return juevesDeCierre(fechaCivil(now, timeZone))
}

export function plazoCondicionVencido(semanaFin, now = new Date(), timeZone = 'America/Panama') {
  const viernes = sumarDias(semanaFin, 1)
  const hoy = fechaCivil(now, timeZone)
  if (hoy !== viernes) return hoy > viernes
  const hora = Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(new Date(now)))
  return hora >= 10
}

export function mesesDeSemana(semanaFin) {
  const { desde, hasta } = rangoSemana(semanaFin)
  const meses = [desde, hasta].map((fecha) => ({ year: Number(fecha.slice(0, 4)), month: Number(fecha.slice(5, 7)) }))
  return meses[0].year === meses[1].year && meses[0].month === meses[1].month ? meses.slice(0, 1) : meses
}

export function zonaHorariaCentro(centro = {}) {
  return String(centro?.pais || '').toUpperCase() === 'VE' ? 'America/Caracas' : 'America/Panama'
}
