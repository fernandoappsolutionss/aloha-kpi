import { neon } from '@neondatabase/serverless'

// Inicialización perezosa: el cliente de Neon solo se crea la primera vez que
// se ejecuta una consulta (en runtime). Así `next build` no falla cuando aún
// no hay DATABASE_URL configurada.
let _client = null
function client() {
  if (_client) return _client
  if (!process.env.DATABASE_URL) {
    throw new Error('Falta DATABASE_URL. Configúrala en .env.local o en Vercel.')
  }
  _client = neon(process.env.DATABASE_URL)
  return _client
}

// `sql` se usa como tagged template (parametrizado, seguro contra inyección):
//   const rows = await sql`SELECT * FROM centros WHERE id = ${id}`
export function sql(strings, ...values) {
  return client()(strings, ...values)
}

// Transacción NO interactiva del cliente HTTP de Neon: todas las sentencias
// viajan juntas en un solo round-trip y se ejecutan atómicamente (si una
// falla, todo revierte). OJO: una sentencia no puede leer en JS el resultado
// de la anterior — para encadenar valores dentro de la transacción se usa una
// CTE escribible en UNA sentencia. Acepta un arreglo de consultas SIN await
// (creadas con `sql`) o una función que recibe `sql` y devuelve ese arreglo:
//   const [filasA, filasB] = await tx((sql) => [sql`...`, sql`...`])
export async function tx(fnOrStatements) {
  const c = client()
  const statements = typeof fnOrStatements === 'function' ? fnOrStatements(sql) : fnOrStatements
  return await c.transaction(statements)
}

// Ejecuta una sentencia sin parámetros (DDL de migración, p. ej.).
// IMPORTANTE: `statement` debe ser una constante del código, NUNCA entrada del
// usuario — no hay parametrización posible en una sentencia suelta.
export async function exec(statement) {
  const strings = [statement]
  strings.raw = [statement]
  return await sql(strings)
}

// Helper genérico de UPSERT.
// IMPORTANTE: `table`, las claves de `row` y `conflictCols` deben provenir de
// constantes controladas por el código (NUNCA de entrada del usuario), porque
// se interpolan como identificadores. Los VALORES sí van parametrizados ($1, $2…).
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
