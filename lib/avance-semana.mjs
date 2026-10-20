import { rangoSemana, sumarDias } from './semana-cierre.mjs'

export const mostrarNumero = valor => valor == null ? 'Sin dato' : Number(valor).toLocaleString('es-PA')

export function diasDeSemana(semanaFin) {
  const { desde } = rangoSemana(semanaFin)
  return Array.from({ length: 7 }, (_, i) => sumarDias(desde, i))
}

export function avanceCuota({ meta, cuota, valor, dia }) {
  if (cuota == null || valor == null) return { esperado: null, falta: null, estado: 'Sin dato o cuota' }
  // Los límites y valores al cierre no se reparten como producción diaria.
  const repartir = meta.tipo === 'flujo' && !meta.inversa
  const esperado = repartir ? Math.round(cuota * Math.max(1, Math.min(7, dia)) / 7) : cuota
  const falta = Math.max(0, meta.inversa ? valor - cuota : cuota - valor)
  const bien = meta.inversa ? valor <= esperado : valor >= esperado
  return { esperado, falta, estado: meta.inversa ? (bien ? 'Dentro del límite' : 'Supera el límite')
    : repartir ? (bien ? 'Al ritmo' : 'Por debajo del ritmo') : (bien ? 'Meta alcanzada al corte' : 'Pendiente para el cierre') }
}

export function filasAvanceDiario({ semanaFin, hoy, meta, cuota, diario = [] }) {
  return diasDeSemana(semanaFin).map((fecha, i) => {
    const futuro = fecha > hoy
    const valor = futuro ? null : diario.find(d => d.fecha === fecha)?.valores?.[meta.codigo] ?? null
    const anterior = i === 0 ? 0 : diario.find(d => d.fecha === sumarDias(fecha, -1))?.valores?.[meta.codigo] ?? null
    const reparto = cuota != null && meta.tipo === 'flujo' && !meta.inversa
    const esperado = cuota == null ? null : reparto ? Math.round(cuota * (i + 1) / 7) : cuota
    const cuotaDia = reparto ? esperado - Math.round(cuota * i / 7) : null
    return { fecha, futuro, valor, esperado, cuotaDia,
      realizadoDia: meta.tipo === 'flujo' && valor != null && anterior != null ? valor - anterior : null,
      ...(!futuro ? { estado: avanceCuota({ meta, cuota, valor, dia: i + 1 }).estado } : { estado: 'Por venir' }) }
  })
}
