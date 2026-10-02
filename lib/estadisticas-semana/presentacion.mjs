import { CODIGOS_ESTADISTICA } from './catalogo.mjs'

const iso10 = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
const numero = (value) => value == null ? null : Number(value)

export function armarSeries(semanas, filas) {
  const porClave = new Map(filas.map((fila) => [`${fila.codigo}:${iso10(fila.semana_fin)}`, fila]))
  const series = Object.fromEntries(CODIGOS_ESTADISTICA.map((codigo) => [codigo, semanas.map((semanaFin) => {
    const fila = porClave.get(`${codigo}:${semanaFin}`)
    return { semanaFin, valor: numero(fila?.valor), estado: fila?.estado ?? null, condicion: fila?.condicion ?? null, detalle: fila?.detalle ?? {}, calculadoAt: fila?.calculado_at ?? null }
  })]))
  const resumen = Object.fromEntries(CODIGOS_ESTADISTICA.map((codigo) => {
    const serie = series[codigo]
    const cerrada = serie.at(-2)?.estado === 'cerrada' ? serie.at(-2).valor : null
    const anterior = serie.at(-3)?.estado === 'cerrada' ? serie.at(-3).valor : null
    return [codigo, { abierta: serie.at(-1)?.estado === 'abierta' ? serie.at(-1).valor : null, cerrada, anterior, delta: cerrada == null || anterior == null ? null : cerrada - anterior }]
  }))
  return { series, resumen }
}

export function armarTablero(centros, semanas, filas) {
  const presentados = centros.map((centro) => {
    const { series, resumen } = armarSeries(semanas, filas.filter((fila) => Number(fila.centro_id) === Number(centro.id)))
    const abierta = Object.fromEntries(CODIGOS_ESTADISTICA.map((codigo) => [codigo, resumen[codigo].abierta]))
    const cerrada = Object.fromEntries(CODIGOS_ESTADISTICA.map((codigo) => [codigo, resumen[codigo].cerrada]))
    const principal = resumen.ninos_activos
    const delta = principal.abierta != null && principal.cerrada != null
      ? principal.abierta - principal.cerrada : principal.delta
    const calculoAbierto = CODIGOS_ESTADISTICA.some((codigo) => series[codigo].at(-1)?.estado != null || series[codigo].at(-1)?.calculadoAt != null)
    return { id: centro.id, nombre: centro.nombre, serie: series.ninos_activos, abierta, cerrada, delta, calculoAbierto }
  })
  const consolidada = semanas.map((semanaFin, index) => {
    const valores = presentados.map((centro) => centro.serie[index].valor)
    const disponibles = valores.filter((valor) => valor != null)
    const subtotal = disponibles.length ? disponibles.reduce((a, b) => a + b, 0) : null
    return { semanaFin, valor: centros.length && disponibles.length === centros.length ? subtotal : null,
      subtotal, disponibles: disponibles.length, total: centros.length, incompleta: disponibles.length !== centros.length }
  })
  return { centros: presentados, consolidada }
}
