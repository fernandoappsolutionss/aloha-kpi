import { sql } from './db'
import { ESTADO_MES_CERRANDO, estadoMesPermiteCambios } from './inicios-clase.mjs'

function mensajeMesNoEditable(estado) {
  if (estadoMesPermiteCambios(estado)) return null
  if (estado === ESTADO_MES_CERRANDO) {
    return 'El mes se está cerrando. Intenta de nuevo en unos segundos.'
  }
  return 'Ese mes está cerrado. Los meses históricos no admiten modificaciones.'
}

export async function errorMesNoEditable(centroId, year, month) {
  const [mes] = await sql`
    SELECT estado FROM mes_kpi
    WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}
  `
  return mensajeMesNoEditable(mes?.estado)
}

// Inserta, ordena y bloquea las filas mensuales dentro de la transacción que
// realizará el movimiento. Así el estado no puede cambiar entre validar y
// guardar, y dos cambios de fecha toman sus filas siempre en el mismo orden.
export async function bloquearMesesEditables(query, centroId, periodos) {
  const unicos = new Map()
  for (const periodo of periodos || []) {
    const year = Number(periodo?.year)
    const month = Number(periodo?.month)
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) continue
    unicos.set(`${year}-${String(month).padStart(2, '0')}`, { year, month })
  }

  const ordenados = [...unicos.values()].sort((a, b) =>
    (a.year * 100 + a.month) - (b.year * 100 + b.month)
  )
  for (const { year, month } of ordenados) {
    await query`
      INSERT INTO mes_kpi (centro_id, year, month, estado, cerrado_at)
      VALUES (${centroId}, ${year}, ${month}, 'abierto', NULL)
      ON CONFLICT (centro_id, year, month) DO NOTHING
    `
    const [mes] = await query`
      SELECT estado FROM mes_kpi
      WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}
      FOR UPDATE
    `
    const error = mensajeMesNoEditable(mes?.estado)
    if (error) return error
  }
  return null
}
