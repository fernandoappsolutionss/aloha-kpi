'use server'
import { sql, upsert } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { guardarSnapshotCuadro, calcularCuadro } from '../../lib/cuadro-snapshot'
import { motivosParaKpi } from '../../lib/cuadro-calc'
import { balanceMensual, INICIOS_CLASE_DESDE } from '../../lib/inicios-clase.mjs'
import { fallo } from '../../lib/errores'
import { cierreMesAnterior } from '../../lib/cadena'

const SEMANAS = [1, 2, 3, 4, 5]
const intOr = (v, d = 0) => {
  const n = parseInt(v)
  return Number.isFinite(n) ? n : d
}

// Desde AGOSTO 2026 lo que el módulo ya sabe no se digita en el KPI: los
// motivos salen de los retiros registrados, y los grupos activos y los nuevos
// del mes, del propio Cuadro de Negocio. Antes de esa fecha todo se capturó a
// mano y no se toca.
const AUTO_MOTIVOS_DESDE = INICIOS_CLASE_DESDE

async function motivosDelModulo(centroId, year, month) {
  if (year * 100 + month < AUTO_MOTIVOS_DESDE) return null
  try {
    const datos = await calcularCuadro(centroId, intOr(year), intOr(month))
    const des = datos?.deserciones || []
    const t = datos?.totales || {}
    return {
      ...motivosParaKpi(des),
      total: des.length,
      grupos: t.gruposActivos || 0,
      nuevos: datos?.iniciosClase?.length ?? t.nuevos ?? 0,
      reincorporados: t.reincorporados || 0,
      inicio: t.mesAnterior || 0,
      final: t.aPagar || 0,
    }
  } catch (e) {
    // Si el cuadro falla, el KPI sigue editable a mano: nunca bloquear la captura.
    console.error('[kpi] no se pudieron leer los datos del módulo:', e)
    return null
  }
}

// Grupos activos que ve el módulo de operaciones ahora mismo.
async function gruposDelModulo(centroId) {
  const [g] = await sql`SELECT COUNT(*)::int AS n FROM grupos WHERE centro_id = ${centroId} AND estado = 'activo'`
  return g?.n || 0
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
    motivosAuto: await motivosDelModulo(centroId, intOr(year), intOr(month)),
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
  // Los motivos de deserción los manda el módulo desde agosto 2026: lo que
  // llegue del formulario no puede contradecir los retiros registrados.
  const auto = await motivosDelModulo(centroId, intOr(year), intOr(month))
  const mot = (k) => (auto ? auto[k] : intOr(config[k]))
  // Grupos activos: el módulo manda. Un formulario recién abierto llega en 0 y
  // así nacía la fila del mes — dejando el panel sin promedio de niños por
  // grupo. Nunca se escribe 0 si el centro tiene grupos abiertos.
  const gruposForm = intOr(config.grupos_activos)
  let gruposActivos = auto && auto.grupos > 0 ? auto.grupos : gruposForm
  if (gruposActivos <= 0) gruposActivos = await gruposDelModulo(centroId)
  // Nuevos activos: desde agosto salen de los inicios de clase del cuadro (así un
  // "Guardar" con la pantalla vieja no borra lo que sincronizó el cuadro).
  const nuevosActivos = auto ? auto.nuevos : intOr(config.nuevos_activos_mes)
  const retirados = auto ? auto.total : totalDes
  const reincorporados = auto ? auto.reincorporados : 0
  const ninosFinal = Math.max(0, balanceMensual({ inicio: ninosInicio, nuevosActivos, reincorporados, retirados }))
  const now = new Date().toISOString()

  await upsert('resumen_mes', {
    centro_id: centroId, year, month,
    ninos_inicio_mes: ninosInicio,
    ninos_final_mes: ninosFinal,
    grupos_activos: gruposActivos,
    meta_nuevos_mensual: intOr(config.meta_nuevos_mensual, 20),
    nuevos_activos_mes: nuevosActivos,
    cp_invitados: intOr(config.cp_invitados),
    cp_asistieron: intOr(config.cp_asistieron),
    cp_matriculados: intOr(config.cp_matriculados),
    mot_tecnica: mot('mot_tecnica'),
    mot_perdida_clase: mot('mot_perdida_clase'),
    mot_economico: mot('mot_economico'),
    mot_horario: mot('mot_horario'),
    mot_graduado: mot('mot_graduado'),
    mot_otro: mot('mot_otro'),
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
        // El inicio SIEMPRE se arrastra del cierre del mes anterior — misma
        // regla que guardarKpiMes. Derivarlo de la propia foto (t.mesAnterior)
        // le da al mes un inicio PROPIO y rompe la cadena: cerrar un mes por
        // error le reescribía el inicio con los datos de hoy. Ese cálculo solo
        // sirve de arranque cuando el centro no tiene mes anterior.
        const arrastrado = await cierreMesAnterior(centroId, intOr(year), intOr(month))
        await upsert('resumen_mes', {
          centro_id: centroId, year: intOr(year), month: intOr(month),
          ninos_inicio_mes: arrastrado ? arrastrado.valor : t.mesAnterior,
          ninos_final_mes: t.aPagar,
          grupos_activos: t.gruposActivos,
          nuevos_activos_mes: datos?.iniciosClase?.length ?? t.nuevos ?? 0,
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
