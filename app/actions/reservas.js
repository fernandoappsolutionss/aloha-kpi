'use server'
import { sql } from '../../lib/db'
import { requireCentroAccess, requireCurrentPuedeEliminar } from '../../lib/auth'
import { fallo } from '../../lib/errores'
import { aMinutos, aHora, aperturaDe, CIERRE_MIN } from '../../lib/inventario'
import { ROLES_RESERVA, DURACION_CLASE_PRUEBA_MIN, franjaSugerida } from '../../lib/reservas'

const HORA_RE = /^\d{2}:\d{2}$/

// Reservas del centro (clase de prueba) con sus salones por rol.
export async function listarReservas(centroId) {
  await requireCentroAccess(centroId)
  const rs = await sql`
    SELECT id, tipo, dia, hora_inicio, hora_fin, activo, notas
    FROM centro_reservas WHERE centro_id = ${centroId} AND activo = TRUE
    ORDER BY dia, hora_inicio
  `
  if (!rs.length) return []
  const ids = rs.map((r) => r.id)
  const ss = await sql`
    SELECT reserva_id, salon_id, rol, coach_id FROM centro_reserva_salones
    WHERE reserva_id = ANY(${ids})
  `
  return rs.map((r) => ({ ...r, salones: ss.filter((s) => s.reserva_id === r.id) }))
}

// Franja que propone el sistema para un día, según la regla del negocio.
export async function sugerenciaReserva(centroId, dia) {
  await requireCentroAccess(centroId)
  const d = Number(dia)
  const f = franjaSugerida(d)
  return { dia: d, hora_inicio: aHora(f.inicio), hora_fin: aHora(f.fin) }
}

export async function guardarReserva(centroId, data) {
  try {
    await requireCentroAccess(centroId)
    const dia = Number(data?.dia)
    if (!(dia >= 1 && dia <= 7)) return { error: 'Día inválido (1 = lunes … 7 = domingo).' }
    if (!HORA_RE.test(data?.hora_inicio || '') || !HORA_RE.test(data?.hora_fin || '')) {
      return { error: 'Las horas van en formato HH:MM.' }
    }
    const ini = aMinutos(data.hora_inicio)
    const fin = aMinutos(data.hora_fin)
    if (fin <= ini) return { error: 'La hora de fin debe ser posterior a la de inicio.' }
    if (fin - ini !== DURACION_CLASE_PRUEBA_MIN) {
      return { error: `La clase de prueba dura 1 h 30 (recibí ${(fin - ini) / 60} h).` }
    }
    if (ini < aperturaDe(dia) || fin > CIERRE_MIN) {
      return { error: 'La clase de prueba queda fuera del horario de operación del centro.' }
    }
    // Un salón por rol: padres, Tiny y Kids. Tiny y Kids llevan su propio
    // coach (son dos clases a la misma hora); a los papás los recibe la
    // administración, por eso ese rol puede ir sin coach.
    const salones = []
    for (const s of data?.salones || []) {
      const rol = String(s?.rol || '').toLowerCase()
      if (!ROLES_RESERVA.includes(rol)) return { error: `Rol inválido: ${s?.rol}.` }
      const salonId = parseInt(s?.salon_id)
      if (!Number.isFinite(salonId)) return { error: `Falta el salón de ${rol}.` }
      const [ok] = await sql`SELECT id FROM salones WHERE id = ${salonId} AND centro_id = ${centroId}`
      if (!ok) return { error: 'Un salón no pertenece a este centro.' }
      let coachId = parseInt(s?.coach_id)
      if (!Number.isFinite(coachId)) coachId = null
      if (coachId) {
        const [okC] = await sql`SELECT id FROM coaches WHERE id = ${coachId} AND centro_id = ${centroId}`
        if (!okC) return { error: 'Un coach no pertenece a este centro.' }
      }
      salones.push({ salon_id: salonId, rol, coach_id: coachId })
    }
    if (!salones.length) return { error: 'Indica al menos un salón para la clase de prueba.' }
    // El mismo coach no puede dar Tiny y Kids a la vez.
    const conCoach = salones.filter((s) => s.coach_id).map((s) => s.coach_id)
    if (new Set(conCoach).size !== conCoach.length) {
      return { error: 'Un mismo coach no puede atender dos salones a la misma hora: Tiny y Kids necesitan coaches distintos.' }
    }

    // Choque con grupos ya abiertos en esos salones (mismo criterio de buffer
    // que usa el módulo: lo valida el propio calendario al pintar, aquí se
    // avisa antes de guardar).
    const now = new Date().toISOString()
    let id = parseInt(data?.id) || null
    if (id) {
      const r = await sql`
        UPDATE centro_reservas SET dia = ${dia}, hora_inicio = ${data.hora_inicio}, hora_fin = ${data.hora_fin},
          notas = ${data?.notas?.trim() || null}, updated_at = ${now}
        WHERE id = ${id} AND centro_id = ${centroId} RETURNING id`
      if (!r.length) return { error: 'La reserva no pertenece a este centro.' }
      await sql`DELETE FROM centro_reserva_salones WHERE reserva_id = ${id}`
    } else {
      const [nueva] = await sql`
        INSERT INTO centro_reservas (centro_id, tipo, dia, hora_inicio, hora_fin, notas, updated_at)
        VALUES (${centroId}, 'clase_prueba', ${dia}, ${data.hora_inicio}, ${data.hora_fin},
                ${data?.notas?.trim() || null}, ${now})
        RETURNING id`
      id = nueva.id
    }
    for (const s of salones) {
      await sql`INSERT INTO centro_reserva_salones (reserva_id, salon_id, rol, coach_id)
                VALUES (${id}, ${s.salon_id}, ${s.rol}, ${s.coach_id})
                ON CONFLICT (reserva_id, salon_id, rol) DO UPDATE SET coach_id = EXCLUDED.coach_id`
    }
    return { ok: true, id }
  } catch (e) {
    return fallo('guardarReserva', e)
  }
}

export async function eliminarReserva(centroId, id) {
  try {
    await requireCurrentPuedeEliminar(centroId)
    const r = await sql`DELETE FROM centro_reservas WHERE id = ${id} AND centro_id = ${centroId} RETURNING id`
    if (!r.length) return { error: 'La reserva no pertenece a este centro.' }
    return { ok: true }
  } catch (e) {
    return fallo('eliminarReserva', e)
  }
}
