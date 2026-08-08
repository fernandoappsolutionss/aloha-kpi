const valores = (inicio, final, activos) => ({ inicio, final, activos })

// Ultimos cierres cuyo snapshot sustituyo el resultado que mostraba KPI.
// La evidencia previa al cambio conserva inicio, activos y retiros declarados.
export const REPARACIONES_HISTORICAS = [
  { centroId: 1, centro: 'BRISAS DEL GOLF', periodo: '2026-07', year: 2026, month: 7, antes: valores(205, 205, 0), despues: valores(205, 189, 0) },
  { centroId: 2, centro: 'ANCLAS MALL', periodo: '2026-07', year: 2026, month: 7, antes: valores(148, 135, 0), despues: valores(135, 122, 0) },
  { centroId: 10, centro: 'LOS NARANJOS', periodo: '2026-07', year: 2026, month: 7, antes: valores(86, 89, 8), despues: valores(85, 88, 8) },
]

const mismosValores = (actual, esperado) =>
  Number(actual?.inicio) === esperado.inicio &&
  Number(actual?.final) === esperado.final &&
  Number(actual?.activos) === esperado.activos

export function estadoReparacionHistorica(actual, reparacion) {
  if (mismosValores(actual, reparacion.despues)) return 'aplicada'
  const estadosAnteriores = [reparacion.antes, ...(reparacion.alternativasAntes || [])]
  if (estadosAnteriores.some((esperado) => mismosValores(actual, esperado))) return 'pendiente'
  return 'conflicto'
}

export function guardiaReparacionHistorica(actual, reparacion) {
  return {
    antes: valores(Number(actual?.inicio), Number(actual?.final), Number(actual?.activos)),
    despues: reparacion.despues,
  }
}
