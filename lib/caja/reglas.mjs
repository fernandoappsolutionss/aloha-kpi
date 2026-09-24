export const CLASES = Object.freeze({
  ingreso: 'Ingreso',
  planilla: 'Planilla y honorarios',
  regalia: 'Regalía C&C',
  kits: 'Kits y compras C&C',
  alquiler: 'Alquiler',
  servicios: 'Servicios y comisiones',
  impuesto: 'Impuestos',
  operativo_otro: 'Otros operativos',
  dueno: 'Dueño',
  intercompania: 'Intercompañía',
  traspaso_propio: 'Traspaso entre cuentas propias',
  resguardo_cc: 'Resguardo campeonatos C&C',
  linea: 'Línea de crédito',
  por_clasificar: 'Por clasificar',
})

// No entran a la curva: la plata de campeonatos es de C&C y un traspaso entre
// cuentas propias no cambia la caja de la empresa.
export const CLASES_FUERA_DE_CURVA = new Set(['traspaso_propio', 'resguardo_cc'])
export const CLASES_EGRESO = Object.freeze(['planilla', 'regalia', 'kits', 'alquiler', 'servicios', 'impuesto', 'operativo_otro', 'linea'])

export function normalizarTexto(s) {
  return String(s || '')
    .replace(/&amp;/gi, '&')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/\s+/g, ' ').trim()
}

export function clasificar(mov, reglas, empresa) {
  const memo = normalizarTexto(mov.memo)
  const signo = Math.sign(mov.monto)
  const regla = [...reglas]
    .sort((a, b) => a.prioridad - b.prioridad || a.id - b.id)
    .find((r) => (!r.empresa || r.empresa === empresa)
      && (!r.signo || Number(r.signo) === signo)
      && memo.includes(normalizarTexto(r.patron)))
  return regla
    ? { clase: regla.clase, categoria: regla.categoria, regla_id: regla.id ?? null }
    : { clase: 'por_clasificar', categoria: 'Por clasificar', regla_id: null }
}

const R = (prioridad, patron, clase, categoria, extra = {}) => ({ prioridad, patron, clase, categoria, empresa: null, signo: null, ...extra })
const EGRESO = { signo: -1 }
const INGRESO = { signo: 1 }

