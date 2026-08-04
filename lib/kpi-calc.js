// Cálculo de métricas de un trimestre para un centro, a partir de filas crudas
// de resumen_mes y kpi_semanas. Sin acceso a BD: recibe las filas ya consultadas.
// Métricas del trimestre de un centro, ENCADENADAS mes a mes: el cierre de un
// mes (ninos_final_mes, que escribe el Cuadro de Negocio al sincronizar o al
// cerrar el mes) es la verdad y el inicio del siguiente. Solo se estima con
// inicio + nuevos − deserción semanal cuando el mes aún no tiene cierre.
// `cierrePrevio` = ninos_final_mes del mes anterior al trimestre (semilla).
export function quarterMetrics(resumenRows, kpiRows, centroId, months, cierrePrevio = 0) {
  // centroId puede venir como número (dashboard) o string (param de URL en /centro/[id]);
  // normalizamos para que el filtro no falle por el tipo (1 === "1" es false).
  const cid = String(centroId)
  const crs = resumenRows.filter((r) => String(r.centro_id) === cid)
  const cks = kpiRows.filter((k) => String(k.centro_id) === cid)
  let cadena = cierrePrevio || 0
  const m = months.map((mo) => {
    const r = crs.find((x) => x.month === mo)
    const ws = cks.filter((x) => x.month === mo)
    const nuevos = ws.reduce((s, w) => s + (w.ing_d1 || 0) + (w.ing_d2 || 0) + (w.ing_d3 || 0) + (w.ing_d4 || 0) + (w.ing_d5 || 0), 0)
    const desercion = ws.reduce((s, w) => s + (w.des_d1 || 0) + (w.des_d2 || 0) + (w.des_d3 || 0) + (w.des_d4 || 0) + (w.des_d5 || 0), 0)
    const has = ws.length > 0 || !!r
    const ninosInicio = (r?.ninos_inicio_mes || 0) > 0 ? r.ninos_inicio_mes : cadena
    const nuevosActivos = r?.nuevos_activos_mes || 0
    const ninosFinal = (r?.ninos_final_mes || 0) > 0
      ? r.ninos_final_mes
      : Math.max(0, ninosInicio + nuevosActivos - desercion)
    if (has) cadena = ninosFinal
    return { mo, nuevos, desercion, has, ninosInicio, nuevosActivos, ninosFinal }
  })
  // Último mes CON datos (no el 3º fijo) — clave para trimestres en curso.
  const conD = m.filter((x) => x.has)
  const last = conD.length ? conD[conD.length - 1] : m[m.length - 1]
  const ninos = last.ninosFinal
  // Deserción mensual % = retiros del mes ÷ niños al inicio del mes. Debe ser <8% en los 3 meses.
  const desOk = m.every((x) => x.has && x.ninosInicio > 0 && (x.desercion / x.ninosInicio) * 100 < 8)
  return { months: m, last, ninos, desOk }
}
