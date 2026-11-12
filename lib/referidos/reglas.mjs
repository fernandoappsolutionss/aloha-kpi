// Reglas puras de referidos (sin base ni red). Diseño:
// docs/superpowers/specs/2026-11-12-referidos-wallet-design.md

export const CUENTA_PA = 'c0c81438-bb54-4ae0-a019-b54e0bfcf870'
export const CUENTA_VE = '75000259-9e63-4feb-a731-9e6d972f5356'

// Prefijo del país y largo máximo de un número nacional (sin prefijo).
const PAIS = {
  [CUENTA_PA]: { prefijo: '507', nacional: 8, nombre: 'Panamá' },
  [CUENTA_VE]: { prefijo: '58', nacional: 10, nombre: 'Venezuela' },
}
export const CUENTAS = Object.keys(PAIS)
export const nombreCuenta = (cuenta) => PAIS[cuenta]?.nombre || cuenta

// Landing de clase de prueba por país (el QR redirige aquí con el código).
export const LANDING = {
  [CUENTA_PA]: 'https://promo.alohapanama.com/aloha/clase-de-prueba',
  [CUENTA_VE]: 'https://promo.alohapanama.com/aloha/venezuela/clase-de-prueba',
}

// Identidad del miembro: solo dígitos con prefijo de país. Un número corto
// (nacional) recibe el prefijo de su cuenta; uno largo ya lo trae. null = no
// sirve como identidad (no crea miembro: nunca se agrupan desconocidos).
export function normalizarTelefono(valor, cuenta) {
  const pais = PAIS[cuenta]
  if (!pais) return null
  const t = String(valor || '').replace(/\D/g, '').replace(/^0+/, '')
  if (t.length < 7) return null
  const completo = t.length <= pais.nacional ? pais.prefijo + t : t
  return completo.length >= 10 && completo.length <= 15 ? completo : null
}

// Sin i, l, o, 0, 1: se dicta y se lee sin confusión. El CRM baja los UTM a
// minúsculas, por eso el código es minúsculo.
const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789'
export const CODIGO_RE = /^[a-z2-9]{6}$/

export function generarCodigo(bytes) {
  let codigo = ''
  for (let i = 0; i < 6; i++) codigo += ALFABETO[bytes[i] % ALFABETO.length]
  return codigo
}

// Código de referido que trae una inscripción del CRM: campo propio primero;
// respaldo por UTM para inscripciones anteriores al despliegue del CRM.
export function codigoDeRegistro(reg) {
  const propio = String(reg?.referral_code || '').trim().toLowerCase()
  if (CODIGO_RE.test(propio)) return propio
  if (String(reg?.utm_source || '').toLowerCase() !== 'referido') return null
  const utm = String(reg?.utm_campaign || '').trim().toLowerCase()
  return CODIGO_RE.test(utm) ? utm : null
}

export const TIPO_DE_CONCEPTO = { cp: 'bono_clase_prueba', ref_asiste: 'bono_referido_asiste', ref_inscrito: 'bono_referido_inscrito' }
const MONTO_DE_CONCEPTO = { cp: 'bono_clase_prueba_cent', ref_asiste: 'bono_referido_asiste_cent', ref_inscrito: 'bono_referido_inscrito_cent' }

// Importe neto de un concepto. `congelado` = importe del primer movimiento del
// concepto (null si nunca se asentó). Devuelve el delta a insertar (0 = nada).
//   cumple     ¿la condición del bono es cierta hoy?
//   elegible   ¿puede nacer por primera vez? (país activo y clase ≥ activo_desde)
export function deltaConcepto({ clase, cumple, elegible, congelado, asentado, config }) {
  const montoNuevo = elegible ? Number(config?.[MONTO_DE_CONCEPTO[clase]] || 0) : 0
  const debido = cumple ? (congelado ?? montoNuevo) : 0
  return debido - Number(asentado || 0)
}

// ¿La clase puede generar bonos nuevos? Sin fecha no hay dinero: la fecha la
// fija Fernando (una fecha pasada acredita a quienes ya fueron).
export function claseElegible(config, claseFecha) {
  if (!config?.activo || !config.activo_desde || !claseFecha) return false
  return fechaISO(claseFecha) >= fechaISO(config.activo_desde)
}

// Atribución: se decide con la inscripción MÁS ANTIGUA del miembro.
//   registros          inscripciones del miembro [{crm_registration_id, registered_at, codigo_referido}]
//   miembroPorCodigo   (codigo) => miembro de la misma cuenta o null
//   primeraFichaFecha  fecha (ISO) de la ficha más antigua con su teléfono, o null
export function decidirAtribucion({ miembroId, registros, miembroPorCodigo, primeraFichaFecha }) {
  const primera = [...registros].sort((a, b) =>
    String(a.registered_at || '').localeCompare(String(b.registered_at || '')) ||
    String(a.crm_registration_id).localeCompare(String(b.crm_registration_id)))[0]
  if (!primera?.codigo_referido) return null
  const referidor = miembroPorCodigo(primera.codigo_referido)
  if (!referidor || referidor.id === miembroId) return null
  // Ya era alumno antes de esa inscripción: no es un referido nuevo.
  if (primeraFichaFecha && fechaISO(primeraFichaFecha) < fechaISO(primera.registered_at)) return null
  return { referidorId: referidor.id, registrationId: primera.crm_registration_id }
}

export function fechaISO(valor) {
  if (valor instanceof Date) return valor.toISOString().slice(0, 10)
  return String(valor || '').slice(0, 10)
}

export const centavos = (n) => `$${(Number(n || 0) / 100).toFixed(2)}`

// Monto en dólares escrito por una persona → centavos enteros positivos.
export function aCentavos(texto) {
  const limpio = String(texto ?? '').trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null
  const cent = Math.round(Number(limpio) * 100)
  return cent > 0 ? cent : null
}
