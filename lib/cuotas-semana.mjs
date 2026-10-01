import { estadistica } from './estadisticas-semana/catalogo.mjs'
import { diaDeSemana, fechaCivil, semanaAbierta, sumarDias, ultimasSemanas, zonaHorariaCentro } from './semana-cierre.mjs'

const SEMANAS_POR_MES = 52 / 12

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

export function prepararCuotas({ catalogo, series, resumen, filasCuotas, metas, semanaAbierta, hoy }) {
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
    const propuesta = proponerCuota({ codigo: meta.codigo, ultimo: resumen[meta.codigo]?.cerrada ?? null, ninosActivos: resumen.ninos_activos?.cerrada ?? null, metas })
    cuotas[meta.codigo] = {
      cuota,
      propuesta,
      estado: fila?.estado ?? (propuesta == null ? null : 'propuesta'),
      ritmo: meta.tipo === 'flujo' ? ritmoCuota({ cuota: cuota ?? propuesta, valor: resumen[meta.codigo]?.abierta ?? null, dia: diaDeSemana(hoy), inversa: meta.inversa }) : null,
    }
  }
  return { series: nuevasSeries, cuotas }
}

export function porcentajeCuotasCumplidas({ catalogo, series, filasCuotas, semanaFin }) {
  const aprobadas = filasCuotas.filter((fila) => fecha(fila.semana_fin) === semanaFin && fila.estado === 'aprobada')
  const resultados = aprobadas.map((fila) => {
    const meta = catalogo.find((item) => item.codigo === fila.codigo)
    const valor = series[fila.codigo]?.find((punto) => punto.semanaFin === semanaFin)?.valor ?? null
    return meta ? cuotaCumplida({ valor, cuota: fila.cuota, inversa: meta.inversa }) : null
  }).filter((valor) => valor !== null)
  return resultados.length ? Math.round(resultados.filter(Boolean).length * 100 / resultados.length) : null
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
