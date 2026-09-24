// Uso:
//   node scripts/caja-semilla.mjs                      → solo muestra qué haría
//   node scripts/caja-semilla.mjs --apply [archivos…]  → siembra y carga extractos (.ofx / .pdf)
// Cuentas: ON CONFLICT DO NOTHING. Reglas, pagos programados y baldes: solo si su tabla está vacía.
// Los extractos se deduplican por (cuenta, fitid): correrlo dos veces no duplica movimientos.
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { cargarEnv, conCliente } from './migrate-caja.mjs'
import { CUENTAS, COMPROMISOS, BALDES } from '../lib/caja/semilla-datos.mjs'
import { REGLAS_SEMILLA, clasificar } from '../lib/caja/reglas.mjs'
import { leerExtracto, soloDigitos } from '../lib/caja/extracto.mjs'
import { insertarImportacion } from '../lib/caja/persistencia.mjs'

function tag(client) {
  return async (strings, ...values) => {
    let text = strings[0]
    for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`
    return (await client.query(text, values)).rows
  }
}

const args = process.argv.slice(2)
const flagDesconocido = args.find((a) => a.startsWith('--') && a !== '--apply')
if (flagDesconocido) throw new Error(`Opción desconocida ${flagDesconocido}. Uso: node scripts/caja-semilla.mjs [--apply] [archivos…]`)
const apply = args.includes('--apply')
const archivos = args.filter((a) => a !== '--apply')

cargarEnv()
const destino = (() => { try { return new URL(process.env.DATABASE_URL).host } catch { return '(DATABASE_URL ilegible)' } })()

await conCliente(async (client) => {
  const q = tag(client)
  const [{ n: reglas }] = await q`SELECT count(*)::int AS n FROM caja_reglas`
  const [{ n: compromisos }] = await q`SELECT count(*)::int AS n FROM caja_compromisos`
  const [{ n: baldes }] = await q`SELECT count(*)::int AS n FROM caja_baldes`
  console.log(JSON.stringify({
    modo: apply ? 'aplicar' : 'solo-lectura', destino,
    existentes: { reglas, compromisos, baldes },
    sembraria: {
      cuentas: CUENTAS.length,
      reglas: reglas === 0 ? REGLAS_SEMILLA.length : 0,
      compromisos: compromisos === 0 ? COMPROMISOS.length : 0,
      baldes: baldes === 0 ? BALDES.length : 0,
    },
    archivos: archivos.map((a) => basename(a)),
  }))
  if (!apply) return

  await client.query('BEGIN')
  try {
    for (const c of CUENTAS) {
      await q`INSERT INTO caja_cuentas (empresa, banco, numero, nombre, tipo, limite, saldo_ancla, saldo_ancla_fecha)
              VALUES (${c.empresa}, ${c.banco}, ${c.numero}, ${c.nombre}, ${c.tipo}, ${c.limite ?? null}, ${c.saldo_ancla ?? null}, ${c.saldo_ancla_fecha ?? null})
              ON CONFLICT (banco, numero) DO NOTHING`
    }
    if (reglas === 0) for (const r of REGLAS_SEMILLA) {
      await q`INSERT INTO caja_reglas (patron, empresa, signo, clase, categoria, prioridad) VALUES (${r.patron}, ${r.empresa}, ${r.signo}, ${r.clase}, ${r.categoria}, ${r.prioridad})`
    }
    if (compromisos === 0) for (const c of COMPROMISOS) {
      await q`INSERT INTO caja_compromisos (empresa, concepto, clase, categoria, monto, frecuencia, dia, fecha, desde)
              VALUES (${c.empresa}, ${c.concepto}, ${c.clase}, ${c.categoria}, ${c.monto}, ${c.frecuencia}, ${c.dia ?? null}, ${c.fecha ?? null}, '2026-09-24')`
    }
    if (baldes === 0) for (const b of BALDES) {
      await q`INSERT INTO caja_baldes (empresa, vigente_desde, dueno_pct, impuesto_pct) VALUES (${b.empresa}, ${b.vigente_desde}, ${b.dueno_pct}, ${b.impuesto_pct})`
    }
    await client.query('COMMIT')
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e }

  const todasReglas = await q`SELECT id, patron, empresa, signo, clase, categoria, prioridad FROM caja_reglas`
  for (const ruta of archivos) {
    const leido = await leerExtracto(ruta, new Uint8Array(readFileSync(ruta)))
    const [cuenta] = await q`SELECT id, empresa FROM caja_cuentas WHERE activa AND regexp_replace(numero, '\\D', '', 'g') = ${soloDigitos(leido.cuenta)}`
    if (!cuenta) throw new Error(`${basename(ruta)}: cuenta ${leido.cuenta} no registrada`)
    const movimientos = leido.movimientos.map((m) => ({ ...m, ...clasificar(m, todasReglas, cuenta.empresa) }))
    await client.query('BEGIN')
    try {
      const r = await insertarImportacion(q, { cuentaId: cuenta.id, archivo: basename(ruta), formato: leido.formato, saldo: leido.saldo, movimientos })
      await client.query('COMMIT')
      console.log(JSON.stringify({
        archivo: basename(ruta), cuenta: leido.cuenta, leidos: movimientos.length,
        nuevos: r.nuevos, duplicados: r.duplicados,
        porClasificar: movimientos.filter((m) => m.clase === 'por_clasificar').length,
        saldo: leido.saldo,
        ...(leido.descuadre ? { descuadre: leido.descuadre } : {}),
      }))
    } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e }
  }
})
