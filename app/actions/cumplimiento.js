'use server'
import { sql, upsert } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'

// Lista blanca de columnas del checklist (evita inyección de identificadores).
const CUMPLIMIENTO_KEYS = [
  'classdojo_activo', 'ninos_completos_classdojo', 'padres_conectados', 'muro_informacion', 'bienvenida',
  'calendario', 'clase_padres', 'fotos_grupo', 'seguimiento_evolucion', 'asistente_classdojo', 'portafolio',
  'grupo_study', 'ninos_activos_study', 'niveles_actualizados', 'coach_activo', 'ninos_trabajando_study', 'asistencia_dias',
  'centro_buen_estado', 'aromatizante', 'mesa_cafe', 'brochure', 'cartel_qr', 'wifi_gratis', 'saludo_cordial', 'encuestas_satisfaccion',
  'coach_estrella', 'reuniones_mensuales', 'monitoreo_camaras', 'actividades_equipo', 'encuestas_equipo',
  'meta_cobranza', 'meta_desercion', 'meta_nuevos_ingresos',
]

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
