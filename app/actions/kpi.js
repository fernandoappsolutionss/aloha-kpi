'use server'
import { sql, upsertWith, withTransaction } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { calcularCuadro } from '../../lib/cuadro-snapshot'
import { motivosParaKpi } from '../../lib/cuadro-calc'
import { balanceMensual, cierreKpiDeclarado, cuadroConBalanceDeclarado, INICIOS_CLASE_DESDE } from '../../lib/inicios-clase.mjs'
import { fallo } from '../../lib/errores'
import { cierreMesAnterior } from '../../lib/cadena'
import { bloquearMesesEditables } from '../../lib/mes-kpi'
import { CAMPOS_RESUMEN_AUTO, poblacionKpiAutomatica, usaKpiAutomatico } from '../../lib/kpi-auto.mjs'
import { fotoKpiAutomatica, mezclarSemanasAutomaticas } from '../../lib/kpi-auto-server'

const SEMANAS = [1, 2, 3, 4, 5]
const intOr = (v, d = 0) => {
  const n = parseInt(v)
  return Number.isFinite(n) ? n : d
}
const totalMatriz = (matrix = []) => matrix.reduce(
  (total, week) => total + (week || []).reduce((sum, value) => sum + intOr(value), 0),
  0,
)

// Desde AGOSTO 2026 lo que el módulo ya sabe no se digita en el KPI: los
// motivos salen de los retiros registrados, y los grupos activos y los nuevos
// del mes, del propio Cuadro de Negocio. Antes de esa fecha todo se capturó a
// mano y no se toca.
const AUTO_MOTIVOS_DESDE = INICIOS_CLASE_DESDE

