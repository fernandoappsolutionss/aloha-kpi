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

  // Bloquea una única cotización por id (usada por prepare/discardAttempt
  // del flujo de subida: necesitan decidir sobre UN intento puntual, no
  // sobre todas las cotizaciones de la petición como listQuotes).
  async lockQuote(query, id) {
    const [row] = await query('SELECT * FROM peticion_cotizaciones WHERE id = $1 FOR UPDATE', [id])
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

  // Crea o actualiza el intento de carga de una cotización. Si row.id es
  // null, inserta una fila nueva; si viene con id, actualiza esa fila (se usa
  // en reintentos, donde la misma cotización conserva su id a través de
  // varios intentos de subida).
  async prepareQuote(query, row) {
    if (row.id === null || row.id === undefined) {
      const [inserted] = await query(
        `INSERT INTO peticion_cotizaciones
           (peticion_id, proveedor_razon_social, proveedor_clave, proveedor_pais, proveedor_id_fiscal,
            proveedor_id_fiscal_clave, empresa_constituida, emite_factura_fiscal, archivo_nombre,
            archivo_mime, archivo_bytes, archivo_sha256, blob_pathname, upload_nonce, expected_pathname,
            upload_status, upload_attempts, validation_error, uploaded_by, uploaded_by_snapshot, validada_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20::jsonb, $21)
         RETURNING *`,
        [
          row.peticion_id, row.proveedor_razon_social, row.proveedor_clave, row.proveedor_pais, row.proveedor_id_fiscal,
          row.proveedor_id_fiscal_clave, row.empresa_constituida, row.emite_factura_fiscal, row.archivo_nombre,
          row.archivo_mime, row.archivo_bytes, row.archivo_sha256, row.blob_pathname, row.upload_nonce, row.expected_pathname,
          row.upload_status, row.upload_attempts, row.validation_error, row.uploaded_by, JSON.stringify(row.uploaded_by_snapshot), row.validada_at,
        ]
      )
      return inserted
    }
    const [updated] = await query(
      `UPDATE peticion_cotizaciones
       SET proveedor_razon_social = $2, proveedor_clave = $3, proveedor_pais = $4, proveedor_id_fiscal = $5,
           proveedor_id_fiscal_clave = $6, empresa_constituida = $7, emite_factura_fiscal = $8, archivo_nombre = $9,
           archivo_mime = $10, archivo_bytes = $11, archivo_sha256 = $12, blob_pathname = $13, upload_nonce = $14,
           expected_pathname = $15, upload_status = $16, upload_attempts = $17, validation_error = $18,
           uploaded_by = $19, uploaded_by_snapshot = $20::jsonb, validada_at = $21, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        row.id, row.proveedor_razon_social, row.proveedor_clave, row.proveedor_pais, row.proveedor_id_fiscal,
        row.proveedor_id_fiscal_clave, row.empresa_constituida, row.emite_factura_fiscal, row.archivo_nombre,
        row.archivo_mime, row.archivo_bytes, row.archivo_sha256, row.blob_pathname, row.upload_nonce, row.expected_pathname,
        row.upload_status, row.upload_attempts, row.validation_error, row.uploaded_by, JSON.stringify(row.uploaded_by_snapshot), row.validada_at,
      ]
    )
    return updated
  },

  // Renueva el TTL del borrador cuando se prepara una carga sobre él (solo si
  // sigue sin enviarse).
  async touchDraft(query, { id, draft_expires_at }) {
    const [row] = await query(
      `UPDATE peticiones
       SET draft_expires_at = $2, updated_at = now()
       WHERE id = $1 AND submitted_at IS NULL
       RETURNING id`,
      [id, draft_expires_at]
    )
    return row
  },

  // Solo borra intentos que NO llegaron a 'valid' (esa fila se protege con la
  // condición en el WHERE, nunca por lógica en JS).
  async deleteQuoteAttempt(query, { id, peticionId }) {
    const [row] = await query(
      `DELETE FROM peticion_cotizaciones
       WHERE id = $1 AND peticion_id = $2 AND upload_status <> 'valid'
       RETURNING id`,
      [id, peticionId]
    )
    return row
  },

  // No transaccional (usa el `sql` compartido): consulta puntual para emitir
  // el token de subida. Trae también centro_id/created_by/submitted_at/estado
  // de la petición para que authorizeToken pueda repetir la verificación de
  // pertenencia del borrador sin una segunda ida a la base.
  async getUploadAttempt(cotizacionId) {
    const [row] = await sql`
      SELECT c.*, p.centro_id AS centro_id, p.created_by AS created_by, p.submitted_at AS submitted_at, p.estado AS estado
      FROM peticion_cotizaciones c
      JOIN peticiones p ON p.id = c.peticion_id
      WHERE c.id = ${cotizacionId}
    `
    return row
  },

  // Igual que getUploadAttempt, para el polling de estado desde el panel.
  async getUploadStatus(cotizacionId) {
    const [row] = await sql`
      SELECT c.*, p.centro_id AS centro_id, p.created_by AS created_by, p.submitted_at AS submitted_at, p.estado AS estado
      FROM peticion_cotizaciones c
      JOIN peticiones p ON p.id = c.peticion_id
      WHERE c.id = ${cotizacionId}
    `
    return row
  },

  // Contexto completo para el callback de `handleUpload`: cotización +
  // petición + estado ACTUAL del usuario que inició la carga (para detectar
  // si perdió el rol/centro/contraseña entre el prepare y el callback).
  // Con { lockUser: true } (dentro de la transacción final) bloquea la fila
  // de usuarios con FOR SHARE antes de decidir markValid/markInvalid, para
  // que un cambio de rol/centro concurrente quede ordenado respecto al
  // commit de la cotización. Postgres NO permite un locking clause sobre el
  // lado nullable de un LEFT JOIN (0A000: "FOR SHARE cannot be applied to
  // the nullable side of an outer join"), así que el lock se toma con una
  // sentencia SEPARADA sobre usuarios (misma conexión/transacción) ANTES del
  // JOIN sin locking clause.
  async getCallbackContext(payload, query, { lockUser = false } = {}) {
    const runner = query || sql
    if (lockUser) {
      await runner('SELECT id FROM usuarios WHERE id = $1 FOR SHARE', [payload.uid])
    }
    const text = `
      SELECT c.*, p.centro_id AS centro_id, p.created_by AS created_by, p.submitted_at AS submitted_at, p.estado AS estado,
             (u.id IS NOT NULL) AS user_exists, u.password_hash AS user_password_hash, u.rol AS user_rol, u.centro_id AS user_centro_id
      FROM peticion_cotizaciones c
      JOIN peticiones p ON p.id = c.peticion_id
      LEFT JOIN usuarios u ON u.id = $2
      WHERE c.id = $1
    `
    const [row] = await runner(text, [payload.cotizacionId, payload.uid])
    return row
  },

  // pending -> validating: marca que el callback empezó a inspeccionar el
  // PDF recién subido. Nunca toca 'valid' ni 'invalid'.
  async markValidating(query, { cotizacionId, nonce, pathname }) {
    const [row] = await query(
      `UPDATE peticion_cotizaciones
       SET upload_status = 'validating', updated_at = now()
       WHERE id = $1 AND upload_nonce = $2 AND expected_pathname = $3 AND upload_status = 'pending'
       RETURNING *`,
      [cotizacionId, nonce, pathname]
    )
    return row || false
  },

  // validating|valid -> valid: idempotente para confirmaciones concurrentes
  // (dos callbacks que llegan a validar el mismo PDF terminan en la misma
  // fila 'valid'), pero excluye explícitamente 'cleanup_pending' para no
  // resucitar un intento que ya se marcó para borrar.
  async markValid(query, { cotizacionId, nonce, pathname, mime, bytes, sha256, validadaAt }) {
    const [row] = await query(
      `UPDATE peticion_cotizaciones
       SET upload_status = 'valid', blob_pathname = $3, archivo_mime = $4, archivo_bytes = $5,
           archivo_sha256 = $6, validada_at = $7, updated_at = now()
       WHERE id = $1 AND upload_nonce = $2 AND expected_pathname = $3 AND upload_status IN ('validating', 'valid')
       RETURNING *`,
      [cotizacionId, nonce, pathname, mime, bytes, sha256, validadaAt]
    )
    return row
  },

  // pending|validating|invalid -> invalid: nunca sobrescribe 'valid'.
  // Retorna la fila cuando la transición ocurrió, null si no (ya estaba en
  // otro estado terminal o el nonce/pathname no coincidían).
  async markInvalid(query, { cotizacionId, nonce, pathname, error }) {
    const [row] = await query(
      `UPDATE peticion_cotizaciones
       SET upload_status = 'invalid', validation_error = $4, updated_at = now()
       WHERE id = $1 AND upload_nonce = $2 AND expected_pathname = $3 AND upload_status IN ('pending', 'validating', 'invalid')
       RETURNING *`,
      [cotizacionId, nonce, pathname, error]
    )
    return row || null
  },

  async countQuotes(query, peticionId) {
    const [row] = await query('SELECT COUNT(*)::int AS count FROM peticion_cotizaciones WHERE peticion_id = $1', [peticionId])
    return row.count
  },

  // No transaccional (usa el `sql` compartido): resuelve una cotización
  // descargable a partir de SOLO su id. El centro_id/created_by/submitted_at
  // se derivan del JOIN con peticiones, nunca los aporta quien llama; solo
  // expone las columnas que la descarga necesita y únicamente cuando
  // upload_status = 'valid' (un intento pending/validating/invalid nunca es
  // descargable).
  async findDownloadableQuote(cotizacionId) {
    const numeric = Number(cotizacionId)
    if (!Number.isInteger(numeric) || numeric < 1 || numeric > 2147483647) return null
    const [row] = await sql`
      SELECT c.id, p.centro_id AS centro_id, p.created_by, p.submitted_at, c.archivo_nombre, c.blob_pathname
      FROM peticion_cotizaciones c
      JOIN peticiones p ON p.id = c.peticion_id
      WHERE c.id = ${numeric} AND c.upload_status = 'valid'
    `
    return row || null
  },
}
