const numero = (valor) => typeof valor === 'number' && Number.isFinite(valor)

// La ausencia de un centro no borra la suma de los que sí declararon datos.
// Se comunica la cobertura por separado y se conserva un cero declarado.
export function totalNinosDeclarados(centros = []) {
  const registrados = centros.filter(c => c.ninosDisponible && numero(c.ninos))
  return { valor: registrados.length ? registrados.reduce((s, c) => s + c.ninos, 0) : null,
    conDatos: registrados.length, total: centros.length }
}

export function promedioDisciplina(centros = []) {
  const registrados = centros.filter(c => numero(c.cumpl))
  return {
    valor: registrados.length ? Math.round(registrados.reduce((s, c) => s + c.cumpl, 0) / registrados.length) : null,
    conDatos: registrados.length,
    total: centros.length,
  }
}

export const porcentajeDisciplina = (valor) => numero(valor) ? `${valor}%` : 'Sin dato'

export function variacionPorcentual(actual, anterior) {
  return numero(actual) && numero(anterior) && anterior > 0
    ? Math.round((actual - anterior) / anterior * 100) : null
}

// Cambiar los centros que participan en la media no demuestra una mejora.
export function variacionDisciplina(actuales = [], anteriores = []) {
  const ids = centros => centros.filter(c => numero(c.cumpl)).map(c => String(c.id)).sort().join(',')
  if (!ids(actuales) || ids(actuales) !== ids(anteriores)) return null
  return variacionPorcentual(promedioDisciplina(actuales).valor, promedioDisciplina(anteriores).valor)
}

export function tendenciaIngresos(actual, anterior) {
  if (!actual?.nuevosDisponible || !anterior?.nuevosDisponible || !numero(actual.nuevos) || !numero(anterior.nuevos)) {
    return { label: 'Sin datos comparables', diferencia: null, porcentaje: null, color: 'var(--text-dim)' }
  }
  const diferencia = actual.nuevos - anterior.nuevos
  return {
    label: diferencia > 0 ? 'Al alza' : diferencia < 0 ? 'A la baja' : 'Estable',
    diferencia,
    porcentaje: variacionPorcentual(actual.nuevos, anterior.nuevos),
    color: diferencia > 0 ? 'var(--ok)' : diferencia < 0 ? 'var(--bad)' : 'var(--text-dim)',
  }
}

// Las filas automáticas vacías no acreditan un centro todavía sin registros.
// Un cero declarado sí es dato. Exigimos cobertura de todo el rango comparado.
export function coberturaIngresos({ meses, resumenes, semanas, autos, centroId, inicioAnterior, periodoActual }) {
  const tieneBase = inicioAnterior != null || resumenes.length > 0
  const registrados = meses.filter(({ year, month }) => {
    if (year * 100 + month > periodoActual) return false
    const coincide = fila => Number(fila.year) === year && Number(fila.month) === month
    if (resumenes.some(coincide) || semanas.some(fila => coincide(fila) && [1, 2, 3, 4, 5].some(d => fila[`ing_d${d}`] != null))) return true
    const auto = autos[`${centroId}:${year * 100 + month}`]
    return auto?.estado === 'auto' && (tieneBase || auto.ingTotal > 0)
  }).length
  return { registrados, esperados: meses.length, disponible: meses.length > 0 && registrados === meses.length }
}
