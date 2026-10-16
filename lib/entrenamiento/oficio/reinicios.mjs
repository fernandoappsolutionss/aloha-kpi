// Compartido por todas las escrituras del oficio: una firma o un cuestionario
// en curso se resuelve antes del reinicio, o relee el progreso ya reiniciado.
export async function bloquearOficio(query, usuarioId) {
  await query`SELECT id FROM usuarios WHERE id = ${usuarioId} FOR UPDATE`
}

export const MOTIVOS_REINICIO = {
  persona_nueva: 'Persona nueva en el puesto',
  periodico: 'Reentrenamiento por tiempo',
  refuerzo: 'Refuerzo del entrenamiento',
}

export function validarReinicio(usuarioId, solicitud) {
  if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) return 'Usuario inválido.'
  if (!solicitud || !Object.hasOwn(MOTIVOS_REINICIO, solicitud.motivo)) return 'Selecciona el motivo del reinicio.'
  if (typeof solicitud.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(solicitud.id)) return 'Solicitud inválida. Cierra el diálogo y vuelve a intentarlo.'
  if (typeof solicitud.nota !== 'string' || solicitud.nota.trim().length > 500) return 'La nota admite hasta 500 caracteres.'
  return null
}

// El llamante verifica Master antes de abrir la transacción. No hay DELETE
// hasta que la copia completa (incluidos conceptos y firmantes) se guardó.
export async function archivarYReiniciar(query, usuarioId, actor, solicitud) {
  const error = validarReinicio(usuarioId, solicitud)
  if (error) return { error }
  await bloquearOficio(query, usuarioId)
  const [anterior] = await query`SELECT usuario_id, realizado_por FROM entrenamiento_oficio_reinicios WHERE id = ${solicitud.id}`
  if (anterior) {
    return Number(anterior.usuario_id) === usuarioId && Number(anterior.realizado_por) === Number(actor.id)
      ? { ok: true, repetido: true }
      : { error: 'Esta solicitud ya fue utilizada.' }
  }
  const [persona] = await query`
    SELECT u.id, u.nombre, u.email, u.rol, u.centro_id,
      ARRAY(SELECT centro_id FROM usuario_centros WHERE usuario_id = u.id ORDER BY centro_id) AS centros
    FROM usuarios u WHERE u.id = ${usuarioId}
  `
  if (!persona || !['administradora', 'asistente', 'coach', 'coordinador'].includes(persona.rol)) {
    return { error: 'Esta persona no tiene un puesto que se pueda reiniciar.' }
  }
  const progreso = await query`
    SELECT ep.*, f.nombre AS firmante_nombre, f.email AS firmante_email
    FROM entrenamiento_progreso ep LEFT JOIN usuarios f ON f.id = ep.drill_firmado_por
    WHERE ep.usuario_id = ${usuarioId} AND ep.modulo LIKE 'of-%' ORDER BY ep.modulo
  `
  const conceptos = await query`
    SELECT * FROM entrenamiento_conceptos WHERE usuario_id = ${usuarioId} AND modulo LIKE 'of-%' ORDER BY modulo, slug
  `
  if (!progreso.length && !conceptos.length) return { error: 'Esta persona ya está en cero: no tiene avance de oficio que reiniciar.' }
  const responsable = { id: actor.id, nombre: actor.nombre, email: actor.email, rol: actor.rol }
  await query`
    INSERT INTO entrenamiento_oficio_reinicios (id, usuario_id, realizado_por, motivo, nota, persona, responsable, progreso, conceptos)
    VALUES (${solicitud.id}, ${usuarioId}, ${actor.id}, ${solicitud.motivo}, ${solicitud.nota.trim()},
      ${JSON.stringify(persona)}::jsonb, ${JSON.stringify(responsable)}::jsonb, ${JSON.stringify(progreso)}::jsonb, ${JSON.stringify(conceptos)}::jsonb)
  `
  await query`DELETE FROM entrenamiento_conceptos WHERE usuario_id = ${usuarioId} AND modulo LIKE 'of-%'`
  await query`DELETE FROM entrenamiento_progreso WHERE usuario_id = ${usuarioId} AND modulo LIKE 'of-%'`
  return { ok: true }
}
