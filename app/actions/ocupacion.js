'use server'
import { sql } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { ocupacionRecursos } from '../../lib/ocupacion-recursos.mjs'

// Lectura del desplegable en Resumen. Los grupos llegan agregados: no hacen
// falta nombres ni fichas de alumnos para calcular niños por grupo y horario.
export async function getOcupacionCoach(centroId, coachId) {
  await requireCentroAccess(centroId)
  const [coaches, salones, grupos, horarios, reservas, asignaciones] = await Promise.all([
    sql`SELECT id, nombre, activo FROM coaches WHERE centro_id = ${centroId}`,
    sql`SELECT id, nombre, activo FROM salones WHERE centro_id = ${centroId}`,
    sql`SELECT g.id, g.numero, g.estado, g.itinerario, g.es_online, g.coach_id,
      COUNT(e.id)::int AS ninos,
      COUNT(e.id) FILTER (WHERE e.itinerario <> 'KINDER')::int AS ninos_no_kinder
      FROM grupos g LEFT JOIN estudiantes e ON e.grupo_id = g.id AND e.centro_id = g.centro_id
        AND e.estado IN ('activo', 'baja_potencial')
      WHERE g.centro_id = ${centroId} AND g.estado = 'activo'
      GROUP BY g.id ORDER BY g.numero`,
    sql`SELECT h.grupo_id, h.dia, h.hora_inicio, h.hora_fin, h.salon_id
      FROM grupo_horarios h JOIN grupos g ON g.id = h.grupo_id
      WHERE g.centro_id = ${centroId} AND g.estado = 'activo'`,
    sql`SELECT id, dia, hora_inicio, hora_fin, activo FROM centro_reservas
      WHERE centro_id = ${centroId} AND activo = TRUE`,
    sql`SELECT s.reserva_id, s.salon_id, s.rol, s.coach_id FROM centro_reserva_salones s
      JOIN centro_reservas r ON r.id = s.reserva_id WHERE r.centro_id = ${centroId} AND r.activo = TRUE`,
  ])
  if (!coaches.some(c => String(c.id) === String(coachId))) return null
  return ocupacionRecursos({ coaches, salones,
    grupos: grupos.map(g => ({ ...g, horarios: horarios.filter(h => String(h.grupo_id) === String(g.id)) })),
    reservas: reservas.map(r => ({ ...r, salones: asignaciones.filter(s => String(s.reserva_id) === String(r.id)) })),
  }).coaches.find(c => String(c.id) === String(coachId)) || null
}
