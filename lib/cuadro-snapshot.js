// Cálculo del Cuadro de Negocio de un mes + su snapshot mensual congelado.
//
// El cuadro se calcula EN VIVO desde estudiantes/eventos mientras el mes está
// abierto — con la población proyectada AS-OF fin de mes desde eventos (R5,
// g1-22): ni siquiera en abierto un evento de un mes posterior reescribe el
// mes que se está viendo. Al CERRAR el mes en KPI Semanal se guarda una foto
// (cuadro_mensual) y esa foto pasa a ser la verdad histórica: un retiro
// registrado en agosto ya no altera cómo se ve julio. Vive en lib/ (no en
// actions/) porque lo usan
// tanto cuadro.js como kpi.js — dos módulos 'use server' no deben importarse
// entre sí.
import { sql, upsert } from './db'
import { promedios } from './fusiones'
import { cuadroRoyalties, cuadroControlGrupos, cuadroDeserciones, poblacionAsOfMes } from './cuadro-calc'
import {
  estudiantesConInicioAlCierre,
  iniciosClaseMes,
  retirosActivosMes,
  usaIniciosClaseOperativos,
  grupoEntraAlCuadro,
} from './inicios-clase.mjs'
import { superponerKpiAbiertos } from './kpi-semanal-service'

// Grupos del centro con coach, horarios y estudiantes (activos + baja potencial)
// embebidos: la forma que esperan lib/fusiones y lib/cuadro-calc.
export async function armarGrupos(centroId, query = sql) {
  const grupos = await query`SELECT * FROM grupos WHERE centro_id = ${centroId} ORDER BY numero`
  const coaches = await query`SELECT * FROM coaches WHERE centro_id = ${centroId}`
  const horarios = await query`
    SELECT gh.* FROM grupo_horarios gh
    JOIN grupos g ON g.id = gh.grupo_id
    WHERE g.centro_id = ${centroId}
    ORDER BY gh.dia, gh.hora_inicio
  `
  const activos = await query`
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
export async function calcularCuadro(centroId, y, m, query = sql) {
  const todos = await armarGrupos(centroId, query)
  const todosEst = await query`SELECT * FROM estudiantes WHERE centro_id = ${centroId}`
  // Los eventos de membresía y de asignación vienen COMPLETOS, de todos los
  // meses: la población as-of (g1-22) necesita el histórico entero para
  // rebobinar un estado reescrito por eventos futuros, y `cambio_grupo` es lo
  // que fija el inicio operativo de una venta colocada después.
  const todosEventos = await query`
    SELECT * FROM estudiante_eventos
    WHERE centro_id = ${centroId}
      AND ((year = ${y} AND month = ${m})
        OR tipo IN ('inscripcion', 'retiro', 'reincorporacion', 'cambio_grupo'))
    ORDER BY fecha, id
  `
  // Regla del negocio (R1, g1-1): un grupo entra al Cuadro de Negocio desde el
  // mes de su fecha de inicio de clases, EXCLUSIVAMENTE. Un grupo EN LLENADO
  // (inicio futuro) y sus niños no cuentan todavía — ni en grupos activos, ni
  // en royalties, ni en "a pagar". El grupo veterano con fecha futura se
  // corrige en los DATOS (preflight g1-1); mientras tanto lo cubre la GUARDIA
  // de runtime de grupoEntraAlCuadro (nivel 2+ con fecha futura = dato roto:
  // sigue contando, fail closed). NULL también cuenta como iniciado.
  const finMes = `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
  const iniciado = (g) => grupoEntraAlCuadro(g, finMes)
  const grupos = todos.filter(iniciado)
  const noIniciados = new Set(todos.filter((g) => !iniciado(g)).map((g) => String(g.id)))
  const visibles = todosEst.filter((e) => !e.grupo_id || !noIniciados.has(String(e.grupo_id)))
  // Dos filtros que se complementan y no se pisan:
  //  1. `estudiantesConInicioAlCierre` deja fuera a quien todavía NO empezó al
  //     cierre del mes (venta sin colocar, colocación de un mes posterior).
  //  2. Población "as of" fin de mes (R5, g1-22): en un mes del gate operativo
  //     la selección deja de mirar `estudiantes.estado` de HOY y proyecta el
  //     estado al cierre del mes desde eventos — el retiro programado que el
  //     cron ejecutó el 1-sep (evento year/month = septiembre) no borra al
  //     niño de agosto abierto. Sin eventos posteriores la proyección ES el
  //     estado actual (paridad exacta, regresión cero).
  // Pre-gate (< 202608) el modo legacy sigue intacto. La foto de un mes
  // CERRADO no pasa por aquí: se lee del snapshot.
  const usaIniciosOperativos = usaIniciosClaseOperativos(y, m)
  const estudiantes = usaIniciosOperativos
    ? poblacionAsOfMes(estudiantesConInicioAlCierre(visibles, todos, todosEventos, y, m), todosEventos, y, m)
    : visibles
  const eventos = todosEventos.filter((evento) => Number(evento.year) === Number(y) && Number(evento.month) === Number(m))
  const pedidosRaw = await query`
    SELECT * FROM pedidos_material
    WHERE centro_id = ${centroId} AND year = ${y} AND month = ${m}
    ORDER BY fecha, id
  `
  const gruposPorId = new Map(todos.map((grupo) => [String(grupo.id), grupo]))
  const pedidos = pedidosRaw.map((pedido) => ({
    ...pedido,
    grupoNumero: gruposPorId.get(String(pedido.grupo_id))?.numero || null,
  }))
  const [res] = await query`
    SELECT nuevos_activos_mes, grupos_activos FROM resumen_mes
    WHERE centro_id = ${centroId} AND year = ${y} AND month = ${m}
  `
  // (g1-16) La comparación con el KPI usa la misma superposición en vivo: en
  // mes abierto >= gate la deserción semanal sale del módulo, no de la tabla.
  let ks = await query`
    SELECT centro_id, year, month, semana, des_d1, des_d2, des_d3, des_d4, des_d5 FROM kpi_semanas
    WHERE centro_id = ${centroId} AND year = ${y} AND month = ${m}
  `
  ;({ filas: ks } = await superponerKpiAbiertos({
    filas: ks,
    centroIds: [centroId],
    desde: Number(y) * 100 + Number(m),
    hasta: Number(y) * 100 + Number(m),
    query,
  }))
  const tri = Math.ceil(m / 3)
  const [metas] = await query`SELECT gpn_min, royalty_por_nino FROM metas WHERE anio = ${y} AND trimestre = ${tri}`

  const royaltyRate = Number(metas?.royalty_por_nino) || 12
  const gpnMin = Number(metas?.gpn_min) || 8
  const iniciosDelMes = usaIniciosOperativos ? iniciosClaseMes(todosEst, todos, todosEventos, y, m) : null
  const retirosDelMes = usaIniciosOperativos ? retirosActivosMes(todosEst, todos, todosEventos, y, m) : null
  const retirosOperativos = retirosDelMes == null ? null : new Set(retirosDelMes)
  const eventosOperativos = retirosOperativos == null
    ? eventos
    : eventos.filter((evento) => evento.tipo !== 'retiro' || retirosOperativos.has(evento))
  const nuevosActivosIds = usaIniciosOperativos
    ? new Set(iniciosDelMes.map((inicio) => String(inicio.estudianteId)))
    : null
  const controlCalculado = cuadroControlGrupos(grupos, estudiantes, eventosOperativos, nuevosActivosIds)
  const deserciones = cuadroDeserciones(estudiantes, eventosOperativos, grupos)
  const totales = usaIniciosOperativos
    ? {
        ...controlCalculado.totales,
        nuevos: iniciosDelMes.length,
        reincorporados: eventos.filter((evento) => evento.tipo === 'reincorporacion').length,
        retirados: deserciones.length,
      }
    : controlCalculado.totales
  if (usaIniciosOperativos) {
    totales.mesAnterior = totales.aPagar - totales.nuevos - totales.reincorporados + totales.retirados
  }
  const controlGrupos = { ...controlCalculado, totales }
  // La deserción capturada en KPI es la suma diaria de las semanas del mes.
  const desercionKpi = ks.length
    ? ks.reduce((a, w) => a + (w.des_d1 || 0) + (w.des_d2 || 0) + (w.des_d3 || 0) + (w.des_d4 || 0) + (w.des_d5 || 0), 0)
    : null

  return {
    royalties: cuadroRoyalties(estudiantes, eventosOperativos, royaltyRate, nuevosActivosIds),
    controlGrupos,
    iniciosClase: iniciosDelMes,
    deserciones,
    totales,
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
