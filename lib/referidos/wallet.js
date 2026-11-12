// Envío del saldo a las tarjetas de Wallet: uno a la vez por miembro y
// confirmando solo la versión enviada. Server-only.
import { sql, withTransaction } from '../db'
import { appleConfig, avisarDispositivos } from './wallet-apple.mjs'
import { desactivarObjeto, googleConfig, publicarObjeto } from './wallet-google.mjs'

const base = () => (process.env.REFERIDOS_BASE_URL || 'https://aloha-kpi.vercel.app').replace(/\/$/, '')

export async function miembroParaWallet(q, miembroId) {
  const [m] = await q`
    SELECT m.id, m.nombre, m.codigo, m.emision, m.version, m.apple_auth, m.google_objeto_at, m.actualizado_at,
      (SELECT COALESCE(SUM(monto_cent), 0)::int FROM referidos_movimientos WHERE miembro_id = m.id) AS saldo_cent
    FROM referidos_miembros m WHERE m.id = ${miembroId}`
  return m || null
}

// `esperar`: el botón de Google espera el candado (necesita el objeto creado);
// el post-commit y el cron no esperan — si está ocupado, el que lo tiene o el
// cron siguiente lo cubre. `crearGoogle` crea el objeto aunque aún no exista.
export async function enviarWallet(miembroId, { esperar = false, crearGoogle = false } = {}) {
  const apple = appleConfig(), google = googleConfig()
  return withTransaction(async (q) => {
    const llave = `referidos:wallet:${miembroId}`
    if (esperar) await q`SELECT pg_advisory_xact_lock(hashtext(${llave}))`
    else if (!(await q`SELECT pg_try_advisory_xact_lock(hashtext(${llave})) AS libre`)[0].libre) return { ocupado: true }
    const m = await miembroParaWallet(q, miembroId)
    if (!m) return { error: 'Miembro no encontrado.' }
    let ok = true
    if (apple) {
      const dispositivos = await q`SELECT device_id, push_token FROM referidos_apple_dispositivos WHERE miembro_id = ${miembroId}`
      const r = await avisarDispositivos(dispositivos.map((d) => d.push_token), apple).catch(() => ({ muertos: [], ok: false }))
      if (r.muertos.length) await q`DELETE FROM referidos_apple_dispositivos WHERE miembro_id = ${miembroId} AND push_token = ANY(${r.muertos}::text[])`
      ok = ok && r.ok
    }
    if (google && (m.google_objeto_at || crearGoogle)) {
      try {
        await publicarObjeto(m, { config: google, base: base() })
        if (!m.google_objeto_at) await q`UPDATE referidos_miembros SET google_objeto_at = now() WHERE id = ${miembroId}`
      } catch (error) { console.error('[referidos] google', error); ok = false }
    }
    // Solo se confirma la versión leída y solo si la emisión no cambió: si el
    // saldo cambió durante el envío, sigue pendiente.
    if (ok) await q`UPDATE referidos_miembros SET wallet_version_enviada = GREATEST(wallet_version_enviada, ${m.version}) WHERE id = ${miembroId} AND emision = ${m.emision}`
    return { ok, miembro: m }
  }, { isolationLevel: 'ReadCommitted' })
}

// Objetos de Google de emisiones anteriores: se desactivan y se reintenta hasta lograrlo.
export async function procesarBajasGoogle() {
  const google = googleConfig()
  if (!google) return 0
  const pendientes = await sql`SELECT objeto_id FROM referidos_google_bajas WHERE hecho_at IS NULL LIMIT 100`
  for (const { objeto_id } of pendientes) {
    try {
      await desactivarObjeto(objeto_id, { config: google })
      await sql`UPDATE referidos_google_bajas SET hecho_at = now() WHERE objeto_id = ${objeto_id}`
    } catch (error) { console.error('[referidos] baja google', error) }
  }
  return pendientes.length
}
