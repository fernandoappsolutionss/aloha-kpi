// Clase de prueba: la sala reservada en el calendario. Cálculo puro, sin BD.
//
// Regla del negocio (Fernando, ago-2026):
//   El día que el centro dedica a clase de prueba NO se arma con grupos de
//   1 hora: ese día los grupos son de 2 h y arrancan a las 4:30 pm, y la
//   prueba va ANTES. El sábado es la excepción: la prueba va en el ÚLTIMO
//   turno, después de la tercera jornada.
//   La prueba dura 1 h 30 y ocupa varios salones a la vez, uno por rol:
//   padres, Tiny y Kids.
//
// DECISIÓN DE DISEÑO: en vez de sumarle un parámetro `reservas` a media
// docena de funciones del motor (huecos, calendario, inventario, coaches
// libres, unidades del modelo) —donde olvidar un call site falla en SILENCIO,
// ofreciendo una franja que en realidad está ocupada— una reserva se convierte
// en un PSEUDO-GRUPO con la forma que el motor ya consume. Así el bloqueo, el
// buffer y el descuento de inventario salen gratis y son imposibles de saltar.
import { aMinutos, aHora12, BUFFER_MIN } from './inventario'

export const DURACION_CLASE_PRUEBA_MIN = 90
export const ROLES_RESERVA = ['padres', 'tiny', 'kids']
export const ROL_LABEL = { padres: 'Padres', tiny: 'Tiny', kids: 'Kids' }

// Los grupos del día de prueba arrancan aquí (entre semana).
export const INICIO_GRUPOS_DIA_PRUEBA = 16 * 60 + 30 // 4:30 pm

// Convierte las reservas en pseudo-grupos. Un horario POR SALÓN ocupado: así
// el calendario pinta cada columna por su cuenta y el bloqueo es por salón
// (un cuarto salón libre se sigue vendiendo).
export function reservasComoGrupos(reservas) {
  return (reservas || []).map((r) => ({
    id: `r${r.id}`,
    es_reserva: true,
    reserva: r,
    estado: 'activo',
    es_online: false,
    numero: null,
    coach_id: r.coach_id || null,
    itinerario: null,
    estudiantes: [],
    horarios: (r.salones || []).map((s) => ({
      id: `r${r.id}-${s.salon_id}-${s.rol}`,
      grupo_id: `r${r.id}`,
      dia: r.dia,
      hora_inicio: r.hora_inicio,
      hora_fin: r.hora_fin,
      salon_id: s.salon_id,
      rol: s.rol,
    })),
  }))
}

// ¿Qué días de la semana tienen clase de prueba? (Set de 1..7)
export function diasConPrueba(reservas) {
  return new Set((reservas || []).filter((r) => r.activo !== false).map((r) => Number(r.dia)))
}

export function textoReserva(reserva, salonesPorId) {
  const roles = (reserva?.salones || [])
    .map((s) => `${ROL_LABEL[s.rol] || s.rol}: ${salonesPorId?.get?.(String(s.salon_id)) || 'salón'}`)
    .join(' · ')
  const a = aHora12(aMinutos(reserva.hora_inicio))
  const b = aHora12(aMinutos(reserva.hora_fin))
  return `${a}–${b}${roles ? ' · ' + roles : ''}`
}

// Franja sugerida para la clase de prueba de un día, según la regla:
//   - Sábado: en el último turno, después de la tercera jornada.
//   - Lun–Vie: justo antes de que arranquen los grupos de 2 h de las 4:30 pm,
//     dejando el buffer entre clases.
// `finUltimaJornadaSabado` en minutos (por defecto 4:00 pm, la parrilla actual).
export function franjaSugerida(dia, finUltimaJornadaSabado = 16 * 60) {
  const inicio = dia === 6
    ? finUltimaJornadaSabado + BUFFER_MIN
    : INICIO_GRUPOS_DIA_PRUEBA - BUFFER_MIN - DURACION_CLASE_PRUEBA_MIN
  return { inicio, fin: inicio + DURACION_CLASE_PRUEBA_MIN }
}
