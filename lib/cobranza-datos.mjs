// Los ceros antiguos se guardaban también para casillas vacías. Sin
// procedencia no pueden certificar una semana sin deuda; se conserva el
// original en DB y se presenta como desconocido hasta una nueva captura.
export function valoresCobranza(fila = {}) {
  return Array.from({ length: 5 }, (_, i) => {
    const v = fila[`cob_d${i + 1}`]
    if (v == null || v === '' || (fila.cob_nullable === false && Number(v) === 0)) return null
    const n = Number(v)
    return Number.isInteger(n) && n >= 0 ? n : null
  })
}

export function normalizarCobranza(fila) {
  return { ...fila, ...Object.fromEntries(valoresCobranza(fila).map((v, i) => [`cob_d${i + 1}`, v])) }
}
