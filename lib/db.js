import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  // Aviso claro en logs del servidor si falta la configuración.
  console.warn('[db] Falta DATABASE_URL. Configúrala en .env.local o en Vercel.')
}

// `sql` se usa como tagged template (parametrizado, seguro contra inyección):
//   const rows = await sql`SELECT * FROM centros WHERE id = ${id}`
// y también de forma dinámica con sql.query(text, params).
export const sql = neon(process.env.DATABASE_URL)

// Helper genérico de UPSERT.
// IMPORTANTE: `table`, las claves de `row` y `conflictCols` deben provenir de
// constantes controladas por el código (NUNCA de entrada del usuario), porque
// se interpolan como identificadores. Los VALORES sí van parametrizados ($1, $2…)
// emulando un tagged template del driver http de Neon.
export async function upsert(table, row, conflictCols) {
  const cols = Object.keys(row)
  const vals = Object.values(row)
  const updates = cols
    .filter((c) => !conflictCols.includes(c))
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(', ')

  const strings = [`INSERT INTO ${table} (${cols.join(', ')}) VALUES (`]
  for (let i = 1; i < vals.length; i++) strings.push(', ')
  strings.push(`) ON CONFLICT (${conflictCols.join(', ')}) DO UPDATE SET ${updates}`)
  strings.raw = strings.slice()

  return await sql(strings, ...vals)
}
