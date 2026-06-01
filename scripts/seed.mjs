// Seed inicial: crea el primer admin y los centros de ejemplo.
// Uso:  npm run db:seed   (requiere DATABASE_URL en el entorno)
//
// Carga .env.local si existe (sin dependencias externas).
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
} catch { /* .env.local opcional */ }

if (!process.env.DATABASE_URL) {
  console.error('❌ Falta DATABASE_URL. Defínela en .env.local o en el entorno.')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

const CENTROS = [
  ['BRISAS DEL GOLF', 'Ciudad de Panamá'],
  ['ANCLAS MALL', 'Ciudad de Panamá'],
  ['CALLE 50', 'Ciudad de Panamá'],
  ['COSTA DEL ESTE', 'Ciudad de Panamá'],
  ['DAVID', 'Chiriquí'],
  ['CONDADO DEL REY', 'Ciudad de Panamá'],
  ['AGUADULCE', 'Coclé'],
  ['SANTIAGO', 'Veraguas'],
  ['CHITRE', 'Herrera'],
]

const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@aloha.com'
const adminPass = process.env.SEED_ADMIN_PASSWORD || 'aloha2026'
const adminNombre = process.env.SEED_ADMIN_NOMBRE || 'Administrador General'

async function main() {
  console.log('→ Insertando centros…')
  for (const [nombre, region] of CENTROS) {
    await sql`INSERT INTO centros (nombre, region) VALUES (${nombre}, ${region})`
  }

  console.log('→ Creando metas Q1 2026…')
  await sql`
    INSERT INTO metas (anio, trimestre, meta_nuevos_ingresos_mes, meta_desercion_mes, meta_cobranza_max, gpn_min, cp_conversion)
    VALUES (2026, 1, 20, 18.4, 1, 8, 50)
    ON CONFLICT (anio, trimestre) DO NOTHING
  `

  console.log(`→ Creando admin (${adminEmail})…`)
  const hash = await bcrypt.hash(adminPass, 10)
  await sql`
    INSERT INTO usuarios (nombre, email, password_hash, rol, centro_id)
    VALUES (${adminNombre}, ${adminEmail}, ${hash}, 'admin_general', NULL)
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, rol = 'admin_general'
  `

  console.log('\n✅ Listo.')
  console.log(`   Entra con:  ${adminEmail}  /  ${adminPass}`)
  console.log('   (cambia la contraseña desde Mi perfil tras el primer ingreso)')
}

main().catch((e) => {
  console.error('❌ Error en el seed:', e.message)
  process.exit(1)
})
