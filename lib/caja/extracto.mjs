import { parseOfx } from './ofx.mjs'
import { parseStGeorgesTexto } from './stgeorges.mjs'
import { parseStGeorgesXls } from './stgeorges-xls.mjs'
import { textoDePdf } from './pdf-texto.mjs'

export const MAX_BYTES_EXTRACTO = 4 * 1024 * 1024
export const soloDigitos = (s) => String(s || '').replace(/\D/g, '')

// `descuadre` solo lo reporta St. Georges (resumen del PDF ≠ suma del detalle); OFX trae null.
export async function leerExtracto(nombre, bytes) {
  if (bytes.length > MAX_BYTES_EXTRACTO) throw new Error('El archivo pesa más de 4 MB.')
  if (/\.ofx$/i.test(nombre)) return { formato: 'ofx', descuadre: null, ...parseOfx(Buffer.from(bytes).toString('latin1')) }
  if (/\.pdf$/i.test(nombre)) return { formato: 'pdf_stgeorges', ...parseStGeorgesTexto(await textoDePdf(bytes)) }
  // La "descarga a Excel" de St. Georges es una tabla HTML en UTF-8, aunque se llame .xls.
  if (/\.(xls|html?)$/i.test(nombre)) return { formato: 'xls_stgeorges', ...parseStGeorgesXls(Buffer.from(bytes).toString('utf8')) }
  throw new Error('Sube el OFX de Banco General, o el Excel de St. Georges o el PDF de su estado de cuenta.')
}
