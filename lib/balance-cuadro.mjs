import { balanceMensual } from './inicios-clase.mjs'

// El cierre aprobado es la base del KPI. El padrón conserva su detalle para
// royalties: una diferencia no autoriza a inventar alumnos ni movimientos.
export function balanceCuadro({ anterior, totales }) {
  if (anterior?.valor == null || !Number.isFinite(Number(anterior.valor))) return null
  const inicio = Number(anterior.valor)
  const final = balanceMensual({ inicio, nuevosActivos: totales.nuevos,
    reincorporados: totales.reincorporados, retirados: totales.retirados })
  return { inicio, final, periodoAnterior: `${anterior.year}-${String(anterior.month).padStart(2, '0')}`,
    nuevos: totales.nuevos, reincorporados: totales.reincorporados,
    retirados: totales.retirados, padron: totales.aPagar, diferencia: totales.aPagar - final }
}
