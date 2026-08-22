// Construcción del cuerpo que se manda a POST /banktransactions de Zoho Books.
// Se mantiene puro y aparte del cliente HTTP para poder probarlo sin red.
//
// Convención de Zoho: `from_account_id` es de dónde sale el dinero y
// `to_account_id` a dónde entra. Para una cuenta bancaria del extracto:
//   entrada (depósito)  → from = cuenta contable de ingreso, to = banco
//   salida  (gasto)     → from = banco,                      to = cuenta de gasto
// Invertir esto registra el asiento al revés, así que va probado.

export function payloadBancario(movimiento, cuentaBancariaId) {
  const banco = String(cuentaBancariaId || '').trim()
  const contable = String(movimiento?.zoho_account_id || '').trim()
  if (!banco) throw new Error('Falta la cuenta bancaria de Zoho.')
  if (!contable) throw new Error('El movimiento no tiene cuenta contable asignada.')
  const monto = Math.round(Math.abs(Number(movimiento.monto) || 0) * 100) / 100
  if (!(monto > 0)) throw new Error('El movimiento no tiene monto.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(movimiento.fecha || ''))) throw new Error('El movimiento no tiene fecha válida.')

  const entrada = movimiento.direccion === 'entrada'
  const tipo = movimiento.transaction_type || (entrada ? 'deposit' : 'expense')

  return {
    transaction_type: tipo,
    date: movimiento.fecha,
    amount: monto,
    from_account_id: entrada ? contable : banco,
    to_account_id: entrada ? banco : contable,
    reference_number: String(movimiento.referencia || '').slice(0, 100),
    description: String(movimiento.descripcion || '').slice(0, 500),
  }
}
