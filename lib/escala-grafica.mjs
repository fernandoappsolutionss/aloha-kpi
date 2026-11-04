export const numeroGrafica = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)

// Sugerencia a partir de datos, no una previsión del máximo probable.
export function escalaSugerida(puntos) {
  const values = puntos.flatMap(p => [numeroGrafica(p.valor), numeroGrafica(p.cuota)]).filter(v => v != null)
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
  return numeroGrafica(escala?.min) != null && numeroGrafica(escala?.max) != null && Number(escala.max) > Number(escala.min)
}
