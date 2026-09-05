'use server'
import { sql, upsert } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { CUMPLIMIENTO_KEYS, disciplinaPct } from '../../lib/checklist'

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
  // `existe` es el que mata el 88% fantasma: un mes SIN fila no es un mes con
  // 29 de 33 criterios cumplidos, es un mes sin registrar. La UI lo dibuja como
  // tal y el % del trimestre no lo cuenta en el denominador.
  if (!row) return { trimestreId, existe: false, vals: null }
  const vals = {}
  for (const k of CUMPLIMIENTO_KEYS) vals[k] = row[k] || 'no'
  return { trimestreId, existe: true, vals }
}

// Marcador 2 del trimestre: disciplina ponderada + cuántos meses hay realmente
// registrados. El denominador viaja siempre con el porcentaje para que
// "Disciplina 100%" no pueda leerse sin su "2 de 3 meses registrados".
export async function getDisciplinaTrimestre(centroId, anio, trimestre) {
  await requireCentroAccess(centroId)
  const rows = await sql`
    SELECT cu.* FROM cumplimiento cu JOIN trimestres t ON t.id = cu.trimestre_id
    WHERE t.centro_id = ${centroId} AND t.anio = ${anio} AND t.trimestre = ${trimestre}
    ORDER BY cu.mes
  `
  return { ...disciplinaPct(rows), mesesRegistradosLista: rows.map((r) => Number(r.mes)) }
}

// Las 3 claves de PRODUCTO se siguen escribiendo aquí para no romper el
// histórico de la tabla, pero su valor ya NO sale de un clic: la pantalla de
// Cumplimiento las manda calculadas (lib/marcadores.mjs) y las pinta de sólo
// lectura. Esta acción escribe lo que recibe.
export async function saveCumplimiento(centroId, anio, trimestre, mes, incoming) {
  await requireCentroAccess(centroId)
  const trimestreId = await ensureTrimestre(centroId, anio, trimestre)
  const row = { trimestre_id: trimestreId, mes }
  for (const k of CUMPLIMIENTO_KEYS) row[k] = incoming?.[k] === 'si' ? 'si' : 'no'
  row.updated_at = new Date().toISOString()
  await upsert('cumplimiento', row, ['trimestre_id', 'mes'])
  return { ok: true }
}
