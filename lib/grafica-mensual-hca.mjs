import { COLOR_MEJORA, COLOR_EMPEORA } from './grafica-semanal.mjs'

const numero = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)
const mesKey = row => Number(row.year) * 12 + Number(row.month) - 1
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function puntosMensuales(rows, campo, meta) {
  if (!rows.length) return []
  const ordered = [...rows].sort((a, b) => mesKey(a) - mesKey(b))
  const map = new Map(ordered.map(row => [mesKey(row), row]))
  const puntos = []
  for (let key = mesKey(ordered[0]); key <= mesKey(ordered.at(-1)); key++) {
    const row = map.get(key), year = Math.floor(key / 12), month = key % 12 + 1
    puntos.push({ periodo: `${year}-${String(month).padStart(2, '0')}`, mes: MESES[month - 1], year,
      valor: numero(row?.[campo]), cuota: row ? numero(typeof meta === 'string' ? row[meta] : meta) : null,
      abierto: Boolean(row && row.estado !== 'cerrado') })
  }
  return puntos
}

export function escalaSugerida(puntos) {
  const values = puntos.flatMap(p => [numero(p.valor), numero(p.cuota)]).filter(v => v != null)
  if (!values.length) return { min: 0, max: 1 }
  const low = Math.min(...values), high = Math.max(...values)
  const pad = high === low ? Math.max(Math.abs(high) * .1, 1) : (high - low) * .1
  const rough = (high - low + 2 * pad) / 5
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].find(n => n * magnitude >= rough) * magnitude
  return { min: Number((low >= 0 ? Math.max(0, Math.floor((low - pad) / step) * step) : Math.floor((low - pad) / step) * step).toPrecision(12)),
    max: Number((Math.ceil((high + pad) / step) * step).toPrecision(12)) }
}

export function escalaValida(escala) {
  return numero(escala?.min) != null && numero(escala?.max) != null && Number(escala.max) > Number(escala.min)
}

export function modeloMensual({ puntos = [], escala, inversa = false, ancho = 660, alto = 280 }) {
  const sugerida = escalaSugerida(puntos)
  const elegida = escalaValida(escala) ? { min: Number(escala.min), max: Number(escala.max) } : sugerida
  const values = puntos.flatMap(p => [numero(p.valor), numero(p.cuota)]).filter(v => v != null)
  // Nunca recortar un dato/meta para que quepa en una escala elegida.
  const min = Math.min(elegida.min, ...values), max = Math.max(elegida.max, ...values)
  const expandida = min !== elegida.min || max !== elegida.max
  const margen = { izquierda: 64, derecha: 24, arriba: 18, abajo: 40 }
  const w = ancho - margen.izquierda - margen.derecha, h = alto - margen.arriba - margen.abajo
  const y = value => margen.arriba + (inversa ? (value - min) : (max - value)) / (max - min) * h
  const puntosXY = puntos.map((p, i) => ({ ...p, x: margen.izquierda + (puntos.length === 1 ? w / 2 : i * w / (puntos.length - 1)),
    y: numero(p.valor) == null ? null : y(Number(p.valor)), yCuota: numero(p.cuota) == null ? null : y(Number(p.cuota)) }))
  const tramos = []
  for (let i = 1; i < puntosXY.length; i++) {
    const a = puntosXY[i - 1], b = puntosXY[i]
    if (a.y == null || b.y == null) continue
    const provisional = a.abierto || b.abierto, diff = b.valor - a.valor
    const sentido = diff === 0 ? 'igual' : ((inversa ? -diff : diff) > 0 ? 'mejora' : 'empeora')
    tramos.push({ a, b, provisional, sentido, color: provisional || sentido === 'igual' ? 'var(--text-muted)' : sentido === 'mejora' ? COLOR_MEJORA : COLOR_EMPEORA })
  }
  return { ancho, alto, margen, min, max, expandida, puntos: puntosXY, tramos,
    ticks: Array.from({ length: 11 }, (_, i) => ({ valor: min + (max - min) * i / 10, y: y(min + (max - min) * i / 10), major: i % 2 === 0 })) }
}
