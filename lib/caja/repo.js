import { sql, withTransaction } from '../db'
import { clasificar } from './reglas.mjs'
import { insertarImportacion } from './persistencia.mjs'
import { soloDigitos } from './extracto.mjs'

// Saldo de cada cuenta = último saldo conocido del banco (ancla manual o el de la
// importación más reciente) + movimientos posteriores a esa fecha.
export async function listarCuentas() {
  return sql`
    SELECT c.id, c.empresa, c.banco, c.numero, c.nombre, c.tipo, c.limite::float8 AS limite,
           b.monto::float8 AS base, to_char(b.fecha, 'YYYY-MM-DD') AS base_fecha,
           COALESCE((SELECT SUM(m.monto) FROM caja_movimientos m WHERE m.cuenta_id = c.id AND m.fecha > b.fecha), 0)::float8 AS posterior,
           (SELECT to_char(MAX(m.fecha), 'YYYY-MM-DD') FROM caja_movimientos m WHERE m.cuenta_id = c.id) AS ultimo_movimiento
    FROM caja_cuentas c
    LEFT JOIN LATERAL (
      -- Desempate determinista: el mismo día, un extracto real (prioridad 1) le gana al
      -- ancla manual (0), y entre importaciones gana la más reciente (mayor id).
      SELECT x.monto, x.fecha FROM (
        SELECT c.saldo_ancla AS monto, c.saldo_ancla_fecha AS fecha, 0 AS prioridad, 0 AS orden WHERE c.saldo_ancla IS NOT NULL
        UNION ALL
        SELECT i.saldo_banco, i.saldo_banco_fecha, 1, i.id FROM caja_importaciones i WHERE i.cuenta_id = c.id AND i.saldo_banco IS NOT NULL
      ) x ORDER BY x.fecha DESC, x.prioridad DESC, x.orden DESC LIMIT 1
    ) b ON true
    WHERE c.activa
    ORDER BY c.empresa, c.id`
}

export async function cuentaPorNumero(numero) {
  const [c] = await sql`SELECT id, empresa, nombre FROM caja_cuentas WHERE activa AND regexp_replace(numero, '\\D', '', 'g') = ${soloDigitos(numero)}`
  return c || null
}

export async function listarReglas() {
  return sql`SELECT id, patron, empresa, signo, clase, categoria, prioridad FROM caja_reglas ORDER BY prioridad, id`
}

export async function movimientosDesde(desde) {
  return sql`
    SELECT m.id, m.cuenta_id, c.empresa, c.tipo AS cuenta_tipo, c.nombre AS cuenta_nombre,
           to_char(m.fecha, 'YYYY-MM-DD') AS fecha, m.monto::float8 AS monto, m.memo, m.clase, m.categoria
    FROM caja_movimientos m JOIN caja_cuentas c ON c.id = m.cuenta_id
    WHERE m.fecha >= ${desde}
    ORDER BY m.fecha, m.id`
}

export async function porClasificar() {
  return sql`
    SELECT m.id, c.empresa, c.nombre AS cuenta_nombre, to_char(m.fecha, 'YYYY-MM-DD') AS fecha, m.monto::float8 AS monto, m.memo
    FROM caja_movimientos m JOIN caja_cuentas c ON c.id = m.cuenta_id
    WHERE m.clase = 'por_clasificar'
    ORDER BY m.fecha DESC, m.id DESC
    LIMIT 200`
}

export async function fitidsExistentes(cuentaId, fitids) {
  const rows = await sql`SELECT fitid FROM caja_movimientos WHERE cuenta_id = ${cuentaId} AND fitid = ANY(${fitids}::text[])`
  return new Set(rows.map((r) => r.fitid))
}

export async function listarCompromisos() {
  return sql`
    SELECT id, empresa, concepto, clase, categoria, monto::float8 AS monto, frecuencia, dia,
           to_char(fecha, 'YYYY-MM-DD') AS fecha, to_char(desde, 'YYYY-MM-DD') AS desde,
           to_char(hasta, 'YYYY-MM-DD') AS hasta, activo
    FROM caja_compromisos WHERE activo ORDER BY empresa, clase, concepto`
}

export async function listarAjustes(desde) {
  return sql`SELECT empresa, to_char(semana, 'YYYY-MM-DD') AS semana, ingreso::float8 AS ingreso, nota FROM caja_ajustes_semana WHERE semana >= ${desde}`
}

