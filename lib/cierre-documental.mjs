// Un cuadro entregado y conciliado puede fijar el total mensual sin inventar
// el día de cada movimiento. Solo se aplica a una fotografía CERRADA válida.
export function cierreDocumental(snapshot, estado = 'cerrado') {
  const d = snapshot?.datos ?? snapshot
  const fuente = d?.conciliacion
  const t = d?.totales
  if (estado !== 'cerrado' || fuente?.tipo !== 'cuadro_negocio_documental' || fuente.version !== 1) return null
  if (!/^[a-f0-9]{64}$/.test(fuente.sha256 || '') || !/^\d{4}-(0[1-9]|1[0-2])$/.test(fuente.periodo || '')) return null
  if (!t || !['mesAnterior', 'aPagar', 'nuevos', 'reincorporados', 'retirados', 'gruposActivos'].every(k => Number.isInteger(t[k]) && t[k] >= 0)) return null
  if (t.mesAnterior + t.nuevos + t.reincorporados - t.retirados !== t.aPagar) return null
  return { ...fuente, totales: t }
}

export function aplicarCierreDocumental(resumen, snapshot, estado) {
  const cierre = cierreDocumental(snapshot, estado)
  const periodo = `${resumen?.year}-${String(resumen?.month).padStart(2, '0')}`
  if (!cierre || cierre.periodo !== periodo) return resumen
  const t = cierre.totales
  // No ocultar una edición posterior/incompleta del resumen detrás de la foto.
  if (Number(resumen.ninos_inicio_mes) !== t.mesAnterior || Number(resumen.ninos_final_mes) !== t.aPagar || Number(resumen.nuevos_activos_mes) !== t.nuevos || Number(resumen.grupos_activos) !== t.gruposActivos) return resumen
  return { ...resumen, retiros_operativos_mes: t.retirados, reincorporados_mes: t.reincorporados, conciliacion_cuadro: cierre }
}

export function ajusteDocumentado(row, cierreAnterior) {
  const c = row?.conciliacion_cuadro
  if (!c || !Number.isFinite(Number(cierreAnterior))) return false
  const a = c.ajusteInicio
  return a != null && Number(a.cierreAnterior) === Number(cierreAnterior)
    && Number(a.inicioDocumento) === Number(row.ninos_inicio_mes ?? row.startChildren)
    && Number(a.diferencia) === Number(a.inicioDocumento) - Number(cierreAnterior)
}
