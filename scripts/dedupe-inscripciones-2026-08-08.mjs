// Manifiesto/dedupe de la historia de inscripciones (R4, g1-17) — one-shot.
// PRERREQUISITO de los índices únicos que hoy viven COMENTADOS en
// db/schema.sql (idx_evento_inscripcion_canonica e idx_estudiantes_centro_crm_reg):
// no se descomentan hasta que este script haya corrido en prod con reporte ok.
//
//   node scripts/dedupe-inscripciones-2026-08-08.mjs           → dry-run:
//     construye el MANIFIESTO y lo escribe en
//     scripts/out/dedupe-inscripciones-2026-08-08.json. NO escribe en la BD.
//     - `duplicadas`: por cada niño con más de un evento 'inscripcion', el
//       canónico (PRIMER evento global por fecha e id — el mismo criterio de
//       lib/kpi-semanal-auto.mjs y lib/inicios-clase.mjs) se conserva y los
//       demás se proponen re-tipar a 'inscripcion_duplicada' (la historia no
//       se borra; los consumidores KPI filtran por tipo exacto y dejan de
//       verlos).
//     - `crmRepetidos`: (centro_id, crm_registration_id) con más de una ficha.
//       AQUÍ NO SE TOCA NADA: fusionar fichas es decisión humana; el índice
//       único de CRM espera a que esta lista quede vacía.
//   node scripts/dedupe-inscripciones-2026-08-08.mjs --apply   → aplica SOLO
//     el manifiesto del dry-run, con CAS por fila (la fila debe seguir siendo
//     'inscripcion' y del mismo niño). Un CAS fallido detiene la corrida y el
//     reporte dice qué alcanzó a re-tiparse. Después re-verifica que ningún
//     niño conserve más de una 'inscripcion'; duplicados NUEVOS (posteriores
//     al dry-run) se listan y obligan a repetir el ciclo dry-run → apply.
//
// Regla de la tarea 2026-08-08: este script queda listo pero NO SE EJECUTA
// contra la base (ni el dry-run) sin decisión explícita de Fernando.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.')

const aplicar = process.argv.includes('--apply')
const sql = neon(process.env.DATABASE_URL)
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out')
const rutaManifiesto = path.join(outDir, 'dedupe-inscripciones-2026-08-08.json')

const iso10 = (v) => (v == null ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10))

// Orden canónico: fecha ascendente (nulos primero) y luego id.
const compararEventos = (a, b) => {
  const porFecha = String(iso10(a.fecha) || '').localeCompare(String(iso10(b.fecha) || ''))
  if (porFecha !== 0) return porFecha
  return Number(a.id) - Number(b.id)
}

// --- 1. Historia viva de inscripciones ---------------------------------------
const inscripciones = await sql`
  SELECT id, estudiante_id, centro_id, tipo, fecha, year, month, origen, a_grupo_id
  FROM estudiante_eventos
  WHERE tipo = 'inscripcion'
  ORDER BY estudiante_id, fecha, id
`
const porNino = new Map()
for (const evento of inscripciones) {
  const key = String(evento.estudiante_id)
  const lista = porNino.get(key) || []
  lista.push(evento)
  porNino.set(key, lista)
}

const duplicadasVivas = []
for (const [estudianteId, lista] of porNino) {
  if (lista.length < 2) continue
  const ordenada = [...lista].sort(compararEventos)
  const canonica = ordenada[0]
  duplicadasVivas.push({
    estudianteId: Number(estudianteId),
    centroId: Number(canonica.centro_id),
    canonica: { id: Number(canonica.id), fecha: iso10(canonica.fecha), year: canonica.year, month: canonica.month },
    // Todo lo que no es el canónico se re-tipa; nada se borra.
    reTipar: ordenada.slice(1).map((evento) => ({
      id: Number(evento.id),
      fecha: iso10(evento.fecha),
      year: evento.year,
      month: evento.month,
      origen: evento.origen ?? null,
    })),
  })
}