export async function listarBaldes() {
  return sql`SELECT empresa, to_char(vigente_desde, 'YYYY-MM-DD') AS vigente_desde, dueno_pct::float8 AS dueno_pct, impuesto_pct::float8 AS impuesto_pct FROM caja_baldes ORDER BY empresa, vigente_desde`
}

export async function guardarImportacion(args) {
  return withTransaction((query) => insertarImportacion(query, args))
}

// Clasifica un movimiento y, si viene `patron`, crea la regla y la aplica a
// los demás pendientes de la misma empresa.
export async function clasificarMovimientoRepo({ id, clase, categoria, patron, usuarioId }) {
  return withTransaction(async (query) => {
    const [mov] = await query`
      SELECT m.id, m.monto::float8 AS monto, m.memo, c.empresa
      FROM caja_movimientos m JOIN caja_cuentas c ON c.id = m.cuenta_id WHERE m.id = ${id} FOR UPDATE OF m`
    if (!mov) throw new Error('Movimiento no encontrado.')
    let reglaId = null
    let otros = 0
    if (patron) {
      const [regla] = await query`
        INSERT INTO caja_reglas (patron, empresa, signo, clase, categoria, prioridad, creado_por)
        VALUES (${patron}, ${mov.empresa}, ${Math.sign(mov.monto)}, ${clase}, ${categoria}, 30, ${usuarioId})
        RETURNING id, patron, empresa, signo, clase, categoria, prioridad`
      reglaId = regla.id
      const pendientes = await query`
        SELECT m.id, m.monto::float8 AS monto, m.memo FROM caja_movimientos m JOIN caja_cuentas c ON c.id = m.cuenta_id
        WHERE m.clase = 'por_clasificar' AND c.empresa = ${mov.empresa} AND m.id <> ${id}`
      const ids = pendientes.filter((p) => clasificar(p, [regla], mov.empresa).regla_id === regla.id).map((p) => p.id)
      if (ids.length) {
        // Solo los que siguen por clasificar: en ReadCommitted otro usuario pudo
        // clasificar alguno entre el SELECT y este UPDATE, y no se pisa.
        const actualizados = await query`
          UPDATE caja_movimientos SET clase = ${clase}, categoria = ${categoria}, regla_id = ${regla.id}, clasificado_por = ${usuarioId}
          WHERE id = ANY(${ids}::int[]) AND clase = 'por_clasificar'
          RETURNING id`
        otros = actualizados.length
      }
    }
    await query`UPDATE caja_movimientos SET clase = ${clase}, categoria = ${categoria}, regla_id = ${reglaId}, clasificado_por = ${usuarioId} WHERE id = ${id}`
    return { otros }
  }, { isolationLevel: 'ReadCommitted' })
}

export async function guardarCompromisoRepo(c) {
  if (c.id) {
    const rows = await sql`
      UPDATE caja_compromisos SET empresa = ${c.empresa}, concepto = ${c.concepto}, clase = ${c.clase}, categoria = ${c.categoria},
        monto = ${c.monto}, frecuencia = ${c.frecuencia}, dia = ${c.dia}, fecha = ${c.fecha}, hasta = ${c.hasta}
      WHERE id = ${c.id}
      RETURNING id`
    if (!rows.length) throw new Error('Compromiso no encontrado.')
    return c.id
  }
  const [row] = await sql`
    INSERT INTO caja_compromisos (empresa, concepto, clase, categoria, monto, frecuencia, dia, fecha, hasta)
    VALUES (${c.empresa}, ${c.concepto}, ${c.clase}, ${c.categoria}, ${c.monto}, ${c.frecuencia}, ${c.dia}, ${c.fecha}, ${c.hasta})
    RETURNING id`
  return row.id
}

export async function desactivarCompromisoRepo(id) {
  await sql`UPDATE caja_compromisos SET activo = FALSE WHERE id = ${id}`
}

export async function guardarAjusteRepo({ empresa, semana, ingreso, nota }) {
  if (ingreso === null) {
    await sql`DELETE FROM caja_ajustes_semana WHERE empresa = ${empresa} AND semana = ${semana}`
    return
  }
  await sql`
    INSERT INTO caja_ajustes_semana (empresa, semana, ingreso, nota) VALUES (${empresa}, ${semana}, ${ingreso}, ${nota})
    ON CONFLICT (empresa, semana) DO UPDATE SET ingreso = EXCLUDED.ingreso, nota = EXCLUDED.nota`
}
