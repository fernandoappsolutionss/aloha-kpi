// Acceso a datos del conciliador. Server-only: todo entra parametrizado y las
// decisiones de permiso viven en las server actions (app/actions/conciliacion.js).
import { sql, withTransaction } from './db'

const COLUMNAS_MOV = [
  'lote_id', 'cuenta_id', 'fecha', 'descripcion', 'referencia', 'monto', 'direccion',
  'huella', 'estado', 'zoho_account_id', 'zoho_account_nombre', 'transaction_type',
  'regla_id', 'zoho_transaction_id', 'nota', 'fila',
]

// Inserta los movimientos de un lote en tandas. Se arma un INSERT multi-fila
// (parametrizado: los valores nunca se interpolan) porque una fila por viaje
// contra Neon serverless convierte un extracto de 300 líneas en 300 idas y
// vueltas.
const TANDA = 200

// Devuelve los trozos de texto y los valores en el mismo formato que consume
// un tagged template: `partes` tiene exactamente un elemento más que
// `valores`, y entre cada par se intercala el marcador $n. Se exporta para
// poder probarlo: un separador de más o de menos produce SQL rota que solo
// se vería contra la base real.
export function construirInsertMovimientos(filas, columnas = COLUMNAS_MOV) {
  const partes = [`INSERT INTO conciliacion_movimientos (${columnas.join(', ')}) VALUES (`]
  const valores = []
  filas.forEach((fila, indiceFila) => {
    columnas.forEach((col, indiceCol) => {
      valores.push(fila[col] ?? null)
      const ultimoDeFila = indiceCol === columnas.length - 1
      if (!ultimoDeFila) partes.push(', ')
      else if (indiceFila < filas.length - 1) partes.push('), (')
    })
  })
  partes.push(')')
  return { partes, valores }
}

function insertarTanda(query, filas) {
  const { partes, valores } = construirInsertMovimientos(filas)
  const strings = partes.slice()
  strings.raw = partes.slice()
  return query(strings, ...valores)
}

// ── Cuentas (mapeo centro ↔ Zoho) ────────────────────────────────────────────

export async function listarCuentas({ centroId = null, soloActivas = false } = {}) {
  const filas = centroId === null
    ? await sql`
        SELECT c.*, ce.nombre AS centro_nombre
        FROM conciliacion_cuentas c
        LEFT JOIN centros ce ON ce.id = c.centro_id
        ORDER BY ce.nombre NULLS FIRST, c.etiqueta`
    : await sql`
        SELECT c.*, ce.nombre AS centro_nombre
        FROM conciliacion_cuentas c
        LEFT JOIN centros ce ON ce.id = c.centro_id
        WHERE c.centro_id = ${Number(centroId)}
        ORDER BY c.etiqueta`
  return soloActivas ? filas.filter((f) => f.activa) : filas
}

export async function obtenerCuenta(id) {
  const [fila] = await sql`
    SELECT c.*, ce.nombre AS centro_nombre
    FROM conciliacion_cuentas c
    LEFT JOIN centros ce ON ce.id = c.centro_id
    WHERE c.id = ${Number(id)}`
  return fila || null
}

export async function crearCuenta(datos) {
  const [fila] = await sql`
    INSERT INTO conciliacion_cuentas
      (centro_id, etiqueta, zoho_org_id, zoho_org_nombre, zoho_account_id, zoho_account_nombre,
       moneda, cuenta_ingreso_id, cuenta_ingreso_nombre, cuenta_gasto_id, cuenta_gasto_nombre,
       tolerancia_dias, activa)
    VALUES
      (${datos.centro_id ?? null}, ${datos.etiqueta}, ${datos.zoho_org_id}, ${datos.zoho_org_nombre ?? null},
       ${datos.zoho_account_id}, ${datos.zoho_account_nombre ?? null}, ${datos.moneda ?? 'USD'},
       ${datos.cuenta_ingreso_id ?? null}, ${datos.cuenta_ingreso_nombre ?? null},
       ${datos.cuenta_gasto_id ?? null}, ${datos.cuenta_gasto_nombre ?? null},
       ${Number(datos.tolerancia_dias ?? 3)}, ${datos.activa !== false})
    RETURNING *`
  return fila
}

export async function actualizarCuenta(id, datos) {
  const [fila] = await sql`
    UPDATE conciliacion_cuentas SET
      centro_id = ${datos.centro_id ?? null},
      etiqueta = ${datos.etiqueta},
      cuenta_ingreso_id = ${datos.cuenta_ingreso_id ?? null},
      cuenta_ingreso_nombre = ${datos.cuenta_ingreso_nombre ?? null},
      cuenta_gasto_id = ${datos.cuenta_gasto_id ?? null},
      cuenta_gasto_nombre = ${datos.cuenta_gasto_nombre ?? null},
      tolerancia_dias = ${Number(datos.tolerancia_dias ?? 3)},
      activa = ${datos.activa !== false},
      updated_at = now()
    WHERE id = ${Number(id)}
    RETURNING *`
  return fila || null
}