// --- 2. crm_registration_id repetidos: solo listado, decide un humano --------
const crmRepetidosVivos = await sql`
  SELECT centro_id, crm_registration_id, array_agg(id ORDER BY id) AS estudiantes
  FROM estudiantes
  WHERE crm_registration_id IS NOT NULL
  GROUP BY centro_id, crm_registration_id
  HAVING COUNT(*) > 1
  ORDER BY centro_id
`
const crmRepetidos = crmRepetidosVivos.map((fila) => ({
  centroId: Number(fila.centro_id),
  crmRegistrationId: fila.crm_registration_id,
  estudiantes: fila.estudiantes.map(Number),
}))

// --- 3. Dry-run: manifiesto fijo · Apply: CAS sobre el manifiesto ------------
fs.mkdirSync(outDir, { recursive: true })

if (!aplicar) {
  const reporte = {
    script: 'dedupe-inscripciones-2026-08-08',
    modo: 'dry-run',
    generado_at: new Date().toISOString(),
    ok: true,
    totales: {
      eventosInscripcion: inscripciones.length,
      ninosConDuplicado: duplicadasVivas.length,
      eventosAReTipar: duplicadasVivas.reduce((a, d) => a + d.reTipar.length, 0),
      crmRepetidos: crmRepetidos.length,
    },
    duplicadas: duplicadasVivas,
    crmRepetidos,
  }
  fs.writeFileSync(rutaManifiesto, JSON.stringify(reporte, null, 2))
  console.log(JSON.stringify({ ok: true, modo: 'dry-run', ...reporte.totales, manifiesto: rutaManifiesto }, null, 2))
} else {
  if (!fs.existsSync(rutaManifiesto)) {
    throw new Error(`No existe el manifiesto ${rutaManifiesto}. Corre primero el dry-run.`)
  }
  const manifiesto = JSON.parse(fs.readFileSync(rutaManifiesto, 'utf8'))
  if (manifiesto.modo !== 'dry-run' || !Array.isArray(manifiesto.duplicadas)) {
    throw new Error('El manifiesto no viene de un dry-run de este script.')
  }
  if (manifiesto.crmRepetidos?.length) {
    console.warn(`OJO: ${manifiesto.crmRepetidos.length} crm_registration_id repetidos siguen pendientes de decisión humana; el índice único de CRM NO puede aplicarse todavía.`)
  }

  // CAS por fila: la fila debe seguir siendo la 'inscripcion' del mismo niño
  // que auditó el dry-run. Si alguien la tocó en el medio, se detiene ahí.
  const aplicadas = []
  let fallida = null
  for (const entrada of manifiesto.duplicadas) {
    for (const duplicado of entrada.reTipar) {
      const filas = await sql`
        UPDATE estudiante_eventos
        SET tipo = 'inscripcion_duplicada'
        WHERE id = ${duplicado.id} AND tipo = 'inscripcion' AND estudiante_id = ${entrada.estudianteId}
        RETURNING id
      `
      if (filas.length === 1) {
        aplicadas.push(duplicado.id)
      } else {
        fallida = { estudianteId: entrada.estudianteId, eventoId: duplicado.id }
        break
      }
    }
    if (fallida) break
  }

  // Post-check: tras aplicar, ningún niño puede conservar >1 'inscripcion'.
  // Duplicados nuevos (nacidos después del dry-run) exigen repetir el ciclo.
  const duplicadosRestantes = await sql`
    SELECT estudiante_id, COUNT(*)::int AS total
    FROM estudiante_eventos
    WHERE tipo = 'inscripcion'
    GROUP BY estudiante_id
    HAVING COUNT(*) > 1
    ORDER BY estudiante_id
  `
  const ok = fallida == null && duplicadosRestantes.length === 0
  const ruta = path.join(outDir, `dedupe-inscripciones-2026-08-08-apply-${Date.now()}.json`)
  fs.writeFileSync(ruta, JSON.stringify({
    script: 'dedupe-inscripciones-2026-08-08',
    modo: 'apply',
    generado_at: new Date().toISOString(),
    ok,
    aplicadas,
    fallida,
    duplicadosRestantes: duplicadosRestantes.map((f) => ({ estudianteId: Number(f.estudiante_id), total: f.total })),
    crmRepetidosPendientes: manifiesto.crmRepetidos || [],
  }, null, 2))
  console.log(JSON.stringify({ ok, modo: 'apply', aplicadas: aplicadas.length, fallida, duplicadosRestantes: duplicadosRestantes.length, reporte: ruta }, null, 2))
  if (!ok) process.exitCode = 1
}
