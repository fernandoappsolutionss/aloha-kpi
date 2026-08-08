// Backfill one-shot D7 v3: grupos.fecha_inicio_clases desde el itinerario,
// SIN reclasificar nuevos (spec docs/superpowers/specs/2026-08-08-llenado-automatico-design.md,
// sección "Fecha de inicio de clases"; patrón antes/después/conflicto de
// scripts/reparar-historico-kpi-2026-08-08.mjs).
//
//   node scripts/backfill-fecha-inicio-2026-08-08.mjs            → dry-run:
//     construye el MANIFIESTO (candidatos con itinerario_clases y columna en
//     NULL + fecha decidida por grupo), corre la verificación before/after y
//     lo escribe en scripts/out/backfill-fecha-inicio-2026-08-08.json.
//   node scripts/backfill-fecha-inicio-2026-08-08.mjs --apply    → aplica SOLO
//     el manifiesto del dry-run (fijo: un candidato nuevo aparecido después NO
//     se toca, queda listado), revalidando cada fila en vivo y con CAS por
//     fila (WHERE fecha_inicio_clases IS NULL). Cualquier conflicto o
//     diferencia de verificación aborta SIN escribir.
//
// Verificación (corrección g2-2): comparable reducido del cuadro (IDs de
// grupos, niños, nuevos vía iniciosClaseMes, royalties, aPagar) de TODOS los
// meses abiertos Y cerrados SIN snapshot desde 2026-08 (esos se reconstruyen
// con datos vivos, app/actions/cuadro.js:32-49) — before/after IDÉNTICO o se
// aborta. ÚNICA excepción documentada y aprobada: grupos vacíos con it_inicio
// futuro salen del cuadro de meses previos (se listan aparte como cambio
// intencional). Un centro sin candidatos no puede variar (el patch no toca sus
// filas), así que la verificación recorre los centros del manifiesto.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { neon } from '@neondatabase/serverless'
import { INICIOS_CLASE_DESDE } from '../lib/inicios-clase.mjs'
import {
  comparableMes,
  compararComparables,
  decidirFechaInicio,
  estadoCandidato,
  finDeMes,
  itInicioDe,
  patchFechaInicio,
  universosPorGrupo,
} from '../lib/backfill-fecha-inicio.mjs'

if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.')

const aplicar = process.argv.includes('--apply')
const sql = neon(process.env.DATABASE_URL)
const hoy = new Date().toISOString().slice(0, 10)
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out')
const rutaManifiesto = path.join(outDir, 'backfill-fecha-inicio-2026-08-08.json')

const iso10 = (v) => (v == null ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10))

// --- 1. Candidatos vivos: itinerario cargado y columna todavía en NULL -------
const candidatosVivos = await sql`
  SELECT id, centro_id, numero, itinerario, estado, fecha_inicio_clases, itinerario_clases
  FROM grupos
  WHERE itinerario_clases IS NOT NULL AND fecha_inicio_clases IS NULL
  ORDER BY id
`

// --- 2. Datos por centro (una sola carga, sirve a decisión y verificación) ---
const metas = await sql`SELECT anio, trimestre, royalty_por_nino FROM metas`
const royaltyDe = (y, m) => {
  const tri = Math.ceil(m / 3)
  const fila = metas.find((x) => Number(x.anio) === y && Number(x.trimestre) === tri)
  return Number(fila?.royalty_por_nino) || 12 // mismo default que calcularCuadro
}

async function cargarCentro(centroId) {
  const grupos = await sql`SELECT * FROM grupos WHERE centro_id = ${centroId} ORDER BY id`
  const estudiantes = await sql`SELECT * FROM estudiantes WHERE centro_id = ${centroId}`
  // iniciosClase solo mira inscripciones y retiros; el comparable no usa más.
  const eventos = await sql`
    SELECT * FROM estudiante_eventos
    WHERE centro_id = ${centroId} AND tipo IN ('inscripcion', 'retiro')
    ORDER BY fecha, id
  `
  const meses = await sql`SELECT year, month, estado FROM mes_kpi WHERE centro_id = ${centroId}`
  const fotos = await sql`SELECT year, month FROM cuadro_mensual WHERE centro_id = ${centroId}`
  return { grupos, estudiantes, eventos, meses, fotos }
}