async function motivosDelModulo(centroId, year, month, query = sql) {
  if (year * 100 + month < AUTO_MOTIVOS_DESDE) return null
  try {
    const datos = await calcularCuadro(centroId, intOr(year), intOr(month), query)
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
async function gruposDelModulo(centroId, query = sql) {
  const [g] = await query`SELECT COUNT(*)::int AS n FROM grupos WHERE centro_id = ${centroId} AND estado = 'activo'`
  return g?.n || 0
}

export async function loadKpiMes(centroId, year, month) {
  await requireCentroAccess(centroId)
  const [c] = await sql`SELECT nombre FROM centros WHERE id = ${centroId}`
  const [mes] = await sql`SELECT estado FROM mes_kpi WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}`
  let [res] = await sql`SELECT * FROM resumen_mes WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}`
  let semanas = await sql`SELECT * FROM kpi_semanas WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month} ORDER BY semana`
  const historial = await sql`
    SELECT year, month, estado, cerrado_at FROM mes_kpi
    WHERE centro_id = ${centroId} AND estado = 'cerrado'
    ORDER BY year DESC, month DESC
  `
  const cierreAnterior = await cierreMesAnterior(centroId, intOr(year), intOr(month))
  const estado = mes?.estado || 'abierto'
  let autoSync = null
  let motivosAuto = estado === 'cerrado' ? null : await motivosDelModulo(centroId, intOr(year), intOr(month))
  if (usaKpiAutomatico(year, month, estado)) {
    const automatic = await fotoKpiAutomatica(centroId, intOr(year), intOr(month))
    if (automatic.complete) {
      const automaticSummary = {}
      for (const key of CAMPOS_RESUMEN_AUTO) automaticSummary[key] = automatic.data[key]
      res = { ...(res || {}), ...automaticSummary }
      semanas = mezclarSemanasAutomaticas(semanas, automatic.data)
      motivosAuto = {
        ...(motivosAuto || {}),
        mot_tecnica: automatic.data.mot_tecnica,
        mot_perdida_clase: automatic.data.mot_perdida_clase,
        mot_economico: automatic.data.mot_economico,
        mot_horario: automatic.data.mot_horario,
        mot_graduado: automatic.data.mot_graduado,
        mot_otro: automatic.data.mot_otro,
        total: totalMatriz(automatic.data.des),
      }
      autoSync = { ok: true, adjusted: automatic.adjusted }
    } else {
      motivosAuto = null
      autoSync = { ok: false, error: automatic.error || 'No se pudo sincronizar el KPI.' }
    }
  }
  return {
    centroNombre: c?.nombre || '',
    estado,
    resumen: res || null,
    semanas,
    historial,
    // Un cierre es una fotografia: no se reencadena ni se vuelve a leer del
    // modulo vivo cuando alguien consulta el historial.
    cierreAnterior,
    inicioArrastrado: estado === 'cerrado' ? null : cierreAnterior,
    motivosAuto,
    autoSync,
  }
}

export async function saveKpiMes(centroId, year, month, config, semanas) {
  try {
    return await guardarKpiMes(centroId, year, month, config, semanas)
  } catch (e) {
    return fallo('saveKpiMes', e)
  }
}

async function guardarKpiBloqueado(query, centroId, year, month, config = {}, semanas = [], automatic = null) {
  let totalDes = 0
  for (const w of semanas || []) for (const v of (w.des || [])) totalDes += intOr(v)

  // El inicio se arrastra del cierre anterior. La lectura y el guardado
  // permanecen bajo el mismo bloqueo que usan los movimientos operativos.
  const arrastrado = await cierreMesAnterior(centroId, intOr(year), intOr(month), query)
  const auto = await motivosDelModulo(centroId, intOr(year), intOr(month), query)
  const automaticData = automatic?.data || null
  if (automaticData && !auto) {
    return { error: 'No se pudo leer la población operativa. Recarga el KPI antes de guardar.' }
  }
  const mot = (k) => (automaticData ? automaticData[k] : auto ? auto[k] : intOr(config[k]))
  let ninosInicio
  let gruposActivos
  let nuevosActivos
  if (automaticData) {
    const poblacion = poblacionKpiAutomatica({ arrastrado, operacion: auto })
    ninosInicio = poblacion.ninosInicio
    gruposActivos = poblacion.gruposActivos
    nuevosActivos = poblacion.nuevosActivos
  } else {
    ninosInicio = arrastrado ? arrastrado.valor : intOr(config.ninos_inicio)
    const gruposForm = intOr(config.grupos_activos)
    gruposActivos = auto && auto.grupos > 0 ? auto.grupos : gruposForm
    if (gruposActivos <= 0) gruposActivos = await gruposDelModulo(centroId, query)
    nuevosActivos = auto ? auto.nuevos : intOr(config.nuevos_activos_mes)
  }
  const retirados = automaticData ? totalMatriz(automaticData.des) : auto ? auto.total : totalDes
  const reincorporados = auto ? auto.reincorporados : 0
  const ninosFinal = Math.max(0, balanceMensual({ inicio: ninosInicio, nuevosActivos, reincorporados, retirados }))
  const now = new Date().toISOString()

  await upsertWith(query, 'resumen_mes', {
    centro_id: centroId, year, month,
    ninos_inicio_mes: ninosInicio,
    ninos_final_mes: ninosFinal,
    grupos_activos: gruposActivos,
    meta_nuevos_mensual: intOr(config.meta_nuevos_mensual, 20),
    nuevos_activos_mes: nuevosActivos,
    cp_invitados: automaticData ? automaticData.cp_invitados : intOr(config.cp_invitados),
    cp_asistieron: automaticData ? automaticData.cp_asistieron : intOr(config.cp_asistieron),
    cp_matriculados: automaticData ? automaticData.cp_matriculados : intOr(config.cp_matriculados),
    mot_tecnica: mot('mot_tecnica'),
    mot_perdida_clase: mot('mot_perdida_clase'),
    mot_economico: mot('mot_economico'),
    mot_horario: mot('mot_horario'),
    mot_graduado: mot('mot_graduado'),
    mot_otro: mot('mot_otro'),
    orig_referido: automaticData ? automaticData.orig_referido : intOr(config.orig_referido),
    orig_marketing: automaticData ? automaticData.orig_marketing : intOr(config.orig_marketing),
    orig_centro: automaticData ? automaticData.orig_centro : intOr(config.orig_centro),
    orig_activaciones: automaticData ? automaticData.orig_activaciones : intOr(config.orig_activaciones),
    orig_medios: automaticData ? automaticData.orig_medios : intOr(config.orig_medios),
    orig_por_clasificar: automaticData ? automaticData.orig_por_clasificar : intOr(config.orig_por_clasificar),
    updated_at: now,
  }, ['centro_id', 'year', 'month'])

  for (let i = 0; i < SEMANAS.length; i++) {
    const w = semanas?.[i] || { cob: [], des: [], ing: [] }
    await upsertWith(query, 'kpi_semanas', {
      centro_id: centroId, year, month, semana: i + 1,
      cob_d1: intOr(w.cob?.[0]), cob_d2: intOr(w.cob?.[1]), cob_d3: intOr(w.cob?.[2]), cob_d4: intOr(w.cob?.[3]), cob_d5: intOr(w.cob?.[4]),
      des_d1: automaticData ? intOr(automaticData.des?.[i]?.[0]) : intOr(w.des?.[0]),
      des_d2: automaticData ? intOr(automaticData.des?.[i]?.[1]) : intOr(w.des?.[1]),
      des_d3: automaticData ? intOr(automaticData.des?.[i]?.[2]) : intOr(w.des?.[2]),
      des_d4: automaticData ? intOr(automaticData.des?.[i]?.[3]) : intOr(w.des?.[3]),
      des_d5: automaticData ? intOr(automaticData.des?.[i]?.[4]) : intOr(w.des?.[4]),
      ing_d1: automaticData ? intOr(automaticData.ing?.[i]?.[0]) : intOr(w.ing?.[0]),
      ing_d2: automaticData ? intOr(automaticData.ing?.[i]?.[1]) : intOr(w.ing?.[1]),
      ing_d3: automaticData ? intOr(automaticData.ing?.[i]?.[2]) : intOr(w.ing?.[2]),
      ing_d4: automaticData ? intOr(automaticData.ing?.[i]?.[3]) : intOr(w.ing?.[3]),
      ing_d5: automaticData ? intOr(automaticData.ing?.[i]?.[4]) : intOr(w.ing?.[4]),
      updated_at: now,
    }, ['centro_id', 'year', 'month', 'semana'])
  }
  return { ok: true }
}

async function guardarKpiMes(centroId, year, month, config, semanas) {
  await requireCentroAccess(centroId)
  return await withTransaction(async (query) => {
    const errorMes = await bloquearMesesEditables(query, centroId, [{ year, month }])
    if (errorMes) return { error: errorMes }

    let automatic = null
    if (usaKpiAutomatico(year, month, 'abierto')) {
      automatic = await fotoKpiAutomatica(centroId, intOr(year), intOr(month), { query })
      if (!automatic.complete) {
        return { error: `No se puede guardar ni cerrar: ${automatic.error || 'la sincronización automática está pendiente.'}` }
      }
    }
    return await guardarKpiBloqueado(query, centroId, year, month, config, semanas, automatic)
  })
}

export async function cerrarMes(centroId, year, month, config, semanas) {
  const y = intOr(year)
  const m = intOr(month)
  try {
    await requireCentroAccess(centroId)
    if (!config || !Array.isArray(semanas)) {
      return { error: 'Recarga el KPI antes de cerrar para tomar una fotografía completa.' }
    }

    return await withTransaction(async (query) => {
      await query`
        INSERT INTO mes_kpi (centro_id, year, month, estado, cerrado_at)
        VALUES (${centroId}, ${y}, ${m}, 'abierto', NULL)
        ON CONFLICT (centro_id, year, month) DO NOTHING
      `
      const [mes] = await query`
        SELECT estado FROM mes_kpi
        WHERE centro_id = ${centroId} AND year = ${y} AND month = ${m}
        FOR UPDATE
      `
      if (mes?.estado === 'cerrado') return { ok: true, alreadyClosed: true }
      if (mes?.estado !== 'abierto') {
        return { error: 'El mes no está disponible para cerrar. Recarga la pantalla e inténtalo de nuevo.' }
      }

      // La lectura externa ocurre mientras la fila mensual permanece tomada.
      // Los movimientos operativos esperan este lock y, al liberarse, ven el
      // mes ya cerrado; ninguno puede colarse entre la foto y el cierre.
      let automatic = null
      if (usaKpiAutomatico(y, m, 'abierto')) {
        automatic = await fotoKpiAutomatica(centroId, y, m, { query })
        if (!automatic.complete) {
          return { error: `No se puede cerrar: ${automatic.error || 'la sincronización automática está pendiente.'}` }
        }
      }

      const guardado = await guardarKpiBloqueado(query, centroId, y, m, config, semanas, automatic)
      if (guardado.error) return guardado
      const [resumen] = await query`
        SELECT ninos_inicio_mes, ninos_final_mes, nuevos_activos_mes
        FROM resumen_mes
        WHERE centro_id = ${centroId} AND year = ${y} AND month = ${m}
        FOR UPDATE
      `
      if (!resumen) {
        return { error: 'No se pudo guardar la fotografía mensual antes del cierre.' }
      }

      const datos = await calcularCuadro(centroId, y, m, query)
      const cierre = cierreKpiDeclarado({ resumen, datos })
      const datosCierre = cuadroConBalanceDeclarado({ datos, ...cierre })
      const cerradoAt = new Date().toISOString()

      await upsertWith(query, 'cuadro_mensual', {
        centro_id: centroId,
        year: y,
        month: m,
        datos: JSON.stringify(datosCierre),
        cerrado_at: cerradoAt,
      }, ['centro_id', 'year', 'month'])

      await query`
        UPDATE mes_kpi
        SET estado = 'cerrado', cerrado_at = ${cerradoAt}
        WHERE centro_id = ${centroId} AND year = ${y} AND month = ${m}
      `
      return { ok: true }
    })
  } catch (e) {
    return fallo('cerrarMes', e)
  }
}
