function iso10(value) {
  if (!value) return null
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
}

export const INICIOS_CLASE_DESDE = 202608
export const ESTADO_MES_CERRANDO = 'cerrando'

export function estadoMesPermiteCambios(estado) {
  return estado == null || estado === 'abierto'
}

export function usaIniciosClaseOperativos(year, month) {
  return (Number(year) * 100) + Number(month) >= INICIOS_CLASE_DESDE
}

function compareEvents(a, b) {
  const dateCompare = String(iso10(a?.fecha) || '').localeCompare(String(iso10(b?.fecha) || ''))
  if (dateCompare !== 0) return dateCompare
  return Number(a?.id || 0) - Number(b?.id || 0)
}

// Un grupo que ya cursa nivel 2 o superior YA dio su primera clase, por
// definición: para llegar al nivel 2 hubo que cerrar el 1. Su
// fecha_inicio_clases es el arranque del NIVEL vigente (regla de Fernando
// 2026-08-08: el itinerario arranca con el inicio de clases y se regenera en
// cada nivel), no la primera clase del grupo. Sin esta distinción, cada cambio
// de nivel volvería a contar como "nuevos activos" a niños que llevan años.
export function grupoYaDioClases(grupo) {
  const nivel = Number(grupo?.itinerario_clases?.nivel)
  return Number.isFinite(nivel) && nivel > 1
}

export function fechaInicioOperativa(estudiante, grupo, eventoInscripcion) {
  const fechaInscripcion = iso10(eventoInscripcion?.fecha) || iso10(estudiante?.fecha_inscripcion)
  const fechaGrupo = grupoYaDioClases(grupo) ? null : iso10(grupo?.fecha_inicio_clases)
  if (!fechaInscripcion) return fechaGrupo
  if (!fechaGrupo) return fechaInscripcion
  return fechaInscripcion > fechaGrupo ? fechaInscripcion : fechaGrupo
}

function periodoFecha(value) {
  const fecha = iso10(value)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return null
  return { year: Number(fecha.slice(0, 4)), month: Number(fecha.slice(5, 7)) }
}

function agregarRangoPeriodos(destino, desde, hasta) {
  const inicio = periodoFecha(desde)
  const fin = periodoFecha(hasta)
  if (!inicio && !fin) return
  const indice = (periodo) => periodo.year * 12 + periodo.month - 1
  const a = indice(inicio || fin)
  const b = indice(fin || inicio)
  const menor = Math.min(a, b)
  const mayor = Math.max(a, b)
  for (let actual = menor; actual <= mayor; actual++) {
    const year = Math.floor(actual / 12)
    const month = (actual % 12) + 1
    destino.set(`${year}-${String(month).padStart(2, '0')}`, { year, month })
  }
}

// Cambiar la fecha inicial de un grupo puede mover el inicio efectivo de cada
// niño (max entre venta e inicio del grupo). Se protegen todos los meses del
// intervalo, incluidos los grupos antiguos cuya fecha inicial era nula.
export function periodosAfectadosCambioInicioGrupo({
  grupo,
  fechaNueva,
  estudiantes = [],
  eventos = [],
  fechaReferencia,
}) {
  const periodos = new Map()
  const fechaAnterior = iso10(grupo?.fecha_inicio_clases)
  const respaldo = iso10(grupo?.fecha_apertura) || iso10(grupo?.created_at) || iso10(fechaReferencia)
  agregarRangoPeriodos(periodos, fechaAnterior || respaldo, iso10(fechaNueva) || respaldo)

  const inscripcionPorEstudiante = new Map()
  for (const evento of (eventos || []).filter((fila) => fila.tipo === 'inscripcion').sort(compareEvents)) {
    const key = String(evento.estudiante_id)
    if (!inscripcionPorEstudiante.has(key)) inscripcionPorEstudiante.set(key, evento)
  }
  for (const estudiante of estudiantes || []) {
    const evento = inscripcionPorEstudiante.get(String(estudiante.id)) || null
    const grupoInscripcion = evento?.a_grupo_id ?? estudiante.grupo_id ?? null
    if (String(grupoInscripcion ?? '') !== String(grupo?.id ?? '')) continue
    const inicioAnterior = fechaInicioOperativa(
      estudiante,
      { ...grupo, fecha_inicio_clases: fechaAnterior },
      evento,
    )
    const inicioNuevo = fechaInicioOperativa(
      estudiante,
      { ...grupo, fecha_inicio_clases: iso10(fechaNueva) },
      evento,
    )
    agregarRangoPeriodos(periodos, inicioAnterior, inicioNuevo)
  }

  return [...periodos.values()].sort((a, b) =>
    (a.year * 100 + a.month) - (b.year * 100 + b.month)
  )
}

