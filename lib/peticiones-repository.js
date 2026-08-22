// Repositorio SQL de peticiones/cotizaciones. Todos los métodos (salvo
// `transaction`, `listSubmitted` y `listDrafts`) reciben como primer
// argumento el query tag activo: puede ser el `sql` compartido (lib/db.js)
// o el tag de una transacción interactiva (misma forma, ver withTransaction).
// Todo valor se parametriza; nunca se interpola entrada del usuario en el
// texto SQL.
import { sql, withTransaction } from './db'

// Agregado de cotizaciones seguro para el panel: nunca incluye
// blob_pathname/expected_pathname/upload_nonce/archivo_sha256 (esos solo
// viajan por listQuotes, dentro de la transacción de envío/descarte; el
// service los descarta igual en el presentador — esto es una segunda
// barrera a nivel de consulta, no depende solo de la capa de servicio).
const QUOTES_SUBQUERY = `
  COALESCE((
    SELECT json_agg(json_build_object(
      'id', c.id,
      'proveedor_razon_social', c.proveedor_razon_social,
      'proveedor_pais', c.proveedor_pais,
      'proveedor_id_fiscal', c.proveedor_id_fiscal,
      'empresa_constituida', c.empresa_constituida,
      'emite_factura_fiscal', c.emite_factura_fiscal,
      'archivo_nombre', c.archivo_nombre,
      'archivo_bytes', c.archivo_bytes,
      'upload_status', c.upload_status,
      'upload_attempts', c.upload_attempts,
      'validation_error', c.validation_error,
      'validada_at', c.validada_at,
      'created_at', c.created_at
    ) ORDER BY c.id)
    FROM peticion_cotizaciones c
    WHERE c.peticion_id = p.id
  ), '[]'::json) AS cotizaciones
`