// Meses a verificar: todos los del KPI desde el gate operativo (2026-08) más
// el mes corriente (abierto implícito aunque nadie haya abierto el KPI aún);
// un mes cerrado CON foto es historia congelada y el backfill no lo puede
// mover — se omite y se deja constancia.
function mesesDelCentro({ meses, fotos }) {
  const [hy, hm] = hoy.split('-').map(Number)
  const claves = new Map()
  for (const fila of meses) claves.set(`${fila.year}-${fila.month}`, fila.estado)
  if (!claves.has(`${hy}-${hm}`)) claves.set(`${hy}-${hm}`, 'abierto')
  const conFoto = new Set(fotos.map((f) => `${f.year}-${f.month}`))
  const verificables = []
  const omitidos = []
  for (const [clave, estado] of claves) {
    const [y, m] = clave.split('-').map(Number)
    if (y * 100 + m < INICIOS_CLASE_DESDE) continue
    if (estado === 'cerrado' && conFoto.has(clave)) {
      omitidos.push({ year: y, month: m, motivo: 'cerrado_con_snapshot' })
    } else {
      verificables.push({ year: y, month: m, estado: estado || 'abierto' })
    }
  }
  verificables.sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))
  return { verificables, omitidos }
}

// --- 3. Decisión por grupo y manifiesto --------------------------------------
const centroIds = [...new Set(candidatosVivos.map((g) => Number(g.centro_id)))].sort((a, b) => a - b)
const datosPorCentro = new Map()
for (const centroId of centroIds) datosPorCentro.set(centroId, await cargarCentro(centroId))

const decidir = (grupo) => {
  const datos = datosPorCentro.get(Number(grupo.centro_id))
  const universos = universosPorGrupo(datos.estudiantes, datos.eventos)
  const universo = universos.get(String(grupo.id)) || []
  return { ...decidirFechaInicio({ itInicio: itInicioDe(grupo), universo }), universo: universo.length }
}

const entradaDe = (grupo, decision) => ({
  grupoId: Number(grupo.id),
  centroId: Number(grupo.centro_id),
  numero: grupo.numero,
  itinerario: grupo.itinerario,
  estadoGrupo: grupo.estado,
  itInicio: itInicioDe(grupo),
  fecha: decision.fecha,
  regla: decision.regla,
  minInscripcion: decision.minInscripcion,
  universo: decision.universo,
})

let candidatos = [] // manifiesto aplicable (regla sin_ninos / con_ninos)
let excluidos = [] // sin_it_inicio / universo_sin_fecha: decide un humano
let fueraDeManifiesto = []
let conflictos = []
let yaAplicadas = [] // idempotencia: repetir --apply no las vuelve a tocar