function contextoInicio(estudiante, gruposPorId, eventosEstudiante) {
  const eventoInscripcion = eventosEstudiante
    .filter((evento) => evento.tipo === 'inscripcion')
    .sort(compareEvents)[0] || null
  const grupoId = eventoInscripcion?.a_grupo_id ?? estudiante.grupo_id ?? null
  const grupo = grupoId == null ? null : gruposPorId.get(String(grupoId)) || null
  return {
    eventoInscripcion,
    grupoId,
    grupo,
    fechaInicio: fechaInicioOperativa(estudiante, grupo, eventoInscripcion),
  }
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
    const { eventoInscripcion, grupoId, grupo, fechaInicio } = contextoInicio(
      estudiante,
      gruposPorId,
      eventosEstudiante,
    )
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

export function retirosActivosMes(estudiantes, grupos, eventos, year, month) {
  const y = Number(year)
  const m = Number(month)
  const prefijo = `${y}-${String(m).padStart(2, '0')}`
  const finMes = `${prefijo}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
  const gruposPorId = new Map((grupos || []).map((grupo) => [String(grupo.id), grupo]))
  const estudiantesPorId = new Map((estudiantes || []).map((estudiante) => [String(estudiante.id), estudiante]))
  const eventosPorEstudiante = new Map()

  for (const evento of eventos || []) {
    const key = String(evento.estudiante_id)
    const actuales = eventosPorEstudiante.get(key) || []
    actuales.push(evento)
    eventosPorEstudiante.set(key, actuales)
  }

  return (eventos || []).filter((evento) => {
    if (evento.tipo !== 'retiro') return false
    const periodoDeclarado = evento.year != null && evento.month != null
      ? Number(evento.year) === y && Number(evento.month) === m
      : iso10(evento.fecha)?.startsWith(prefijo)
    if (!periodoDeclarado) return false

    const estudiante = estudiantesPorId.get(String(evento.estudiante_id))
    if (!estudiante) return false
    const eventosEstudiante = eventosPorEstudiante.get(String(estudiante.id)) || []
    const { fechaInicio } = contextoInicio(estudiante, gruposPorId, eventosEstudiante)
    const fechaRetiro = iso10(evento.fecha) || finMes

    // Una venta cancelada antes de iniciar clases nunca formó parte de la
    // población activa, por lo que tampoco puede restarse del balance.
    return !fechaInicio || fechaInicio <= fechaRetiro
  })
}

export function movimientosVivosMes({ estudiantes = [], grupos = [], eventos = [], year, month }) {
  const y = Number(year)
  const m = Number(month)
  const prefijo = `${y}-${String(m).padStart(2, '0')}`
  const finMes = `${prefijo}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
  const eventosMes = eventos.filter((evento) =>
    (Number(evento.year) === y && Number(evento.month) === m) ||
    (!evento.year && !evento.month && iso10(evento.fecha)?.startsWith(prefijo))
  )
  const deserciones = retirosActivosMes(estudiantes, grupos, eventos, y, m)
    .map((evento) => ({ ...evento, motivo: evento.motivo || 'OTRO' }))
  const iniciosDelMes = iniciosClaseMes(estudiantes, grupos, eventos, y, m)

  return {
    iniciosClase: iniciosDelMes,
    deserciones,
    totales: {
      nuevos: iniciosDelMes.length,
      reincorporados: eventosMes.filter((evento) => evento.tipo === 'reincorporacion').length,
      retirados: deserciones.length,
      gruposActivos: grupos.filter((grupo) =>
        grupo.estado === 'activo' && (!grupo.fecha_inicio_clases || iso10(grupo.fecha_inicio_clases) <= finMes)
      ).length,
    },
  }
}

export function periodosAbiertosOperativos({
  resumenes = [],
  estados = [],
  centroIds = [],
  desde = Number.NEGATIVE_INFINITY,
  hasta = Number.POSITIVE_INFINITY,
  periodoActual = null,
}) {
  const ids = new Set((centroIds || []).map(Number))
  for (const fila of [...resumenes, ...estados]) {
    if (fila.centro_id != null) ids.add(Number(fila.centro_id))
  }
  const unicoCentro = ids.size === 1 ? [...ids][0] : null
  const centroDe = (fila) => fila.centro_id != null ? Number(fila.centro_id) : unicoCentro
  const clave = (centroId, year, month) => `${centroId}:${Number(year) * 100 + Number(month)}`
  const estadoPorPeriodo = new Map()

  for (const fila of estados || []) {
    const centroId = centroDe(fila)
    if (centroId == null) continue
    estadoPorPeriodo.set(clave(centroId, fila.year, fila.month), fila.estado)
  }

  const candidatos = new Map()
  const agregar = (centroId, year, month, estado = 'abierto') => {
    const y = Number(year)
    const m = Number(month)
    const periodo = y * 100 + m
    if (centroId == null || periodo < desde || periodo > hasta || !usaIniciosClaseOperativos(y, m)) return
    if (estadoPorPeriodo.get(clave(centroId, y, m)) === 'cerrado') return
    candidatos.set(clave(centroId, y, m), { centroId: Number(centroId), year: y, month: m, estado: estado || 'abierto' })
  }

  for (const estado of estados || []) {
    if (estado.estado !== 'cerrado') agregar(centroDe(estado), estado.year, estado.month, estado.estado)
  }
  for (const resumen of resumenes || []) {
    agregar(centroDe(resumen), resumen.year, resumen.month)
  }

  if (periodoActual != null) {
    const actual = Number(periodoActual)
    const year = Math.floor(actual / 100)
    const month = actual % 100
    for (const centroId of ids) agregar(centroId, year, month)
  }

  return [...candidatos.values()].sort((a, b) =>
    (a.year * 100 + a.month) - (b.year * 100 + b.month) || a.centroId - b.centroId
  )
}

export function balanceMensual({ inicio, nuevosActivos, reincorporados, retirados }) {
  return Number(inicio || 0) + Number(nuevosActivos || 0) + Number(reincorporados || 0) - Number(retirados || 0)
}

export function cuadroConBalanceDeclarado({ datos, inicio, final = null, nuevosActivos, reincorporados, retirados }) {
  if (!datos) return datos
  const cierreCalculado = Math.max(0, balanceMensual({ inicio, nuevosActivos, reincorporados, retirados }))
  const cierreDeclarado = final == null ? cierreCalculado : Math.max(0, Number(final) || 0)
  const totales = {
    ...(datos.totales || {}),
    mesAnterior: Number(inicio || 0),
    nuevos: Number(nuevosActivos || 0),
    reincorporados: Number(reincorporados || 0),
    retirados: Number(retirados || 0),
    aPagar: cierreDeclarado,
  }
  return {
    ...datos,
    totales,
    controlGrupos: datos.controlGrupos
      ? { ...datos.controlGrupos, totales }
      : datos.controlGrupos,
  }
}

function numeroKpi(valor) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : 0
}

