export const ESTADISTICAS_CENTRO = Object.freeze([
  { codigo: 'ninos_activos', nombre: 'Niños activos al cierre', principal: true, tipo: 'nivel', inversa: false, unidad: 'niños', fuente: 'Balance del mes al corte: cierre anterior + inicios de clase + reincorporaciones − retiros' },
  { codigo: 'nuevos_inscritos', nombre: 'Nuevos inscritos', principal: false, tipo: 'flujo', inversa: false, unidad: 'niños', fuente: 'Primer evento de inscripción de cada niño, sin traslados ni matrículas anuladas' },
  { codigo: 'retiros', nombre: 'Retiros', principal: false, tipo: 'flujo', inversa: true, unidad: 'niños', fuente: 'Retiros operativos de la semana, sin graduados' },
  { codigo: 'facturas_vencidas', nombre: 'Facturas de mensualidad vencidas', principal: false, tipo: 'nivel', inversa: true, unidad: 'facturas', fuente: 'Último conteo de Zoho de la semana' },
  { codigo: 'cp_asistidas', nombre: 'Clases de prueba asistidas', principal: false, tipo: 'flujo', inversa: false, unidad: 'asistentes', fuente: 'Asistentes del CRM en clases realizadas en la semana' },
])

export const CODIGOS_ESTADISTICA = ESTADISTICAS_CENTRO.map((e) => e.codigo)
export const ESTADISTICA_PRINCIPAL = 'ninos_activos'

export function estadistica(codigo) {
  const item = ESTADISTICAS_CENTRO.find((e) => e.codigo === codigo)
  if (!item) throw new Error(`Estadística desconocida: ${codigo}`)
  return item
}
