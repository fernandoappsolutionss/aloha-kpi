const MESES = { ENE: '01', JAN: '01', FEB: '02', MAR: '03', ABR: '04', APR: '04', MAY: '05', JUN: '06', JUL: '07', AGO: '08', AUG: '08', SEP: '09', SET: '09', OCT: '10', NOV: '11', DIC: '12', DEC: '12' }
const INICIO_FILA = /^(\d{2})-([A-Z]{3})-(\d{2})\s+(.*)$/
const CIERRE_FILA = /^(.*?)\s*(-?[\d,]+\.\d{2})\s+(-?[\d,]+\.\d{2})$/
const PIE = /^(Chat$|https?:\/\/|\d{1,2}\/\d{1,2}\/\d{2},)/
const num = (s) => Number(s.replace(/,/g, ''))
const r2 = (n) => Math.round(n * 100) / 100

function fechaFila(dd, mmm, yy) {
  const mes = MESES[mmm]
  if (!mes) throw new Error(`Mes desconocido en el estado de cuenta: ${mmm}`)
  return `20${yy}-${mes}-${dd}`
}

export function parseStGeorgesTexto(texto) {
  const cuenta = (texto.match(/N[úu]mero:\s*(\d{8,})/) || texto.match(/Cuenta\s+(\d{8,})/))?.[1]
  if (!cuenta || !/DETALLE DE TRANSACCIONES/.test(texto)) {
    throw new Error('El PDF no es un estado de cuenta de St. Georges (no trae número de cuenta ni detalle).')
  }
  const resumen = texto.match(/Saldo Anterior[^\n]*\n\s*(-?[\d,]+\.\d{2})\s+(-?[\d,]+\.\d{2})\s+(-?[\d,]+\.\d{2})\s+(-?[\d,]+\.\d{2})/)
  const fechaEstado = texto.match(/Fecha\s*:\s*([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),\s*(\d{4})/)

  const movimientos = []
  let pendiente = null
  const cerrar = (desc, monto, saldo) => {
    const memo = `${pendiente.desc} ${desc}`.replace(/\s+/g, ' ').trim()
    movimientos.push({ fecha: pendiente.fecha, monto: num(monto), memo, saldo: num(saldo) })
    pendiente = null
  }
  for (const linea of texto.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const inicio = linea.match(INICIO_FILA)
    if (inicio) {
      if (pendiente) throw new Error(`Fila sin monto del ${pendiente.fecha}: "${pendiente.desc}"`)
      pendiente = { fecha: fechaFila(inicio[1], inicio[2], inicio[3]), desc: '' }
      const cierre = inicio[4].match(CIERRE_FILA)
      if (cierre) cerrar(cierre[1], cierre[2], cierre[3])
      else pendiente.desc = inicio[4]
      continue
    }
    if (!pendiente || PIE.test(linea)) continue
    const cierre = linea.match(CIERRE_FILA)
    if (cierre) cerrar(cierre[1], cierre[2], cierre[3])
    else pendiente.desc += ` ${linea}`
  }
  if (pendiente) throw new Error(`Fila sin monto del ${pendiente.fecha}.`)

  let anterior = resumen ? num(resumen[1]) : (movimientos[0] ? r2(movimientos[0].saldo - movimientos[0].monto) : 0)
  for (const m of movimientos) {
    if (Math.abs(r2(anterior + m.monto) - m.saldo) > 0.005) {
      throw new Error(`El saldo corrido no cuadra el ${m.fecha} ("${m.memo}"): ${anterior} + ${m.monto} ≠ ${m.saldo}. Revisa el PDF.`)
    }
    anterior = m.saldo
  }

  const ultimo = movimientos.at(-1)
  const fechaSaldo = fechaEstado
    ? `${fechaEstado[3]}-${MESES[fechaEstado[1].toUpperCase()]}-${fechaEstado[2].padStart(2, '0')}`
    : ultimo?.fecha
  // El cierre oficial es el "Saldo Actual" del resumen. El detalle web puede omitir filas
  // (abril 2026: faltó un débito de 5.000), y eso no lo detecta el saldo corrido.
  const saldoActual = resumen ? num(resumen[4]) : null
  const saldoFilas = ultimo ? ultimo.saldo : null
  const monto = saldoActual ?? saldoFilas
  const descuadre = saldoActual !== null && Math.abs(saldoActual - (saldoFilas ?? anterior)) > 0.005
    ? { monto: r2(saldoActual - (saldoFilas ?? anterior)), fecha: fechaSaldo ?? null }
    : null
  return {
    cuenta,
    saldo: monto !== null ? { monto, fecha: fechaSaldo ?? null } : null,
    descuadre,
    movimientos: movimientos.map(({ fecha, monto, memo, saldo }) => ({
      fecha, monto, memo,
      // Sin ID del banco: el saldo corrido hace única cada fila de la cuenta.
      fitid: `${fecha}|${saldo.toFixed(2)}|${monto.toFixed(2)}`,
    })),
  }
}
