const valores = (inicio, final, activos) => ({ inicio, final, activos })

// Filas cerradas alteradas por la reconciliacion concurrente del 8-ago-2026.
// "despues" restaura la captura operativa auditada antes de esa escritura; en
// Anclas junio ademas corrige el cierre tardio con evidencia de ambos extremos.
export const REPARACIONES_HISTORICAS = [
  { centroId: 2, centro: 'ANCLAS MALL', periodo: '2026-06', year: 2026, month: 6, antes: valores(136, 135, 1), despues: valores(136, 148, 14) },
  { centroId: 2, centro: 'ANCLAS MALL', periodo: '2026-07', year: 2026, month: 7, antes: valores(135, 135, 14), despues: valores(148, 135, 0) },
  { centroId: 5, centro: 'DAVID', periodo: '2026-06', year: 2026, month: 6, antes: valores(150, 150, 16), despues: valores(163, 150, 3) },
  { centroId: 10, centro: 'LOS NARANJOS', periodo: '2026-02', year: 2026, month: 2, antes: valores(58, 77, 9), despues: valores(68, 77, 9) },
  { centroId: 10, centro: 'LOS NARANJOS', periodo: '2026-03', year: 2026, month: 3, antes: valores(77, 80, 7), despues: valores(73, 80, 7) },
  { centroId: 10, centro: 'LOS NARANJOS', periodo: '2026-04', year: 2026, month: 4, antes: valores(80, 74, 6), despues: valores(74, 74, 6) },
  { centroId: 10, centro: 'LOS NARANJOS', periodo: '2026-06', year: 2026, month: 6, antes: valores(89, 85, 0), despues: valores(88, 85, 0) },
  // Julio y su snapshot cerrado confirman que el centro inicio con 86 ninos.
  { centroId: 10, centro: 'LOS NARANJOS', periodo: '2026-06', year: 2026, month: 6, antes: valores(88, 85, 0), despues: valores(88, 86, 0) },
  { centroId: 10, centro: 'LOS NARANJOS', periodo: '2026-07', year: 2026, month: 7, antes: valores(85, 92, 12), despues: valores(86, 89, 8) },
]

const mismosValores = (actual, esperado) =>
  Number(actual?.inicio) === esperado.inicio &&
  Number(actual?.final) === esperado.final &&
  Number(actual?.activos) === esperado.activos

export function estadoReparacionHistorica(actual, reparacion) {
  if (mismosValores(actual, reparacion.despues)) return 'aplicada'
  if (mismosValores(actual, reparacion.antes)) return 'pendiente'
  return 'conflicto'
}
