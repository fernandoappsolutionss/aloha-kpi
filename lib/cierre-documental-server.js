import { sql } from './db.js'
import { aplicarCierreDocumental } from './cierre-documental.mjs'

export async function conCierresDocumentales(rows, query = sql) {
  if (!rows.length) return rows
  const ids = [...new Set(rows.map(r => Number(r.centro_id)))]
  const periodos = rows.map(r => Number(r.year) * 100 + Number(r.month))
  const fotos = await query`
    SELECT c.centro_id, c.year, c.month, m.estado,
      jsonb_build_object('totales', c.datos->'totales', 'conciliacion', c.datos->'conciliacion') AS datos
    FROM cuadro_mensual c JOIN mes_kpi m USING (centro_id, year, month)
    WHERE c.centro_id = ANY(${ids}::int[]) AND c.year * 100 + c.month BETWEEN ${Math.min(...periodos)} AND ${Math.max(...periodos)}
      AND m.estado = 'cerrado' AND c.datos->'conciliacion'->>'tipo' = 'cuadro_negocio_documental'
  `
  const porMes = new Map(fotos.map(f => [`${f.centro_id}-${f.year}-${f.month}`, f]))
  return rows.map(r => {
    const f = porMes.get(`${r.centro_id}-${r.year}-${r.month}`)
    return f ? aplicarCierreDocumental(r, f, f.estado) : r
  })
}
