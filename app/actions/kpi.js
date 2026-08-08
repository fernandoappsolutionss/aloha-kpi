'use server'
import { sql, upsertWith, withTransaction } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { calcularCuadro } from '../../lib/cuadro-snapshot'
import { motivosParaKpi } from '../../lib/cuadro-calc'
import { balanceMensual, cierreKpiDeclarado, cuadroConBalanceDeclarado, INICIOS_CLASE_DESDE } from '../../lib/inicios-clase.mjs'
import { fallo } from '../../lib/errores'
import { cierreMesAnterior } from '../../lib/cadena'
import { bloquearMesesEditables } from '../../lib/mes-kpi'
import { fechaIso10 } from '../../lib/operaciones'
import { ejecutarRetiroEn } from '../../lib/retiros-service'
import { calcularKpiAutoMes } from '../../lib/kpi-semanal-service'
import { superponerSemanasAuto } from '../../lib/kpi-semanal-auto.mjs'

const SEMANAS = [1, 2, 3, 4, 5]
const intOr = (v, d = 0) => {
  const n = parseInt(v)
  return Number.isFinite(n) ? n : d
}
const ymDe = (fecha) => {
  const [y, m] = String(fecha).split('-').map(Number)
  return { year: y, month: m }
}

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
  const [res] = await sql`SELECT * FROM resumen_mes WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}`
  let semanas = await sql`SELECT * FROM kpi_semanas WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month} ORDER BY semana`
  const historial = await sql`
    SELECT year, month, estado, cerrado_at FROM mes_kpi
    WHERE centro_id = ${centroId} AND estado = 'cerrado'
    ORDER BY year DESC, month DESC
  `
  const cierreAnterior = await cierreMesAnterior(centroId, intOr(year), intOr(month))
  const estado = mes?.estado || 'abierto'
  // (g1-16) KPI sin manos: en mes ABIERTO >= gate las filas ing/des salen del
  // módulo, superpuestas sobre kpi_semanas. Un mes cerrado es histórico
  // congelado: lo guardado manda y ni se calcula.
  let kpiAuto = null
  if (estado !== 'cerrado') {
    kpiAuto = await calcularKpiAutoMes(centroId, intOr(year), intOr(month))
    if (kpiAuto?.estado === 'manual_pre_gate') kpiAuto = null
    if (kpiAuto?.estado === 'auto') {
      semanas = superponerSemanasAuto(semanas, {
        centroId, year: intOr(year), month: intOr(month), auto: kpiAuto,
      })
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
    motivosAuto: estado === 'cerrado' ? null : await motivosDelModulo(centroId, intOr(year), intOr(month)),
    // Resultado discriminado (g1-20) para la UI: 'auto' bloquea ing/des (el
    // cero también), 'fallo' las desbloquea con advertencia visible.
    kpiAuto,
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
  let totalDes = 0
  for (const w of semanas || []) for (const v of (w.des || [])) totalDes += intOr(v)

  return await withTransaction(async (query) => {
    const errorMes = await bloquearMesesEditables(query, centroId, [{ year, month }])
    if (errorMes) return { error: errorMes }

    // El inicio se arrastra del cierre anterior. La lectura y el guardado
    // permanecen bajo el mismo bloqueo que usan los movimientos operativos.
    const arrastrado = await cierreMesAnterior(centroId, intOr(year), intOr(month), query)
    const ninosInicio = arrastrado ? arrastrado.valor : intOr(config.ninos_inicio)
    const auto = await motivosDelModulo(centroId, intOr(year), intOr(month), query)
    // (g1-16/g1-20) El server recalcula ing/des DESPUÉS del lock del mes: en
    // 'auto' se ignoran las filas del cliente y se materializa el cálculo;
    // solo en 'fallo' (o pre-gate) se acepta la captura manual.
    const kpiAuto = await calcularKpiAutoMes(centroId, intOr(year), intOr(month), query)
    const esAuto = kpiAuto?.estado === 'auto'
    const mot = (k) => (auto ? auto[k] : intOr(config[k]))
    const gruposForm = intOr(config.grupos_activos)
    let gruposActivos = auto && auto.grupos > 0 ? auto.grupos : gruposForm
    if (gruposActivos <= 0) gruposActivos = await gruposDelModulo(centroId, query)
    const nuevosActivos = auto ? auto.nuevos : intOr(config.nuevos_activos_mes)
    const retirados = auto ? auto.total : (esAuto ? kpiAuto.desTotal : totalDes)
    const reincorporados = auto ? auto.reincorporados : 0
    const ninosFinal = Math.max(0, balanceMensual({ inicio: ninosInicio, nuevosActivos, reincorporados, retirados }))
    // (g1-21) cp_matriculados con override: efectivo = override ?? derivado.
    // El derivado son las ventas del mes (sin traslados); el efectivo se
    // materializa en cp_matriculados para no tocar consumidores existentes.
    const overrideCrudo = config.cp_matriculados_override
    const cpOverride = overrideCrudo === undefined || overrideCrudo === null || overrideCrudo === ''
      ? null
      : intOr(overrideCrudo)
    const cpMatriculados = cpOverride ?? (esAuto ? kpiAuto.cp : intOr(config.cp_matriculados))
    const now = new Date().toISOString()

    await upsertWith(query, 'resumen_mes', {
      centro_id: centroId, year, month,
      ninos_inicio_mes: ninosInicio,
      ninos_final_mes: ninosFinal,
      grupos_activos: gruposActivos,
      meta_nuevos_mensual: intOr(config.meta_nuevos_mensual, 20),
      nuevos_activos_mes: nuevosActivos,
      cp_invitados: intOr(config.cp_invitados),
      cp_asistieron: intOr(config.cp_asistieron),
      cp_matriculados: cpMatriculados,
      cp_matriculados_override: cpOverride,
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
      // Materialización (g1-16): SOLO ing_*/des_* vienen del cálculo; cob_*
      // siempre es captura del cliente (intacto para el módulo).
      const ingSemana = esAuto ? kpiAuto.ing[i] : null
      const desSemana = esAuto ? kpiAuto.des[i] : null
      await upsertWith(query, 'kpi_semanas', {
        centro_id: centroId, year, month, semana: i + 1,
        cob_d1: intOr(w.cob?.[0]), cob_d2: intOr(w.cob?.[1]), cob_d3: intOr(w.cob?.[2]), cob_d4: intOr(w.cob?.[3]), cob_d5: intOr(w.cob?.[4]),
        des_d1: intOr(desSemana ? desSemana[0] : w.des?.[0]), des_d2: intOr(desSemana ? desSemana[1] : w.des?.[1]), des_d3: intOr(desSemana ? desSemana[2] : w.des?.[2]), des_d4: intOr(desSemana ? desSemana[3] : w.des?.[3]), des_d5: intOr(desSemana ? desSemana[4] : w.des?.[4]),
        ing_d1: intOr(ingSemana ? ingSemana[0] : w.ing?.[0]), ing_d2: intOr(ingSemana ? ingSemana[1] : w.ing?.[1]), ing_d3: intOr(ingSemana ? ingSemana[2] : w.ing?.[2]), ing_d4: intOr(ingSemana ? ingSemana[3] : w.ing?.[3]), ing_d5: intOr(ingSemana ? ingSemana[4] : w.ing?.[4]),
        updated_at: now,
      }, ['centro_id', 'year', 'month', 'semana'])
    }
    return { ok: true }
  })
}

export async function cerrarMes(centroId, year, month) {
  const y = intOr(year)
  const m = intOr(month)
  try {
    await requireCentroAccess(centroId)
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

      const [resumen] = await query`
        SELECT ninos_inicio_mes, ninos_final_mes, nuevos_activos_mes
        FROM resumen_mes
        WHERE centro_id = ${centroId} AND year = ${y} AND month = ${m}
        FOR UPDATE
      `
      if (!resumen) {
        return { error: 'Guarda el KPI antes de cerrar el mes.' }
      }

      // (g2-4) RECONCILIACIÓN ANTES DEL SNAPSHOT: los retiros programados que
      // vencen dentro del mes que se cierra (retiro_programado_para <= fin de
      // mes) se EJECUTAN aquí, por el MISMO camino del cron y de la acción
      // (ejecutarRetiroEn), dentro de la transacción de cierre — y solo
      // después se recalcula y congela la foto. Si el cron se cayó o llegó
      // tarde, el cierre no se traga la deserción: la ejecuta él mismo.
      const finMes = `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
      const candidatos = await query`
        SELECT id, retiro_programado_para FROM estudiantes
        WHERE centro_id = ${centroId} AND estado = 'baja_potencial'
          AND retiro_programado_para IS NOT NULL
          AND retiro_programado_para <= ${finMes}::date
        ORDER BY id
      `
      // Meses lógicos DISTINTOS al que se cierra (programaciones atrasadas de
      // meses anteriores): abiertos se bloquean y también se reconcilian;
      // CERRADOS jamás reciben un evento nuevo — la fila queda intacta y se
      // reporta para reparación manual (mismo patrón del cron, g2-4).
      const reparacion = []
      const ejecutables = new Set([`${y}-${m}`])
      const periodosExtra = new Map()
      for (const c of candidatos) {
        const p = ymDe(fechaIso10(c.retiro_programado_para))
        const key = `${p.year}-${p.month}`
        if (!ejecutables.has(key)) periodosExtra.set(key, p)
      }
      const extrasOrdenados = [...periodosExtra.entries()].sort((a, b) =>
        (a[1].year * 100 + a[1].month) - (b[1].year * 100 + b[1].month))
      for (const [key, p] of extrasOrdenados) {
        const [mesLogico] = await query`
          SELECT estado FROM mes_kpi
          WHERE centro_id = ${centroId} AND year = ${p.year} AND month = ${p.month}
        `
        if (mesLogico?.estado === 'cerrado') continue
        const errorMesLogico = await bloquearMesesEditables(query, centroId, [p])
        if (!errorMesLogico) ejecutables.add(key)
      }
      for (const c of candidatos) {
        const fechaLogica = fechaIso10(c.retiro_programado_para)
        const p = ymDe(fechaLogica)
        if (!ejecutables.has(`${p.year}-${p.month}`)) {
          reparacion.push({ estudianteId: c.id, fecha: fechaLogica })
          continue
        }
        // Re-verificación bajo lock (orden del repo: mes_kpi → estudiantes):
        // si otra transacción canceló, reprogramó o ya ejecutó la
        // programación, aquí no hay nada que hacer.
        const [est] = await query`
          SELECT * FROM estudiantes
          WHERE id = ${c.id} AND centro_id = ${centroId} AND estado = 'baja_potencial'
            AND retiro_programado_para = ${fechaLogica}::date
          FOR UPDATE
        `
        if (!est) continue
        // El motivo vive en el evento de programación (obligatorio en
        // programarRetiro); un evento perdido no frena el retiro: OTRO.
        const [evProg] = await query`
          SELECT motivo FROM estudiante_eventos
          WHERE estudiante_id = ${est.id} AND tipo = 'retiro_programado'
          ORDER BY id DESC LIMIT 1
        `
        await ejecutarRetiroEn(query, {
          estudiante: est,
          centroId,
          motivo: evProg?.motivo || 'OTRO',
          fecha: fechaLogica,
          detalle: { origen: 'cierre_mes_reconciliacion', programado_para: fechaLogica },
        })
      }

      // (g1-16) El cierre recalcula el KPI del módulo BAJO el mismo lock del
      // mes y materializa SOLO ing_*/des_* (cob_* intacto): lo que congela la
      // foto es el cálculo, no lo que quedara digitado. En fallo, el mes
      // cierra con los valores manuales y se avisa (fallback explícito).
      let warnAuto = null
      const kpiAuto = await calcularKpiAutoMes(centroId, y, m, query)
      if (kpiAuto?.estado === 'auto') {
        const nowAuto = new Date().toISOString()
        for (let s = 1; s <= 5; s++) {
          const ing = kpiAuto.ing[s - 1]
          const des = kpiAuto.des[s - 1]
          await query`
            INSERT INTO kpi_semanas (centro_id, year, month, semana,
              ing_d1, ing_d2, ing_d3, ing_d4, ing_d5,
              des_d1, des_d2, des_d3, des_d4, des_d5, updated_at)
            VALUES (${centroId}, ${y}, ${m}, ${s},
              ${ing[0]}, ${ing[1]}, ${ing[2]}, ${ing[3]}, ${ing[4]},
              ${des[0]}, ${des[1]}, ${des[2]}, ${des[3]}, ${des[4]}, ${nowAuto})
            ON CONFLICT (centro_id, year, month, semana) DO UPDATE SET
              ing_d1 = EXCLUDED.ing_d1, ing_d2 = EXCLUDED.ing_d2, ing_d3 = EXCLUDED.ing_d3,
              ing_d4 = EXCLUDED.ing_d4, ing_d5 = EXCLUDED.ing_d5,
              des_d1 = EXCLUDED.des_d1, des_d2 = EXCLUDED.des_d2, des_d3 = EXCLUDED.des_d3,
              des_d4 = EXCLUDED.des_d4, des_d5 = EXCLUDED.des_d5,
              updated_at = EXCLUDED.updated_at
          `
        }
      } else if (kpiAuto?.estado === 'fallo') {
        warnAuto = `El KPI automático falló (${kpiAuto.mensaje}) y el mes cerró con las ventas y retiros capturados a mano.`
      }

      // El guardado inmediatamente anterior ya fijo la cifra que vio el
      // administrador. Aqui solo se congela el detalle del Cuadro alrededor
      // de esa declaracion; nunca se vuelve a calcular el cierre.
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
      const warns = []
      if (reparacion.length) {
        warns.push(`${reparacion.length} retiro(s) programado(s) caen en un mes ya cerrado y NO se ejecutaron (reparación manual): ${reparacion.map((r) => `estudiante ${r.estudianteId} → ${r.fecha}`).join(', ')}.`)
      }
      if (warnAuto) warns.push(warnAuto)
      return warns.length ? { ok: true, warn: warns.join(' ') } : { ok: true }
    })
  } catch (e) {
    return fallo('cerrarMes', e)
  }
}

export async function reabrirMes(centroId, year, month) {
  try {
    await requireCentroAccess(centroId)
    return await withTransaction(async (query) => {
      await query`
        INSERT INTO mes_kpi (centro_id, year, month, estado, cerrado_at)
        VALUES (${centroId}, ${year}, ${month}, 'abierto', NULL)
        ON CONFLICT (centro_id, year, month) DO NOTHING
      `
      await query`
        SELECT estado FROM mes_kpi
        WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}
        FOR UPDATE
      `
      await query`
        UPDATE mes_kpi SET estado = 'abierto', cerrado_at = NULL
        WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}
      `
      return { ok: true }
    })
  } catch (e) {
    return fallo('reabrirMes', e)
  }
}
