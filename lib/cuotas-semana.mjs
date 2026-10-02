import { estadistica, CODIGOS_ESTADISTICA } from './estadisticas-semana/catalogo.mjs'
import { diaDeSemana, fechaCivil, semanaAbierta, sumarDias, ultimasSemanas, zonaHorariaCentro } from './semana-cierre.mjs'

const SEMANAS_POR_MES = 52 / 12

export function cierresDelMes(periodo) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) throw new Error('Mes inválido.')
  const cierres = []
  for (let fecha = `${periodo}-01`; fecha.startsWith(periodo); fecha = sumarDias(fecha, 1)) {
    if (new Date(`${fecha}T12:00:00Z`).getUTCDay() === 4) cierres.push(fecha)
  }
  return cierres
}

export function validarCompromiso(datos) {
  cierresDelMes(datos?.periodo)
  const diagnostico = String(datos?.diagnostico || '').trim()
  if (!diagnostico || diagnostico.length > 2000) throw new Error('Escribe un diagnóstico de hasta 2000 caracteres.')
  const metas = {}
  for (const codigo of CODIGOS_ESTADISTICA) {
    const valor = datos?.metas?.[codigo]
    if (!['string', 'number'].includes(typeof valor) || String(valor).trim() === '' || !Number.isSafeInteger(Number(valor)) || Number(valor) < 0 || Number(valor) > 1000000) throw new Error('Completa las cinco metas con enteros entre 0 y 1000000.')
    metas[codigo] = Number(valor)
  }
  return { periodo: datos.periodo, diagnostico, metas }
}

export function propuestaDesdeCompromiso({ codigo, compromiso, series, semanaFin }) {
  if (!compromiso || compromiso.periodo !== semanaFin.slice(0, 7)) return null
  const meta = estadistica(codigo)
  const cierres = cierresDelMes(compromiso.periodo)
  const restantes = cierres.filter(fin => fin >= semanaFin).length
  if (!cierres.includes(semanaFin)) return null
  const objetivo = Number(compromiso.metas[codigo])
  const requeridas = meta.tipo === 'flujo' ? cierres.filter(fin => fin < semanaFin) : [sumarDias(semanaFin, -7)]
  const puntos = requeridas.map(fin => series[codigo]?.find(p => p.semanaFin === fin && p.estado === 'cerrada'))
  if (puntos.some(p => p?.valor == null || !Number.isFinite(Number(p.valor)))) return { valor: null, explicacion: 'Faltan cierres con dato para repartir la meta mensual.' }
  const acumulado = puntos.reduce((sum, p) => sum + Number(p.valor), 0)
  const pendiente = Math.max(0, objetivo - acumulado)
  const valor = meta.tipo === 'flujo'
    ? (meta.inversa ? Math.floor : Math.ceil)(pendiente / restantes)
    : Math.max(0, Math.ceil(acumulado + (objetivo - acumulado) / restantes))
  return { valor, explicacion: `Meta ${compromiso.periodo}: ${objetivo}; ${meta.tipo === 'flujo' ? 'acumulado' : 'último cierre'}: ${acumulado}; ${restantes} cierres restantes.${meta.inversa ? ' Máximo permitido.' : ' Mínimo esperado.'}` }
}

export function proponerCuota({ codigo, ultimo, ninosActivos = null, metas }) {
  estadistica(codigo)
  if (ultimo == null) return null
  const valor = Number(ultimo)
  switch (codigo) {
    case 'nuevos_inscritos':
      return Math.max(valor + 1, Math.ceil(Number(metas.nuevos) / SEMANAS_POR_MES))
    case 'retiros': {
      const base = Math.max(0, valor - 1)
      return ninosActivos == null ? base : Math.min(base, Math.floor(Number(ninosActivos) * Number(metas.desercion) / 100 / SEMANAS_POR_MES))
    }
    case 'facturas_vencidas':
      return Math.min(Math.max(0, valor - 1), Number(metas.cobranza))
    default:
      return valor + 1
  }
}

export function ritmoCuota({ cuota, valor, dia, inversa = false }) {
  if (cuota == null || valor == null) return null
  const esperado = Math.round(Number(cuota) * Number(dia) / 7)
  return { esperado, vaBien: inversa ? Number(valor) <= esperado : Number(valor) >= esperado }
}

export function cuotaCumplida({ valor, cuota, inversa = false }) {
  if (valor == null || cuota == null) return null
  return inversa ? Number(valor) <= Number(cuota) : Number(valor) >= Number(cuota)
}

const fecha = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value)

