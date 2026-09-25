// Fechas como strings ISO (YYYY-MM-DD) en UTC puro: sin horas ni zonas que corran el día.
const pad = (n) => String(n).padStart(2, '0')
const ultimoDia = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate() // m = 1..12

export function sumarDias(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// Días calendario de `desde` a `hasta` (negativo si `hasta` es anterior).
export function diasEntre(desde, hasta) {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000)
}

export function lunesDe(iso) {
  const dow = (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7 // lunes = 0
  return sumarDias(iso, -dow)
}

// La ventana se calcula desde hoy: al pasar el mes, la semana 13 ya es del mes
// siguiente sin cron ni botón.
export function ventana13(hoy) {
  const lunes = lunesDe(hoy)
  return Array.from({ length: 13 }, (_, i) => sumarDias(lunes, 7 * i))
}

export function hoyPanama(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

// Fechas de pago de un compromiso dentro de [desde, hasta] (ambos incluidos).
export function fechasDelCompromiso(c, desde, hasta) {
  if (c.activo === false) return []
  const lo = c.desde && c.desde > desde ? c.desde : desde
  const hi = c.hasta && c.hasta < hasta ? c.hasta : hasta
  if (lo > hi) return []
  if (c.frecuencia === 'unico') return c.fecha >= lo && c.fecha <= hi ? [c.fecha] : []
  const out = []
  let [y, m] = lo.split('-').map(Number)
  const [yh, mh] = hi.split('-').map(Number)
  while (y < yh || (y === yh && m <= mh)) {
    const ud = ultimoDia(y, m)
    let dias = []
    if (c.frecuencia === 'mensual') dias = [Math.min(Number(c.dia), ud)]
    else if (c.frecuencia === 'quincenal') dias = [15, ud]
    else if (c.frecuencia === 'anual' && Number(c.fecha.slice(5, 7)) === m) dias = [Math.min(Number(c.fecha.slice(8, 10)), ud)]
    for (const d of dias) {
      const f = `${y}-${pad(m)}-${pad(d)}`
      if (f >= lo && f <= hi) out.push(f)
    }
    m += 1
    if (m > 12) { m = 1; y += 1 }
  }
  return out
}
