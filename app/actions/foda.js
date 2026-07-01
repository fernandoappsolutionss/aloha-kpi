'use server'
import { sql, upsert } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { fortalezasDebilidades } from '../../lib/checklist'

// Carga el FODA guardado del trimestre + las Fortalezas/Debilidades derivadas
// del cumplimiento real (vinculación cumplimiento ↔ FODA). La UI usa las
// derivadas como base editable cuando aún no hay texto guardado.
export async function loadFoda(centroId, anio, trimestre) {
  await requireCentroAccess(centroId)
  const [row] = await sql`
    SELECT * FROM foda
    WHERE centro_id = ${centroId} AND anio = ${anio} AND trimestre = ${trimestre}
  `
  const cumpRows = await sql`
    SELECT cu.mes, cu.* FROM cumplimiento cu JOIN trimestres t ON t.id = cu.trimestre_id
    WHERE t.centro_id = ${centroId} AND t.anio = ${anio} AND t.trimestre = ${trimestre}
  `
  const vinculado = fortalezasDebilidades(cumpRows)
  return {
    foda: row || null,
    vinculado, // { fortalezas: [...], debilidades: [...] } desde el cumplimiento
  }
}

export async function saveFoda(centroId, anio, trimestre, data) {
  await requireCentroAccess(centroId)
  await upsert('foda', {
    centro_id: centroId, anio, trimestre,
    fortalezas: data.fortalezas ?? null,
    debilidades: data.debilidades ?? null,
    oportunidades: data.oportunidades ?? null,
    amenazas: data.amenazas ?? null,
    comentarios: data.comentarios ?? null,
    comentario_estado: data.comentario_estado ?? null,
    updated_at: new Date().toISOString(),
  }, ['centro_id', 'anio', 'trimestre'])
  return { ok: true }
}

// ── Peticiones / comentarios del administrador (varios por trimestre) ──
const ESTADOS = ['Próximo trimestre', 'Negado', 'Aprobado', 'En proceso', 'Cumplido']

export async function listPeticiones(centroId, anio, trimestre) {
  await requireCentroAccess(centroId)
  return await sql`
    SELECT id, texto, estado FROM peticiones
    WHERE centro_id = ${centroId} AND anio = ${anio} AND trimestre = ${trimestre}
    ORDER BY created_at
  `
}

export async function addPeticion(centroId, anio, trimestre, texto) {
  await requireCentroAccess(centroId)
  const t = (texto || '').trim()
  if (!t) return { error: 'Escribe el texto de la petición.' }
  const [row] = await sql`
    INSERT INTO peticiones (centro_id, anio, trimestre, texto, estado)
    VALUES (${centroId}, ${anio}, ${trimestre}, ${t}, 'Próximo trimestre')
    RETURNING id, texto, estado
  `
  return { ok: true, peticion: row }
}

export async function updatePeticion(centroId, id, { texto, estado }) {
  await requireCentroAccess(centroId)
  if (estado !== undefined) {
    if (!ESTADOS.includes(estado)) return { error: 'Estado inválido.' }
    await sql`UPDATE peticiones SET estado = ${estado}, updated_at = now() WHERE id = ${id} AND centro_id = ${centroId}`
  }
  if (texto !== undefined) {
    await sql`UPDATE peticiones SET texto = ${(texto || '').trim()}, updated_at = now() WHERE id = ${id} AND centro_id = ${centroId}`
  }
  return { ok: true }
}

export async function deletePeticion(centroId, id) {
  await requireCentroAccess(centroId)
  await sql`DELETE FROM peticiones WHERE id = ${id} AND centro_id = ${centroId}`
  return { ok: true }
}
