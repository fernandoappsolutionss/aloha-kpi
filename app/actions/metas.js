'use server'
import { sql } from '../../lib/db'
import { requireCurrentAdmin } from '../../lib/auth'

export async function getMetas(anio, trimestre) {
  await requireCurrentAdmin()
  const rows = await sql`SELECT * FROM metas WHERE anio = ${anio} AND trimestre = ${trimestre}`
  return rows[0] || null
}

export async function saveMetas(anio, trimestre, m) {
  await requireCurrentAdmin()
  await sql`
    INSERT INTO metas (anio, trimestre, meta_nuevos_ingresos_mes, meta_desercion_mes, meta_cobranza_max, gpn_min, cp_conversion)
    VALUES (${anio}, ${trimestre}, ${m.meta_nuevos_ingresos_mes}, ${m.meta_desercion_mes}, ${m.meta_cobranza_max}, ${m.gpn_min}, ${m.cp_conversion})
    ON CONFLICT (anio, trimestre) DO UPDATE SET
      meta_nuevos_ingresos_mes = EXCLUDED.meta_nuevos_ingresos_mes,
      meta_desercion_mes       = EXCLUDED.meta_desercion_mes,
      meta_cobranza_max        = EXCLUDED.meta_cobranza_max,
      gpn_min                  = EXCLUDED.gpn_min,
      cp_conversion            = EXCLUDED.cp_conversion
  `
  return { ok: true }
}
