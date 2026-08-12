// Constantes y helpers del módulo de operaciones (grupos, estudiantes, cuadro
// de negocio). Módulo plano (sin 'use server', sin BD) para poder importarlo
// desde acciones, cálculos y páginas. Fuente: manual de operaciones ALOHA.

export const ITINERARIOS = ['TINY', 'KIDS', 'KINDER']

// Nivel final de cada itinerario (= graduación). Manual: Tiny 1–10, Kids 1–8, Kinder 1–3.
export const NIVEL_MAX = { TINY: 10, KIDS: 8, KINDER: 3 }

export const ESTADOS_GRUPO = ['activo', 'cerrado', 'fusionado']

// baja_potencial = sigue este mes pero se va el próximo (estado del cuadro real).
export const ESTADOS_ESTUDIANTE = ['activo', 'baja_potencial', 'retirado']

// Status en la plataforma corporativa (columna de la hoja "Cantidad de Niños").
export const STATUS_PLATAFORMA = ['INCLUIR', 'ACTIVO', 'DESACTIVAR', 'CAMBIAR_NIVEL', 'CAMBIAR_GRUPO']

// Motivos de retiro del cuadro de deserciones (se reportan a corporativo).
export const MOTIVOS_RETIRO = ['GRADUADO', 'ECONOMICO', 'HORARIO', 'TECNICA', 'PERDIDA_CLASES', 'NO_CONFIRMO', 'INASISTENCIA', 'CAMBIO_CENTRO', 'OTRO']

// Etiqueta legible de cada motivo (misma redacción del cuadro real).
export const MOTIVOS_RETIRO_LABELS = {
  GRADUADO: 'Graduado',
  ECONOMICO: 'Económico',
  HORARIO: 'Horario',
  TECNICA: 'Técnica',
  PERDIDA_CLASES: 'Pérdida de clases',
  NO_CONFIRMO: 'No confirmó continuidad',
  INASISTENCIA: 'Inasistencia',
  CAMBIO_CENTRO: 'Cambio de centro',
  OTRO: 'Otro',
}

// Historial del estudiante (tabla estudiante_eventos.tipo).
// retiro_programado / retiro_cancelado (R5, g1-24): programación y cancelación
// del "retirar el próximo mes" — el retiro real sigue siendo tipo 'retiro'.
export const TIPOS_EVENTO = ['inscripcion', 'cambio_grupo', 'fusion', 'cambio_nivel', 'baja_potencial', 'retiro', 'reincorporacion', 'graduacion_tiny', 'retiro_programado', 'retiro_cancelado']

// De dónde entró el niño: clase de prueba, inscripción directa o traslado de centro.
export const ORIGENES = ['clase_prueba', 'directo', 'traslado']

// Canal comercial que genero la venta. Es independiente del origen tecnico
// anterior: una venta de clase de prueba tambien puede venir de un referido.
export const ORIGENES_VENTA = ['referido', 'marketing', 'centro', 'activaciones', 'medios']

export function esOrigenVenta(value) {
  return ORIGENES_VENTA.includes(String(value || '').toLowerCase())
}

export function requiereOrigenVenta(fecha) {
  const value = fechaIso10(fecha)
  return Boolean(value && value >= '2026-08-01')
}

// Días de la semana indexados 1..7 (grupo_horarios.dia); el índice 0 queda vacío.
export const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// Productos de los pedidos de material del cuadro (sección KIT/ÁBACO).
export const PRODUCTOS_MATERIAL = ['KIT', 'ABACO', 'LIBRO', 'SUETER', 'MOCHILA', 'OTRO']

// Apertura mínima por itinerario y nivel (regla del manual):
// TINY nivel 1 → 8 (ideal 8–10), niveles 2+ → 6 · KIDS nivel 1 → 10, niveles 2+ → 6 · KINDER → 3.
export function aperturaMinima(itinerario, nivel) {
  if (itinerario === 'KINDER') return 3
  if (itinerario === 'KIDS') return nivel === 1 ? 10 : 6
  return nivel === 1 ? 8 : 6
}

// Tope de nivel TINY que un coach domina, derivado de su nivel KIDS (manual):
// kids 1→tiny 3, 2→3, 3→4, 4→6, 5→7, 6→8, 7→9, 8→10. 0 = sin certificación registrada.
export const TINYMAP = { 0: 0, 1: 3, 2: 3, 3: 4, 4: 6, 5: 7, 6: 8, 7: 9, 8: 10 }

// Fecha de HOY del negocio (AAAA-MM-DD) en hora de Panamá. NUNCA usar
// toISOString() para fechar eventos: el servidor corre en UTC (Vercel) y los
// centros operan hasta las 7:30 p. m., así que todo lo capturado en la tarde
// caería en el día siguiente — y a fin de mes, en el mes siguiente del cuadro.
// El locale en-CA formatea AAAA-MM-DD.
export const hoyISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Panama' })

// Una fecha leída de la BD puede llegar como Date (el driver de Neon devuelve
// las columnas DATE así) o como string ISO. SIEMPRE normalizar antes de
// comparar contra 'AAAA-MM-DD': String(Date) da "Fri Jul 03 2026…" y la
// comparación alfabética miente (un grupo con fecha de inicio quedaba
// excluido del cuadro para siempre).
export function fechaIso10(v) {
  if (!v) return null
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)
}

export function estudianteVivo(e) {
  return e?.estado === 'activo' || e?.estado === 'baja_potencial'
}

export function grupoOperativoConNinos(grupo, estudiantes = []) {
  if (!grupo || grupo.estado !== 'activo' || grupo.es_online || grupo.es_reserva) return false
  return (estudiantes || []).some((e) =>
    String(e.grupo_id) === String(grupo.id) && estudianteVivo(e)
  )
}
