import { isIsoCountryCode } from './iso-countries.mjs'

export const PETICION_CATEGORIAS = Object.freeze([
  { value: 'reparacion', label: 'Reparación' },
  { value: 'activaciones_mercadeo', label: 'Activaciones Mercadeo' },
  { value: 'contratacion', label: 'Contratación' },
  { value: 'capacitacion', label: 'Capacitación' },
  { value: 'otros', label: 'Otros' },
])
export const PETICION_ESTADOS = Object.freeze(['Próximo trimestre', 'Negado', 'Aprobado', 'En proceso', 'Cumplido', 'Anulada'])
export const MAX_PDF_BYTES = 10 * 1024 * 1024
export const MAX_COTIZACIONES = 10
export const MAX_UPLOAD_ATTEMPTS = 5
export const DRAFT_TTL_DAYS = 30

const categoryCodes = new Set(PETICION_CATEGORIAS.map((item) => item.value))
const quoteOpenStates = new Set(['Próximo trimestre', 'Negado', 'Aprobado', 'En proceso'])
const stripMarks = (value) => String(value || '').normalize('NFKD').replace(/\p{Diacritic}/gu, '')
const submissionMessages = Object.freeze({
  texto_requerido: 'Escribe la descripción de la petición.',
  categoria_invalida: 'Selecciona una categoría válida.',
  minimo_tres: 'Adjunta al menos tres cotizaciones válidas de proveedores fiscales distintos.',
  proveedor_invalido: 'Cada proveedor necesita razón social, país, identificación fiscal, ambas certificaciones y un PDF válido.',
  proveedor_duplicado: 'Las cotizaciones deben pertenecer a proveedores fiscales distintos.',
  pdf_duplicado: 'No puedes usar el mismo PDF en más de una cotización.',
  maximo_diez: 'Una petición admite hasta diez cotizaciones.',
})

export function normalizeSupplierName(value) {
  return stripMarks(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

export function normalizeFiscalId(value) {
  return stripMarks(value).toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function supplierIdentityKey(row) {
  return `${String(row?.proveedor_pais || '').trim().toUpperCase()}:${normalizeFiscalId(row?.proveedor_id_fiscal)}`
}

export function validateSupplier(row) {
  const country = String(row?.proveedor_pais || '').toUpperCase()
  return Boolean(
    normalizeSupplierName(row?.proveedor_razon_social) &&
    isIsoCountryCode(country) &&
    normalizeFiscalId(row?.proveedor_id_fiscal) &&
    row?.empresa_constituida === true &&
    row?.emite_factura_fiscal === true &&
    row?.upload_status === 'valid' &&
    row?.archivo_sha256
  )
}

export function validateSubmission({ texto, categoria, cotizaciones }) {
  const errors = []
  const rows = Array.isArray(cotizaciones) ? cotizaciones : []
  if (!String(texto || '').trim()) errors.push('texto_requerido')
  if (!categoryCodes.has(categoria)) errors.push('categoria_invalida')
  if (rows.length > MAX_COTIZACIONES) errors.push('maximo_diez')
  const declaredValid = rows.filter((row) => row?.upload_status === 'valid')
  if (declaredValid.some((row) => !validateSupplier(row))) errors.push('proveedor_invalido')
  const valid = declaredValid.filter(validateSupplier)
  if (valid.length < 3) errors.push('minimo_tres')
  const identities = valid.map(supplierIdentityKey)
  if (new Set(identities).size !== identities.length) errors.push('proveedor_duplicado')
  const hashes = valid.map((row) => row.archivo_sha256)
  if (new Set(hashes).size !== hashes.length) errors.push('pdf_duplicado')
  return [...new Set(errors)]
}

export function submissionErrorMessage(codes) {
  return [...new Set(codes)].map((code) => submissionMessages[code] || code).join(' ')
}

export function canAddQuote(estado) {
  return quoteOpenStates.has(estado)
}