if (!aplicar) {
  for (const grupo of candidatosVivos) {
    const entrada = entradaDe(grupo, decidir(grupo))
    if (entrada.fecha) candidatos.push(entrada)
    else excluidos.push(entrada)
  }
} else {
  // El manifiesto es FIJO: lo escribió el dry-run y es lo único que se aplica.
  if (!fs.existsSync(rutaManifiesto)) {
    throw new Error(`No existe el manifiesto ${rutaManifiesto}. Corre primero el dry-run.`)
  }
  const manifiesto = JSON.parse(fs.readFileSync(rutaManifiesto, 'utf8'))
  if (manifiesto.modo !== 'dry-run' || !Array.isArray(manifiesto.candidatos)) {
    throw new Error('El manifiesto no viene de un dry-run de este script.')
  }
  const vivosPorId = new Map(candidatosVivos.map((g) => [Number(g.id), g]))
  for (const entrada of manifiesto.candidatos) {
    const vivo = vivosPorId.get(Number(entrada.grupoId)) || null
    let filaViva = vivo
    if (!filaViva) {
      // Ya no es candidato: o alguien le puso fecha (¿la nuestra? → aplicada)
      // o cambió otra cosa. Se relee suelto para clasificar sin adivinar.
      const [releida] = await sql`
        SELECT id, centro_id, fecha_inicio_clases, itinerario_clases FROM grupos WHERE id = ${entrada.grupoId}
      `
      filaViva = releida || null
    }
    const decisionViva = vivo ? decidir(vivo) : null
    const estado = estadoCandidato(filaViva, entrada, decisionViva)
    if (estado === 'pendiente') candidatos.push(entrada)
    else if (estado === 'aplicada') yaAplicadas.push(entrada.grupoId)
    else conflictos.push({ ...entrada, actual: filaViva ? iso10(filaViva.fecha_inicio_clases) : 'fila_ausente', estado })
  }
  fueraDeManifiesto = candidatosVivos
    .filter((g) => !manifiesto.candidatos.some((e) => Number(e.grupoId) === Number(g.id)))
    .map((g) => ({ grupoId: Number(g.id), centroId: Number(g.centro_id), numero: g.numero }))
  excluidos = manifiesto.excluidos || []
}

// --- 4. Verificación before/after por centro y mes ---------------------------
const decisionesPorGrupo = new Map(candidatos.map((e) => [String(e.grupoId), e]))
const mesesVerificados = []
const mesesOmitidos = []
const variacionesAprobadas = []
const diferencias = []

function verificarCentro(centroId, datos) {
  const despuesGrupos = patchFechaInicio(datos.grupos, decisionesPorGrupo)
  const { verificables, omitidos } = mesesDelCentro(datos)
  for (const omitido of omitidos) mesesOmitidos.push({ centroId, ...omitido })
  for (const mes of verificables) {
    const base = {
      estudiantes: datos.estudiantes,
      eventos: datos.eventos,
      year: mes.year,
      month: mes.month,
      royaltyRate: royaltyDe(mes.year, mes.month),
    }
    const antes = comparableMes({ ...base, grupos: datos.grupos })
    const despues = comparableMes({ ...base, grupos: despuesGrupos })
    const resultado = compararComparables(antes, despues, {
      decisiones: decisionesPorGrupo,
      finMes: finDeMes(mes.year, mes.month),
    })
    for (const v of resultado.variaciones) variacionesAprobadas.push({ centroId, year: mes.year, month: mes.month, ...v })
    for (const d of resultado.diferencias) diferencias.push({ centroId, year: mes.year, month: mes.month, ...d })
    mesesVerificados.push({
      centroId,
      year: mes.year,
      month: mes.month,
      estadoMes: mes.estado,
      resultado: resultado.diferencias.length ? 'diferencias' : resultado.variaciones.length ? 'variacion_aprobada' : 'identico',
    })
  }
}

for (const centroId of centroIds) verificarCentro(centroId, datosPorCentro.get(centroId))

// --- 5. Reporte + aplicación -------------------------------------------------
fs.mkdirSync(outDir, { recursive: true })
const reporte = {
  script: 'backfill-fecha-inicio-2026-08-08',
  modo: aplicar ? 'apply' : 'dry-run',
  generado_at: new Date().toISOString(),
  hoy,
  candidatos,
  excluidos,
  fueraDeManifiesto,
  conflictos,
  yaAplicadas,
  verificacion: { mesesVerificados, mesesOmitidos },
  variacionesAprobadas,
  diferencias,
}

