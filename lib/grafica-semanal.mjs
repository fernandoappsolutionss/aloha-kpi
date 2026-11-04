import { escalaSugerida, escalaValida, numeroGrafica } from './escala-grafica.mjs'

export const COLOR_MEJORA = '#385AE2'
export const COLOR_EMPEORA = '#C8423B'
export const COLOR_IGUAL = '#64748B'
const MARGEN = { arriba: 34, derecha: 32, abajo: 48, izquierda: 56 }

export function modeloGrafica({ puntos = [], inversa = false, escala, incluirCuotas = false, ancho = 820, alto = 360, margen = MARGEN } = {}) {
  const limpios = puntos.map(p => ({ ...p, valor: numeroGrafica(p.valor), cuota: numeroGrafica(p.cuota) }))
  const base = limpios.map(p => ({ valor: p.valor, cuota: incluirCuotas ? p.cuota : null }))
  const sugerida = escalaSugerida(base)
  const elegida = escalaValida(escala) ? { min: Number(escala.min), max: Number(escala.max) } : sugerida
  const numeros = base.flatMap(p => [p.valor, p.cuota]).filter(v => v != null)
  const w = ancho - margen.izquierda - margen.derecha
  const h = alto - margen.arriba - margen.abajo
  if (!limpios.some(p => p.valor != null)) return { ancho, alto, margen, min: 0, max: 1, sugerida, vacia: true, ticks: [], tramos: [], puntos: limpios.map(pt => ({ ...pt, x: null, y: null, yCuota: null })) }
  // Una escala elegida se conserva mientras quepan los datos. Jamás recortar
  // un resultado real; las cuotas sólo amplían el eje si se pide mostrarlas.
  const min = Math.min(elegida.min, ...numeros)
  const max = Math.max(elegida.max, ...numeros)
  const y = (v) => inversa
    ? margen.arriba + ((v - min) / (max - min)) * h
    : margen.arriba + ((max - v) / (max - min)) * h
  const x = (i) => margen.izquierda + (puntos.length === 1 ? w / 2 : i * w / (puntos.length - 1))
  const out = limpios.map((pt, i) => ({ ...pt, x: x(i), y: pt.valor == null ? null : y(pt.valor), yCuota: !incluirCuotas || pt.cuota == null ? null : y(pt.cuota) }))
  const tramos = []
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1]; const b = out[i]
    if (a.valor == null || b.valor == null) continue
    const diff = b.valor - a.valor
    const sentido = diff === 0 ? 'igual' : (inversa ? -diff : diff) > 0 ? 'mejora' : 'empeora'
    const provisional = Boolean(a.abierto || b.abierto)
    tramos.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, sentido, provisional,
      color: provisional || sentido === 'igual' ? COLOR_IGUAL : sentido === 'mejora' ? COLOR_MEJORA : COLOR_EMPEORA })
  }
  const rough = Math.max(1, (max - min) / 6)
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].find(n => n * magnitude >= rough) * magnitude
  const ticks = []
  for (let valor = Math.ceil(min / step) * step; valor <= max; valor += step) ticks.push({ valor, y: y(valor) })
  return { ancho, alto, margen, min, max, sugerida, expandida: min !== elegida.min || max !== elegida.max, vacia: false, ticks, tramos, puntos: out }
}
