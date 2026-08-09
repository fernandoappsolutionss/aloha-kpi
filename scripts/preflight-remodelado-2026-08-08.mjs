// Preflight de datos del remodelado (rollout paso 1, spec
// docs/superpowers/specs/2026-08-08-remodelado-grupo-nino-design.md; patrón
// manifiesto/CAS de scripts/backfill-fecha-inicio-2026-08-08.mjs). El rollout
// de R1 se BLOQUEA hasta que este preflight pase LIMPIO en prod.
//
//   node scripts/preflight-remodelado-2026-08-08.mjs           → dry-run:
//     (a) g1-2: listado nominal de grupos ACTIVOS con fecha_inicio_clases
//         NULL (con o sin itinerario) — los resuelve un humano o el D7.
//     (b) g1-1: veteranos (nivel vigente >= 2) cuya fecha quedó en el
//         arranque FUTURO de su nivel con niños atribuidos → corrección
//         LEAST(fecha actual, min inscripción atribuida), verificada con el
//         comparable del cuadro before/after IDÉNTICO. Si el --apply de D7
//         nunca corrió, aquí no hay nada que corregir y se reporta vacío.
//     (c) g1-3: medición de historia fecha_apertura <> día civil Panamá de
//         created_at (solo se MIDE; la columna está congelada).
//     Escribe el manifiesto en scripts/out/preflight-remodelado-2026-08-08.json.
//   node scripts/preflight-remodelado-2026-08-08.mjs --apply   → aplica SOLO
//     las correcciones (b) del manifiesto del dry-run, revalidando cada fila
//     en vivo y con CAS por fila (WHERE fecha_inicio_clases = la futura
//     auditada). Cualquier conflicto o diferencia de verificación aborta SIN
//     escribir. (a) y (c) se re-miden en vivo: son parte del gate, no del apply.
//
// Salida: exit 0 SOLO si el script corrió íntegro Y el rollout NO está
// bloqueado (sin activos NULL, sin candidatos pendientes, sin casos de
// decisión humana). Cualquier bloqueo o aborto → exit 1.
//
// Regla de la tarea 2026-08-08: este script queda listo pero NO SE EJECUTA
// contra la base (ni el dry-run) sin decisión explícita de Fernando.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { neon } from '@neondatabase/serverless'
import { INICIOS_CLASE_DESDE } from '../lib/inicios-clase.mjs'
import { fechaPublicacion } from '../lib/fecha-publicacion.mjs'
import {
  comparableMes,
  compararComparables,
  finDeMes,
  universosPorGrupo,
} from '../lib/backfill-fecha-inicio.mjs'
import {
  activosSinFecha,
  clasificarVeteranoFuturo,
  estadoCorreccion,
  medirHistoriaApertura,
  patchCorreccionVeteranos,
} from '../lib/preflight-remodelado.mjs'

if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.')

const aplicar = process.argv.includes('--apply')
const sql = neon(process.env.DATABASE_URL)
// Día CIVIL de Panamá (g1-3): el mismo helper único de publicación resuelve
// "hoy" — jamás el día UTC del runtime.
const hoy = fechaPublicacion(new Date())
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out')
const rutaManifiesto = path.join(outDir, 'preflight-remodelado-2026-08-08.json')

const iso10 = (v) => (v == null ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10))

// --- Datos por centro (mismo cargador que el backfill D7) --------------------
const metas = await sql`SELECT anio, trimestre, royalty_por_nino FROM metas`
const royaltyDe = (y, m) => {
  const tri = Math.ceil(m / 3)
  const fila = metas.find((x) => Number(x.anio) === y && Number(x.trimestre) === tri)
  return Number(fila?.royalty_por_nino) || 12 // mismo default que calcularCuadro
}

async function cargarCentro(centroId) {
  const grupos = await sql`SELECT * FROM grupos WHERE centro_id = ${centroId} ORDER BY id`
  const estudiantes = await sql`SELECT * FROM estudiantes WHERE centro_id = ${centroId}`
  const eventos = await sql`
    SELECT * FROM estudiante_eventos
    WHERE centro_id = ${centroId} AND tipo IN ('inscripcion', 'retiro')
    ORDER BY fecha, id
  `
  const meses = await sql`SELECT year, month, estado FROM mes_kpi WHERE centro_id = ${centroId}`
  const fotos = await sql`SELECT year, month FROM cuadro_mensual WHERE centro_id = ${centroId}`
  return { grupos, estudiantes, eventos, meses, fotos }
}

// Meses a verificar (espejo de backfill-fecha-inicio-2026-08-08.mjs): los del
// KPI desde el gate operativo más el mes corriente; un cerrado CON foto es
// historia congelada y se omite con constancia.
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

// --- (a) g1-2: activos sin fecha (medición viva en ambos modos) --------------
const activosNull = activosSinFecha(await sql`
  SELECT id, centro_id, numero, itinerario, estado, fecha_inicio_clases, itinerario_clases, created_at
  FROM grupos
  WHERE estado = 'activo' AND fecha_inicio_clases IS NULL
  ORDER BY id
`)

