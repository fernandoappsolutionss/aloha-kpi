export const METRICAS_ALINEAMIENTO = { nuevos_inscritos: 'Nuevos inscritos', cp_asistidas: 'Clases de prueba asistidas' }
export const PARTIDAS_ALINEAMIENTO = { produccion: 'Producción', adicional: 'Otra partida' }

export function cambiarAlineamiento(actual, cambio, nuevoId) {
  if (cambio?.accion === 'agregar') {
    const nombre = String(cambio.nombre || '').trim()
    const cantidad = Number(cambio.cantidad)
    if (!Object.hasOwn(METRICAS_ALINEAMIENTO, cambio.codigo) || !Object.hasOwn(PARTIDAS_ALINEAMIENTO, cambio.partida)) throw new Error('Elige un resultado y una partida válidos.')
    if (!nombre || nombre.length > 200) throw new Error('Indica el cliente, grupo o producto (hasta 200 caracteres).')
    if (typeof cambio.cantidad === 'boolean' || !Number.isSafeInteger(cantidad) || cantidad <= 0 || cantidad > 10000) throw new Error('La cantidad debe ser un entero entre 1 y 10000.')
    if (actual.length >= 200) throw new Error('El alineamiento admite hasta 200 partidas por semana.')
    return [...actual, { id: nuevoId, codigo: cambio.codigo, partida: cambio.partida, nombre, cantidad, hecho: false, evidencia: null }]
  }
  if (!['realizar', 'reabrir', 'eliminar'].includes(cambio?.accion)) throw new Error('Acción inválida.')
  if (!actual.some(item => item.id === cambio.id)) throw new Error('La partida ya no está disponible. Actualiza la página.')
  if (cambio.accion === 'eliminar') return actual.filter(item => item.id !== cambio.id)
  const evidencia = String(cambio.evidencia || '').trim()
  if (cambio.accion === 'realizar' && (!evidencia || evidencia.length > 1000)) throw new Error('Indica dónde compruebas el resultado (hasta 1000 caracteres).')
  return actual.map(item => item.id === cambio.id ? { ...item, hecho: cambio.accion === 'realizar', evidencia: cambio.accion === 'realizar' ? evidencia : null } : item)
}

export function totalesAlineamiento(items, codigo) {
  const propios = items.filter(item => item.codigo === codigo)
  return { alineado: propios.reduce((total, item) => total + item.cantidad, 0), hecho: propios.reduce((total, item) => total + (item.hecho ? item.cantidad : 0), 0) }
}
