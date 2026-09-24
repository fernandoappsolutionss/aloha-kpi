// Cuentas, compromisos y baldes iniciales (24-sep-2026). Montos = promedio jun–ago
// 2026 de los extractos y día típico de pago: Altavia de su Banco General; F&F de
// Banco General …9550 (OFX) + St. Georges …8094 (Excel).
export const CUENTAS = [
  { empresa: 'altavia', banco: 'St. Georges', numero: '20000001096460', nombre: 'Altavia · St. Georges corriente (tarjetas)', tipo: 'recaudadora' },
  { empresa: 'altavia', banco: 'Banco General', numero: '04-49-00-002283-8', nombre: 'Altavia · Banco General (operativa)', tipo: 'operativa' },
  { empresa: 'ff', banco: 'Banco General', numero: '03-51-01-121955-0', nombre: 'F&F · Banco General corriente', tipo: 'operativa', saldo_ancla: 6238.55, saldo_ancla_fecha: '2026-09-24' },
  { empresa: 'ff', banco: 'St. Georges', numero: '20000000678094', nombre: 'F&F · St. Georges corriente', tipo: 'operativa', saldo_ancla: 3372.75, saldo_ancla_fecha: '2026-09-24' },
  { empresa: 'ff', banco: 'St. Georges', numero: '20000000686865', nombre: 'F&F · St. Georges ahorro (balde Dueño)', tipo: 'ahorro_dueno', saldo_ancla: 701.72, saldo_ancla_fecha: '2026-09-24' },
  { empresa: 'ff', banco: 'Banco General', numero: '0729090212776', nombre: 'Línea de crédito BG (fondo de tormenta del grupo)', tipo: 'linea_credito', limite: 50000, saldo_ancla: 0, saldo_ancla_fecha: '2026-09-24' },
]

const M = (empresa, concepto, clase, categoria, monto, dia) => ({ empresa, concepto, clase, categoria, monto, frecuencia: 'mensual', dia })
const Q = (empresa, concepto, clase, categoria, monto) => ({ empresa, concepto, clase, categoria, monto, frecuencia: 'quincenal' })
const U = (empresa, concepto, clase, categoria, monto, fecha) => ({ empresa, concepto, clase, categoria, monto, frecuencia: 'unico', fecha })

