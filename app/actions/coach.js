'use server'
// Acciones del LINK DE COACH: autenticadas por el token del grupo (sin sesión).
// El coach recibe /coach/<token> y ahí marca la asistencia de cada clase del
// itinerario y lleva sus notas por niño (formato de la lista de Anclas Mall).
import { sql, upsert } from '../../lib/db'
import { horarioTextoDe } from '../../lib/modelo'

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/
const ESTADOS = ['presente', 'ausente', 'justificada']

async function grupoPorToken(token) {
  if (!token || String(token).length < 16) return null
  const [g] = await sql`
    SELECT g.*, c.nombre AS centro_nombre FROM grupos g
    JOIN centros c ON c.id = g.centro_id
    WHERE g.coach_token = ${String(token)}
  `
  return g || null
}

// Carga de la página del coach: grupo, itinerario, roster y asistencia.
export async function loadGrupoCoach(token) {
  const g = await grupoPorToken(token)
  if (!g) return { error: 'Link inválido. Pídele al administrador el link actualizado del grupo.' }
  const [coach] = g.coach_id
    ? await sql`SELECT nombre FROM coaches WHERE id = ${g.coach_id}`
    : [null]
  const horarios = await sql`
    SELECT dia, hora_inicio, hora_fin FROM grupo_horarios WHERE grupo_id = ${g.id} ORDER BY dia, hora_inicio
  `
  const estudiantes = await sql`
    SELECT id, nombre, itinerario, nivel, estado, nota_coach FROM estudiantes
    WHERE grupo_id = ${g.id} AND estado IN ('activo', 'baja_potencial')
    ORDER BY nombre
  `
  const asistencias = await sql`
    SELECT estudiante_id, fecha, estado FROM asistencias WHERE grupo_id = ${g.id}
  `
  return {
    grupo: {
      numero: g.numero,
      itinerario: g.itinerario,
      centro: g.centro_nombre || '',
      coach: coach?.nombre || null,
      horarioTexto: horarioTextoDe(horarios),
      estado: g.estado,
      itinerario_clases: typeof g.itinerario_clases === 'string' ? JSON.parse(g.itinerario_clases) : g.itinerario_clases,
    },
    estudiantes,
    asistencias: asistencias.map((a) => ({
      estudiante_id: a.estudiante_id,
      fecha: String(a.fecha).slice(0, 10),
      estado: a.estado,
    })),
  }
}

// Marca la asistencia de un niño en una fecha del itinerario.
// estado: 'presente' | 'ausente' | 'justificada' | null (borrar la marca).
// Presente actualiza estudiantes.ultima_asistencia — así el retiro del cuadro
// (norma: se declara en el mes en que vio clases) sale de datos reales.
export async function marcarAsistencia(token, estudianteId, fecha, estado) {
  const g = await grupoPorToken(token)
  if (!g) return { error: 'Link inválido.' }
  if (!FECHA_RE.test(String(fecha || ''))) return { error: 'Fecha inválida.' }
  const [e] = await sql`
    SELECT id FROM estudiantes WHERE id = ${estudianteId} AND grupo_id = ${g.id}
  `
  if (!e) return { error: 'El niño ya no está en este grupo.' }
  if (estado == null || estado === '') {
    await sql`DELETE FROM asistencias WHERE estudiante_id = ${estudianteId} AND fecha = ${fecha}`
    return { ok: true }
  }
  if (!ESTADOS.includes(estado)) return { error: 'Estado de asistencia inválido.' }
  await upsert('asistencias', {
    grupo_id: g.id, estudiante_id: estudianteId, fecha, estado,
    updated_at: new Date().toISOString(),
  }, ['estudiante_id', 'fecha'])
  if (estado === 'presente') {
    await sql`
      UPDATE estudiantes SET ultima_asistencia = GREATEST(COALESCE(ultima_asistencia, ${fecha}::date), ${fecha}::date)
      WHERE id = ${estudianteId}
    `
  }
  return { ok: true }
}

// Nota del coach sobre un niño (puntuación, status, observaciones — texto libre).
export async function guardarNotaCoach(token, estudianteId, nota) {
  const g = await grupoPorToken(token)
  if (!g) return { error: 'Link inválido.' }
  const [e] = await sql`SELECT id FROM estudiantes WHERE id = ${estudianteId} AND grupo_id = ${g.id}`
  if (!e) return { error: 'El niño ya no está en este grupo.' }
  const texto = String(nota ?? '').trim().slice(0, 2000) || null
  await sql`UPDATE estudiantes SET nota_coach = ${texto}, updated_at = ${new Date().toISOString()} WHERE id = ${estudianteId}`
  return { ok: true }
}
