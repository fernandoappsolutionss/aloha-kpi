import { normalizarDescripcion } from './huella.mjs'

// Auto-clasificación por descripción: cada regla dice "si el concepto del
// banco contiene X, el movimiento va a la cuenta contable Y de Zoho".
//
// A propósito NO hay modo "expresión regular". Una regex escrita desde la web
// se ejecuta en el servidor y una mal formada puede colgar la petición
// (backtracking catastrófico); además nadie en administración necesita
// escribirlas. Los cuatro modos cubren lo real: contiene, empieza, termina y
// "todas estas palabras".

export const MODOS = ['contiene', 'empieza', 'termina', 'palabras']
export const DIRECCIONES = ['entrada', 'salida', 'ambas']

export function reglaValida(regla) {
  if (!regla) return false
  if (!String(regla.patron || '').trim()) return false
  if (!MODOS.includes(regla.modo)) return false
  if (!DIRECCIONES.includes(regla.direccion || 'ambas')) return false
  return Boolean(String(regla.zoho_account_id || '').trim())
}

export function coincide(regla, movimiento) {
  const direccion = regla.direccion || 'ambas'
  if (direccion !== 'ambas' && direccion !== movimiento.direccion) return false
  const patron = normalizarDescripcion(regla.patron)
  if (!patron) return false
  const descripcion = normalizarDescripcion(movimiento.descripcion)
  const referencia = normalizarDescripcion(movimiento.referencia)
  // `empieza` y `termina` miran SOLO la descripción: si se concatenara la
  // referencia, "termina en QUINCENA" nunca calzaría porque la línea real
  // acaba en el número de documento. `contiene` y `palabras` sí revisan las
  // dos, que es donde los bancos reparten el mismo dato.
  switch (regla.modo) {
    case 'empieza': return descripcion.startsWith(patron)
    case 'termina': return descripcion.endsWith(patron)
    case 'palabras': {
      const palabras = new Set(`${descripcion} ${referencia}`.trim().split(' '))
      return patron.split(' ').every((p) => palabras.has(p))
    }
    case 'contiene':
    default: return descripcion.includes(patron) || (Boolean(referencia) && referencia.includes(patron))
  }
}

// Orden de resolución: primero la prioridad que definió el usuario (mayor
// gana) y, a igualdad, el patrón más largo — el específico ("ACH NOMINA
// QUINCENA") debe ganarle al genérico ("ACH").
export function ordenarReglas(reglas) {
  return [...reglas]
    .filter((r) => r.activa !== false)
    .sort((a, b) => (Number(b.prioridad || 0) - Number(a.prioridad || 0))
      || (String(b.patron || '').length - String(a.patron || '').length)
      || (Number(a.id || 0) - Number(b.id || 0)))
}

// Clasifica un movimiento. `defaults` son las cuentas puente de la cuenta
// bancaria: lo que no calza con ninguna regla cae ahí, y si tampoco hay
// puente el movimiento queda `sin_clasificar` — nunca se inventa una cuenta.
export function clasificar(movimiento, reglas, defaults = {}) {
  for (const regla of ordenarReglas(reglas)) {
    if (coincide(regla, movimiento)) {
      return {
        zoho_account_id: String(regla.zoho_account_id),
        zoho_account_name: regla.zoho_account_name || '',
        transaction_type: regla.transaction_type || tipoPorDireccion(movimiento.direccion),
        regla_id: regla.id ?? null,
        origen: 'regla',
      }
    }
  }
  const puente = movimiento.direccion === 'entrada'
    ? { id: defaults.cuenta_ingreso_id, nombre: defaults.cuenta_ingreso_nombre }
    : { id: defaults.cuenta_gasto_id, nombre: defaults.cuenta_gasto_nombre }
  if (puente.id) {
    return {
      zoho_account_id: String(puente.id),
      zoho_account_name: puente.nombre || '',
      transaction_type: tipoPorDireccion(movimiento.direccion),
      regla_id: null,
      origen: 'puente',
    }
  }
  return { zoho_account_id: null, zoho_account_name: '', transaction_type: null, regla_id: null, origen: 'ninguno' }
}

export function tipoPorDireccion(direccion) {
  return direccion === 'entrada' ? 'deposit' : 'expense'
}

export function clasificarLote(movimientos, reglas, defaults = {}) {
  return movimientos.map((mov) => {
    const clase = clasificar(mov, reglas, defaults)
    return { ...mov, ...clase, estado: clase.zoho_account_id ? 'nuevo' : 'sin_clasificar' }
  })
}
