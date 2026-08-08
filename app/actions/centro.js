'use server'
import { sql } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { nivelPorNinos, siguienteNivel } from '../../lib/nivel'
import { quarterMetrics } from '../../lib/kpi-calc'
import { cumplimientoPct } from '../../lib/checklist'
import { fechaIso10, hoyISO } from '../../lib/operaciones'
import { iniciosClaseMes, periodosAbiertosOperativos, proyeccionSiguienteMes, resumenConCuadroVivo } from '../../lib/inicios-clase.mjs'
import { calcularCuadro } from '../../lib/cuadro-snapshot'
import { motivosParaKpi } from '../../lib/cuadro-calc'
import { cierreMesAnterior } from '../../lib/cadena'

const Q_MONTHS = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] }

// Datos crudos del trimestre para la página de resumen del centro.
export async function getCentroResumen(centroId, year, trimestre) {
  await requireCentroAccess(centroId)
  const months = Q_MONTHS[trimestre] || [1, 2, 3]
  const lo = months[0], hi = months[months.length - 1]

  const [c] = await sql`SELECT nombre FROM centros WHERE id = ${centroId}`
  const [metas] = await sql`SELECT * FROM metas WHERE anio = ${year} AND trimestre = ${trimestre}`
  let rs = await sql`
    SELECT * FROM resumen_mes
    WHERE centro_id = ${centroId} AND year = ${year} AND month BETWEEN ${lo} AND ${hi}
    ORDER BY month
  `
  const ks = await sql`
    SELECT * FROM kpi_semanas
    WHERE centro_id = ${centroId} AND year = ${year} AND month BETWEEN ${lo} AND ${hi}
  `

  const hoy = hoyISO()
  const [yearActual, monthActual] = hoy.split('-').map(Number)
  const estadosRango = await sql`
    SELECT year, month, estado FROM mes_kpi
    WHERE centro_id = ${centroId} AND year = ${year} AND month BETWEEN ${lo} AND ${hi}
  `
  const abiertos = periodosAbiertosOperativos({
    resumenes: rs,
    estados: estadosRango,
    centroIds: [centroId],
    desde: Number(year) * 100 + lo,
    hasta: Number(year) * 100 + hi,
    periodoActual: yearActual * 100 + monthActual,
  })

  for (const abierto of abiertos) {
    try {
      const [cuadroAbierto, cierreAnterior] = await Promise.all([
        calcularCuadro(centroId, abierto.year, abierto.month),
        cierreMesAnterior(centroId, abierto.year, abierto.month),
      ])
      const previousYear = abierto.month === 1 ? abierto.year - 1 : abierto.year
      const previousMonth = abierto.month === 1 ? 12 : abierto.month - 1
      const cierreVivoAnterior = rs.find((fila) =>
        Number(fila.year) === previousYear && Number(fila.month) === previousMonth
      )?.ninos_final_mes
      rs = resumenConCuadroVivo(rs, {
        centroId,
        year: abierto.year,
        month: abierto.month,
        estado: abierto.estado,
        cuadro: cuadroAbierto,
        inicioArrastrado: cierreVivoAnterior ?? cierreAnterior?.valor,
        motivos: motivosParaKpi(cuadroAbierto?.deserciones || []),
      })
    } catch (e) {
      console.error(`[getCentroResumen] no se pudo calcular ${abierto.year}-${abierto.month}:`, e)
    }
  }
  rs = rs.map((fila) => ({
    ...fila,
    estado_mes: estadosRango.find((estado) =>
      Number(estado.year) === Number(fila.year) && Number(estado.month) === Number(fila.month)
    )?.estado || 'abierto',
  }))

  // Cierre del mes anterior al trimestre: semilla del encadenamiento (el mes
  // que abre el trimestre arranca con lo que cerró el mes previo).
  const py = lo === 1 ? year - 1 : year
  const pm = lo === 1 ? 12 : lo - 1
  const [prevMes] = await sql`
    SELECT ninos_final_mes FROM resumen_mes
    WHERE centro_id = ${centroId} AND year = ${py} AND month = ${pm}
  `
  const cierrePrevio = prevMes?.ninos_final_mes || 0

  // Nivel del centro = niños del trimestre vs umbrales (igual que el Excel; sin condición de deserción).
  const cur = quarterMetrics(rs, ks, centroId, months, cierrePrevio)
  const nivel = nivelPorNinos(cur.ninos)
  const nivelEnCurso = nivel
  const sig = siguienteNivel(cur.ninos)

  // Cumplimiento REAL = checklist (hoja "Cumplimiento" de los Excel) del trimestre.
  const cumpRows = await sql`
    SELECT cu.* FROM cumplimiento cu JOIN trimestres t ON t.id = cu.trimestre_id
    WHERE t.centro_id = ${centroId} AND t.anio = ${year} AND t.trimestre = ${trimestre}
  `
  const cumplChecklist = cumplimientoPct(cumpRows)

  // Graduación anual (logro): graduados del año vs deserción total (bajas) y vs alumnado.
  // Graduarse = completar todos los niveles (≈4–5 años), por eso se mide por año.
  const rsAnio = await sql`SELECT month, ninos_inicio_mes, mot_graduado FROM resumen_mes WHERE centro_id = ${centroId} AND year = ${year} ORDER BY month`
  const ksAnio = await sql`SELECT des_d1, des_d2, des_d3, des_d4, des_d5 FROM kpi_semanas WHERE centro_id = ${centroId} AND year = ${year}`
  const graduadosAnio = rsAnio.reduce((a, r) => a + (r.mot_graduado || 0), 0)
  const bajasAnio = ksAnio.reduce((a, w) => a + (w.des_d1 || 0) + (w.des_d2 || 0) + (w.des_d3 || 0) + (w.des_d4 || 0) + (w.des_d5 || 0), 0)
  const ninosInicioAnio = rsAnio.find((r) => (r.ninos_inicio_mes || 0) > 0)?.ninos_inicio_mes || 0
  const graduacion = {
    graduados: graduadosAnio,
    bajas: bajasAnio,
    desercionReal: Math.max(0, bajasAnio - graduadosAnio),
    pctBajas: bajasAnio > 0 ? Math.round((graduadosAnio / bajasAnio) * 100) : 0,
    pctAlumnado: ninosInicioAnio > 0 ? Math.round((graduadosAnio / ninosInicioAnio) * 100) : 0,
  }

  const nextYear = monthActual === 12 ? yearActual + 1 : yearActual
  const nextMonth = monthActual === 12 ? 1 : monthActual + 1
  const finMesActual = `${yearActual}-${String(monthActual).padStart(2, '0')}-${String(new Date(yearActual, monthActual, 0).getDate()).padStart(2, '0')}`
  const gruposProyeccion = await sql`
    SELECT id, estado, fecha_inicio_clases FROM grupos WHERE centro_id = ${centroId}
  `
  const estudiantesProyeccion = await sql`
    SELECT id, grupo_id, estado, fecha_inscripcion FROM estudiantes WHERE centro_id = ${centroId}
  `
  const eventosProyeccion = await sql`
    SELECT id, estudiante_id, tipo, fecha, a_grupo_id
    FROM estudiante_eventos
    WHERE centro_id = ${centroId} AND tipo IN ('inscripcion', 'retiro')
    ORDER BY fecha, id
  `
  const gruposPorId = new Map(gruposProyeccion.map((grupo) => [String(grupo.id), grupo]))
  const poblacionOperativa = estudiantesProyeccion.filter((estudiante) => {
    if (estudiante.estado !== 'activo' && estudiante.estado !== 'baja_potencial') return false
    const grupo = estudiante.grupo_id == null ? null : gruposPorId.get(String(estudiante.grupo_id))
    const fechaGrupo = fechaIso10(grupo?.fecha_inicio_clases)
    const fechaInscripcion = fechaIso10(estudiante.fecha_inscripcion)
    return (!fechaGrupo || fechaGrupo <= finMesActual) && (!fechaInscripcion || fechaInscripcion <= finMesActual)
  })
  const cierreActual = cur.ninos
  const bajasPotenciales = poblacionOperativa.filter((estudiante) => estudiante.estado === 'baja_potencial').length
  const iniciosProgramados = iniciosClaseMes(
    estudiantesProyeccion,
    gruposProyeccion,
    eventosProyeccion,
    nextYear,
    nextMonth,
  ).filter((inicio) =>
    inicio.estado === 'activo' && inicio.grupoEstado !== 'cerrado' && inicio.grupoEstado !== 'fusionado'
  ).length
  const proyeccion = {
    year: nextYear,
    month: nextMonth,
    cierreActual,
    bajasPotenciales,
    iniciosProgramados,
    total: proyeccionSiguienteMes({ cierreActual, bajasPotenciales, iniciosProgramados }),
  }

  return { nombre: c?.nombre || '', metas: metas || null, rs, ks, meses: cur.months, nivel, nivelEnCurso, sig, ninosActual: cur.ninos, desOkActual: cur.desOk, cumplimientoPct: cumplChecklist, graduacion, proyeccion }
}

