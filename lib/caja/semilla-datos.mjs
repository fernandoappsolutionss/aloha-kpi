// Cuentas, compromisos y baldes iniciales (24-sep-2026). Montos de Altavia =
// promedio jun–ago de su Banco General; F&F = estimación desde Zoho (marcados
// "(estimado)" para que la administración los corrija con el pago real).
export const CUENTAS = [
  { empresa: 'altavia', banco: 'St. Georges', numero: '20000001096460', nombre: 'Altavia · St. Georges corriente (tarjetas)', tipo: 'recaudadora' },
  { empresa: 'altavia', banco: 'Banco General', numero: '04-49-00-002283-8', nombre: 'Altavia · Banco General (operativa)', tipo: 'operativa' },
  { empresa: 'ff', banco: 'Banco General', numero: '03-51-01-121955-0', nombre: 'F&F · Banco General corriente', tipo: 'operativa', saldo_ancla: 6740.78, saldo_ancla_fecha: '2026-09-24' },
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
  M('altavia', 'Inversiones y Desarrollo Educativo (por confirmar qué es)', 'operativo_otro', 'Inversiones y Desarrollo Educativo', 1470, 12),
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

  Q('ff', 'Planilla + honorarios + coaches (estimado, cada quincena)', 'planilla', 'Planilla', 5950),
  M('ff', 'CSS cuota obrero-patronal (estimado)', 'planilla', 'CSS', 1100, 15),
  M('ff', 'Honorarios asesoría (estimado)', 'planilla', 'Honorarios', 4200, 30),
  M('ff', 'Regalía C&C Calle 50 + David (estimado)', 'regalia', 'Regalía C&C', 6500, 26),
  M('ff', 'Kits y compras C&C (estimado)', 'kits', 'Kits y compras C&C', 1500, 26),
  M('ff', 'Alquiler Calle 50 + David (estimado)', 'alquiler', 'Alquiler', 2570, 3),
  M('ff', 'Marketing (estimado)', 'operativo_otro', 'Marketing', 1660, 15),
  M('ff', 'Luz, contabilidad y telecom (estimado)', 'servicios', 'Servicios', 1300, 26),
  M('ff', 'Leasing', 'operativo_otro', 'Leasing', 440.38, 5),
  M('ff', 'Descuento directo empleado', 'planilla', 'Descuento directo', 174.98, 30),
  M('ff', 'Afiliación POS Banco General', 'servicios', 'Comisiones bancarias', 25, 1),
  M('ff', 'Cargos St. Georges (e-commerce, POS, mantenimiento)', 'servicios', 'Comisiones bancarias', 75, 28),
  M('ff', 'Teléfono e internet David', 'servicios', 'Internet/teléfono', 290.57, 28),
  M('ff', 'Comisiones POS + Yappy', 'servicios', 'Comisiones bancarias', 450, 30),
  U('ff', 'Décimo tercer mes', 'planilla', 'Décimo', 392.18, '2026-12-15'),
]

// Escalera: arranca en lo que el margen aguanta y sube hacia 35/15 (Fase 2 sugiere cada trimestre).
export const BALDES = [
  { empresa: 'altavia', vigente_desde: '2026-09-28', dueno_pct: 15, impuesto_pct: 8 },
  { empresa: 'ff', vigente_desde: '2026-09-28', dueno_pct: 8, impuesto_pct: 8 },
]
