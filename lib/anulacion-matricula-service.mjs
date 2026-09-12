import { evaluarAnulacionMatricula, periodosAnulacionMatricula } from './anulacion-matricula.mjs'

// El caller autoriza centro/usuario y abre una transacción SERIALIZABLE.
// Dependencias recibidas para probar que ninguna denegación modifica la ficha.
export async function anularMatriculaEn(query, { centroId, estudianteId, fecha, motivo, hoy, actor }, { bloquearMesesEditables, encolarSyncCrm }) {
  const [pre] = await query`SELECT * FROM estudiantes WHERE id = ${estudianteId} AND centro_id = ${centroId}`
  if (!pre) return { error: 'El estudiante no pertenece a este centro.' }
  // Mismo orden del alta y edición: grupos → meses → estudiantes.
  const [grupo] = pre.grupo_id == null ? [] : await query`
    SELECT * FROM grupos WHERE id = ${pre.grupo_id} AND centro_id = ${centroId} FOR UPDATE
  `
  const eventosPrevios = await query`
    SELECT * FROM estudiante_eventos WHERE estudiante_id = ${estudianteId} AND centro_id = ${centroId} ORDER BY fecha, id
  `
  const periodos = periodosAnulacionMatricula({ estudiante: pre, grupo, eventos: eventosPrevios, fecha, hoy })
  const errorMes = await bloquearMesesEditables(query, centroId, periodos)
  if (errorMes) return { error: `${errorMes} La anulación afecta la venta y sus movimientos originales; solicita reabrir los periodos afectados para la corrección histórica.` }
  const [estudiante] = await query`
    SELECT * FROM estudiantes WHERE id = ${estudianteId} AND centro_id = ${centroId} FOR UPDATE
  `
  if (!estudiante || String(estudiante.grupo_id ?? '') !== String(pre.grupo_id ?? '') || estudiante.estado !== pre.estado) {
    return { error: 'La ficha cambió mientras anulabas la matrícula. Recarga y vuelve a revisar.' }
  }
  const [asistencia] = await query`
    SELECT MAX(fecha) AS ultima FROM asistencias WHERE estudiante_id = ${estudianteId} AND estado = 'presente'
  `
  const evaluacion = evaluarAnulacionMatricula({ estudiante, grupo, eventos: eventosPrevios, ultimaPresencia: asistencia?.ultima, fecha })
  if (evaluacion.error) return evaluacion
  const detalle = {
    actor, estado_previo: estudiante.estado, fecha_inscripcion: evaluacion.fechaVenta,
    fecha_inicio_prevista: evaluacion.fechaInicio, fecha_inicio_nivel_previa: estudiante.fecha_inicio_nivel,
    inscripcion_evento_id: evaluacion.inscripcion?.id || null,
    retiros_reclasificados: evaluacion.retiros.map((e) => ({ id: e.id, fecha: e.fecha, motivo: e.motivo })),
    retiro_programado_previo: estudiante.retiro_programado_para,
  }
  await query`
    UPDATE estudiantes SET estado = 'matricula_anulada', status_plataforma = 'DESACTIVAR',
      retiro_programado_para = NULL, motivo_retiro = NULL, fecha_retiro = NULL, updated_at = now()
    WHERE id = ${estudianteId} AND centro_id = ${centroId}
  `
  const [year, month] = fecha.split('-').map(Number)
  await query`
    INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, de_grupo_id, motivo, detalle)
    VALUES (${estudianteId}, ${centroId}, 'anulacion_matricula', ${year}, ${month}, ${fecha}, ${estudiante.grupo_id}, ${motivo}, ${JSON.stringify(detalle)})
  `
  if (estudiante.grupo_id != null) await encolarSyncCrm([estudiante.grupo_id], 'anulacion_matricula', query)
  return { ok: true, estado: 'matricula_anulada', fechaAnulacion: fecha, grupoId: estudiante.grupo_id }
}
