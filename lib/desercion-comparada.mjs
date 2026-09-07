import { alertasDeCoach, consultarDesercionPorCoach, ventanaTrimestre } from './desercion-coach.mjs'
import { referenciaCentro, referenciaGlobal } from './desercion-referencias.mjs'

// Se llama solo después de autorizar acceso al centro solicitado. La referencia
// de toda la red devuelve únicamente agregados, no los coaches de otras sedes.
export async function consultarDesercionComparada(sql, { centroId, anio, trimestre }) {
  const centros = await sql`SELECT id, nombre FROM centros ORDER BY nombre`
  if (!centros.some(c => Number(c.id) === centroId)) throw new Error('Centro no encontrado.')
  const ventana = ventanaTrimestre(trimestre)
  // La referencia incluye TODO el padrón, también alumnos sin coach/grupo y
  // graduados sin atribución. Sumar solo filas de coaches sesgaba la base.
  const bases = await sql`
    WITH activos_centros AS (
      SELECT centro_id, COUNT(*)::int AS activos FROM estudiantes
      WHERE estado IN ('activo','baja_potencial') GROUP BY centro_id
    ), salidas_centros AS (
      SELECT centro_id,
        COUNT(*) FILTER (WHERE motivo IS DISTINCT FROM 'GRADUADO')::int AS bajas,
        COUNT(*) FILTER (WHERE motivo = 'GRADUADO')::int AS graduados
      FROM estudiante_eventos WHERE tipo = 'retiro'
        AND year = ${anio} AND month BETWEEN ${ventana.mesDesde} AND ${ventana.mesHasta}
      GROUP BY centro_id
    )
    SELECT c.id, COALESCE(a.activos,0) AS activos, COALESCE(s.bajas,0) AS bajas,
      COALESCE(s.graduados,0) AS graduados
    FROM centros c LEFT JOIN activos_centros a ON a.centro_id = c.id
    LEFT JOIN salidas_centros s ON s.centro_id = c.id`
  const referencias = centros.map(c => {
    const base = bases.find(b => Number(b.id) === Number(c.id))
    if (!base) throw new Error('No se pudo leer la base completa de los centros.')
    return { ...c, resultado: { baseCentro: { bajasReales: Number(base.bajas), graduados: Number(base.graduados),
      expuestos: Number(base.activos) + Number(base.bajas) + Number(base.graduados) } } }
  })
  // Solo se consultan fichas de coaches del centro autorizado.
  const { filas, sinCoach } = await consultarDesercionPorCoach(sql, { centroId, anio, ...ventana })
  const baseCentro = referencias.find(c => Number(c.id) === centroId).resultado.baseCentro
  const local = alertasDeCoach(filas, { anio, trimestre, sinCoach, baseCentro })
  return { ...local, referenciaCentro: referenciaCentro(local),
    referenciaGlobal: referenciaGlobal(referencias) }
}
