// Bucket de día hábil CIVIL exacto (R4, g1-18) — cálculo puro, sin BD.
//
// Una venta cae en la celda S{semana}/D{día} del KPI semanal según su ordinal
// hábil dentro del mes. Reglas del spec, sin feriados:
//   - Lunes a viernes → ordinal hábil n (n-ésimo día hábil del mes).
//   - Sábado/domingo POSTERIOR al primer hábil → retrocede al viernes previo.
//   - Mes que empieza en fin de semana → esas ventas AVANZAN al primer lunes.
//   - semana = 1 + floor((n-1)/5) · dia = 1 + ((n-1)%5).
//
// El weekday se calcula con Date.UTC/getUTCDay sobre la fecha CIVIL: la zona
// horaria del runtime no participa (la fecha ya viene resuelta como día civil
// de Panamá por quien llama).
//
// Validación ESTRICTA: 'AAAA-MM-DD' real (no existe 2026-02-30) y coincidente
// con el year/month del periodo. Cualquier dato inválido ⇒ null — el KPI cae a
// fallback manual explícito (g1-17); aquí NUNCA se clampa ni se adivina.

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/

// 0=domingo … 6=sábado, siempre en UTC sobre la fecha civil.
const weekdayUtc = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay()

const esFinDeSemana = (y, m, d) => {
  const w = weekdayUtc(y, m, d)
  return w === 0 || w === 6
}

const iso = (y, m, d) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

// → { fecha, ordinal, semana, dia } | null
//   fecha:   día hábil EFECTIVO al que quedó asignada la venta (iso10).
//   ordinal: n-ésimo día hábil del mes (base 1).
export function bucketDiaHabil(fecha, year, month) {
  if (typeof fecha !== 'string' || !RE_FECHA.test(fecha)) return null
  const [y, m, d] = fecha.split('-').map(Number)
  if (y !== Number(year) || m !== Number(month)) return null
  // Fecha civil REAL: el roundtrip por Date.UTC delata 2026-02-30 o mes 13.
  const civil = new Date(Date.UTC(y, m - 1, d))
  if (civil.getUTCFullYear() !== y || civil.getUTCMonth() + 1 !== m || civil.getUTCDate() !== d) return null

  // Primer día hábil del mes (a lo sumo el día 3: un fin de semana dura 2 días).
  let primerHabil = 1
  while (esFinDeSemana(y, m, primerHabil)) primerHabil++

  const w = civil.getUTCDay()
  let diaEfectivo
  if (w >= 1 && w <= 5) {
    diaEfectivo = d
  } else if (d < primerHabil) {
    // Mes que empieza en fin de semana: esas ventas avanzan al primer lunes.
    diaEfectivo = primerHabil
  } else {
    // Fin de semana posterior al primer hábil: retrocede al viernes previo
    // (sábado −1, domingo −2), que siempre existe dentro del mismo mes.
    diaEfectivo = d - (w === 6 ? 1 : 2)
  }

  let ordinal = 0
  for (let dd = 1; dd <= diaEfectivo; dd++) {
    if (!esFinDeSemana(y, m, dd)) ordinal++
  }

  return {
    fecha: iso(y, m, diaEfectivo),
    ordinal,
    semana: 1 + Math.floor((ordinal - 1) / 5),
    dia: 1 + ((ordinal - 1) % 5),
  }
}
