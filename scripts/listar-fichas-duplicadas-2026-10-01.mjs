// Fichas duplicadas por centro (2026-10-01) — SOLO LECTURA.
//
// Lista, centro por centro, los grupos de fichas que parecen ser el MISMO niño,
// con las reglas que desde ahora frenan «Inscribir» (lib/ficha-existente.mjs):
// mismo registro de CRM, nombre compatible + teléfono/correo/representante en
// común, o el mismo nombre exacto. Por ficha muestra estado, grupo, nivel,
// origen, registro de CRM, creación, venta canónica (la que cuenta el KPI) y
// si su mes está cerrado, asistencias, retiros y teléfono enmascarado. Por
// grupo: cuántas ventas sobrarían si son el mismo niño, si es una cadena
// (posibles hermanos), presentes el mismo día, retiros posteriores a la otra
// ficha, la familia (mismo teléfono o correo) y si el centro ya confirmó al
// inscribir que era otro niño.
//
// NO CORRIGE NADA. Limpiar datos de producción requiere el OK de Fernando y la
// confirmación de cada centro. Retirar la ficha sobrante NO es la limpieza:
// suma un retiro espurio al KPI.
//
//   node --env-file=.env.local scripts/listar-fichas-duplicadas-2026-10-01.mjs
//   … --centro 5     → un solo centro
//   … --json         → además escribe scripts/out/fichas-duplicadas-<fecha>.json
//                      (scripts/out/ está en .gitignore)
//
// Garantía de solo lectura: todas las consultas van en UNA transacción
// READ ONLY (Postgres rechaza cualquier escritura dentro de ella) y
// REPEATABLE READ (la misma foto de la base para todas). Ninguna consulta va
// suelta fuera de esa transacción. No existe --apply.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { neon } from '@neondatabase/serverless'
import { armarReporteDuplicados, textoReporteDuplicados } from '../lib/fichas-duplicadas-reporte.mjs'

if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.')

const args = process.argv.slice(2)
const iCentro = args.indexOf('--centro')
const centroFiltro = iCentro >= 0 ? Number(args[iCentro + 1]) : null
if (iCentro >= 0 && !Number.isInteger(centroFiltro)) throw new Error('Uso: --centro <id numérico>')
const conJson = args.includes('--json')

const sql = neon(process.env.DATABASE_URL)
const [centros, fichas, eventos, grupos, asistencias, meses] = await sql.transaction([
  sql`SELECT id, nombre FROM centros ORDER BY id`,
  sql`
    SELECT id, centro_id, nombre, estado, grupo_id, itinerario, nivel, origen, crm_registration_id,
      telefono, correo, representante, fecha_inscripcion, fecha_retiro, created_at
    FROM estudiantes ORDER BY centro_id, id
  `,
  sql`
    SELECT id, estudiante_id, tipo, fecha, year, month, motivo, detalle
    FROM estudiante_eventos
    WHERE tipo IN ('inscripcion', 'retiro', 'reincorporacion')
    ORDER BY estudiante_id, fecha, id
  `,
  sql`SELECT id, numero FROM grupos`,
  // Solo las presentes, agregadas por ficha: una fila por niño.
  sql`
    SELECT estudiante_id, array_agg(fecha::text ORDER BY fecha) AS fechas
    FROM asistencias WHERE estado = 'presente'
    GROUP BY estudiante_id
  `,
  sql`SELECT centro_id, year, month, estado FROM mes_kpi`,
], { readOnly: true, isolationLevel: 'RepeatableRead' })

const enFiltro = (fila) => centroFiltro == null || Number(fila.centro_id) === centroFiltro
const reporte = armarReporteDuplicados({ centros, fichas: fichas.filter(enFiltro), eventos, grupos, asistencias, meses })
console.log(textoReporteDuplicados(reporte))

if (conJson) {
  const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out')
  fs.mkdirSync(outDir, { recursive: true })
  const ruta = path.join(outDir, `fichas-duplicadas-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(ruta, JSON.stringify({
    script: 'listar-fichas-duplicadas-2026-10-01',
    modo: 'solo-lectura',
    generado_at: new Date().toISOString(),
    centro: centroFiltro,
    grupos: reporte,
  }, null, 2))
  console.log(`\nJSON: ${ruta}`)
}
