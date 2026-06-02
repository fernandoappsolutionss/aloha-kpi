'use server'
import { sql, upsert } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { CUMPLIMIENTO_KEYS } from '../../lib/checklist'

async function ensureTrimestre(centroId, anio, trimestre) {
  const [t] = await sql`SELECT id FROM trimestres WHERE centro_id = ${centroId} AND anio = ${anio} AND trimestre = ${trimestre}`
  if (t) return t.id
  const [nt] = await sql`INSERT INTO trimestres (centro_id, anio, trimestre) VALUES (${centroId}, ${anio}, ${trimestre}) RETURNING id`
  return nt.id
}

export async function loadCumplimiento(centroId, anio, trimestre, mes) {
  await requireCentroAccess(centroId)
  const trimestreId = await ensureTrimestre(centroId, anio, trimestre)
  const [row] = await sql`SELECT * FROM cumplimiento WHERE trimestre_id = ${trimestreId} AND mes = ${mes}`
  if (!row) return { trimestreId, vals: null } // sin registro: la UI usará sus valores por defecto
  const vals = {}
  for (const k of CUMPLIMIENTO_KEYS) vals[k] = row[k] || 'no'
  return { trimestreId, vals }
}

export async function saveCumplimiento(centroId, anio, trimestre, mes, incoming) {
  await requireCentroAccess(centroId)
  const trimestreId = await ensureTrimestre(centroId, anio, trimestre)
  const row = { trimestre_id: trimestreId, mes }
  for (const k of CUMPLIMIENTO_KEYS) row[k] = incoming?.[k] === 'si' ? 'si' : 'no'
  row.updated_at = new Date().toISOString()
  await upsert('cumplimiento', row, ['trimestre_id', 'mes'])
  return { ok: true }
}