export function prepararCuotas({ catalogo, series, resumen, filasCuotas, metas, compromiso, semanaAbierta, hoy }) {
  const porClave = new Map(filasCuotas.map((fila) => [`${fila.codigo}:${fecha(fila.semana_fin)}`, fila]))
  const nuevasSeries = {}
  const cuotas = {}
  for (const meta of catalogo) {
    nuevasSeries[meta.codigo] = (series[meta.codigo] || []).map((punto) => ({
      ...punto,
      cuota: porClave.get(`${meta.codigo}:${punto.semanaFin}`)?.cuota == null
        ? null : Number(porClave.get(`${meta.codigo}:${punto.semanaFin}`).cuota),
    }))
    const fila = porClave.get(`${meta.codigo}:${semanaAbierta}`)
    const cuota = fila?.cuota == null ? null : Number(fila.cuota)
    const mensual = propuestaDesdeCompromiso({ codigo: meta.codigo, compromiso, series, semanaFin: semanaAbierta })
    const propuesta = mensual ? mensual.valor : proponerCuota({ codigo: meta.codigo, ultimo: resumen[meta.codigo]?.cerrada ?? null, ninosActivos: resumen.ninos_activos?.cerrada ?? null, metas })
    cuotas[meta.codigo] = {
      cuota,
      propuesta,
      explicacion: mensual?.explicacion ?? 'Referencia de la última semana y metas generales. Falta acordar la meta mensual en Ruta de Nivel.',
      estado: fila?.estado ?? (propuesta == null ? null : 'propuesta'),
      ritmo: meta.tipo === 'flujo' ? ritmoCuota({ cuota: cuota ?? propuesta, valor: resumen[meta.codigo]?.abierta ?? null, dia: diaDeSemana(hoy), inversa: meta.inversa }) : null,
    }
  }
  return { series: nuevasSeries, cuotas }
}

export function porcentajeCuotasCumplidas({ catalogo, series, filasCuotas, semanaFin }) {
  return evaluarCuotasCerradas({ catalogo, series, filasCuotas, semanaFin }).porcentaje
}

export function evaluarCuotasCerradas({ catalogo, series, filasCuotas, semanaFin }) {
  const valido = (v) => v != null && String(v).trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0
  const detalles = catalogo.map((meta) => {
    const fila = filasCuotas.find((f) => f.codigo === meta.codigo && fecha(f.semana_fin) === semanaFin)
    const aprobada = fila?.estado === 'aprobada' && valido(fila.cuota)
    const cuota = aprobada ? Number(fila.cuota) : null
    const punto = series[meta.codigo]?.find((p) => p.semanaFin === semanaFin && p.estado === 'cerrada')
    const valor = valido(punto?.valor) ? Number(punto.valor) : null
    const cumple = cuotaCumplida({ valor, cuota, inversa: meta.inversa })
    return { codigo: meta.codigo, nombre: meta.nombre, inversa: meta.inversa, cuota, valor, cumple,
      falta: cumple == null ? null : Math.max(0, meta.inversa ? valor - cuota : cuota - valor) }
  })
  const total = detalles.length
  const aprobadas = detalles.filter((d) => d.cuota != null).length
  const evaluadas = detalles.filter((d) => d.cumple != null).length
  const cumplidas = detalles.filter((d) => d.cumple === true).length
  const completo = total > 0 && evaluadas === total
  const principal = detalles.find((d) => d.codigo === 'ninos_activos')
  return { detalles, total, aprobadas, evaluadas, cumplidas,
    porcentaje: completo ? Math.round(cumplidas * 100 / total) : null,
    superacionPrincipal: principal?.cumple == null ? null : (principal.valor - principal.cuota) / Math.max(principal.cuota, 1),
    estado: aprobadas === 0 ? 'sin_cuotas' : aprobadas < total ? 'cuotas_incompletas' : !completo ? 'datos_pendientes' : cumplidas === total ? 'cumplido' : 'incumplido' }
}

export function ordenarRankingSemanal(centros) {
  const comparar = (a, b) => (b.evaluacionCuotas.porcentaje ?? -1) - (a.evaluacionCuotas.porcentaje ?? -1)
    || (b.evaluacionCuotas.superacionPrincipal ?? -Infinity) - (a.evaluacionCuotas.superacionPrincipal ?? -Infinity) || 0
  let posicion = null
  return [...centros].sort((a, b) => comparar(a, b) || a.nombre.localeCompare(b.nombre, 'es') || Number(a.id) - Number(b.id)).map((centro, index, ordenados) => {
    if (centro.evaluacionCuotas.porcentaje == null) posicion = null
    else if (index === 0 || comparar(ordenados[index - 1], centro) !== 0) posicion = index + 1
    return { ...centro, posicion, medalla: centro.evaluacionCuotas.estado === 'cumplido' ? ({ 1: '🥇', 2: '🥈', 3: '🥉' }[posicion] ?? null) : null }
  })
}

export function ordenarReunion(centros) {
  return centros.map((centro) => {
    const actual = centro.serie.find((punto) => punto.semanaFin === centro.ultimaCerrada && punto.estado === 'cerrada')?.valor
    const anterior = centro.serie.find((punto) => punto.semanaFin === sumarDias(centro.ultimaCerrada, -7) && punto.estado === 'cerrada')?.valor
    return { ...centro, deltaCerrada: actual == null || anterior == null ? null : Number(actual) - Number(anterior) }
  }).sort((a, b) => (b.deltaCerrada ?? -Infinity) - (a.deltaCerrada ?? -Infinity))
}

export function periodosCentro(centros, now = new Date()) {
  return Object.fromEntries(centros.map((centro) => {
    const zona = zonaHorariaCentro(centro)
    const abierta = semanaAbierta(now, zona)
    return [centro.id, { semanaAbierta: abierta, ultimaCerrada: sumarDias(abierta, -7), hoy: fechaCivil(now, zona), semanas: ultimasSemanas(abierta, 12) }]
  }))
}
