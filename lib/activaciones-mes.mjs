// En un cierre, las reincorporaciones se leen de su foto, nunca del padrón vivo.
// La guarda impide mezclar una foto antigua con un resumen editado después.
export function movimientosCierreKpi({ estado, resumen, snapshot }) {
  const t = snapshot?.datos?.totales ?? snapshot?.totales
  if (estado !== 'cerrado' || !resumen || !t) return null
  if (!['mesAnterior', 'aPagar', 'nuevos', 'reincorporados', 'retirados'].every(k =>
    Number.isInteger(t[k]) && t[k] >= 0)) return null
  if (t.mesAnterior !== Number(resumen.ninos_inicio_mes)
    || t.aPagar !== Number(resumen.ninos_final_mes)
    || t.nuevos !== Number(resumen.nuevos_activos_mes)
    || t.mesAnterior + t.nuevos + t.reincorporados - t.retirados !== t.aPagar) return null
  return { nuevos: t.nuevos, reincorporados: t.reincorporados, retirados: t.retirados }
}
