// Conciliación: cruza las líneas del extracto contra lo que YA existe en la
// cuenta de Zoho para no volver a registrar lo mismo.
//
// Dos fuentes de "ya está":
//   1. Huellas de cargas anteriores del propio KPI (duplicado).
//   2. Transacciones que Zoho ya tiene en esa cuenta y ese rango de fechas,
//      vengan de donde vengan — el feed del banco, una factura cobrada o un
//      gasto que la administradora cargó a mano (ya_en_zoho).
//
// El emparejamiento con Zoho es 1 a 1 y con tolerancia de días: el banco
// fecha el movimiento el día que compensa y Zoho lo tiene con la fecha del
// documento. Cada transacción de Zoho se consume una sola vez, así dos pagos
// idénticos del mismo día no se "concilian" ambos contra un único asiento.

const DIA_MS = 86400000

// Tipos de Zoho que mueven dinero HACIA la cuenta bancaria y desde ella.
const ENTRADA_ZOHO = new Set(['deposit', 'sales_without_invoices', 'owner_contribution', 'customer_advance', 'interest_income', 'other_income', 'transfer_fund_in'])
const SALIDA_ZOHO = new Set(['expense', 'card_payment', 'owner_drawings', 'vendor_advance', 'transfer_fund_out'])

export function direccionZoho(txn) {
  const tipo = String(txn?.transaction_type || '').toLowerCase()
  if (ENTRADA_ZOHO.has(tipo)) return 'entrada'
  if (SALIDA_ZOHO.has(tipo)) return 'salida'
  const dc = String(txn?.debit_or_credit || '').toLowerCase()
  // En el extracto de una cuenta, el banco ACREDITA lo que entra.
  if (dc === 'credit') return 'entrada'
  if (dc === 'debit') return 'salida'
  return null // desconocida: se acepta contra cualquier dirección
}

export function normalizarTransaccionZoho(txn) {
  return {
    transaction_id: String(txn?.transaction_id ?? txn?.banktransaction_id ?? ''),
    fecha: String(txn?.date || '').slice(0, 10),
    monto: Math.abs(Number(txn?.amount) || 0),
    direccion: direccionZoho(txn),
    referencia: String(txn?.reference_number || '').trim(),
    descripcion: String(txn?.description || '').trim(),
  }
}

function diferenciaDias(a, b) {
  const ta = Date.parse(`${a}T00:00:00Z`)
  const tb = Date.parse(`${b}T00:00:00Z`)
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return Infinity
  return Math.abs(ta - tb) / DIA_MS
}

const mismoMonto = (a, b) => Math.abs(a - b) < 0.005

function mismaReferencia(a, b) {
  const x = String(a || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  const y = String(b || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return Boolean(x) && x === y
}

// Devuelve los movimientos con su estado de conciliación resuelto.
// `huellasPrevias` es un Set con lo ya importado antes para esa cuenta.
export function conciliar(movimientos, transaccionesZoho = [], { toleranciaDias = 3, huellasPrevias = new Set() } = {}) {
  const candidatas = transaccionesZoho.map(normalizarTransaccionZoho).map((t) => ({ ...t, usada: false }))

  return movimientos.map((mov) => {
    if (mov.estado === 'ignorado' || mov.estado === 'publicado') return mov

    if (mov.huella && huellasPrevias.has(mov.huella)) {
      return { ...mov, estado: 'duplicado', nota: 'Ya se había importado desde el KPI en una carga anterior.' }
    }

    const compatibles = candidatas.filter((t) => !t.usada
      && mismoMonto(t.monto, Math.abs(Number(mov.monto) || 0))
      && (t.direccion === null || t.direccion === mov.direccion)
      && diferenciaDias(t.fecha, mov.fecha) <= toleranciaDias)

    if (!compatibles.length) return mov

    // La mejor pareja: misma referencia primero; luego la fecha más cercana.
    compatibles.sort((a, b) => {
      const refA = mismaReferencia(a.referencia, mov.referencia) ? 0 : 1
      const refB = mismaReferencia(b.referencia, mov.referencia) ? 0 : 1
      if (refA !== refB) return refA - refB
      return diferenciaDias(a.fecha, mov.fecha) - diferenciaDias(b.fecha, mov.fecha)
    })

    const elegida = compatibles[0]
    elegida.usada = true
    return {
      ...mov,
      estado: 'ya_en_zoho',
      zoho_transaction_id: elegida.transaction_id || null,
      nota: `Zoho ya tiene este movimiento (${elegida.fecha}${elegida.referencia ? ` · ref ${elegida.referencia}` : ''}).`,
    }
  })
}

export function resumenLote(movimientos) {
  const base = {
    total: movimientos.length,
    nuevos: 0, sin_clasificar: 0, duplicados: 0, ya_en_zoho: 0, publicados: 0, errores: 0, ignorados: 0,
    entradas: 0, salidas: 0,
  }
  for (const mov of movimientos) {
    const monto = Math.abs(Number(mov.monto) || 0)
    if (mov.direccion === 'entrada') base.entradas += monto
    else base.salidas += monto
    switch (mov.estado) {
      case 'nuevo': base.nuevos++; break
      case 'sin_clasificar': base.sin_clasificar++; break
      case 'duplicado': base.duplicados++; break
      case 'ya_en_zoho': base.ya_en_zoho++; break
      case 'publicado': base.publicados++; break
      case 'error': base.errores++; break
      case 'ignorado': base.ignorados++; break
      default: break
    }
  }
  base.entradas = Math.round(base.entradas * 100) / 100
  base.salidas = Math.round(base.salidas * 100) / 100
  return base
}
