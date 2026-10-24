import { sql, withTransaction } from './db.js'
import { leerArchivoEvidencia } from './semana-evidencias.mjs'

// Un archivo pequeño por acción, junto al dato y con el mismo respaldo y alcance.
export async function guardarEvidenciaEn(centroId, objetivoId, archivo, actorId, { transaction = withTransaction } = {}) {
  const { bytes, tipo, nombre } = await leerArchivoEvidencia(archivo)
  return transaction(async query => {
    const [objetivo] = await query`SELECT o.id, o.hecho, o.seccion FROM semana_objetivos o JOIN semana_planes p ON p.id=o.plan_id
      WHERE o.id=${objetivoId} AND p.centro_id=${centroId} FOR UPDATE OF o`
    if (!objetivo || objetivo.seccion === 'orden') throw new Error('Acción no disponible para adjuntar evidencia.')
    if (objetivo.hecho) throw new Error('Reabre la acción antes de sustituir su evidencia.')
    await query`INSERT INTO semana_evidencias(objetivo_id,nombre,tipo,contenido,creado_por)
      VALUES (${objetivoId},${nombre},${tipo},decode(${Buffer.from(bytes).toString('base64')},'base64'),${actorId})
      ON CONFLICT(objetivo_id) DO UPDATE SET nombre=EXCLUDED.nombre,tipo=EXCLUDED.tipo,contenido=EXCLUDED.contenido,creado_por=EXCLUDED.creado_por,updated_at=now()`
    return { nombre, tipo }
  })
}

export async function leerEvidenciasPlan(planId, { query = sql } = {}) {
  return query`SELECT e.objetivo_id, e.nombre, e.tipo FROM semana_evidencias e JOIN semana_objetivos o ON o.id=e.objetivo_id WHERE o.plan_id=${planId}`
}
