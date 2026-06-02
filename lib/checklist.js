// Claves del checklist de cumplimiento (33 ítems), en el mismo orden que la
// hoja "Cumplimiento" de los Excel y la tabla `cumplimiento`. Módulo plano
// (sin 'use server') para poder importarlo desde acciones y utilidades.
export const CUMPLIMIENTO_KEYS = [
  'classdojo_activo', 'ninos_completos_classdojo', 'padres_conectados', 'muro_informacion', 'bienvenida',
  'calendario', 'clase_padres', 'fotos_grupo', 'seguimiento_evolucion', 'asistente_classdojo', 'portafolio',
  'grupo_study', 'ninos_activos_study', 'niveles_actualizados', 'coach_activo', 'ninos_trabajando_study', 'asistencia_dias',
  'centro_buen_estado', 'aromatizante', 'mesa_cafe', 'brochure', 'cartel_qr', 'wifi_gratis', 'saludo_cordial', 'encuestas_satisfaccion',
  'coach_estrella', 'reuniones_mensuales', 'monitoreo_camaras', 'actividades_equipo', 'encuestas_equipo',
  'meta_cobranza', 'meta_desercion', 'meta_nuevos_ingresos',
]

// % de cumplimiento de un centro en un trimestre: promedio de 'si' sobre el
// total de ítems, a partir de las filas de `cumplimiento` (1 por mes).
export function cumplimientoPct(rows) {
  let si = 0, tot = 0
  for (const row of rows) {
    for (const k of CUMPLIMIENTO_KEYS) { tot++; if (row[k] === 'si') si++ }
  }
  return tot ? Math.round((si / tot) * 100) : null
}
