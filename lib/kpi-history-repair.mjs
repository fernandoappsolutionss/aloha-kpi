const valores = (inicio, final, activos) => ({ inicio, final, activos })

// Reversion del doble descuento del 8-ago-2026.
//
// Los retiros que el centro declara en la captura SEMANAL de un mes son los
// MISMOS que el modulo ya desconto por la fecha real de cada niño. Restar el
// declarado sobre un cierre que ya los descontó cuenta dos veces a la misma
// gente. Eso fue lo que bajo Brisas julio de 205 a 189 (205 - 16 declarados,
// cuando esos 16 ya estaban descontados con fecha de mayo/junio).
//
// El cierre real de Brisas en julio es 205, y lo dicen tres fuentes
// independientes entre si: el cuadro de negocio del propio centro (205 niños ·
// $2.460), el arranque de agosto (205) y los niños activos vigentes (205).
//
// Las entradas de ANCLAS (135->122) y LOS NARANJOS (85->88) que vivian aqui
// eran el mismo doble descuento sin aplicar todavia: se retiran para que nadie
// las dispare. Anclas julio cierra en 135 (su cuadro dice 135 y agosto arranca
// en 135) y Los Naranjos en 89 (89 activos hoy).
export const REPARACIONES_HISTORICAS = [
  { centroId: 1, centro: 'BRISAS DEL GOLF', periodo: '2026-07', year: 2026, month: 7, antes: valores(205, 189, 0), despues: valores(205, 205, 0) },
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
