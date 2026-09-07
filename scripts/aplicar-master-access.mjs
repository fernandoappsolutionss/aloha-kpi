import { pathToFileURL } from 'node:url'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { resolveNeonE2EConfig } from '../lib/neon-e2e-config.mjs'

export const MASTER_EMAIL = 'fperez@teamsolutionss.com'
export const BLOCKED_EMAILS = ['froberts@alohapanama.com', 'vcampos@alohapanama.com']
export const BLOCKED_UNTIL = '2026-09-10T05:00:00.000Z'
const EXPECTED_IDS = { [MASTER_EMAIL]: 2, 'froberts@alohapanama.com': 5, 'vcampos@alohapanama.com': 14 }
const REASON = 'Bloqueo temporal solicitado por Fernando el 7 de septiembre de 2026, hasta después del miércoles (hora de Panamá).'

export async function runMasterAccess(client, { apply = false, now = new Date(), log = console.log } = {}) {
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
  try {
    await client.query("SET LOCAL lock_timeout = '5s'")
    const { rows } = await client.query(
      `SELECT id, email, rol, blocked_until, password_hash IS NOT NULL AS active
       FROM usuarios WHERE lower(email) = ANY($1::text[]) ORDER BY id FOR UPDATE`,
      [[MASTER_EMAIL, ...BLOCKED_EMAILS]],
    )
    if (rows.length !== 3 || rows.some(u => Number(u.id) !== EXPECTED_IDS[u.email.toLowerCase()] || !u.active)) {
      throw new Error('Las tres identidades activas no coinciden con la revisión. No se aplicó ningún cambio.')
    }
    const otherMasters = await client.query("SELECT id FROM usuarios WHERE rol='admin_master' AND lower(email)<>$1", [MASTER_EMAIL])
    if (otherMasters.rows.length) throw new Error('Hay otro Master; requiere revisar antes de continuar.')
    if (!rows.every(u => u.email.toLowerCase() === MASTER_EMAIL
      ? ['admin_general','admin_master'].includes(u.rol)
      : u.rol === 'admin_general')) throw new Error('Los roles cambiaron desde la revisión inicial.')
    const before = rows.map(u => ({ ...u, blocked_until: u.blocked_until?.toISOString?.() || u.blocked_until || null }))
    log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', before, deadline: BLOCKED_UNTIL }))
    if (!apply) { await client.query('ROLLBACK'); return { applied: false, before } }
    const { rows: clockRows } = await client.query('SELECT clock_timestamp() AS db_now')
    const dbNow = new Date(clockRows[0]?.db_now).getTime()
    const deadline = new Date(BLOCKED_UNTIL).getTime()
    if (!Number.isFinite(dbNow) || dbNow >= deadline || new Date(now).getTime() >= deadline) throw new Error('La fecha del bloqueo ya venció.')
    const master = rows.find(u => u.email.toLowerCase() === MASTER_EMAIL)
    if (master.rol !== 'admin_master') {
      await client.query("UPDATE usuarios SET rol='admin_master', blocked_until=NULL WHERE id=$1", [master.id])
    } else if (master.blocked_until && new Date(master.blocked_until).getTime() > dbNow) {
      throw new Error('La cuenta Master tiene un bloqueo inesperado.')
    }
    for (const user of rows.filter(u => BLOCKED_EMAILS.includes(u.email.toLowerCase()))) {
      if (new Date(user.blocked_until || 0).toISOString() === BLOCKED_UNTIL) continue
      await client.query('UPDATE usuarios SET blocked_until=$1 WHERE id=$2', [BLOCKED_UNTIL, user.id])
      await client.query('UPDATE password_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL', [user.id])
      await client.query(
        `INSERT INTO usuario_acceso_historial(user_id,actor_id,action,previous_blocked_until,new_blocked_until,motivo)
         VALUES($1,$2,'block',$3,$4,$5)`,
        [user.id,master.id,user.blocked_until,BLOCKED_UNTIL,REASON],
      )
    }
    const { rows: after } = await client.query(
      'SELECT id,email,rol,blocked_until,blocked_until>clock_timestamp() AS blocked FROM usuarios WHERE id=ANY($1::int[]) ORDER BY id',
      [rows.map(u => u.id)],
    )
    if (after.length !== 3 || after.find(u => Number(u.id) === 2)?.rol !== 'admin_master' || after.find(u => Number(u.id) === 2)?.blocked === true || after.filter(u => Number(u.id) !== 2).some(u => u.rol !== 'admin_general' || u.blocked !== true || new Date(u.blocked_until).toISOString() !== BLOCKED_UNTIL)) {
      throw new Error('La verificación final no coincide; se revierte toda la transacción.')
    }
    await client.query('COMMIT')
    log(JSON.stringify({ applied: true, after }))
    return { applied: true, before, after }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  }
}

async function main() {
  if (process.argv.slice(2).some(x => x !== '--apply')) throw new Error('Uso: node --env-file=<entorno> scripts/aplicar-master-access.mjs [--apply]')
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.')
  neonConfig.webSocketConstructor = ws
  const transport = resolveNeonE2EConfig(process.env)
  if (transport) Object.assign(neonConfig, transport)
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()
  try { await runMasterAccess(client, { apply: process.argv.includes('--apply') }) }
  finally { client.release(); await pool.end() }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main()
