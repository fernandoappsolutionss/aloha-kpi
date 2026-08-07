'use server'
import { sql } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { nivelPorNinos, siguienteNivel } from '../../lib/nivel'
import { quarterMetrics } from '../../lib/kpi-calc'
import { cumplimientoPct } from '../../lib/checklist'

const Q_MONTHS = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] }

// Datos crudos del trimestre para la página de resumen del centro.
export async function getCentroResumen(centroId, year, trimestre) {
  await requireCentroAccess(centroId)
  const months = Q_MONTHS[trimestre] || [1, 2, 3]
  const lo = months[0], hi = months[months.length - 1]

  const [c] = await sql`SELECT nombre FROM centros WHERE id = ${centroId}`
  const [metas] = await sql`SELECT * FROM metas WHERE anio = ${year} AND trimestre = ${trimestre}`
  const rs = await sql`
    SELECT * FROM resumen_mes
    WHERE centro_id = ${centroId} AND year = ${year} AND month BETWEEN ${lo} AND ${hi}
    ORDER BY month
  `
  const ks = await sql`
    SELECT * FROM kpi_semanas
    WHERE centro_id = ${centroId} AND year = ${year} AND month BETWEEN ${lo} AND ${hi}
  `

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

  return { nombre: c?.nombre || '', metas: metas || null, rs, ks, meses: cur.months, nivel, nivelEnCurso, sig, ninosActual: cur.ninos, desOkActual: cur.desOk, cumplimientoPct: cumplChecklist, graduacion }
}

// Todos los meses con datos (para la vista de historial/tendencias del centro).
export async function getHistorialCentro(centroId) {
  await requireCentroAccess(centroId)
  const [c] = await sql`SELECT nombre FROM centros WHERE id = ${centroId}`
  const resumen = await sql`
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
      nuevos: d?.totales?.nuevos ?? 0,
      reincorporados: d?.totales?.reincorporados ?? 0,
      retirados: d?.totales?.retirados ?? 0,
      gruposActivos: d?.totales?.gruposActivos ?? 0,
      promedio: d?.promedios?.sinK ?? null,
      royalty: d?.royalties?.totales?.totalRoyalty ?? 0,
    }
  })
  return { nombre: c?.nombre || '', resumen, estados, semanas, cuadros }
}
