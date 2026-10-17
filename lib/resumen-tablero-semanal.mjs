import { sumarDias } from './semana-cierre.mjs'

export const SEMANAS_RESUMEN = 6

export function puntosResumen(serie, ultimaCerrada) {
  return serie.slice(-SEMANAS_RESUMEN).map(p => ({ ...p, periodo: p.semanaFin,
    abierto: p.semanaFin > ultimaCerrada }))
}

// La referencia se calcula con cierres; la semana abierta no la sustituye.
export function comparacionCierres(centro) {
  const cierre = centro.serie.find(p => p.semanaFin === centro.ultimaCerrada)
  const anterior = centro.serie.find(p => p.semanaFin === sumarDias(centro.ultimaCerrada, -7))
  if (cierre?.valor == null || anterior?.valor == null) return null
  const delta = Number(cierre.valor) - Number(anterior.valor)
  return { anterior: Number(anterior.valor), actual: Number(cierre.valor), delta,
    porcentaje: Number(anterior.valor) === 0 ? null : delta / Number(anterior.valor) * 100 }
}

export function coberturaResumen(datos) {
  return datos.consolidada.slice(-SEMANAS_RESUMEN).map(p => ({ ...p,
    faltantes: datos.centros.filter(c => c.serie.find(s => s.semanaFin === p.semanaFin)?.valor == null).map(c => c.nombre),
  }))
}
