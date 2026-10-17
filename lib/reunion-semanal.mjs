import { rangoSemana, sumarDias, plazoCondicionVencido } from './semana-cierre.mjs'
import { nombreCondicion } from './condiciones/formulas.mjs'

// Arranque confirmado por Fernando: reunión 23/10, cierre 22/10, plan hasta 29/10.
export const PRIMER_CIERRE_REUNION = '2026-10-22'

export function estadoCalendarioPlan(semanaFin, now, zona) {
  const calendario = calendarioPlan(semanaFin)
  const preparacion = semanaFin < PRIMER_CIERRE_REUNION
  return { ...calendario, preparacion, plazoVencido: !preparacion && plazoCondicionVencido(semanaFin, now, zona) }
}

// El plan se identifica por el cierre observado, pero se ejecuta después de él.
export function calendarioPlan(semanaFin) {
  rangoSemana(semanaFin)
  return { cierre: semanaFin, reunion: sumarDias(semanaFin, 1), desde: sumarDias(semanaFin, 1), hasta: sumarDias(semanaFin, 7) }
}

export function estadoCondicion({ condicion, lectura } = {}) {
  if (condicion) return { condicion, nombre: nombreCondicion(condicion), origen: 'asignada', estado: 'Confirmada' }
  if (lectura?.condicion) return { condicion: lectura.condicion, nombre: nombreCondicion(lectura.condicion), origen: 'sugerida', estado: 'Referencia · pendiente de confirmar' }
  const nombre = lectura?.estado === 'recuperacion' ? 'Recuperación · revisar contexto'
    : lectura?.estado === 'historial_insuficiente' ? 'Historial insuficiente' : 'Sin datos suficientes'
  return { condicion: null, nombre, origen: 'sin_datos', estado: 'Revisar datos antes de asignar' }
}
