'use server'
import { sql, upsert } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'

export async function loadFoda(centroId, anio, trimestre) {
  await requireCentroAccess(centroId)
  const [row] = await sql`
    SELECT oportunidades, amenazas, comentarios, comentario_estado
    FROM foda WHERE centro_id = ${centroId} AND anio = ${anio} AND trimestre = ${trimestre}
  `
  return row || null
}

export async function saveFoda(centroId, anio, trimestre, data) {
  await requireCentroAccess(centroId)
  await upsert('foda', {
    centro_id: centroId, anio, trimestre,
    oportunidades: data.oportunidades ?? null,
    amenazas: data.amenazas ?? null,
    comentarios: data.comentarios ?? null,
    comentario_estado: data.comentario_estado ?? null,
    updated_at: new Date().toISOString(),
  }, ['centro_id', 'anio', 'trimestre'])
  return { ok: true }
}
