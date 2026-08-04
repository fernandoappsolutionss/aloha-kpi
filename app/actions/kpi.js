'use server'
import { sql, upsert } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { guardarSnapshotCuadro } from '../../lib/cuadro-snapshot'
import { fallo } from '../../lib/errores'

const SEMANAS = [1, 2, 3, 4, 5]
const intOr = (v, d = 0) => {
  const n = parseInt(v)
  return Number.isFinite(n) ? n : d
}

// Cierre del mes anterior: es el "niños inicio" OBLIGATORIO del mes actual.
// Regla de Fernando: si la administradora cerró con 170, el siguiente mes
// arranca con 170 — los números deben encadenar mes a mes, sin dedazos.
async function cierreMesAnterior(centroId, year, month) {
  const py = month === 1 ? year - 1 : year
  const pm = month === 1 ? 12 : month - 1
  const [prev] = await sql`
    SELECT ninos_final_mes FROM resumen_mes
    WHERE centro_id = ${centroId} AND year = ${py} AND month = ${pm}
  `
  const valor = prev?.ninos_final_mes || 0
  return valor > 0 ? { valor, year: py, month: pm } : null
}

export async function loadKpiMes(centroId, year, month) {
  await requireCentroAccess(centroId)
  const [c] = await sql`SELECT nombre FROM centros WHERE id = ${centroId}`
  const [mes] = await sql`SELECT estado FROM mes_kpi WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}`
  const [res] = await sql`SELECT * FROM resumen_mes WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}`
  const semanas = await sql`SELECT * FROM kpi_semanas WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month} ORDER BY semana`
  const historial = await sql`
    SELECT year, month, estado, cerrado_at FROM mes_kpi
    WHERE centro_id = ${centroId} AND estado = 'cerrado'
    ORDER BY year DESC, month DESC
  `
  return {
    centroNombre: c?.nombre || '',
    estado: mes?.estado || 'abierto',
    resumen: res || null,
    semanas,
    historial,
    inicioArrastrado: await cierreMesAnterior(centroId, intOr(year), intOr(month)),
  }
}

export async function saveKpiMes(centroId, year, month, config, semanas) {
  try {
    return await guardarKpiMes(centroId, year, month, config, semanas)
  } catch (e) {
    return fallo('saveKpiMes', e)
  }
}

async function guardarKpiMes(centroId, year, month, config, semanas) {
  await requireCentroAccess(centroId)
  const [mes] = await sql`SELECT estado FROM mes_kpi WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}`
  if (mes?.estado === 'cerrado') return { error: 'Este mes está cerrado. No se puede editar.' }

  let totalDes = 0
  for (const w of semanas || []) for (const v of (w.des || [])) totalDes += intOr(v)

  // El inicio del mes se ARRASTRA del cierre del mes anterior cuando existe
  // (regla del encadenamiento); lo que digite el cliente solo vale para el
  // primer mes del centro, cuando aún no hay cadena.
  const arrastrado = await cierreMesAnterior(centroId, intOr(year), intOr(month))
  const ninosInicio = arrastrado ? arrastrado.valor : intOr(config.ninos_inicio)
  const nuevosActivos = intOr(config.nuevos_activos_mes)
  const ninosFinal = Math.max(0, ninosInicio + nuevosActivos - totalDes)
  const now = new Date().toISOString()

  await upsert('resumen_mes', {
    centro_id: centroId, year, month,
    ninos_inicio_mes: ninosInicio,
    ninos_final_mes: ninosFinal,
    grupos_activos: intOr(config.grupos_activos),
    meta_nuevos_mensual: intOr(config.meta_nuevos_mensual, 20),
    nuevos_activos_mes: nuevosActivos,
    cp_invitados: intOr(config.cp_invitados),
    cp_asistieron: intOr(config.cp_asistieron),
    cp_matriculados: intOr(config.cp_matriculados),
    mot_tecnica: intOr(config.mot_tecnica),
    mot_perdida_clase: intOr(config.mot_perdida_clase),
    mot_economico: intOr(config.mot_economico),
    mot_horario: intOr(config.mot_horario),
    mot_graduado: intOr(config.mot_graduado),
    orig_referido: intOr(config.orig_referido),
    orig_marketing: intOr(config.orig_marketing),
    orig_centro: intOr(config.orig_centro),
    orig_activaciones: intOr(config.orig_activaciones),
    orig_medios: intOr(config.orig_medios),
    updated_at: now,
  }, ['centro_id', 'year', 'month'])

  for (let i = 0; i < SEMANAS.length; i++) {
    const w = semanas?.[i] || { cob: [], des: [], ing: [] }
    await upsert('kpi_semanas', {
      centro_id: centroId, year, month, semana: i + 1,
      cob_d1: intOr(w.cob?.[0]), cob_d2: intOr(w.cob?.[1]), cob_d3: intOr(w.cob?.[2]), cob_d4: intOr(w.cob?.[3]), cob_d5: intOr(w.cob?.[4]),
      des_d1: intOr(w.des?.[0]), des_d2: intOr(w.des?.[1]), des_d3: intOr(w.des?.[2]), des_d4: intOr(w.des?.[3]), des_d5: intOr(w.des?.[4]),
      ing_d1: intOr(w.ing?.[0]), ing_d2: intOr(w.ing?.[1]), ing_d3: intOr(w.ing?.[2]), ing_d4: intOr(w.ing?.[3]), ing_d5: intOr(w.ing?.[4]),
      updated_at: now,
    }, ['centro_id', 'year', 'month', 'semana'])
  }
  return { ok: true }
}

export async function cerrarMes(centroId, year, month) {
  try {
    await requireCentroAccess(centroId)
    await upsert('mes_kpi',
      { centro_id: centroId, year, month, estado: 'cerrado', cerrado_at: new Date().toISOString() },
      ['centro_id', 'year', 'month'])
    // Al cerrar el mes se congela la foto del Cuadro de Negocio (historial)
    // y los niños de inicio/cierre quedan GRABADOS en el KPI del mes desde
    // esa foto: el mes siguiente arranca con este cierre (encadenamiento).
    // Best effort: si falla, el mes queda cerrado igual y la foto se congela
    // retroactivamente la próxima vez que alguien abra ese mes del cuadro.
    let warn
    try {
      const datos = await guardarSnapshotCuadro(centroId, intOr(year), intOr(month))
      const t = datos?.totales
      if (t) {
        await upsert('resumen_mes', {
          centro_id: centroId, year: intOr(year), month: intOr(month),
          ninos_inicio_mes: t.continuan + t.retirados,
          ninos_final_mes: t.aPagar,
          grupos_activos: t.gruposActivos,
          updated_at: new Date().toISOString(),
        }, ['centro_id', 'year', 'month'])
      }
    } catch (e) {
      console.error('[cerrarMes] no se pudo congelar la foto del cuadro:', e)
      warn = 'El mes quedó cerrado, pero no se pudo congelar la foto del cuadro; se congelará al abrir el cuadro de ese mes.'
    }
    return warn ? { ok: true, warn } : { ok: true }
  } catch (e) {
    return fallo('cerrarMes', e)
  }
}

export async function reabrirMes(centroId, year, month) {
  try {
    await requireCentroAccess(centroId)
    await upsert('mes_kpi',
      { centro_id: centroId, year, month, estado: 'abierto', cerrado_at: null },
      ['centro_id', 'year', 'month'])
    return { ok: true }
  } catch (e) {
    return fallo('reabrirMes', e)
  }
}