const abortar = (motivo) => {
  const ruta = path.join(outDir, `backfill-fecha-inicio-2026-08-08-${aplicar ? 'apply' : 'dry-run'}-abortado.json`)
  fs.writeFileSync(ruta, JSON.stringify({ ...reporte, ok: false, motivo }, null, 2))
  console.error(JSON.stringify({ ok: false, motivo, conflictos, diferencias, reporte: ruta }, null, 2))
  process.exitCode = 1
}

if (conflictos.length) {
  abortar('conflictos: la fila viva no coincide con el manifiesto auditado')
} else if (diferencias.length) {
  abortar('la verificación before/after encontró diferencias fuera de la variación aprobada')
} else if (!aplicar) {
  fs.writeFileSync(rutaManifiesto, JSON.stringify({ ...reporte, ok: true }, null, 2))
  console.log(JSON.stringify({
    ok: true,
    modo: 'dry-run',
    candidatos: candidatos.length,
    excluidos: excluidos.length,
    variacionesAprobadas: variacionesAprobadas.length,
    mesesVerificados: mesesVerificados.length,
    manifiesto: rutaManifiesto,
  }, null, 2))
} else {
  // CAS por fila: solo escribe si la columna SIGUE en NULL. Un CAS fallido es
  // una carrera (alguien puso fecha entre la revalidación y el UPDATE):
  // se detiene ahí mismo y el reporte dice qué alcanzó a aplicarse.
  const aplicadas = []
  let fallida = null
  for (const entrada of candidatos) {
    const filas = await sql`
      UPDATE grupos
      SET fecha_inicio_clases = ${entrada.fecha}, updated_at = now()
      WHERE id = ${entrada.grupoId} AND fecha_inicio_clases IS NULL
      RETURNING id
    `
    if (filas.length === 1) {
      aplicadas.push(entrada.grupoId)
    } else {
      fallida = entrada.grupoId
      break
    }
  }

  // Post-check: el comparable vivo tras escribir debe calzar con el "después"
  // simulado (misma verificación, ahora contra la BD real). OJO: una
  // inscripción/retiro concurrente entre la carga y esta relectura sale como
  // diferencia — el reporte queda ok:false para que un humano la revise, pero
  // las fechas ya aplicadas son correctas (el CAS por fila las protegió).
  const postDiferencias = []
  for (const centroId of centroIds) {
    const datos = await cargarCentro(centroId)
    const previos = datosPorCentro.get(centroId)
    const simulados = patchFechaInicio(previos.grupos, decisionesPorGrupo)
    const { verificables } = mesesDelCentro(datos)
    for (const mes of verificables) {
      const base = { year: mes.year, month: mes.month, royaltyRate: royaltyDe(mes.year, mes.month) }
      const esperado = comparableMes({ ...base, grupos: simulados, estudiantes: previos.estudiantes, eventos: previos.eventos })
      const vivo = comparableMes({ ...base, grupos: datos.grupos, estudiantes: datos.estudiantes, eventos: datos.eventos })
      const resultado = compararComparables(esperado, vivo, { decisiones: new Map(), finMes: finDeMes(mes.year, mes.month) })
      for (const d of [...resultado.diferencias, ...resultado.variaciones]) {
        postDiferencias.push({ centroId, year: mes.year, month: mes.month, ...d })
      }
    }
  }

  const ok = fallida == null && postDiferencias.length === 0
  const ruta = path.join(outDir, `backfill-fecha-inicio-2026-08-08-apply-${Date.now()}.json`)
  fs.writeFileSync(ruta, JSON.stringify({ ...reporte, ok, aplicadas, fallida, postDiferencias }, null, 2))
  console.log(JSON.stringify({
    ok,
    modo: 'apply',
    aplicadas: aplicadas.length,
    de: candidatos.length,
    fallida,
    fueraDeManifiesto: fueraDeManifiesto.length,
    variacionesAprobadas: variacionesAprobadas.length,
    postDiferencias: postDiferencias.length,
    reporte: ruta,
  }, null, 2))
  if (!ok) process.exitCode = 1
}
