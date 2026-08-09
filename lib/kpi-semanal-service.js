// KPI semanal sin manos — capa de datos compartida (R4, g1-16).
// Módulo server-only (usa sql; el repo no usa el paquete 'server-only', así
// que la regla es esta línea): lo importan loadKpiMes, Centro, Dashboard,
// Growth y el Cuadro. UN solo cálculo y UNA sola superposición para todos —
// jamás N copias del criterio (bloqueante g1-16).
//
// Contrato:
//   - calcularKpiAutoMes(centroId, y, m, query)  → resultado discriminado del
//     motor puro (lib/kpi-semanal-auto.mjs) con los eventos vivos del centro.
//   - superponerKpiAbiertos({ filas, ... })      → superpone el cálculo auto
//     sobre filas con forma de kpi_semanas para los (centro, mes) ABIERTOS
//     >= gate del rango; mes cerrado = histórico congelado, ni se calcula.
//     Cualquier error (query caída, dato roto) deja las filas MANUALES tal
//     cual: el KPI nunca se bloquea por la superposición (fallo ⇒ manual).
// Extensiones explícitas: lo importa lib/kpi-auto-server.js, que los tests
// .mjs cargan directo en Node (ESM no resuelve especificadores sin extensión).
import { sql } from './db.js'
import { retirosActivosMes } from './inicios-clase.mjs'
import {
  VENTAS_AUTO_DESDE,
  calcularKpiSemanalAuto,
  superponerSemanasAuto,
  usaKpiSemanalAuto,
} from './kpi-semanal-auto.mjs'

// Datos mínimos del cálculo por centro: estudiantes y grupos alimentan el
// filtro de retiros OPERATIVOS (retirosActivosMes, la misma vara del Cuadro);
// los eventos traen la historia GLOBAL de inscripciones (el canónico se elige
// antes de filtrar mes, g1-17) y los retiros.
async function cargarDatosCentro(centroId, query) {
  const estudiantes = await query`
    SELECT id, grupo_id, estado, fecha_inscripcion, origen_venta, crm_registration_id
    FROM estudiantes WHERE centro_id = ${centroId}
  `
  const grupos = await query`
    SELECT id, estado, fecha_inicio_clases, itinerario_clases FROM grupos WHERE centro_id = ${centroId}
  `
  // `cambio_grupo` entra porque el inicio operativo de una venta colocada
  // después lo fija su asignación (lib/inicios-clase.mjs contextoInicio).
  const eventos = await query`
    SELECT id, estudiante_id, tipo, fecha, year, month, origen, motivo, a_grupo_id
    FROM estudiante_eventos
    WHERE centro_id = ${centroId} AND tipo IN ('inscripcion', 'retiro', 'cambio_grupo')
    ORDER BY fecha, id
  `
  return { estudiantes, grupos, eventos }
}

function calcularConDatos({ estudiantes, grupos, eventos }, year, month) {
  const auto = calcularKpiSemanalAuto({
    year,
    month,
    inscripciones: eventos.filter((evento) => evento.tipo === 'inscripcion'),
    retiros: retirosActivosMes(estudiantes, grupos, eventos, year, month),
  })
  if (auto.estado !== 'auto') return auto
  // Los derivados de resumen (orig_*, cp_matriculados) viven en la ficha del
  // niño, no en el evento: se pegan AQUÍ, sobre las ventas que el motor ya
  // contó — nadie vuelve a recorrer eventos para contarlas otra vez.
  const porId = new Map(estudiantes.map((e) => [String(e.id), e]))
  auto.ventas = auto.ventas.map((evento) => {
    const est = porId.get(String(evento.estudiante_id)) || null
    return {
      ...evento,
      origen_venta: est?.origen_venta ?? null,
      crm_registration_id: est?.crm_registration_id ?? null,
    }
  })
  return auto
}

// El cálculo de UN centro y UN mes con la conexión dada (sql suelto o el
// `query` de una transacción: guardarKpiMes y cerrarMes recalculan bajo su
// propio lock mensual pasando su query).
export async function calcularKpiAutoMes(centroId, year, month, query = sql) {
  if (!usaKpiSemanalAuto(year, month)) return { estado: 'manual_pre_gate' }
  try {
    const datos = await cargarDatosCentro(centroId, query)
    return calcularConDatos(datos, Number(year), Number(month))
  } catch (e) {
    // Un error de lectura equivale a un fallo del cálculo: fallback manual
    // explícito, nunca inventar ceros (g1-20).
    console.error('[kpi-auto] no se pudo calcular el KPI del módulo:', e)
    return { estado: 'fallo', mensaje: 'No se pudieron leer los eventos del módulo.' }
  }
}

// Meses {year, month} entre dos periodos AAAAMM inclusive.
function periodosEntre(lo, hi) {
  const salida = []
  let year = Math.floor(lo / 100)
  let month = lo % 100
  while (year * 100 + month <= hi) {
    if (month >= 1 && month <= 12) salida.push({ year, month })
    month += 1
    if (month > 12) { month = 1; year += 1 }
  }
  return salida
}

// Superposición en vivo (g1-16): para cada (centro, mes) ABIERTO >= gate del
// rango, calcula el KPI auto y lo superpone sobre `filas` (forma kpi_semanas:
// deben traer centro_id/year/month/semana). Devuelve { filas, autos } donde
// autos['<centroId>:<AAAAMM>'] es el resultado discriminado (para totales de
// traslados, cp derivado o el mensaje del fallo). Mes cerrado no se toca.
export async function superponerKpiAbiertos({ filas, centroIds = [], desde, hasta, query = sql }) {
  const lo = Math.max(Number(desde), VENTAS_AUTO_DESDE)
  const hi = Number(hasta)
  const salida = { filas, autos: {} }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo > hi) return salida
  const ids = [...new Set((centroIds || []).map(Number).filter(Number.isFinite))]
  if (!ids.length) return salida

  try {
    const estados = await query`
      SELECT centro_id, year, month, estado FROM mes_kpi
      WHERE (year * 100 + month) BETWEEN ${lo} AND ${hi}
    `
    const estadoDe = new Map(estados.map((fila) =>
      [`${Number(fila.centro_id)}:${Number(fila.year) * 100 + Number(fila.month)}`, fila.estado]
    ))
    const periodos = periodosEntre(lo, hi)
    let resultado = filas

    for (const centroId of ids) {
      // Sin fila en mes_kpi el mes está abierto (así nace); solo 'cerrado' es
      // histórico congelado — 'cerrando' sigue viéndose vivo, como el Cuadro.
      const abiertos = periodos.filter(({ year, month }) =>
        estadoDe.get(`${centroId}:${year * 100 + month}`) !== 'cerrado'
      )
      if (!abiertos.length) continue
      const datos = await cargarDatosCentro(centroId, query)
      for (const { year, month } of abiertos) {
        const auto = calcularConDatos(datos, year, month)
        salida.autos[`${centroId}:${year * 100 + month}`] = auto
        resultado = superponerSemanasAuto(resultado, { centroId, year, month, auto })
      }
    }
    salida.filas = resultado
    return salida
  } catch (e) {
    console.error('[kpi-auto] superposición falló; se mantienen los valores manuales:', e)
    return { filas, autos: {} }
  }
}
