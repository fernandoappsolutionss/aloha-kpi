import { facturasConciliadasCentro, sumarSaldosVencidos } from './cobranza-saldos.mjs'

// La fecha y el instante identifican la misma conciliación que produjo el
// número del panel, incluso si otra sincronización sustituye el conteo diario.
export async function leerDetalleCobranza({ centroId, fecha, registradoAt, total } = {}, { autorizar, query }) {
  const id = Number(centroId)
  if (!Number.isSafeInteger(id) || id <= 0) return { error: 'Centro inválido.' }
  await autorizar(id)
  const instante = registradoAt instanceof Date && Number.isFinite(registradoAt.getTime()) ? registradoAt.toISOString() : registradoAt
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
    || !Number.isFinite(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha
    || typeof instante !== 'string' || !/T.*(?:Z|[+-]\d\d:\d\d)$/.test(instante)
    || !Number.isFinite(Date.parse(instante))) {
    return { error: 'Este conteo no tiene un detalle conciliado disponible. Actualiza el conteo desde Conexión Zoho.' }
  }
  const [fila] = await query`SELECT informe FROM cobranza_conciliaciones
    WHERE guardado = true AND fecha = ${fecha}::date AND terminado_at = ${instante}::timestamptz
    ORDER BY id DESC LIMIT 1`
  const informe = fila?.informe
  if (!informe?.guardado || !informe.completo || informe.porCentro?.[id] == null)
    return { error: 'No hay un detalle conciliado para este conteo. Actualiza el panel e inténtalo de nuevo.' }
  const facturas = facturasConciliadasCentro(informe, id, total)
  if (!facturas)
    return { error: 'El detalle no coincide con el conteo. Actualiza el panel antes de revisarlo.' }
  // Los informes anteriores a esta función no guardaban cliente ni moneda.
  // No consultar Zoho aquí: mezclaría saldos actuales con un conteo anterior.
  if (facturas.some(f => !f.cliente || !f.moneda || !f.numero || !f.vencimiento || !Number.isFinite(f.saldo) || f.saldo <= 0))
    return { error: 'Este conteo todavía no incluye el detalle de clientes. Actualiza el conteo desde Conexión Zoho.' }
  return { fecha, registradoAt: instante, total: facturas.length, saldos: sumarSaldosVencidos(facturas), facturas: facturas
    .map(f => ({ id: `${f.orgId}:${f.facturaId}`, cliente: f.cliente, numero: f.numero,
      saldo: f.saldo, moneda: f.moneda, vencimiento: f.vencimiento }))
    .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento) || a.numero.localeCompare(b.numero)) }
}
