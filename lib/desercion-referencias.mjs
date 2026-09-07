// Referencias comparables: misma ventana y base operativa que la alerta de coach.
// La red se pondera por exposición, nunca por promedio simple de porcentajes.
export function referenciaCentro(resultado) {
  const bajasReales = resultado.baseCentro?.bajasReales ?? resultado.bajasCentro + resultado.sinCoach
  const expuestos = resultado.baseCentro?.expuestos ?? resultado.expuestosCentro + resultado.sinCoach
  return { bajasReales, expuestos, graduados: resultado.baseCentro?.graduados ?? resultado.graduadosCentro,
    tasa: expuestos > 0 ? bajasReales / expuestos : null }
}

export function referenciaGlobal(centros) {
  const unicos = [...new Map(centros.map(c => [String(c.id), c])).values()]
  const bases = unicos.map(c => referenciaCentro(c.resultado))
  const bajasReales = bases.reduce((s, c) => s + c.bajasReales, 0)
  const expuestos = bases.reduce((s, c) => s + c.expuestos, 0)
  return { centros: unicos.map(c => ({ id: c.id, nombre: c.nombre })),
    centrosConBase: bases.filter(c => c.expuestos > 0).length,
    bajasReales, expuestos, tasa: expuestos > 0 ? bajasReales / expuestos : null }
}

export function diferenciaPuntos(coach, referencia) {
  if (!coach || coach.expuestos <= 0 || referencia?.tasa == null) return null
  return (coach.bajasReales / coach.expuestos - referencia.tasa) * 100
}