// Cerrar el mes congela el resultado que ya guardo el administrador en KPI.
// El Cuadro aporta el detalle operativo, pero no puede sustituir el inicio o
// el final declarado durante el cierre.
export function cierreKpiDeclarado({ resumen, datos }) {
  if (!resumen) return null
  const inicio = numeroKpi(resumen.ninos_inicio_mes)
  const final = numeroKpi(resumen.ninos_final_mes)
  const nuevosActivos = numeroKpi(resumen.nuevos_activos_mes)
  const reincorporados = numeroKpi(datos?.totales?.reincorporados)
  const retirosParaCuadrar = inicio + nuevosActivos + reincorporados - final
  const retirados = retirosParaCuadrar >= 0
    ? retirosParaCuadrar
    : numeroKpi(datos?.totales?.retirados)

  return { inicio, final, nuevosActivos, reincorporados, retirados }
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

export function resumenConCuadroVivo(filas, {
  centroId = null,
  year,
  month,
  estado,
  cuadro,
  inicioArrastrado = null,
  motivos = null,
}) {
  if (!Array.isArray(filas) || estado === 'cerrado' || !cuadro) return filas

  const totales = cuadro.totales || {}
  const nuevosActivos = Array.isArray(cuadro.iniciosClase)
    ? cuadro.iniciosClase.length
    : (totales.nuevos ?? 0)
  const retirados = Array.isArray(cuadro.deserciones)
    ? cuadro.deserciones.length
    : numeroKpi(totales.retirados)
  const reincorporados = numeroKpi(totales.reincorporados)

  const existeFila = filas.some((fila) =>
    (centroId == null || Number(fila.centro_id) === Number(centroId)) &&
    Number(fila.year) === Number(year) &&
    Number(fila.month) === Number(month)
  )
  const base = existeFila || centroId == null
    ? filas
    : [...filas, { centro_id: Number(centroId), year: Number(year), month: Number(month) }]

  return base.map((fila) => {
    if (
      (centroId != null && Number(fila.centro_id) !== Number(centroId)) ||
      Number(fila.year) !== Number(year) ||
      Number(fila.month) !== Number(month)
    ) return fila
    const inicio = inicioArrastrado != null
      ? numeroKpi(inicioArrastrado)
      : numeroKpi(fila.ninos_inicio_mes ?? totales.mesAnterior)
    return {
      ...fila,
      ...(motivos || {}),
      balance_vivo: true,
      ninos_inicio_mes: inicio,
      ninos_final_mes: Math.max(0, balanceMensual({
        inicio,
        nuevosActivos,
        reincorporados,
        retirados,
      })),
      grupos_activos: totales.gruposActivos ?? fila.grupos_activos,
      nuevos_activos_mes: nuevosActivos,
      retiros_operativos_mes: retirados,
      reincorporados_mes: reincorporados,
    }
  })
}
