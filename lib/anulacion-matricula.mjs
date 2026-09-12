// La anulación revierte una matrícula que nunca inició. La ficha y todos sus
// movimientos permanecen como evidencia; los cálculos excluyen su identidad.
export const ESTADO_MATRICULA_ANULADA = 'matricula_anulada'
export const TIPO_ANULACION_MATRICULA = 'anulacion_matricula'

const iso = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '').slice(0, 10)
const fechaValida = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '')
  && !Number.isNaN(Date.parse(`${value}T12:00:00Z`))
  && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value

export const matriculaAnulada = (estudiante) => estudiante?.estado === ESTADO_MATRICULA_ANULADA

export function eventosSinMatriculasAnuladas(estudiantes = [], eventos = []) {
  const anulados = new Set(estudiantes.filter(matriculaAnulada).map((e) => String(e.id)))
  return eventos.filter((evento) => !anulados.has(String(evento.estudiante_id)))
}

export function validarSolicitudAnulacion({ fecha, motivo, hoy }) {
  if (typeof fecha !== 'string' || !fechaValida(fecha)) return 'La fecha de anulación debe ser una fecha válida (AAAA-MM-DD).'
  if (fecha > hoy) return 'La fecha de anulación no puede ser futura.'
  if (typeof motivo !== 'string' || !motivo.trim()) return 'Indica el motivo de la anulación y la devolución solicitada.'
  if (motivo.trim().length > 1000) return 'El motivo de anulación admite hasta 1000 caracteres.'
  return null
}

export function evaluarAnulacionMatricula({ estudiante, grupo, eventos = [], ultimaPresencia, fecha }) {
  if (!estudiante) return { error: 'El estudiante no pertenece a este centro.' }
  if (matriculaAnulada(estudiante)) return { error: 'Esta matrícula ya está anulada.' }
  if (!['activo', 'baja_potencial', 'retirado'].includes(estudiante.estado)) return { error: 'El estado del estudiante no permite anular la matrícula.' }
  if (ultimaPresencia || estudiante.ultima_asistencia) return { error: 'El niño tiene asistencia presente registrada. Corresponde registrar un retiro, no anular su matrícula.' }
  const ancla = iso(estudiante.fecha_inicio_nivel)
  if (ancla && ancla <= fecha) return { error: 'La fecha indicada es igual o posterior al inicio de clases. Corresponde registrar un retiro.' }
  if (Number(estudiante.nivel) >= 2) return { error: 'El niño ya tiene un nivel avanzado. Requiere revisión histórica antes de anular.' }
  const inscripciones = eventos.filter((e) => e.tipo === 'inscripcion')
  if (inscripciones.length > 1) return { error: 'Hay varias inscripciones en la historia. Revisa y corrige la ficha antes de anular.' }
  const inscripcion = inscripciones[0] || null
  const fechaVenta = iso(inscripcion?.fecha || estudiante.fecha_inscripcion)
  if (!fechaValida(fechaVenta)) return { error: 'Falta una fecha de inscripción confiable. Corrige la ficha antes de anular.' }
  if (fecha < fechaVenta) return { error: 'La anulación no puede ser anterior a la inscripción.' }
  if (estudiante.origen === 'traslado' || inscripcion?.origen === 'traslado'
    || eventos.some((e) => ['reincorporacion', 'cambio_nivel', 'graduacion_tiny', 'fusion'].includes(e.tipo)
      || (e.tipo === 'cambio_grupo' && e.de_grupo_id != null))) {
    return { error: 'La ficha tiene traslados, reincorporaciones o avance de nivel. Requiere revisión histórica; no se puede tratar como una matrícula sin inicio.' }
  }
  let fechaInicio = null
  if (estudiante.grupo_id != null) {
    if (!grupo || String(grupo.id) !== String(estudiante.grupo_id)) return { error: 'No se pudo verificar el grupo de inscripción.' }
    if (!inscripcion || String(inscripcion.a_grupo_id) !== String(grupo.id)) return { error: 'Falta una inscripción canónica vinculada al grupo. Revisa la historia antes de anular.' }
    const inicioGrupo = iso(grupo.fecha_inicio_clases)
    if (!fechaValida(inicioGrupo)) return { error: 'El grupo no tiene una fecha de inicio confiable. Corrige su fecha antes de anular.' }
    let plan = grupo.itinerario_clases
    if (typeof plan === 'string') { try { plan = JSON.parse(plan) } catch { plan = null } }
    if (Number(plan?.nivel) >= 2) return { error: 'El grupo ya tiene un nivel avanzado. Requiere revisión histórica antes de anular.' }
    fechaInicio = fechaVenta > inicioGrupo ? fechaVenta : inicioGrupo
    const primeraClase = (plan?.semanas || []).flatMap((semana) => semana.fechas || []).map(iso).filter(fechaValida).sort()[0]
    if (fechaInicio <= fecha || (primeraClase && primeraClase <= fecha)) {
      return { error: 'La fecha indicada es igual o posterior al inicio de clases. Corresponde registrar un retiro.' }
    }
  } else if (inscripcion || eventos.some((e) => e.a_grupo_id != null || e.de_grupo_id != null)) {
    return { error: 'La ficha tuvo un grupo anteriormente. Revisa la historia antes de anular.' }
  }
  const retiros = eventos.filter((e) => e.tipo === 'retiro')
  if (retiros.some((e) => !fechaValida(iso(e.fecha)) || (fechaInicio && iso(e.fecha) >= fechaInicio))) {
    return { error: 'Existe un retiro posterior al inicio de clases. Requiere una corrección histórica, no una anulación de matrícula.' }
  }
  if (estudiante.estado === 'retirado' && (!retiros.length || !fechaInicio)) {
    return { error: 'No hay evidencia suficiente para reclasificar este retiro. Revisa el evento y el inicio del grupo.' }
  }
  return { fechaVenta, fechaInicio, inscripcion, retiros }
}

// La venta, el retiro erróneo y el inicio que desaparecerían del cálculo
// necesitan meses abiertos. Incluye fecha real y periodo declarado legacy.
export function periodosAnulacionMatricula({ estudiante, grupo, eventos = [], fecha, hoy }) {
  const periodos = new Map()
  const agregar = (year, month) => {
    if (Number.isInteger(year) && year >= 2000 && Number.isInteger(month) && month >= 1 && month <= 12) {
      periodos.set(`${year}-${month}`, { year, month })
    }
  }
  const fechas = [fecha, hoy, estudiante.fecha_inscripcion, estudiante.fecha_inicio_nivel, estudiante.fecha_retiro, estudiante.retiro_programado_para, grupo?.fecha_inicio_clases]
  for (const evento of eventos) {
    if (!['inscripcion', 'retiro', 'retiro_programado'].includes(evento.tipo)) continue
    agregar(Number(evento.year), Number(evento.month))
    fechas.push(evento.fecha)
  }
  for (const value of fechas) {
    const date = iso(value)
    if (fechaValida(date)) agregar(Number(date.slice(0, 4)), Number(date.slice(5, 7)))
  }
  return [...periodos.values()].sort((a, b) => a.year * 100 + a.month - b.year * 100 - b.month)
}