export async function eliminarCuenta(id) {
  await sql`DELETE FROM conciliacion_cuentas WHERE id = ${Number(id)}`
}

// ── Reglas ───────────────────────────────────────────────────────────────────

// Las reglas de una cuenta son las suyas más las generales de su organización.
export async function listarReglasDeCuenta(cuenta) {
  return await sql`
    SELECT * FROM conciliacion_reglas
    WHERE zoho_org_id = ${cuenta.zoho_org_id}
      AND (cuenta_id IS NULL OR cuenta_id = ${Number(cuenta.id)})
      AND activa = TRUE
    ORDER BY prioridad DESC, id`
}

export async function listarReglas(orgId) {
  return await sql`
    SELECT r.*, c.etiqueta AS cuenta_etiqueta
    FROM conciliacion_reglas r
    LEFT JOIN conciliacion_cuentas c ON c.id = r.cuenta_id
    WHERE r.zoho_org_id = ${orgId}
    ORDER BY r.prioridad DESC, r.id`
}

export async function crearRegla(datos) {
  const [fila] = await sql`
    INSERT INTO conciliacion_reglas
      (zoho_org_id, cuenta_id, patron, modo, direccion, zoho_account_id, zoho_account_nombre,
       transaction_type, prioridad, activa, creado_por)
    VALUES
      (${datos.zoho_org_id}, ${datos.cuenta_id ?? null}, ${datos.patron}, ${datos.modo},
       ${datos.direccion}, ${datos.zoho_account_id}, ${datos.zoho_account_nombre ?? null},
       ${datos.transaction_type ?? null}, ${Number(datos.prioridad ?? 0)}, ${datos.activa !== false},
       ${datos.creado_por ?? null})
    RETURNING *`
  return fila
}

export async function actualizarRegla(id, datos) {
  const [fila] = await sql`
    UPDATE conciliacion_reglas SET
      patron = ${datos.patron},
      modo = ${datos.modo},
      direccion = ${datos.direccion},
      zoho_account_id = ${datos.zoho_account_id},
      zoho_account_nombre = ${datos.zoho_account_nombre ?? null},
      cuenta_id = ${datos.cuenta_id ?? null},
      prioridad = ${Number(datos.prioridad ?? 0)},
      activa = ${datos.activa !== false},
      updated_at = now()
    WHERE id = ${Number(id)}
    RETURNING *`
  return fila || null
}

export async function eliminarRegla(id) {
  await sql`DELETE FROM conciliacion_reglas WHERE id = ${Number(id)}`
}

// ── Lotes y movimientos ──────────────────────────────────────────────────────

// Huellas ya conocidas de esa cuenta, con el lote donde quedaron. Sirve para
// marcar como duplicado lo que vuelve a subir en otro archivo.
export async function huellasDeCuenta(cuentaId, { exceptoLote = null } = {}) {
  const filas = exceptoLote
    ? await sql`
        SELECT huella, lote_id, estado FROM conciliacion_movimientos
        WHERE cuenta_id = ${Number(cuentaId)} AND lote_id <> ${Number(exceptoLote)}
          AND estado NOT IN ('duplicado', 'ignorado')`
    : await sql`
        SELECT huella, lote_id, estado FROM conciliacion_movimientos
        WHERE cuenta_id = ${Number(cuentaId)} AND estado NOT IN ('duplicado', 'ignorado')`
  const mapa = new Map()
  for (const f of filas) if (!mapa.has(f.huella)) mapa.set(f.huella, f)
  return mapa
}

export async function crearLote({ cuenta, archivo, periodo, resumen, avisos, usuarioId, movimientos }) {
  return await withTransaction(async (query) => {
    const [lote] = await query`
      INSERT INTO conciliacion_lotes
        (cuenta_id, archivo, periodo_desde, periodo_hasta, estado, resumen, avisos, subido_por)
      VALUES
        (${Number(cuenta.id)}, ${archivo || null}, ${periodo?.desde || null}, ${periodo?.hasta || null},
         'borrador', ${JSON.stringify(resumen || {})}, ${JSON.stringify(avisos || [])}, ${usuarioId ?? null})
      RETURNING *`

    const filas = movimientos.map((m) => ({
      lote_id: lote.id,
      cuenta_id: Number(cuenta.id),
      fecha: m.fecha,
      descripcion: m.descripcion,
      referencia: m.referencia || null,
      monto: m.monto,
      direccion: m.direccion,
      huella: m.huella,
      estado: m.estado,
      zoho_account_id: m.zoho_account_id || null,
      zoho_account_nombre: m.zoho_account_name || null,
      transaction_type: m.transaction_type || null,
      regla_id: m.regla_id ?? null,
      zoho_transaction_id: m.zoho_transaction_id || null,
      nota: m.nota || null,
      fila: m.fila ?? null,
    }))
    for (let i = 0; i < filas.length; i += TANDA) {
      await insertarTanda(query, filas.slice(i, i + TANDA))
    }
    return lote
  }, { isolationLevel: 'ReadCommitted' })
}

