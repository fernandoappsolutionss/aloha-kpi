export function facturasConciliadasCentro(informe, centroId, total) {
  if (!informe?.guardado || !informe.completo || informe.porCentro?.[centroId] == null) return null
  const facturas = (informe.organizaciones || []).flatMap(org => org.facturas || [])
    .filter(f => f.estado === 'incluida' && Number(f.centroId) === Number(centroId))
  const unicas = new Set(facturas.map(f => `${f.orgId}:${f.facturaId}`))
  return facturas.length === informe.porCentro[centroId] && facturas.length === total && unicas.size === total
    ? facturas : null
}

// Sumar los centavos de cada saldo mostrado evita residuos de coma flotante.
// Una moneda o saldo ausente invalida el total: no equivale a deuda cero.
export function sumarSaldosVencidos(facturas) {
  if (!Array.isArray(facturas)) return null
  const centavos = new Map()
  for (const factura of facturas) {
    const moneda = typeof factura.moneda === 'string' ? factura.moneda.trim().toUpperCase() : ''
    if (!moneda || !Number.isFinite(factura.saldo) || factura.saldo <= 0) return null
    const saldo = Math.round((factura.saldo + Number.EPSILON) * 100)
    const acumulado = (centavos.get(moneda) || 0) + saldo
    if (!Number.isSafeInteger(saldo) || !Number.isSafeInteger(acumulado)) return null
    centavos.set(moneda, acumulado)
  }
  return [...centavos].sort(([a], [b]) => a.localeCompare(b)).map(([moneda, valor]) => ({ moneda, saldo: valor / 100 }))
}
