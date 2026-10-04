export const COLOR_MEJORA = '#385AE2'
export const COLOR_EMPEORA = '#C8423B'
const MARGEN = { arriba: 16, derecha: 16, abajo: 28, izquierda: 44 }

export function modeloGrafica({ puntos = [], inversa = false, ancho = 640, alto = 220, margen = MARGEN } = {}) {
  const numeros = puntos.flatMap((pt) => [pt.valor, pt.cuota].filter((v) => v != null).map(Number))
  const w = ancho - margen.izquierda - margen.derecha
  const h = alto - margen.arriba - margen.abajo
  if (!numeros.length) return { ancho, alto, min: 0, max: 1, vacia: true, ticks: [], tramos: [], puntos: puntos.map((pt) => ({ ...pt, x: null, y: null, yCuota: null })) }
  const minDato = Math.min(...numeros)
  const maxDato = Math.max(...numeros)
  const rango = maxDato - minDato
  const pad = rango === 0 ? 1 : Math.max(rango * 0.1, 1)
  const min = minDato >= 0 ? Math.max(0, minDato - pad) : minDato - pad
  const max = maxDato + pad
  const y = (v) => inversa
    ? margen.arriba + ((v - min) / (max - min)) * h
    : margen.arriba + ((max - v) / (max - min)) * h
  const x = (i) => margen.izquierda + (puntos.length === 1 ? w / 2 : i * w / (puntos.length - 1))
  const out = puntos.map((pt, i) => ({ ...pt, x: x(i), y: pt.valor == null ? null : y(Number(pt.valor)), yCuota: pt.cuota == null ? null : y(Number(pt.cuota)) }))
  const tramos = []
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1]; const b = out[i]
    if (a.valor == null || b.valor == null) continue
    const mejora = inversa ? Number(b.valor) <= Number(a.valor) : Number(b.valor) >= Number(a.valor)
    tramos.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, color: mejora ? COLOR_MEJORA : COLOR_EMPEORA })
  }
  const ticks = [0, 1, 2, 3].map((k) => { const valor = min + (max - min) * k / 3; return { valor: Math.round(valor), y: y(valor) } })
  return { ancho, alto, min, max, vacia: false, ticks, tramos, puntos: out }
}
