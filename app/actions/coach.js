'use server'
// Acciones del LINK DE COACH: autenticadas por el token del grupo (sin sesión).
// El coach recibe /coach/<token> y ahí marca la asistencia de cada clase del
// itinerario y lleva sus notas por niño (formato de la lista de Anclas Mall).
import { sql, withTransaction, upsertWith } from '../../lib/db'
import { horarioTextoDe } from '../../lib/modelo'
import { hoyISO } from '../../lib/operaciones'
import { bloquearMesesEditables } from '../../lib/mes-kpi'
import { errorFechaAsistencia } from '../../lib/retiros.mjs'

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

// itinerario_clases llega como objeto (JSONB) o, defensivamente, como string.
const itinerarioDe = (g) => {
  const it = g?.itinerario_clases
  if (it == null) return null
  if (typeof it === 'string') {
    try { return JSON.parse(it) } catch { return null }
  }
  return it
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
      itinerario_clases: itinerarioDe(g),
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
// (g1-23) Evidencia confiable: la fecha debe ser una clase REAL del calendario
// versionado del grupo y <= hoy Panamá (nada de marcar el futuro), y respeta
// el bloqueo de mes. La escritura toma el MISMO lock de estudiante que el
// retiro (el EXISTS del retiro corre sobre esta misma fila bloqueada) y
// estudiantes.ultima_asistencia se RECALCULA server-side en cada cambio —
// también al borrar o degradar una presencia (salió del contrato público).
export async function marcarAsistencia(token, estudianteId, fecha, estado) {
  const g = await grupoPorToken(token)
  if (!g) return { error: 'Link inválido.' }
  const f = String(fecha || '').slice(0, 10)
  if (!FECHA_RE.test(f)) return { error: 'Fecha inválida.' }
  const hoy = hoyISO()
  const errFecha = errorFechaAsistencia(itinerarioDe(g), f, hoy)
  if (errFecha) return { error: errFecha }
  const borrar = estado == null || estado === ''
  if (!borrar && !ESTADOS.includes(estado)) return { error: 'Estado de asistencia inválido.' }
  const [y, m] = f.split('-').map(Number)

  return await withTransaction(async (query) => {
    // Orden de locks del repo (mes_kpi → estudiantes): el mes de la clase debe
    // seguir abierto — un mes cerrado es histórico congelado.
    const errorMes = await bloquearMesesEditables(query, g.centro_id, [{ year: y, month: m }])
    if (errorMes) return { error: errorMes }
    const [e] = await query`
      SELECT id FROM estudiantes WHERE id = ${estudianteId} AND grupo_id = ${g.id} FOR UPDATE
    `
    if (!e) return { error: 'El niño ya no está en este grupo.' }
    if (borrar) {
      await query`DELETE FROM asistencias WHERE estudiante_id = ${estudianteId} AND fecha = ${f}`
    } else {
      await upsertWith(query, 'asistencias', {
        grupo_id: g.id, estudiante_id: estudianteId, fecha: f, estado,
        updated_at: new Date().toISOString(),
      }, ['estudiante_id', 'fecha'])
    }
    // ultima_asistencia derivada: el máximo PRESENTE real del niño, recalculado
    // en la misma transacción (cubre marcar, cambiar y borrar).
    await query`
      UPDATE estudiantes SET ultima_asistencia = (
        SELECT MAX(fecha) FROM asistencias WHERE estudiante_id = ${estudianteId} AND estado = 'presente'
      )
      WHERE id = ${estudianteId}
    `
    return { ok: true }
  })
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
