// Aplica db/schema.sql contra Neon usando el driver HTTP (puerto 443).
// Útil cuando el puerto 5432 (psql) está bloqueado por la red.
// Uso:  npm run db:migrate   (requiere DATABASE_URL en .env.local o el entorno)
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

// Carga .env.local si existe (sin dependencias externas).
try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch { /* opcional */ }

if (!process.env.DATABASE_URL) {
  console.error('❌ Falta DATABASE_URL. Defínela en .env.local o en el entorno.')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

// El esquema no usa bloques con `;` internos (sin funciones plpgsql),
// así que separar por `;` es seguro. Se quitan los comentarios de línea.
const raw = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8')
const statements = raw
  .replace(/--.*$/gm, '')
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0)

console.log(`→ Aplicando ${statements.length} sentencias de db/schema.sql…`)
for (const st of statements) {
  const strings = [st]
  strings.raw = [st]
  await sql(strings)
}
console.log('✅ Esquema aplicado correctamente.')
