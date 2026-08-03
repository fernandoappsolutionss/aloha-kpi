'use server'
import { sql, exec, upsert } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { fortalezasDebilidades } from '../../lib/checklist'

// En producción Next.js oculta el mensaje de cualquier excepción de un Server
// Action y la reemplaza por "An error occurred in the Server Components
// render…", que no le dice nada a quien está usando el panel. Por eso estas
// acciones devuelven { error: 'mensaje legible' } en vez de lanzar: la UI ya
// sabe mostrar `res.error`. El detalle técnico queda en los logs de Vercel.
function fallo(donde, e) {
  console.error(`[foda] ${donde}:`, e)
  const msg = e?.message || 'error desconocido'
  if (/No autenticado/i.test(msg)) return { error: 'Tu sesión expiró. Vuelve a entrar.' }
  if (/No autorizado/i.test(msg)) return { error: 'No tienes acceso a este centro.' }
  return { error: msg }
}

// Columnas de `foda` que escribe el guardado. La migración de este proyecto es
// manual (`npm run db:migrate`), así que una base que se creó antes de que se
// agregaran estas columnas se queda sin ellas y el INSERT revienta con 42703
// (undefined_column) — el SELECT del cargado sigue funcionando, por eso la
// página se ve bien y solo falla al guardar.
const FODA_COLUMNAS = [
  ['fortalezas', 'TEXT'],
  ['debilidades', 'TEXT'],
  ['oportunidades', 'TEXT'],
  ['amenazas', 'TEXT'],
  ['comentarios', 'TEXT'],
  ['comentario_estado', 'TEXT'],
  ['updated_at', 'TIMESTAMPTZ DEFAULT now()'],
]

async function agregarColumnasFaltantes() {
  for (const [col, tipo] of FODA_COLUMNAS) {
    await exec(`ALTER TABLE foda ADD COLUMN IF NOT EXISTS ${col} ${tipo}`)
  }
}

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
  try {
    await requireCentroAccess(centroId)
    const row = {
      centro_id: Number(centroId), anio: Number(anio), trimestre: Number(trimestre),
      fortalezas: data.fortalezas ?? null,
      debilidades: data.debilidades ?? null,
      oportunidades: data.oportunidades ?? null,
      amenazas: data.amenazas ?? null,
      comentarios: data.comentarios ?? null,
      comentario_estado: data.comentario_estado ?? null,
      updated_at: new Date().toISOString(),
    }
    const claves = ['centro_id', 'anio', 'trimestre']
    try {
      await upsert('foda', row, claves)
    } catch (e) {
      // 42703 = la tabla `foda` de esta base no tiene alguna de las columnas
      // editables. Se agregan (es idempotente) y se reintenta una vez, para no
      // depender de que alguien corra la migración a mano desde su equipo.
      if (e?.code !== '42703') throw e
      console.warn('[foda] faltaban columnas en la tabla foda; aplicando migración y reintentando')
      await agregarColumnasFaltantes()
      await upsert('foda', row, claves)
    }
    return { ok: true }
  } catch (e) {
    return fallo('saveFoda', e)
  }
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
  try {
    await requireCentroAccess(centroId)
    const t = (texto || '').trim()
    if (!t) return { error: 'Escribe el texto de la petición.' }
    const [row] = await sql`
      INSERT INTO peticiones (centro_id, anio, trimestre, texto, estado)
      VALUES (${centroId}, ${anio}, ${trimestre}, ${t}, 'Próximo trimestre')
      RETURNING id, texto, estado
    `
    return { ok: true, peticion: row }
  } catch (e) {
    return fallo('addPeticion', e)
  }
}

export async function updatePeticion(centroId, id, { texto, estado }) {
  try {
    await requireCentroAccess(centroId)
    if (estado !== undefined) {
      if (!ESTADOS.includes(estado)) return { error: 'Estado inválido.' }
      await sql`UPDATE peticiones SET estado = ${estado}, updated_at = now() WHERE id = ${id} AND centro_id = ${centroId}`
    }
    if (texto !== undefined) {
      await sql`UPDATE peticiones SET texto = ${(texto || '').trim()}, updated_at = now() WHERE id = ${id} AND centro_id = ${centroId}`
    }
    return { ok: true }
  } catch (e) {
    return fallo('updatePeticion', e)
  }
}

export async function deletePeticion(centroId, id) {
  try {
    await requireCentroAccess(centroId)
    await sql`DELETE FROM peticiones WHERE id = ${id} AND centro_id = ${centroId}`
    return { ok: true }
  } catch (e) {
    return fallo('deletePeticion', e)
  }
}
