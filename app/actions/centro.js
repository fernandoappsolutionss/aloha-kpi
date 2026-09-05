'use server'
import { sql } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { nivelPorNinos, siguienteNivel } from '../../lib/nivel'
import { quarterMetrics } from '../../lib/kpi-calc'
import { fechaIso10, hoyISO } from '../../lib/operaciones'
import { iniciosClaseMes, periodosAbiertosOperativos, proyeccionSiguienteMes, resumenConCuadroVivo, fechaInicioClasesConfiable } from '../../lib/inicios-clase.mjs'
import { calcularCuadro } from '../../lib/cuadro-snapshot'
import { motivosParaKpi } from '../../lib/cuadro-calc'
import { cierreMesAnterior } from '../../lib/cadena'
import { superponerKpiAbiertos } from '../../lib/kpi-semanal-service'
import { VENTAS_AUTO_DESDE } from '../../lib/kpi-semanal-auto.mjs'
import { usaKpiAutomatico } from '../../lib/kpi-auto.mjs'
import { fotoKpiAutomatica, mezclarResumenAutomatico } from '../../lib/kpi-auto-server'

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
  let ks = await sql`
    SELECT * FROM kpi_semanas
    WHERE centro_id = ${centroId} AND year = ${year} AND month BETWEEN ${lo} AND ${hi}
  `
  // (g1-16) Superposición en vivo: en meses abiertos >= gate, ing/des salen
  // del módulo — la tabla deja de ser fuente hasta que el cierre materializa.
  ;({ filas: ks } = await superponerKpiAbiertos({
    filas: ks,
    centroIds: [centroId],
    desde: Number(year) * 100 + lo,
    hasta: Number(year) * 100 + hi,
  }))

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
  const automaticosAbiertos = new Map()

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
      if (usaKpiAutomatico(abierto.year, abierto.month, abierto.estado)) {
        const automatic = await fotoKpiAutomatica(centroId, abierto.year, abierto.month)
        if (automatic.complete) {
          rs = mezclarResumenAutomatico(rs, abierto.year, abierto.month, automatic.data)
          automaticosAbiertos.set(`${abierto.year}-${abierto.month}`, automatic.data)
        } else {
          console.error(`[getCentroResumen] no se pudo sincronizar ${abierto.year}-${abierto.month}: ${automatic.error}`)
        }
      }
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

  // El % del checklist sobre los 33 criterios YA NO SE DEVUELVE. Era el 88% que
  // daba la falsa confianza, y aunque ninguna pantalla lo pintaba ya, seguía
  // viajando listo en el payload esperando a que alguien volviera a usarlo.
  // La disciplina —ponderada y con su denominador de meses— la sirve
  // getDisciplinaTrimestre (app/actions/cumplimiento.js).

  // Graduación anual (logro): graduados del año vs deserción total (bajas) y vs alumnado.
  // Graduarse = completar todos los niveles (≈4–5 años), por eso se mide por año.
  let rsAnio = await sql`SELECT year, month, ninos_inicio_mes, mot_graduado FROM resumen_mes WHERE centro_id = ${centroId} AND year = ${year} ORDER BY month`
  // Deserción anual: ing/des salen SIEMPRE de la superposición del motor
  // semanal (una sola derivación); del automático de resumen solo se toman los
  // campos que ese motor no cubre (mot_graduado y compañía).
  let ksAnio = await sql`SELECT centro_id, year, month, semana, des_d1, des_d2, des_d3, des_d4, des_d5 FROM kpi_semanas WHERE centro_id = ${centroId} AND year = ${year}`
  ;({ filas: ksAnio } = await superponerKpiAbiertos({
    filas: ksAnio,
    centroIds: [centroId],
    desde: Number(year) * 100 + 1,
    hasta: Number(year) * 100 + 12,
  }))
  for (const [periodo, automatic] of automaticosAbiertos) {
    const [autoYear, autoMonth] = periodo.split('-').map(Number)
    rsAnio = mezclarResumenAutomatico(rsAnio, autoYear, autoMonth, automatic)
  }
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
    SELECT id, estado, fecha_inicio_clases, itinerario_clases FROM grupos WHERE centro_id = ${centroId}
  `
  const estudiantesProyeccion = await sql`
    SELECT id, grupo_id, estado, fecha_inscripcion FROM estudiantes WHERE centro_id = ${centroId}
  `
  const eventosProyeccion = await sql`
    SELECT id, estudiante_id, tipo, fecha, a_grupo_id
    FROM estudiante_eventos
    WHERE centro_id = ${centroId} AND tipo IN ('inscripcion', 'retiro', 'cambio_grupo')
    ORDER BY fecha, id
  `
  const gruposPorId = new Map(gruposProyeccion.map((grupo) => [String(grupo.id), grupo]))
  const poblacionOperativa = estudiantesProyeccion.filter((estudiante) => {
    if (estudiante.estado !== 'activo' && estudiante.estado !== 'baja_potencial') return false
    const grupo = estudiante.grupo_id == null ? null : gruposPorId.get(String(estudiante.grupo_id))
    // Sin grupo no hay población operativa: una venta sin colocar todavía no
    // es un niño activo.
    if (!grupo) return false
    // (R1, g1-1) La población operativa depende EXCLUSIVAMENTE de la fecha de
    // inicio de clases del grupo. Los grupos veteranos con fecha futura se
    // corrigen en los datos (preflight g1-1); mientras tanto los cubre la
    // GUARDIA de runtime (nivel 2+ con fecha futura = dato roto: se trata
    // como NULL y el grupo sigue contando, fail closed).
    const fechaGrupo = fechaInicioClasesConfiable(grupo, finMesActual)
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

  return { nombre: c?.nombre || '', metas: metas || null, rs, ks, meses: cur.months, nivel, nivelEnCurso, sig, ninosActual: cur.ninos, desOkActual: cur.desOk, graduacion, proyeccion }
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
  // (g1-16) Las semanas se leen CRUDAS y se agregan en JS: así la
  // superposición del cálculo vivo (meses abiertos >= gate) entra al total
  // con el mismo helper compartido, sin duplicar el criterio en SQL.
  let semanasCrudas = await sql`
    SELECT centro_id, year, month, semana,
      ing_d1, ing_d2, ing_d3, ing_d4, ing_d5,
      des_d1, des_d2, des_d3, des_d4, des_d5
    FROM kpi_semanas
    WHERE centro_id = ${centroId}
  `
  const [anioHoy, mesHoy] = hoyISO().split('-').map(Number)
  ;({ filas: semanasCrudas } = await superponerKpiAbiertos({
    filas: semanasCrudas,
    centroIds: [centroId],
    desde: VENTAS_AUTO_DESDE,
    hasta: anioHoy * 100 + mesHoy,
  }))
  const porMes = new Map()
  for (const fila of semanasCrudas) {
    const clave = `${fila.year}-${fila.month}`
    const acumulado = porMes.get(clave) || { year: fila.year, month: fila.month, nuevos_ingresos_venta: 0, total_desercion: 0 }
    acumulado.nuevos_ingresos_venta += (fila.ing_d1 || 0) + (fila.ing_d2 || 0) + (fila.ing_d3 || 0) + (fila.ing_d4 || 0) + (fila.ing_d5 || 0)
    acumulado.total_desercion += (fila.des_d1 || 0) + (fila.des_d2 || 0) + (fila.des_d3 || 0) + (fila.des_d4 || 0) + (fila.des_d5 || 0)
    porMes.set(clave, acumulado)
  }
  const semanas = [...porMes.values()]
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
      if (usaKpiAutomatico(abierto.year, abierto.month, abierto.estado)) {
        const automatic = await fotoKpiAutomatica(centroId, abierto.year, abierto.month)
        if (automatic.complete) {
          // Solo los campos de resumen: los totales de ventas y deserción del
          // mes abierto ya vienen superpuestos arriba desde el motor semanal.
          resumen = mezclarResumenAutomatico(resumen, abierto.year, abierto.month, automatic.data)
        } else {
          console.error(`[getHistorialCentro] no se pudo sincronizar ${abierto.year}-${abierto.month}: ${automatic.error}`)
        }
      }
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
