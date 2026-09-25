// "Excel" de movimientos de la banca en línea de St. Georges: en realidad es una tabla
// HTML (UTF-8 con BOM). Las filas de detalle no traen <tr> de apertura: se leen las
// celdas de 5 en 5 (fecha, descripción, débito, crédito, balance DESPUÉS del
// movimiento) y vienen de la más nueva a la más vieja.
import { MESES, isoSiExiste, conFitidStGeorges } from './stgeorges.mjs'

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
const r2 = (n) => Math.round(n * 100) / 100

function textoCelda(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (e, c) => {
      if (c[0] === '#') return String.fromCodePoint(c[1].toLowerCase() === 'x' ? parseInt(c.slice(2), 16) : Number(c.slice(1)))
      return ENTIDADES[c.toLowerCase()] ?? e
    })
    .replace(/\s+/g, ' ')
    .trim()
}

function fecha(s) {
  const m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/)
  const mes = m && MESES[m[2].toUpperCase()]
  const iso = mes && isoSiExiste(Number(m[3]), Number(mes), Number(m[1]))
  if (!iso) throw new Error(`Fecha inválida en el Excel de St. Georges: ${s}.`)
  return iso
}

function monto(s, fila) {
  if (s === '') return 0
  if (!/^-?[\d,]*\d(\.\d{1,2})?$/.test(s)) throw new Error(`Monto inválido en el Excel de St. Georges (${fila}): "${s}".`)
  return Number(s.replace(/,/g, ''))
}

export function parseStGeorgesXls(html) {
  const celdas = [...String(html).matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => textoCelda(m[1]))
  const iCuenta = celdas.indexOf('Cuenta:')
  const cuenta = iCuenta >= 0 ? (celdas[iCuenta + 1] || '').replace(/\D/g, '') : ''
  const iBalance = celdas.indexOf('Balance')
  if (cuenta.length < 8 || iBalance < 4 || celdas[iBalance - 4] !== 'Fecha') {
    throw new Error('El archivo no es la exportación a Excel de St. Georges (falta la cuenta o la tabla de movimientos).')
  }
  const detalle = celdas.slice(iBalance + 1)
  if (detalle.length % 5 !== 0) throw new Error('La tabla de movimientos del Excel de St. Georges está incompleta (celdas sueltas).')

  // De la más nueva a la más vieja, como viene el archivo.
  const filas = []
  for (let i = 0; i < detalle.length; i += 5) {
    const [f, desc, deb, cred, bal] = detalle.slice(i, i + 5)
    const iso = fecha(f)
    const ref = `${f} "${desc}"`
    if (filas.length && iso > filas.at(-1).fecha) {
      throw new Error(`El Excel de St. Georges trae filas fuera de orden (${ref} después de ${filas.at(-1).fecha}).`)
    }
    filas.push({ fecha: iso, monto: r2(monto(cred, ref) - monto(deb, ref)), memo: desc.toUpperCase(), saldo: monto(bal, ref) })
  }
  filas.reverse() // de la más vieja a la más nueva

  for (let i = 1; i < filas.length; i++) {
    const [ant, m] = [filas[i - 1], filas[i]]
    if (Math.abs(r2(ant.saldo + m.monto) - m.saldo) > 0.005) {
      throw new Error(`El saldo corrido no cuadra el ${m.fecha} ("${m.memo}"): ${ant.saldo} + ${m.monto} ≠ ${m.saldo}. Revisa el archivo.`)
    }
  }

  const ultima = filas.at(-1)
  return {
    cuenta,
    saldo: ultima ? { monto: ultima.saldo, fecha: ultima.fecha } : null,
    movimientos: conFitidStGeorges(filas),
    descuadre: null,
  }
}
