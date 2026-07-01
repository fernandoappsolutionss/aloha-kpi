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

// Etiqueta legible de cada ítem del checklist (misma redacción que la página de
// Cumplimiento). Se comparte para poder generar las Fortalezas/Debilidades del
// FODA a partir del cumplimiento real (vinculación cumplimiento ↔ FODA).
export const CUMPLIMIENTO_LABELS = {
  classdojo_activo: 'Classdojo activo',
  ninos_completos_classdojo: 'Niños completos en Classdojo',
  padres_conectados: 'Padres conectados',
  muro_informacion: 'Muro con información',
  bienvenida: 'Bienvenida publicada',
  calendario: 'Calendario publicado',
  clase_padres: 'Clase de padres',
  fotos_grupo: 'Fotos de grupo',
  seguimiento_evolucion: 'Seguimiento evolución',
  asistente_classdojo: 'Asistente activa',
  portafolio: 'Portafolio con retroalimentación',
  grupo_study: 'Grupo creado en Study',
  ninos_activos_study: 'Niños activos completos en Study',
  niveles_actualizados: 'Niveles actualizados',
  coach_activo: 'Coach activo',
  ninos_trabajando_study: 'Niños trabajando (gráfica)',
  asistencia_dias: 'Asistencia con días trabajados',
  centro_buen_estado: 'Centro en buen estado',
  aromatizante: 'Aromatizante en recepción',
  mesa_cafe: 'Mesa de café y té',
  brochure: 'Brochure en recepción',
  cartel_qr: 'Cartel QR para Google',
  wifi_gratis: 'Mensaje WIFI Gratis',
  saludo_cordial: 'Saludo cordial a padres',
  encuestas_satisfaccion: 'Encuestas de satisfacción',
  coach_estrella: 'Premiar Coach estrella del mes',
  reuniones_mensuales: 'Reuniones mensuales con equipo',
  monitoreo_camaras: 'Monitoreo de cámaras',
  actividades_equipo: 'Actividades internas del equipo',
  encuestas_equipo: 'Encuestas al equipo (semestral)',
  meta_cobranza: 'Meta de cobranza lograda',
  meta_desercion: 'Meta de deserción lograda',
  meta_nuevos_ingresos: 'Meta 20+ nuevos ingresos',
}

// % de cumplimiento de un centro en un trimestre: promedio de 'si' sobre el
// total de ítems, a partir de las filas de `cumplimiento` (1 por mes).
export function cumplimientoPct(rows) {
  let si = 0, tot = 0
  for (const row of rows) {
    for (const k of CUMPLIMIENTO_KEYS) { tot++; if (row[k] === 'si') si++ }
  }
  return tot ? Math.round((si / tot) * 100) : null
}

// Deriva Fortalezas/Debilidades del cumplimiento real del trimestre.
// Para cada ítem se toma su estado en el ÚLTIMO mes que tenga registro:
// 'si' → fortaleza, 'no' → debilidad. Así el FODA queda vinculado al
// cumplimiento de metas y al checklist operativo. `rows` = filas de
// `cumplimiento` del trimestre (cada una con su campo `mes`).
export function fortalezasDebilidades(rows) {
  const fortalezas = [], debilidades = []
  const ordered = [...(rows || [])].sort((a, b) => (a.mes || 0) - (b.mes || 0))
  for (const k of CUMPLIMIENTO_KEYS) {
    let estado = null
    for (const row of ordered) if (row[k] === 'si' || row[k] === 'no') estado = row[k]
    if (estado === 'si') fortalezas.push(CUMPLIMIENTO_LABELS[k])
    else if (estado === 'no') debilidades.push(CUMPLIMIENTO_LABELS[k])
  }
  return { fortalezas, debilidades }
}
