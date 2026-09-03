// Conexión OAuth con Zoho Books guardada en la DB (fila única en
// zoho_conexion). El refresh token de Zoho no caduca: Fernando se loguea una
// vez desde /dashboard/zoho y el cron queda contando solo.
import { sql } from './db'

export async function zohoRefreshToken() {
  // ponytail: el env sigue sirviendo como override manual (backfills locales).
  if (process.env.ZOHO_REFRESH_TOKEN) return process.env.ZOHO_REFRESH_TOKEN
  try {
    const [fila] = await sql`SELECT refresh_token FROM zoho_conexion WHERE id = 1`
    return fila?.refresh_token || null
  } catch {
    return null
  }
}

export async function zohoConexionInfo() {
  try {
    const [fila] = await sql`SELECT email, conectado_por, conectado_at FROM zoho_conexion WHERE id = 1`
    return fila || null
  } catch {
    return null
  }
}

export async function guardarZohoConexion({ refreshToken, email, por }) {
  await sql`
    INSERT INTO zoho_conexion (id, refresh_token, email, conectado_por, conectado_at)
    VALUES (1, ${refreshToken}, ${email}, ${por || null}, now())
    ON CONFLICT (id) DO UPDATE SET
      refresh_token = EXCLUDED.refresh_token,
      email = EXCLUDED.email,
      conectado_por = EXCLUDED.conectado_por,
      conectado_at = now()`
}