export const COMPROMISOS = [
  Q('altavia', 'Planilla Movemedia (cada quincena)', 'planilla', 'Planilla (Movemedia)', 6760),
  M('altavia', 'Honorarios personal (1ª mitad)', 'planilla', 'Honorarios personal', 1150, 11),
  M('altavia', 'Honorarios personal (2ª mitad)', 'planilla', 'Honorarios personal', 1150, 26),
  M('altavia', 'Regalía C&C Anclas + Brisas', 'regalia', 'Regalía C&C', 6300, 26),
  M('altavia', 'Kits y compras C&C', 'kits', 'Kits y compras C&C', 1560, 26),
  M('altavia', 'Alquiler Brisas Center', 'alquiler', 'Alquiler Brisas', 2400, 3),
  M('altavia', 'Admicontabilidad (local)', 'alquiler', 'Alquiler/administración local', 1070, 3),
  M('altavia', 'Marketing (Inversiones y Desarrollo Educativo)', 'operativo_otro', 'Marketing', 1470, 12),
  M('altavia', 'Servatec contabilidad', 'servicios', 'Contabilidad', 642, 11),
  M('altavia', 'ENSA luz', 'servicios', 'Luz', 410, 26),
  M('altavia', 'Multibank', 'operativo_otro', 'Pago Multibank', 362, 4),
  M('altavia', 'Limpieza (Higiene Especializados)', 'servicios', 'Limpieza', 230, 11),
  M('altavia', 'Insumos (Leonardo Rodríguez)', 'operativo_otro', 'Insumos', 190, 26),
  M('altavia', 'Tarjeta Visa', 'operativo_otro', 'Tarjeta Visa', 900, 28),
  M('altavia', 'Cable & Wireless', 'servicios', 'Internet/teléfono', 57.11, 12),
  M('altavia', 'Tigo', 'servicios', 'Internet/teléfono', 56, 25),
  M('altavia', 'Comisiones POS St. Georges + Yappy', 'servicios', 'Comisiones bancarias', 470, 30),
  U('altavia', 'ISR estimado ANIP', 'impuesto', 'ISR / Tasa única', 287.7, '2026-12-31'),

  // F&F jun–ago 2026. Movemedia sin el pago del préstamo de corto plazo (2.500, 15-jun) ni el
  // décimo (va aparte el 15-dic). Préstamos BG: los dos se cancelaron (8-abr y 20-may).
  Q('ff', 'Planilla Movemedia (cada quincena)', 'planilla', 'Planilla (Movemedia)', 6266.55),
  M('ff', 'Honorarios personal (1ª mitad)', 'planilla', 'Honorarios personal', 2848.73, 11),
  M('ff', 'Honorarios personal (2ª mitad)', 'planilla', 'Honorarios personal', 758.87, 29),
  M('ff', 'Descuento directo empleado', 'planilla', 'Descuento directo', 174.98, 30),
  M('ff', 'CSS cuota obrero-patronal', 'planilla', 'CSS', 463.29, 20),
  M('ff', 'Regalía C&C Calle 50 + David', 'regalia', 'Regalía C&C', 4665.69, 26),
  M('ff', 'Kits y compras C&C', 'kits', 'Kits y compras C&C', 1825.77, 4),
  M('ff', 'Alquiler Indaluz', 'alquiler', 'Alquiler (Indaluz)', 1322.52, 3),
  M('ff', 'Alquiler fideicomiso BG Trust', 'alquiler', 'Alquiler (fideicomiso BG Trust)', 1342.79, 3),
  M('ff', 'Marketing (Inversiones y Desarrollo Educativo)', 'operativo_otro', 'Marketing', 863.41, 11),
  M('ff', 'Tarjeta Visa (MASTER, S.A.)', 'operativo_otro', 'Tarjeta Visa', 648.12, 29),
  M('ff', 'Leasing', 'operativo_otro', 'Leasing', 440.38, 5),
  M('ff', 'Servatec contabilidad', 'servicios', 'Contabilidad', 672.32, 11),
  M('ff', 'Naturgy luz (medidor 6112866)', 'servicios', 'Luz', 486.7, 11),
  M('ff', 'Naturgy luz (medidor 6367566)', 'servicios', 'Luz', 169.41, 26),
  M('ff', 'Seguro Grupo Vive (Metrobank)', 'servicios', 'Seguros', 312.08, 11),
  M('ff', 'Aseguradora Ancón', 'servicios', 'Seguros', 180.83, 29),
  M('ff', 'Limpieza (Higiene Especializados)', 'servicios', 'Limpieza', 162.43, 11),
  M('ff', 'Tigo', 'servicios', 'Internet/teléfono', 81.97, 29),
  M('ff', 'Afiliación POS Banco General', 'servicios', 'Comisiones bancarias', 25, 1),
  M('ff', 'Comisiones Banco General (Yappy, ITBMS)', 'servicios', 'Comisiones bancarias', 110.23, 30),
  M('ff', 'Comisiones y cargos St. Georges (POS, e-commerce)', 'servicios', 'Comisiones bancarias', 450.26, 30),
  U('ff', 'Décimo tercer mes (honorarios)', 'planilla', 'Décimo', 392.18, '2026-12-15'),
  U('ff', 'Décimo tercer mes Movemedia', 'planilla', 'Décimo', 913.39, '2026-12-15'),
]

// Escalera: arranca en lo que el margen aguanta y sube hacia 35/15 (Fase 2 sugiere cada trimestre).
export const BALDES = [
  { empresa: 'altavia', vigente_desde: '2026-09-28', dueno_pct: 15, impuesto_pct: 8 },
  { empresa: 'ff', vigente_desde: '2026-09-28', dueno_pct: 8, impuesto_pct: 8 },
]

// Perfil de cobro de respaldo mientras una empresa no tenga un mes cerrado de
// extractos: promedio mensual y peso por bloque del mes (1-7, 8-14, 15-21, 22-fin)
// de los pagos de clientes en Zoho, mar–ago 2026. La curva lo marca "estimado".
export const INGRESO_REFERENCIA = Object.freeze({
  altavia: Object.freeze({ promedioMensual: 40646, pesos: Object.freeze([0.181, 0.186, 0.212, 0.421]) }),
  ff: Object.freeze({ promedioMensual: 36578, pesos: Object.freeze([0.196, 0.199, 0.239, 0.366]) }),
})