// --- (c) g1-3: medición de historia (viva en ambos modos) --------------------
const historiaApertura = medirHistoriaApertura(await sql`
  SELECT id, centro_id, numero, fecha_apertura, created_at FROM grupos ORDER BY id
`)

// --- (b) g1-1: veteranos con arranque futuro ---------------------------------
const futurosVivos = await sql`
  SELECT * FROM grupos WHERE fecha_inicio_clases > ${hoy} ORDER BY id
`
const centroIds = [...new Set(futurosVivos.map((g) => Number(g.centro_id)))].sort((a, b) => a - b)
const datosPorCentro = new Map()
for (const centroId of centroIds) datosPorCentro.set(centroId, await cargarCentro(centroId))

// Universo atribuido del grupo enriquecido con el estado del niño (la
// clasificación exige saber si hay activos; la cota LEAST usa a todos).
const clasificar = (grupo) => {
  const datos = datosPorCentro.get(Number(grupo.centro_id))
  const estadoDe = new Map(datos.estudiantes.map((e) => [String(e.id), e.estado]))
  const universo = (universosPorGrupo(datos.estudiantes, datos.eventos).get(String(grupo.id)) || [])
    .map((u) => ({ ...u, estado: estadoDe.get(String(u.estudianteId)) || null }))
  return clasificarVeteranoFuturo(grupo, universo, hoy)
}

const entradaDe = (grupo, clasificacion) => ({
  grupoId: Number(grupo.id),
  centroId: Number(grupo.centro_id),
  numero: grupo.numero,
  itinerario: grupo.itinerario,
  ...clasificacion,
})

// Estados que exigen decisión HUMANA antes de abrir el gate (el candidato lo
// resuelve el --apply; nivel_1_en_llenado y sin_ninos no bloquean).
const ESTADOS_HUMANOS = ['fecha_manual_futura', 'universo_sin_fecha', 'solo_retirados']

let candidatos = []
let revisiones = [] // estados humanos: bloquean hasta que alguien decida
let informativos = [] // nivel_1_en_llenado / sin_ninos: constancia, sin bloqueo
let conflictos = []
let yaAplicadas = []
let fueraDeManifiesto = [] // candidatos nuevos post-dry-run: NO se tocan, bloquean

if (!aplicar) {
  for (const grupo of futurosVivos) {
    const entrada = entradaDe(grupo, clasificar(grupo))
    if (entrada.estado === 'candidato') candidatos.push(entrada)
    else if (ESTADOS_HUMANOS.includes(entrada.estado)) revisiones.push(entrada)
    else informativos.push(entrada)
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
  const vivosPorId = new Map(futurosVivos.map((g) => [Number(g.id), g]))
  for (const entrada of manifiesto.candidatos) {
    let vivo = vivosPorId.get(Number(entrada.grupoId)) || null
    if (!vivo) {
      // Ya no tiene fecha futura: o es la nuestra (aplicada) o alguien la
      // movió. Se relee suelto para clasificar sin adivinar.
      const [releida] = await sql`SELECT * FROM grupos WHERE id = ${entrada.grupoId}`
      vivo = releida || null
    }
    const clasificacionViva = vivo && vivosPorId.has(Number(entrada.grupoId)) ? clasificar(vivo) : null
    const estado = estadoCorreccion(vivo, entrada, clasificacionViva)
    if (estado === 'pendiente') candidatos.push(entrada)
    else if (estado === 'aplicada') yaAplicadas.push(entrada.grupoId)
    else conflictos.push({ ...entrada, actual: vivo ? iso10(vivo.fecha_inicio_clases) : 'fila_ausente' })
  }
  revisiones = manifiesto.revisiones || []
  informativos = manifiesto.informativos || []
  // Un candidato o caso humano NUEVO (posterior al dry-run) no se toca: queda
  // listado y mantiene el gate cerrado hasta repetir el ciclo dry-run → apply.
  const auditados = new Set(
    [...manifiesto.candidatos, ...(manifiesto.revisiones || []), ...(manifiesto.informativos || [])]
      .map((e) => Number(e.grupoId))
  )
  fueraDeManifiesto = futurosVivos
    .filter((g) => !auditados.has(Number(g.id)))
    .map((g) => entradaDe(g, clasificar(g)))
    .filter((e) => e.estado === 'candidato' || ESTADOS_HUMANOS.includes(e.estado))
}

// --- Verificación before/after por centro y mes ------------------------------
// "antes" = comportamiento vigente para el veterano (fecha ignorada → NULL);
// "después" = fechaNueva. IDÉNTICO o se aborta: aquí no hay variación aprobada.
const correccionesPorGrupo = new Map(candidatos.map((e) => [String(e.grupoId), e]))
const mesesVerificados = []
const mesesOmitidos = []
const diferencias = []

for (const centroId of centroIds) {
  const datos = datosPorCentro.get(centroId)
  const gruposAntes = patchCorreccionVeteranos(datos.grupos, correccionesPorGrupo, 'antes')
  const gruposDespues = patchCorreccionVeteranos(datos.grupos, correccionesPorGrupo, 'despues')
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
    const antes = comparableMes({ ...base, grupos: gruposAntes })
    const despues = comparableMes({ ...base, grupos: gruposDespues })
    const resultado = compararComparables(antes, despues, {
      decisiones: new Map(),
      finMes: finDeMes(mes.year, mes.month),
    })
    for (const d of [...resultado.diferencias, ...resultado.variaciones]) {
      diferencias.push({ centroId, year: mes.year, month: mes.month, ...d })
    }
    mesesVerificados.push({
      centroId,
      year: mes.year,
      month: mes.month,
      estadoMes: mes.estado,
      resultado: resultado.diferencias.length || resultado.variaciones.length ? 'diferencias' : 'identico',
    })
  }
}

