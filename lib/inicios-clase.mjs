function iso10(value) {
  if (!value) return null
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
}

export const INICIOS_CLASE_DESDE = 202608

export function usaIniciosClaseOperativos(year, month) {
  return (Number(year) * 100) + Number(month) >= INICIOS_CLASE_DESDE
}

function compareEvents(a, b) {
  const dateCompare = String(iso10(a?.fecha) || '').localeCompare(String(iso10(b?.fecha) || ''))
  if (dateCompare !== 0) return dateCompare
  return Number(a?.id || 0) - Number(b?.id || 0)
}

export function fechaInicioOperativa(estudiante, grupo, eventoInscripcion) {
  const fechaInscripcion = iso10(eventoInscripcion?.fecha) || iso10(estudiante?.fecha_inscripcion)
  const fechaGrupo = iso10(grupo?.fecha_inicio_clases)
  if (!fechaInscripcion) return fechaGrupo
  if (!fechaGrupo) return fechaInscripcion
  return fechaInscripcion > fechaGrupo ? fechaInscripcion : fechaGrupo
}

export function iniciosClase(estudiantes, grupos, eventos) {
  const gruposPorId = new Map((grupos || []).map((grupo) => [String(grupo.id), grupo]))
  const eventosPorEstudiante = new Map()

  for (const evento of eventos || []) {
    const key = String(evento.estudiante_id)
    const actuales = eventosPorEstudiante.get(key) || []
    actuales.push(evento)
    eventosPorEstudiante.set(key, actuales)
  }

  const filas = []
  for (const estudiante of estudiantes || []) {
    const eventosEstudiante = eventosPorEstudiante.get(String(estudiante.id)) || []
    const eventoInscripcion = eventosEstudiante
      .filter((evento) => evento.tipo === 'inscripcion')
      .sort(compareEvents)[0] || null
    const grupoId = eventoInscripcion?.a_grupo_id ?? estudiante.grupo_id ?? null
    const grupo = grupoId == null ? null : gruposPorId.get(String(grupoId)) || null
    const fechaInicio = fechaInicioOperativa(estudiante, grupo, eventoInscripcion)
    if (!fechaInicio) continue

    const retiroPrevio = eventosEstudiante.some((evento) =>
      evento.tipo === 'retiro' && iso10(evento.fecha) && iso10(evento.fecha) < fechaInicio
    )
    if (retiroPrevio) continue

    filas.push({
      estudianteId: estudiante.id,
      nombre: estudiante.nombre,
      estado: estudiante.estado,
      grupoId,
      grupoNumero: grupo?.numero || null,
      grupoEstado: grupo?.estado || null,
      coach: grupo?.coach || null,
      coachNombre: grupo?.coach?.nombre || null,
      itinerario: estudiante.itinerario || grupo?.itinerario || null,
      nivel: estudiante.nivel,
      fechaInscripcion: iso10(eventoInscripcion?.fecha) || iso10(estudiante.fecha_inscripcion),
      fechaInicioGrupo: iso10(grupo?.fecha_inicio_clases),
      fechaInicio,
      representante: estudiante.representante || null,
      correo: estudiante.correo || null,
      telefono: estudiante.telefono || null,
    })
  }

  return filas.sort((a, b) =>
    String(a.fechaInicio).localeCompare(String(b.fechaInicio)) ||
    String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es')
  )
}

export function iniciosClaseMes(estudiantes, grupos, eventos, year, month) {
  const prefijo = `${Number(year)}-${String(Number(month)).padStart(2, '0')}`
  return iniciosClase(estudiantes, grupos, eventos).filter((fila) => fila.fechaInicio.startsWith(prefijo))
}

export function balanceMensual({ inicio, nuevosActivos, reincorporados, retirados }) {
  return Number(inicio || 0) + Number(nuevosActivos || 0) + Number(reincorporados || 0) - Number(retirados || 0)
}

function numeroKpi(valor) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : 0
}

// Un mes cerrado es una fotografia historica. Solo el mes abierto se encadena
// dinamicamente al cierre anterior y se recalcula con los movimientos vivos.
export function inicioVisibleKpi({ estado, guardado, arrastrado }) {
  if (estado === 'cerrado') return numeroKpi(guardado)
  return arrastrado != null ? numeroKpi(arrastrado) : numeroKpi(guardado)
}

export function finalVisibleKpi({ estado, guardado, calculado }) {
  if (estado === 'cerrado' && guardado != null) return numeroKpi(guardado)
  return numeroKpi(calculado)
}

export function ajusteHistoricoKpi({ estado, inicioGuardado, cierreAnterior }) {
  if (estado !== 'cerrado' || cierreAnterior == null) return null
  const diferencia = numeroKpi(inicioGuardado) - numeroKpi(cierreAnterior)
  return diferencia === 0 ? null : diferencia
}

export function proyeccionSiguienteMes({ cierreActual, bajasPotenciales, iniciosProgramados }) {
  return Number(cierreActual || 0) - Number(bajasPotenciales || 0) + Number(iniciosProgramados || 0)
}

export function valorHistorialMes({ estado, guardado, cuadro, campo }) {
  const normalizar = (valor) => {
    const numero = Number(valor)
    return Number.isFinite(numero) ? numero : 0
  }

  if (estado !== 'cerrado' && cuadro?.vivo === true && cuadro[campo] != null) {
    return normalizar(cuadro[campo])
  }
  if (guardado != null) return normalizar(guardado)
  if (cuadro?.[campo] != null) return normalizar(cuadro[campo])
  return 0
}

export function resumenConCuadroVivo(filas, { year, month, estado, cuadro }) {
  if (!Array.isArray(filas) || estado === 'cerrado' || !cuadro) return filas

  const totales = cuadro.totales || {}
  const nuevosActivos = Array.isArray(cuadro.iniciosClase)
    ? cuadro.iniciosClase.length
    : (totales.nuevos ?? 0)

  return filas.map((fila) => {
    if (Number(fila.year) !== Number(year) || Number(fila.month) !== Number(month)) return fila
    return {
      ...fila,
      ninos_inicio_mes: totales.mesAnterior ?? fila.ninos_inicio_mes,
      ninos_final_mes: totales.aPagar ?? fila.ninos_final_mes,
      grupos_activos: totales.gruposActivos ?? fila.grupos_activos,
      nuevos_activos_mes: nuevosActivos,
    }
  })
}
