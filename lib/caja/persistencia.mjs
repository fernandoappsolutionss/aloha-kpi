// SQL de escritura. Recibe `query` (tagged template) para correr igual dentro de
// withTransaction (Next) y en scripts de Node.
export async function insertarImportacion(query, { cuentaId, archivo, formato, usuarioId = null, saldo, movimientos }) {
  const fechas = movimientos.map((m) => m.fecha).sort()
  // La tabla exige saldo y fecha juntos: un saldo sin fecha no sirve de ancla.
  const conSaldo = saldo && saldo.monto !== null && saldo.monto !== undefined && saldo.fecha
  const [imp] = await query`
    INSERT INTO caja_importaciones (cuenta_id, archivo, formato, desde, hasta, saldo_banco, saldo_banco_fecha, usuario_id)
    VALUES (${cuentaId}, ${archivo}, ${formato}, ${fechas[0] || null}, ${fechas.at(-1) || null},
            ${conSaldo ? saldo.monto : null}, ${conSaldo ? saldo.fecha : null}, ${usuarioId})
    RETURNING id`
  const insertados = await query`
    INSERT INTO caja_movimientos (cuenta_id, fecha, monto, memo, fitid, clase, categoria, regla_id, importacion_id)
    SELECT ${cuentaId}, t.f::date, t.mo::numeric, t.me, t.fi, t.cl, t.ca, t.re, ${imp.id}
    FROM unnest(${movimientos.map((m) => m.fecha)}::text[], ${movimientos.map((m) => m.monto)}::numeric[],
                ${movimientos.map((m) => m.memo)}::text[], ${movimientos.map((m) => m.fitid)}::text[],
                ${movimientos.map((m) => m.clase)}::text[], ${movimientos.map((m) => m.categoria)}::text[],
                ${movimientos.map((m) => m.regla_id ?? null)}::int[]) AS t(f, mo, me, fi, cl, ca, re)
    ON CONFLICT (cuenta_id, fitid) DO NOTHING
    RETURNING id`
  const nuevos = insertados.length
  const duplicados = movimientos.length - nuevos
  await query`UPDATE caja_importaciones SET nuevos = ${nuevos}, duplicados = ${duplicados} WHERE id = ${imp.id}`
  return { importacionId: imp.id, nuevos, duplicados }
}
