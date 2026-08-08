import { neon } from '@neondatabase/serverless'
import {
  REPARACIONES_HISTORICAS,
  estadoReparacionHistorica,
} from '../lib/kpi-history-repair.mjs'

if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.')

const aplicar = process.argv.includes('--apply')
const sql = neon(process.env.DATABASE_URL)
const diagnostico = []

for (const reparacion of REPARACIONES_HISTORICAS) {
  const [fila] = await sql`
    SELECT
      r.ninos_inicio_mes AS inicio,
      r.ninos_final_mes AS final,
      r.nuevos_activos_mes AS activos,
      m.estado
    FROM resumen_mes r
    LEFT JOIN mes_kpi m
      ON m.centro_id = r.centro_id AND m.year = r.year AND m.month = r.month
    WHERE r.centro_id = ${reparacion.centroId}
      AND r.year = ${reparacion.year}
      AND r.month = ${reparacion.month}
  `
  const estado = fila?.estado === 'cerrado'
    ? estadoReparacionHistorica(fila, reparacion)
    : 'conflicto'
  diagnostico.push({ ...reparacion, actual: fila || null, estado })
}

const conflictos = diagnostico.filter((fila) => fila.estado === 'conflicto')
if (conflictos.length) {
  console.error(JSON.stringify({ ok: false, conflictos }, null, 2))
  process.exitCode = 1
} else if (!aplicar) {
  console.log(JSON.stringify({ ok: true, modo: 'dry-run', diagnostico }, null, 2))
} else {
  const pendientes = diagnostico.filter((fila) => fila.estado === 'pendiente')
  if (pendientes.length) {
    const params = []
    const values = pendientes.map((fila) => {
      const r = fila
      const base = params.length
      params.push(
        r.centroId, r.year, r.month,
        r.antes.inicio, r.antes.final, r.antes.activos,
        r.despues.inicio, r.despues.final, r.despues.activos,
      )
      return `($${base + 1}::int,$${base + 2}::int,$${base + 3}::int,$${base + 4}::int,$${base + 5}::int,$${base + 6}::int,$${base + 7}::int,$${base + 8}::int,$${base + 9}::int)`
    }).join(',')

    const query = `
      WITH expected (
        centro_id, year, month,
        before_inicio, before_final, before_activos,
        after_inicio, after_final, after_activos
      ) AS (VALUES ${values}),
      eligible AS (
        SELECT e.*
        FROM expected e
        JOIN resumen_mes r USING (centro_id, year, month)
        JOIN mes_kpi m USING (centro_id, year, month)
        WHERE m.estado = 'cerrado'
          AND r.ninos_inicio_mes = e.before_inicio
          AND r.ninos_final_mes = e.before_final
          AND r.nuevos_activos_mes = e.before_activos
      ),
      guard AS (SELECT COUNT(*)::int AS total FROM eligible)
      UPDATE resumen_mes r
      SET ninos_inicio_mes = e.after_inicio,
          ninos_final_mes = e.after_final,
          nuevos_activos_mes = e.after_activos,
          updated_at = NOW()
      FROM eligible e, guard g
      WHERE g.total = $${params.length + 1}::int
        AND r.centro_id = e.centro_id
        AND r.year = e.year
        AND r.month = e.month
      RETURNING r.centro_id, r.year, r.month,
        r.ninos_inicio_mes AS inicio,
        r.ninos_final_mes AS final,
        r.nuevos_activos_mes AS activos
    `
    const actualizadas = await sql(query, [...params, pendientes.length])
    if (actualizadas.length !== pendientes.length) {
      throw new Error(`La reparacion se aborto por concurrencia: ${actualizadas.length}/${pendientes.length} filas actualizadas.`)
    }
  }

  console.log(JSON.stringify({ ok: true, modo: 'apply', reparadas: pendientes.length }, null, 2))
}
