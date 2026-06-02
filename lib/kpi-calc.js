// Cálculo de métricas de un trimestre para un centro, a partir de filas crudas
// de resumen_mes y kpi_semanas. Sin acceso a BD: recibe las filas ya consultadas.
export function quarterMetrics(resumenRows, kpiRows, centroId, months) {
  const crs = resumenRows.filter((r) => r.centro_id === centroId)
  const cks = kpiRows.filter((k) => k.centro_id === centroId)
  const m = months.map((mo) => {
    const r = crs.find((x) => x.month === mo)
    const ws = cks.filter((x) => x.month === mo)
    const nuevos = ws.reduce((s, w) => s + (w.ing_d1 || 0) + (w.ing_d2 || 0) + (w.ing_d3 || 0) + (w.ing_d4 || 0) + (w.ing_d5 || 0), 0)
    const desercion = ws.reduce((s, w) => s + (w.des_d1 || 0) + (w.des_d2 || 0) + (w.des_d3 || 0) + (w.des_d4 || 0) + (w.des_d5 || 0), 0)
    const has = ws.length > 0 || !!r
    return { mo, nuevos, desercion, has, ninosInicio: r?.ninos_inicio_mes || 0, nuevosActivos: r?.nuevos_activos_mes || 0 }
  })
  const last = m[m.length - 1]
  const ninos = Math.max(0, last.ninosInicio + last.nuevosActivos - last.desercion)
  // Deserción mensual % = retiros del mes ÷ niños al inicio del mes. Debe ser <8% en los 3 meses.
  const desOk = m.every((x) => x.has && x.ninosInicio > 0 && (x.desercion / x.ninosInicio) * 100 < 8)
  return { months: m, last, ninos, desOk }
}
