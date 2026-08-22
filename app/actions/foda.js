'use server'
import { sql, exec, upsert } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { fortalezasDebilidades } from '../../lib/checklist'
import { fallo } from '../../lib/errores'

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