export const peticionesRepository = {
  async transaction(work, options) {
    return withTransaction(work, options)
  },

  // Enviadas del centro/periodo, con sus cotizaciones agregadas (todas las
  // filas de intento, no solo las válidas: así un intento fallido puede
  // reanudarse por el mismo cotizacionId). El panel solo cuenta/descarga las
  // de upload_status = 'valid'.
  async listSubmitted({ centroId, anio, trimestre }) {
    return await sql(
      `SELECT p.*, ${QUOTES_SUBQUERY}
       FROM peticiones p
       WHERE p.centro_id = $1 AND p.anio = $2 AND p.trimestre = $3 AND p.submitted_at IS NOT NULL
       ORDER BY p.id`,
      [Number(centroId), Number(anio), Number(trimestre)]
    )
  },

  // Borradores (submitted_at IS NULL) del centro/periodo. Una administradora
  // solo ve los suyos; admin_general/supervisor ven todos los del centro.
  async listDrafts({ centroId, anio, trimestre }, actor) {
    if (actor?.rol === 'administradora') {
      return await sql(
        `SELECT p.*, ${QUOTES_SUBQUERY}
         FROM peticiones p
         WHERE p.centro_id = $1 AND p.anio = $2 AND p.trimestre = $3 AND p.submitted_at IS NULL AND p.created_by = $4
         ORDER BY p.id`,
        [Number(centroId), Number(anio), Number(trimestre), actor.id]
      )
    }
    return await sql(
      `SELECT p.*, ${QUOTES_SUBQUERY}
       FROM peticiones p
       WHERE p.centro_id = $1 AND p.anio = $2 AND p.trimestre = $3 AND p.submitted_at IS NULL
       ORDER BY p.id`,
      [Number(centroId), Number(anio), Number(trimestre)]
    )
  },

  async insertComentario(query, data) {
    const [row] = await query(
      `INSERT INTO peticiones
         (centro_id, anio, trimestre, texto, tipo, categoria, estado, created_by, created_by_snapshot, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
       RETURNING *`,
      [
        data.centro_id, data.anio, data.trimestre, data.texto, data.tipo, data.categoria,
        data.estado, data.created_by, JSON.stringify(data.created_by_snapshot), data.submitted_at,
      ]
    )
    return row
  },

  async insertDraft(query, data) {
    const [row] = await query(
      `INSERT INTO peticiones
         (centro_id, anio, trimestre, texto, tipo, categoria, estado, created_by, created_by_snapshot, submitted_at, draft_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)
       RETURNING *`,
      [
        data.centro_id, data.anio, data.trimestre, data.texto, data.tipo, data.categoria,
        data.estado, data.created_by, JSON.stringify(data.created_by_snapshot), data.submitted_at, data.draft_expires_at,
      ]
    )
    return row
  },

  async lockPeticion(query, id) {
    const [row] = await query('SELECT * FROM peticiones WHERE id = $1 FOR UPDATE', [id])
    return row
  },

  async listQuotes(query, peticionId, { forUpdate = false } = {}) {
    const text = forUpdate
      ? 'SELECT * FROM peticion_cotizaciones WHERE peticion_id = $1 ORDER BY id FOR UPDATE'
      : 'SELECT * FROM peticion_cotizaciones WHERE peticion_id = $1 ORDER BY id'
    return await query(text, [peticionId])
  },

  async updateComentario(query, data) {
    const [row] = await query(
      `UPDATE peticiones SET texto = $2, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [data.id, data.texto]
    )
    return row
  },

  async updateDraft(query, data) {
    const [row] = await query(
      `UPDATE peticiones
       SET texto = $2, categoria = $3, draft_expires_at = $4, updated_at = now()
       WHERE id = $1 AND submitted_at IS NULL
       RETURNING *`,
      [data.id, data.texto, data.categoria, data.draft_expires_at]
    )
    return row
  },

  async markSubmitted(query, data) {
    const [row] = await query(
      `UPDATE peticiones
       SET submitted_at = $2, draft_expires_at = NULL, updated_at = now()
       WHERE id = $1 AND submitted_at IS NULL
       RETURNING *`,
      [data.id, data.submitted_at]
    )
    return row
  },

  async changeStatus(query, data) {
    const [row] = await query(
      `UPDATE peticiones
       SET estado = $2, anulada_at = $3, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [data.id, data.estado, data.anulada_at]
    )
    return row
  },

  async insertHistory(query, event) {
    await query(
      `INSERT INTO peticion_estado_historial
         (peticion_id, estado_anterior, estado_nuevo, changed_by, changed_by_snapshot, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       ON CONFLICT (peticion_id) WHERE estado_anterior IS NULL DO NOTHING`,
      [
        event.peticion_id,
        event.estado_anterior,
        event.estado_nuevo,
        event.changed_by,
        JSON.stringify(event.changed_by_snapshot),
        event.created_at,
      ]
    )
  },

  async enqueueCleanup(query, item) {
    await query(
      `INSERT INTO peticion_blob_cleanup (blob_pathname, motivo)
       VALUES ($1, $2)
       ON CONFLICT (blob_pathname) DO UPDATE
       SET motivo = EXCLUDED.motivo,
           generation = peticion_blob_cleanup.generation + 1,
           intentos = 0,
           ultimo_error = NULL,
           locked_at = NULL,
           lock_token = NULL,
           lock_generation = NULL,
           completed_at = NULL,
           proximo_intento_at = now()`,
      [item.blob_pathname, item.motivo]
    )
  },

  async deleteIncompleteDraftQuotes(query, id) {
    await query(
      `DELETE FROM peticion_cotizaciones
       WHERE peticion_id = $1 AND upload_status <> 'valid'`,
      [id]
    )
  },

  async deleteDraftQuotes(query, id) {
    await query('DELETE FROM peticion_cotizaciones WHERE peticion_id = $1', [id])
  },

  async deleteDraft(query, id) {
    await query('DELETE FROM peticiones WHERE id = $1 AND submitted_at IS NULL', [id])
  },
}