// Semilla sacada de los extractos reales de Altavia (feb–sep 2026) y de Zoho F&F.
// Menor prioridad = se evalúa antes.
export const REGLAS_SEMILLA = Object.freeze([
  // Dueño: transferencia al ahorro de F&F en St. Georges.
  R(5, '20000000686865', 'dueno', 'Separación dueño → ahorro F&F', EGRESO),
  // Plata de campeonatos: en resguardo para C&C.
  R(10, 'CAMPEONATO', 'resguardo_cc', 'Campeonatos'),
  R(10, 'COMPETENCIA', 'resguardo_cc', 'Campeonatos'),
  R(10, 'AGASAJO CAMPEON', 'resguardo_cc', 'Campeonatos'),
  R(10, 'CANCELA INSCR', 'resguardo_cc', 'Campeonatos'),
  // Línea de crédito Banco General de F&F.
  R(12, '0729090212776', 'linea', 'Línea de crédito BG'),
  // Altavia: St. Georges barre a Banco General.
  // Con el beneficiario: "ACH XPRESS A FAVOR DE <persona>" es un pago, no un traspaso.
  R(15, 'ACH XPRESS A FAVOR DE ALTAVIA', 'traspaso_propio', 'St. Georges → Banco General', { empresa: 'altavia', ...EGRESO }),
  R(15, 'ACH XPRESS A FAVOR DE ALOHA', 'traspaso_propio', 'St. Georges → Banco General', { empresa: 'altavia', ...EGRESO }),
  R(15, 'ACH A FAVOR DE ALTAVIA', 'traspaso_propio', 'St. Georges → Banco General', { empresa: 'altavia', ...EGRESO }),
  R(15, 'ACH XPRESS - ALOHA', 'traspaso_propio', 'St. Georges → Banco General', { empresa: 'altavia', ...INGRESO }),
  R(15, 'ACH - ALTAVIA GROUP', 'traspaso_propio', 'St. Georges → Banco General', { empresa: 'altavia', ...INGRESO }),
  // Pases entre empresas (cliente que pagó en la cuenta equivocada).
  R(20, 'F&F SOLUCIONES', 'intercompania', 'F&F ↔ Altavia', { empresa: 'altavia' }),
  R(20, 'F Y F SOLUCIONES', 'intercompania', 'F&F ↔ Altavia', { empresa: 'altavia' }),
  R(20, 'ALTAVIA GROUP', 'intercompania', 'F&F ↔ Altavia', { empresa: 'ff' }),
  // C&C: regalía (FEE) antes que el resto de compras.
  R(40, 'C&C SOLUCIONES INTEGRALES, S.A. FEE', 'regalia', 'Regalía C&C', EGRESO),
  R(45, 'C&C SOLUCIONES', 'kits', 'Kits y compras C&C', EGRESO),
  R(45, 'C Y C SOLUCIONES', 'kits', 'Kits y compras C&C', EGRESO),
  // La Visa antes que los nombres: "PAGO VISA ... MOVEMEDIA" es la tarjeta, no planilla.
  R(48, 'PAGO VISA', 'operativo_otro', 'Tarjeta Visa', EGRESO),
  // Planilla y honorarios.
  R(50, 'MOVEMEDIA', 'planilla', 'Planilla (Movemedia)', EGRESO),
  R(50, 'VANESSA DEL CARMEN CAMPOS', 'planilla', 'Honorarios personal', EGRESO),
  R(50, 'LORENA DEL VALLE ORTIZ', 'planilla', 'Honorarios personal', EGRESO),
  R(50, 'FREDERICK MOISES ROBERTS', 'planilla', 'Honorarios personal', EGRESO),
  R(50, 'FERNANDO JHOSUE PEREZ', 'planilla', 'Honorarios personal', EGRESO),
  R(50, 'CARMEN ADELA PERAZA', 'planilla', 'Honorarios personal', EGRESO),
  R(50, 'FREDDY ALEXIS LIZARDO', 'planilla', 'Honorarios personal', EGRESO),
  // Local, servicios e impuestos.
  R(50, 'INVERSIONES BRISAS CENTER', 'alquiler', 'Alquiler Brisas', EGRESO),
  R(50, 'ADMICONTABILIDAD', 'alquiler', 'Alquiler/administración local', EGRESO),
  R(50, 'SERVATEC', 'servicios', 'Contabilidad', EGRESO),
  R(50, 'SERVICIOS DE HIGIENE', 'servicios', 'Limpieza', EGRESO),
  R(50, 'KADO SEGUROS', 'servicios', 'Seguros', EGRESO),
  R(50, 'ENSA', 'servicios', 'Luz', EGRESO),
  R(50, 'IDAAN', 'servicios', 'Agua', EGRESO),
  R(50, 'CABLE', 'servicios', 'Internet/teléfono', EGRESO),
  R(50, 'TIGO', 'servicios', 'Internet/teléfono', EGRESO),
  R(50, 'ANIP', 'impuesto', 'ISR / Tasa única', EGRESO),
  R(50, 'MUNICIPIO', 'impuesto', 'Municipio', EGRESO),
  R(50, 'MULTIBANK', 'operativo_otro', 'Pago Multibank', EGRESO),
  R(50, 'LEONARDO RODRIGUEZ ALVARADO', 'operativo_otro', 'Insumos', EGRESO),
  R(50, 'LEASING', 'operativo_otro', 'Leasing', EGRESO),
  // Comisiones e ITBMS bancarios.
  R(60, 'COMISION', 'servicios', 'Comisiones bancarias', EGRESO),
  R(60, 'ITBMS', 'servicios', 'Comisiones bancarias', EGRESO),
  R(60, 'CARGO', 'servicios', 'Comisiones bancarias', EGRESO),
  // Cobros de clientes.
  R(200, 'YAPPY', 'ingreso', 'Yappy', INGRESO),
  R(200, 'REMISION', 'ingreso', 'Tarjeta (POS)', INGRESO),
  R(200, 'TRANSFERENCIA DE', 'ingreso', 'Transferencias de clientes', INGRESO),
  R(200, 'DEPOSITO', 'ingreso', 'Depósitos', INGRESO),
  R(200, 'PAGO DE CLIENTES', 'ingreso', 'Transferencias de clientes', INGRESO),
  R(200, 'TRANSF. DE PAGOS', 'ingreso', 'Pagos página web', INGRESO),
  R(210, 'ACH', 'ingreso', 'Transferencias de clientes', INGRESO),
  R(210, 'INTERES', 'ingreso', 'Intereses', INGRESO),
])