// Todos los meses con datos (para la vista de historial/tendencias del centro).
export async function getHistorialCentro(centroId) {
  await requireCentroAccess(centroId)
  const [c] = await sql`SELECT nombre FROM centros WHERE id = ${centroId}`
  let resumen = await sql`
    SELECT * FROM resumen_mes WHERE centro_id = ${centroId}
    ORDER BY year ASC, month ASC
  `
  const estados = await sql`
    SELECT year, month, estado, cerrado_at FROM mes_kpi WHERE centro_id = ${centroId}
  `
  const semanas = await sql`
    SELECT
      year,
      month,
      COALESCE(SUM(
        COALESCE(ing_d1, 0) + COALESCE(ing_d2, 0) + COALESCE(ing_d3, 0) + COALESCE(ing_d4, 0) + COALESCE(ing_d5, 0)
      ), 0)::int AS nuevos_ingresos_venta,
      COALESCE(SUM(
        COALESCE(des_d1, 0) + COALESCE(des_d2, 0) + COALESCE(des_d3, 0) + COALESCE(des_d4, 0) + COALESCE(des_d5, 0)
      ), 0)::int AS total_desercion
    FROM kpi_semanas
    WHERE centro_id = ${centroId}
    GROUP BY year, month
  `
  // Fotos mensuales del Cuadro de Negocio (solo métricas compactas: la foto
  // completa con niños y contactos se ve en la página del cuadro).
  const fotos = await sql`
    SELECT year, month, datos, cerrado_at FROM cuadro_mensual
    WHERE centro_id = ${centroId} ORDER BY year, month
  `
  const cuadros = fotos.map((f) => {
    const d = typeof f.datos === 'string' ? JSON.parse(f.datos) : f.datos
    return {
      year: f.year,
      month: f.month,
      cerrado_at: f.cerrado_at,
      aPagar: d?.totales?.aPagar ?? 0,
      nuevos: d?.iniciosClase?.length ?? d?.totales?.nuevos ?? 0,
      reincorporados: d?.totales?.reincorporados ?? 0,
      retirados: d?.totales?.retirados ?? 0,
      gruposActivos: d?.totales?.gruposActivos ?? 0,
      promedio: d?.promedios?.sinK ?? null,
      royalty: d?.royalties?.totales?.totalRoyalty ?? 0,
    }
  })

  // La foto congelada manda en meses cerrados. Cada mes reabierto consume el
  // mismo cálculo vivo que KPI y Cuadro de Negocio, aunque no sea el último.
  const [yearActual, monthActual] = hoyISO().split('-').map(Number)
  const abiertos = periodosAbiertosOperativos({
    resumenes: resumen,
    estados,
    centroIds: [centroId],
    periodoActual: yearActual * 100 + monthActual,
  })

  for (const abierto of abiertos) {
    try {
      const [d, cierreAnterior] = await Promise.all([
        calcularCuadro(centroId, abierto.year, abierto.month),
        cierreMesAnterior(centroId, abierto.year, abierto.month),
      ])
      const previousYear = abierto.month === 1 ? abierto.year - 1 : abierto.year
      const previousMonth = abierto.month === 1 ? 12 : abierto.month - 1
      const cierreVivoAnterior = resumen.find((fila) =>
        Number(fila.year) === previousYear && Number(fila.month) === previousMonth
      )?.ninos_final_mes
      resumen = resumenConCuadroVivo(resumen, {
        centroId,
        year: abierto.year,
        month: abierto.month,
        estado: abierto.estado,
        cuadro: d,
        inicioArrastrado: cierreVivoAnterior ?? cierreAnterior?.valor,
        motivos: motivosParaKpi(d?.deserciones || []),
      })
      const cuadroVivo = {
        year: abierto.year,
        month: abierto.month,
        cerrado_at: null,
        vivo: true,
        aPagar: d?.totales?.aPagar ?? 0,
        nuevos: d?.iniciosClase?.length ?? d?.totales?.nuevos ?? 0,
        reincorporados: d?.totales?.reincorporados ?? 0,
        retirados: d?.totales?.retirados ?? 0,
        gruposActivos: d?.totales?.gruposActivos ?? 0,
        promedio: d?.promedios?.sinK ?? null,
        royalty: d?.royalties?.totales?.totalRoyalty ?? 0,
      }
      const indice = cuadros.findIndex((cuadro) =>
        Number(cuadro.year) === cuadroVivo.year && Number(cuadro.month) === cuadroVivo.month
      )
      if (indice >= 0) cuadros[indice] = cuadroVivo
      else cuadros.push(cuadroVivo)
    } catch (e) {
      console.error(`[getHistorialCentro] no se pudo calcular ${abierto.year}-${abierto.month}:`, e)
    }
  }
  return { nombre: c?.nombre || '', resumen, estados, semanas, cuadros }
}