// --- Reporte + gate + aplicación ---------------------------------------------
fs.mkdirSync(outDir, { recursive: true })
const bloqueos = {
  activosSinFecha: activosNull.length,
  candidatosPendientes: candidatos.length,
  revisionesHumanas: revisiones.length,
  fueraDeManifiesto: fueraDeManifiesto.length,
}
const rolloutBloqueado = (b) =>
  b.activosSinFecha > 0 || b.candidatosPendientes > 0 || b.revisionesHumanas > 0 || b.fueraDeManifiesto > 0

const reporte = {
  script: 'preflight-remodelado-2026-08-08',
  modo: aplicar ? 'apply' : 'dry-run',
  generado_at: new Date().toISOString(),
  hoy,
  activosSinFecha: activosNull,
  candidatos,
  revisiones,
  informativos,
  conflictos,
  yaAplicadas,
  fueraDeManifiesto,
  historiaApertura,
  verificacion: { mesesVerificados, mesesOmitidos },
  diferencias,
  bloqueos,
}

const abortar = (motivo) => {
  const ruta = path.join(outDir, `preflight-remodelado-2026-08-08-${aplicar ? 'apply' : 'dry-run'}-abortado.json`)
  fs.writeFileSync(ruta, JSON.stringify({ ...reporte, ok: false, rolloutBloqueado: true, motivo }, null, 2))
  console.error(JSON.stringify({ ok: false, motivo, conflictos, diferencias, reporte: ruta }, null, 2))
  process.exitCode = 1
}

if (conflictos.length) {
  abortar('conflictos: la fila viva no coincide con el manifiesto auditado')
} else if (diferencias.length) {
  abortar('la verificación before/after del cuadro no es idéntica')
} else if (!aplicar) {
  const bloqueado = rolloutBloqueado(bloqueos)
  fs.writeFileSync(rutaManifiesto, JSON.stringify({ ...reporte, ok: true, rolloutBloqueado: bloqueado }, null, 2))
  console.log(JSON.stringify({
    ok: true,
    modo: 'dry-run',
    rolloutBloqueado: bloqueado,
    bloqueos,
    candidatos: candidatos.length,
    revisiones: revisiones.length,
    informativos: informativos.length,
    historiaAperturaDistintos: historiaApertura.distintos,
    mesesVerificados: mesesVerificados.length,
    manifiesto: rutaManifiesto,
  }, null, 2))
  if (bloqueado) process.exitCode = 1
} else {
  // CAS por fila: solo escribe si la fila CONSERVA la fecha futura auditada.
  // Un CAS fallido es una carrera: se detiene ahí mismo y el reporte dice qué
  // alcanzó a aplicarse.
  const aplicadas = []
  let fallida = null
  for (const entrada of candidatos) {
    const filas = await sql`
      UPDATE grupos
      SET fecha_inicio_clases = ${entrada.fechaNueva}, updated_at = now()
      WHERE id = ${entrada.grupoId} AND fecha_inicio_clases = ${entrada.fecha}
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
  // simulado (misma verificación, ahora contra la BD real). Una inscripción o
  // retiro concurrente saldría como diferencia: el reporte queda ok:false para
  // revisión humana; las fechas aplicadas están protegidas por el CAS por fila.
  const postDiferencias = []
  for (const centroId of centroIds) {
    const datos = await cargarCentro(centroId)
    const previos = datosPorCentro.get(centroId)
    const simulados = patchCorreccionVeteranos(previos.grupos, correccionesPorGrupo, 'despues')
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

  const bloqueosFinales = { ...bloqueos, candidatosPendientes: candidatos.length - aplicadas.length }
  const bloqueado = rolloutBloqueado(bloqueosFinales)
  const ok = fallida == null && postDiferencias.length === 0
  const ruta = path.join(outDir, `preflight-remodelado-2026-08-08-apply-${Date.now()}.json`)
  fs.writeFileSync(ruta, JSON.stringify({
    ...reporte,
    ok,
    rolloutBloqueado: bloqueado,
    bloqueos: bloqueosFinales,
    aplicadas,
    fallida,
    postDiferencias,
  }, null, 2))
  console.log(JSON.stringify({
    ok,
    modo: 'apply',
    rolloutBloqueado: bloqueado,
    bloqueos: bloqueosFinales,
    aplicadas: aplicadas.length,
    de: candidatos.length,
    fallida,
    postDiferencias: postDiferencias.length,
    reporte: ruta,
  }, null, 2))
  if (!ok || bloqueado) process.exitCode = 1
}
