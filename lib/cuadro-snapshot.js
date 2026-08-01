// Cálculo del Cuadro de Negocio de un mes + su snapshot mensual congelado.
//
// El cuadro se calcula EN VIVO desde estudiantes/eventos mientras el mes está
// abierto. Al CERRAR el mes en KPI Semanal se guarda una foto (cuadro_mensual)
// y esa foto pasa a ser la verdad histórica: un retiro registrado en agosto ya
// no altera cómo se ve julio. Vive en lib/ (no en actions/) porque lo usan
// tanto cuadro.js como kpi.js — dos módulos 'use server' no deben importarse
// entre sí.
import { sql, upsert } from './db'
import { promedios } from './fusiones'
import { cuadroRoyalties, cuadroControlGrupos, cuadroDeserciones } from './cuadro-calc'

// Grupos del centro con coach, horarios y estudiantes (activos + baja potencial)
// embebidos: la forma que esperan lib/fusiones y lib/cuadro-calc.
export async function armarGrupos(centroId) {
  const grupos = await sql`SELECT * FROM grupos WHERE centro_id = ${centroId} ORDER BY numero`
  const coaches = await sql`SELECT * FROM coaches WHERE centro_id = ${centroId}`
  const horarios = await sql`
    SELECT gh.* FROM grupo_horarios gh
    JOIN grupos g ON g.id = gh.grupo_id
    WHERE g.centro_id = ${centroId}
    ORDER BY gh.dia, gh.hora_inicio
  `
  const activos = await sql`
    SELECT * FROM estudiantes
    WHERE centro_id = ${centroId} AND estado IN ('activo', 'baja_potencial')
  `
  const porCoach = new Map(coaches.map((c) => [String(c.id), c]))
  return grupos.map((g) => ({
    ...g,
    coach: g.coach_id == null ? null : porCoach.get(String(g.coach_id)) || null,
    horarios: horarios.filter((h) => String(h.grupo_id) === String(g.id)),
    estudiantes: activos.filter((e) => String(e.grupo_id) === String(g.id)),
  }))
}

// El cuadro completo de un mes, calculado en vivo. Devuelve exactamente lo que
// pinta la página (sin nombre del centro ni estado del mes: eso lo agrega el
// caller, y así el snapshot no congela datos que pueden renombrarse).
export async function calcularCuadro(centroId, y, m) {
  const grupos = await armarGrupos(centroId)
  const estudiantes = await sql`SELECT * FROM estudiantes WHERE centro_id = ${centroId}`
  const eventos = await sql`
    SELECT * FROM estudiante_eventos
    WHERE centro_id = ${centroId} AND year = ${y} AND month = ${m}
    ORDER BY fecha, id
  `
  const pedidos = await sql`
    SELECT * FROM pedidos_material
    WHERE centro_id = ${centroId} AND year = ${y} AND month = ${m}
    ORDER BY fecha, id
  `
  const [res] = await sql`
    SELECT nuevos_activos_mes, grupos_activos FROM resumen_mes
    WHERE centro_id = ${centroId} AND year = ${y} AND month = ${m}
  `
  const ks = await sql`
    SELECT des_d1, des_d2, des_d3, des_d4, des_d5 FROM kpi_semanas
    WHERE centro_id = ${centroId} AND year = ${y} AND month = ${m}
  `
  const tri = Math.ceil(m / 3)
  const [metas] = await sql`SELECT gpn_min, royalty_por_nino FROM metas WHERE anio = ${y} AND trimestre = ${tri}`

  const royaltyRate = Number(metas?.royalty_por_nino) || 12
  const gpnMin = Number(metas?.gpn_min) || 8
  const controlGrupos = cuadroControlGrupos(grupos, estudiantes, eventos)
  // La deserción capturada en KPI es la suma diaria de las semanas del mes.
  const desercionKpi = ks.length
    ? ks.reduce((a, w) => a + (w.des_d1 || 0) + (w.des_d2 || 0) + (w.des_d3 || 0) + (w.des_d4 || 0) + (w.des_d5 || 0), 0)
    : null

  return {
    royalties: cuadroRoyalties(estudiantes, eventos, royaltyRate),
    controlGrupos,
    deserciones: cuadroDeserciones(estudiantes, eventos, grupos),
    totales: controlGrupos.totales,
    pedidos,
    promedios: promedios(grupos, gpnMin),
    kpiComparacion: {
      nuevosKpi: res ? res.nuevos_activos_mes || 0 : null,
      desercionKpi,
      gruposActivosKpi: res ? res.grupos_activos || 0 : null,
    },
    royaltyRate,
  }
}

// Congela la foto del mes en cuadro_mensual (upsert: recerrar un mes reabierto
// reemplaza la foto anterior). Devuelve los datos congelados.
export async function guardarSnapshotCuadro(centroId, y, m) {
  const datos = await calcularCuadro(centroId, y, m)
  await upsert('cuadro_mensual', {
    centro_id: centroId, year: y, month: m,
    datos: JSON.stringify(datos),
    cerrado_at: new Date().toISOString(),
  }, ['centro_id', 'year', 'month'])
  return datos
}

// La foto congelada de un mes, o null si no existe.
export async function leerSnapshotCuadro(centroId, y, m) {
  const [row] = await sql`
    SELECT datos, cerrado_at FROM cuadro_mensual
    WHERE centro_id = ${centroId} AND year = ${y} AND month = ${m}
  `
  if (!row) return null
  return {
    datos: typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos,
    cerradoAt: row.cerrado_at,
  }
}