export async function listarLotes(cuentaId, { limite = 20 } = {}) {
  return await sql`
    SELECT l.*, u.nombre AS subido_por_nombre
    FROM conciliacion_lotes l
    LEFT JOIN usuarios u ON u.id = l.subido_por
    WHERE l.cuenta_id = ${Number(cuentaId)}
    ORDER BY l.created_at DESC
    LIMIT ${Number(limite)}`
}

export async function obtenerLote(loteId) {
  const [lote] = await sql`
    SELECT l.*, u.nombre AS subido_por_nombre
    FROM conciliacion_lotes l
    LEFT JOIN usuarios u ON u.id = l.subido_por
    WHERE l.id = ${Number(loteId)}`
  return lote || null
}

export async function movimientosDeLote(loteId) {
  return await sql`
    SELECT * FROM conciliacion_movimientos
    WHERE lote_id = ${Number(loteId)}
    ORDER BY fecha, id`
}

export async function obtenerMovimiento(id) {
  const [fila] = await sql`SELECT * FROM conciliacion_movimientos WHERE id = ${Number(id)}`
  return fila || null
}

export async function eliminarLote(loteId) {
  await sql`DELETE FROM conciliacion_lotes WHERE id = ${Number(loteId)}`
}

// Toma un movimiento para publicarlo. El UPDATE condicional es el candado: si
// otra pestaña (u otro reintento) ya se lo llevó, esta llamada no devuelve
// fila y aquí no se manda nada a Zoho.
export async function reclamarMovimiento(id) {
  // El NOT EXISTS descarta el caso corriente (la misma línea ya publicada
  // desde otro lote) con un mensaje claro; la garantía dura la da el índice
  // único parcial sobre ('publicado','publicando'), que hace fallar este
  // UPDATE con 23505 si dos procesos reclaman a la vez — antes de que
  // cualquiera de los dos llame a Zoho.
  try {
    const [fila] = await sql`
      UPDATE conciliacion_movimientos m
      SET estado = 'publicando', error = NULL
      WHERE m.id = ${Number(id)} AND m.estado = 'nuevo'
        AND NOT EXISTS (
          SELECT 1 FROM conciliacion_movimientos o
          WHERE o.cuenta_id = m.cuenta_id AND o.huella = m.huella
            AND o.id <> m.id AND o.estado IN ('publicado', 'publicando')
        )
      RETURNING *`
    return fila || null
  } catch (e) {
    if (e?.code === '23505') return null
    throw e
  }
}

export async function marcarPublicado(id, transactionId) {
  const [fila] = await sql`
    UPDATE conciliacion_movimientos
    SET estado = 'publicado', zoho_transaction_id = ${String(transactionId)},
        publicado_at = now(), error = NULL
    WHERE id = ${Number(id)}
    RETURNING *`
  return fila || null
}

export async function marcarError(id, mensaje, { estado = 'error' } = {}) {
  await sql`
    UPDATE conciliacion_movimientos
    SET estado = ${estado}, error = ${String(mensaje).slice(0, 400)}
    WHERE id = ${Number(id)}`
}

export async function actualizarEstadoMovimiento(id, { estado, zoho_account_id, zoho_account_nombre, transaction_type, nota }) {
  const [fila] = await sql`
    UPDATE conciliacion_movimientos SET
      estado = COALESCE(${estado ?? null}, estado),
      zoho_account_id = COALESCE(${zoho_account_id ?? null}, zoho_account_id),
      zoho_account_nombre = COALESCE(${zoho_account_nombre ?? null}, zoho_account_nombre),
      transaction_type = COALESCE(${transaction_type ?? null}, transaction_type),
      nota = COALESCE(${nota ?? null}, nota)
    WHERE id = ${Number(id)}
    RETURNING *`
  return fila || null
}

// Reevalúa el estado de un movimiento tras volver a mirar Zoho.
export async function refrescarConciliacion(id, { estado, zohoTransactionId, nota }) {
  await sql`
    UPDATE conciliacion_movimientos
    SET estado = ${estado},
        zoho_transaction_id = ${zohoTransactionId ?? null},
        nota = ${nota ?? null},
        error = NULL
    WHERE id = ${Number(id)}`
}

export async function guardarResumenLote(loteId, { resumen, estado }) {
  await sql`
    UPDATE conciliacion_lotes
    SET resumen = ${JSON.stringify(resumen || {})},
        estado = ${estado},
        publicado_at = CASE WHEN ${estado} = 'conciliado' THEN now() ELSE publicado_at END
    WHERE id = ${Number(loteId)}`
}
