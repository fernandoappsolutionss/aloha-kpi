// ALERTA DE DESERCIÓN POR COACH
//
// El problema: el centro puede estar perdiendo niños y el tablero no dice POR
// DÓNDE. Este módulo responde una sola pregunta: ¿la deserción del trimestre
// está repartida o se concentra en alguien?
//
// De un retiro se llega al coach por el grupo del niño:
//   estudiante_eventos.de_grupo_id → grupos.coach_id → coaches.id
// (`de_grupo_id` es el campo poblado en los retiros; `a_grupo_id`, que es el
// que trae lib/growth/server.js:49, viene vacío en un retiro.)
//
// DOS DECISIONES QUE SOSTIENEN TODO:
//
// 1. NUMERADOR SIN GRADUADOS. `bajasReales` excluye motivo GRADUADO, misma
//    doctrina que realAttrition en lib/growth/metrics.mjs:48. Graduar a un niño
//    es el trabajo bien hecho; jamás puede contar como falta del coach.
//
// 2. SE COMPARA CONTRA EL PROPIO CENTRO, no contra un umbral de manual ni
//    contra otro centro. Mismos padres, mismo precio, misma administradora: es
//    la única comparación justa. Un centro con 15% de deserción estructural no
//    puede tener a todos sus coaches en alerta porque un número de manual diga
//    8%, y un centro sano no puede esconder un caso detrás de la media de red.
//
// TONO: esto lo lee la persona señalada. El módulo informa un dato y su brecha
// —cuántos niños, en qué periodo, contra qué—, nunca un juicio sobre ella.

import { Q_MESES, quarterMonths } from './period.js'
import { MOTIVOS_RETIRO_LABELS } from './operaciones.js'

// Causas de retiro que el aula sí controla. Mismo recorte que
// CONTROLLABLE_ATTRITION_KEYS (lib/growth/constants.mjs:12): classLoss,
// technique, schedule. Son las que convierten la alerta en algo accionable.
export const MOTIVOS_CONTROLABLES = ['PERDIDA_CLASES', 'TECNICA', 'HORARIO']

// LOS 4 CANDADOS CONTRA EL RUIDO. Los cuatro deben cumplirse para que haya
// alerta. Acusar a alguien por ruido estadístico es peor que no medir.
export const CANDADOS = {
  // 1. Piso de exposición (≈2 grupos). Con 6 niños, perder 1 da 17% y eso no
  //    dice nada de nadie. Por debajo NO se emite alerta: se dice que aún no
  //    hay base suficiente.
  expuestosMin: 15,
  // 2. Piso de eventos. Una o dos salidas nunca son una alerta.
  bajasMin: 3,
  // 3. Margen relativo: la tasa del coach debe ser al menos 1,5× la del centro.
  razonMin: 1.5,
  // 4. Margen absoluto: niños perdidos POR ENCIMA de lo que le tocaba al ritmo
  //    del centro. Es el número que se le dice a la persona ("son 5 niños de
  //    más"), inmune al porcentaje de muestra chica.
  excesoMin: 3,
  // Corte de la lista de seguimiento (no es alerta): al menos un niño por
  // encima de lo esperado. Debajo de eso es redondeo.
  seguimientoMin: 1,
}

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const red1 = (n) => Math.round(n * 10) / 10
// Números en español: 27,3 — no 27.3.
export const es1 = (n) => red1(n).toFixed(1).replace('.', ',')
const plural = (n, uno, muchos) => (Math.abs(n) === 1 ? uno : muchos)

export function etiquetaPeriodo(anio, trimestre) {
  const meses = Q_MESES[trimestre]
  return meses ? `${meses} ${anio}` : String(anio || '')
}

// ── Consulta (solo lectura) ────────────────────────────────────────────────
// Recibe el `sql` tagged-template del repo (lib/db.js) para que el módulo siga
// siendo importable sin base de datos y testeable con un doble.
//
// DENOMINADOR = niños activos hoy del coach + sus bajas del periodo + sus
// graduados del periodo. Reconstruye la población que TUVO a cargo, no la que
// le queda: si se usaran solo los activos de hoy, quien perdió gente tendría
// menor denominador y saldría castigado dos veces.
//
// ponytail: la parte "activos hoy" es una foto del presente, no del cierre del
// trimestre (techo: en un trimestre pasado el denominador incluye niños que
// entraron después, así que sobreestima la exposición y subestima la tasa —
// conservador, nunca acusa de más; salida: reconstruir la población a la fecha
// de corte con poblacionAsOfMes de lib/cuadro-calc.js cuando el histórico de
// estudiante_eventos cubra inscripción y retiro de todo el padrón).
//
// ponytail: la atribución usa grupos.coach_id ACTUAL (techo: si un grupo cambió
// de coach dentro de la ventana, sus bajas caen sobre el coach de hoy; salida:
// cuando exista historial de coach por grupo, unir por la fecha del evento).
export async function consultarDesercionPorCoach(sql, { centroId, anio, mesDesde, mesHasta }) {
  const filas = await sql`
    WITH salidas AS (
      SELECT g.coach_id,
             count(*) FILTER (WHERE e.motivo IS DISTINCT FROM 'GRADUADO')                AS bajas_reales,
             count(*) FILTER (WHERE e.motivo = 'GRADUADO')                               AS graduados,
             count(*) FILTER (WHERE e.motivo IN ('PERDIDA_CLASES','TECNICA','HORARIO'))  AS controlables,
             mode() WITHIN GROUP (ORDER BY e.motivo)
               FILTER (WHERE e.motivo IS DISTINCT FROM 'GRADUADO')                       AS motivo_top
      FROM estudiante_eventos e
      JOIN grupos g ON g.id = e.de_grupo_id
      WHERE e.centro_id = ${centroId} AND e.tipo = 'retiro'
        AND e.year = ${anio} AND e.month BETWEEN ${mesDesde} AND ${mesHasta}
        AND g.coach_id IS NOT NULL
      GROUP BY g.coach_id
    ),
    activos AS (
      SELECT g.coach_id, count(*) AS n
      FROM estudiantes s JOIN grupos g ON g.id = s.grupo_id
      WHERE s.centro_id = ${centroId} AND s.estado IN ('activo','baja_potencial') AND g.coach_id IS NOT NULL
      GROUP BY g.coach_id
    )
    SELECT c.id AS coach_id, c.nombre,
           coalesce(a.n,0)::int + coalesce(s.bajas_reales,0)::int + coalesce(s.graduados,0)::int AS expuestos,
           coalesce(s.bajas_reales,0)::int AS bajas_reales,
           coalesce(s.graduados,0)::int    AS graduados,
           coalesce(s.controlables,0)::int AS controlables,
           s.motivo_top
    FROM coaches c
    LEFT JOIN salidas s ON s.coach_id = c.id
    LEFT JOIN activos a ON a.coach_id = c.id
    WHERE c.centro_id = ${centroId} AND c.activo = true
  `
  // Retiros que NO se pueden atribuir: sin grupo de origen, con grupo sin coach
  // o con un coach dado de baja. Se reporta el número en vez de repartirlo:
  // una métrica floja es peor que decir "de esto no hay dato".
  const [huerfanos] = await sql`
    SELECT
      count(*) FILTER (WHERE e.motivo IS DISTINCT FROM 'GRADUADO')::int AS bajas_sin_coach,
      count(*)::int AS retiros_totales
    FROM estudiante_eventos e
    LEFT JOIN grupos g ON g.id = e.de_grupo_id
    LEFT JOIN coaches c ON c.id = g.coach_id AND c.activo = true
    WHERE e.centro_id = ${centroId} AND e.tipo = 'retiro'
      AND e.year = ${anio} AND e.month BETWEEN ${mesDesde} AND ${mesHasta}
      AND c.id IS NULL
  `
  return { filas, sinCoach: num(huerfanos?.bajas_sin_coach) }
}

// ── Cálculo puro (sin base de datos) ───────────────────────────────────────
// `filas`: [{ coach_id, nombre, expuestos, bajas_reales, graduados,
//             controlables, motivo_top }]
export function alertasDeCoach(filas, opciones = {}) {
  const { anio, trimestre, sinCoach = 0 } = opciones
  const periodo = opciones.periodo || etiquetaPeriodo(anio, trimestre)

  const base = (Array.isArray(filas) ? filas : []).map((f) => ({
    coachId: f.coachId ?? f.coach_id ?? null,
    nombre: String(f.nombre ?? '').trim() || 'Sin nombre',
    expuestos: num(f.expuestos),
    bajasReales: num(f.bajasReales ?? f.bajas_reales),
    graduados: num(f.graduados),
    controlables: num(f.controlables),
    motivoTop: f.motivoTop ?? f.motivo_top ?? null,
  }))

  const expuestosCentro = base.reduce((s, c) => s + c.expuestos, 0)
  const bajasCentro = base.reduce((s, c) => s + c.bajasReales, 0)
  const graduadosCentro = base.reduce((s, c) => s + c.graduados, 0)
  const huerfanas = num(sinCoach)

  // LA VARA CONTRA LA QUE SE MIDE A UNA PERSONA TIENE QUE INCLUIR TODAS LAS
  // BAJAS DEL CENTRO, no sólo las que se pudieron atribuir.
  //
  // Verificado en producción (DAVID, Q3-2026): 15 bajas reales, sólo 10 con
  // coach identificable. Con las 5 huérfanas fuera, la tasa del centro salía
  // 10/149 = 6,7% y Aljhenz Pineda (8 de 55 = 14,5%) disparaba alerta con
  // razón 2,16 y exceso +4,3. Con las huérfanas dentro la tasa real es
  // 15/154 = 9,7%, y entonces razón = 1,49 (< 1,5) y exceso = 2,6 (< 3): los
  // DOS candados de margen se caen. Su alerta era un artefacto del
  // denominador — se señalaba a una persona con una vara que dejaba fuera un
  // tercio de las bajas del centro.
  //
  // Las huérfanas entran a ambos lados (son bajas de niños que existieron), así
  // que suben la vara sin atribuírselas a nadie.
  const tasaCentro = (expuestosCentro + huerfanas) > 0
    ? (bajasCentro + huerfanas) / (expuestosCentro + huerfanas)
    : 0
  const pctCentro = red1(tasaCentro * 100)

  const coaches = base.map((c) => {
    const pct = c.expuestos > 0 ? red1((c.bajasReales / c.expuestos) * 100) : null
    const esperadas = c.expuestos * tasaCentro
    const exceso = red1(c.bajasReales - esperadas)
    const candados = {
      exposicion: c.expuestos >= CANDADOS.expuestosMin,
      eventos: c.bajasReales >= CANDADOS.bajasMin,
      margenRelativo: (bajasCentro + huerfanas) > 0 && c.bajasReales >= CANDADOS.razonMin * esperadas,
      margenAbsoluto: exceso >= CANDADOS.excesoMin,
    }
    const alerta = candados.exposicion && candados.eventos && candados.margenRelativo && candados.margenAbsoluto
    let estado = 'en_rango'
    if (!candados.exposicion) estado = 'sin_muestra'
    else if (alerta) estado = 'alerta'
    else if (exceso >= CANDADOS.seguimientoMin) estado = 'seguimiento'

    const motivoTopLabel = c.motivoTop ? (MOTIVOS_RETIRO_LABELS[c.motivoTop] || c.motivoTop) : null
    return {
      ...c,
      pct,
      pctTexto: pct == null ? '—' : `${es1(pct)}%`,
      esperadas: red1(esperadas),
      exceso,
      estado,
      candados,
      motivoTopLabel,
      ...frases({ ...c, pct, exceso, estado, motivoTopLabel, pctCentro, periodo }),
    }
  }).sort((a, b) => b.exceso - a.exceso || b.bajasReales - a.bajasReales)

  return {
    periodo,
    pctCentro,
    bajasCentro,
    graduadosCentro,
    expuestosCentro,
    sinCoach: huerfanas,
    coaches,
    alertas: coaches.filter((c) => c.estado === 'alerta'),
    seguimiento: coaches.filter((c) => c.estado === 'seguimiento'),
    enRango: coaches.filter((c) => c.estado === 'en_rango'),
    sinMuestra: coaches.filter((c) => c.estado === 'sin_muestra'),
  }
}

// La frase que va a leer la persona señalada, delante de su administradora.
// Regla: siempre el número, contra qué se compara y en qué periodo. Nunca un
// veredicto sobre la persona.
// ponytail: los textos son plantillas fijas en español (techo: no se adaptan a
// matices del centro ni al historial del coach; salida: cuando exista un
// generador de texto, sustituir la plantilla manteniendo el contrato de
// "número + brecha + periodo").
function frases({ nombre, expuestos, bajasReales, graduados, controlables, pct, exceso, estado, motivoTopLabel, pctCentro, periodo }) {
  const ninos = `${expuestos} ${plural(expuestos, 'niño', 'niños')}`
  const conGraduados = graduados > 0
    ? (graduados === 1
      ? ' No cuenta su graduado: graduarse es un logro, no una baja.'
      : ` No cuentan sus ${graduados} graduados: graduarse es un logro, no una baja.`)
    : ''

  if (estado === 'sin_muestra') {
    // Sin un solo niño en la ventana no hay "muestra corta": no hay nada que medir.
    if (expuestos === 0) {
      return {
        titular: `${nombre}: sin niños a cargo en el periodo`,
        detalle: `No tiene grupo asignado hoy ni registró retiros en ${periodo}.`,
      }
    }
    return {
      titular: `${nombre}: muestra corta · ${ninos} a cargo`,
      detalle: `Con menos de ${CANDADOS.expuestosMin} niños a cargo un solo retiro mueve el porcentaje demasiado. No se evalúa hasta tener base suficiente.${conGraduados}`,
    }
  }

  const brecha = `${es1(pct)}% frente al ${es1(pctCentro)}% del centro en ${periodo}`

  if (estado === 'alerta') {
    const deMas = Math.max(1, Math.round(exceso))
    const causa = motivoTopLabel ? ` Motivo más frecuente: ${motivoTopLabel.toLowerCase()}.` : ''
    const accionable = controlables > 0
      ? ` ${controlables} de esas ${bajasReales} salieron por causas del aula (pérdida de clases, técnica u horario): ahí está el margen para actuar.`
      : ''
    return {
      titular: `${nombre}: ${bajasReales} retiros de ${ninos} a cargo`,
      detalle: `${brecha}. Son ${deMas} ${plural(deMas, 'niño', 'niños')} por encima de lo esperado para su carga.${causa}${accionable}${conGraduados}`,
    }
  }

  if (estado === 'seguimiento') {
    return {
      titular: `${nombre}: ${bajasReales} de ${ninos}`,
      detalle: `${brecha}. Está por encima del promedio, pero dentro del margen de ruido: se sigue, no se alerta.${conGraduados}`,
    }
  }

  return {
    titular: `${nombre}: ${bajasReales} de ${ninos}`,
    detalle: `${brecha}.${conGraduados}`,
  }
}

// Ventana de meses de un trimestre (reusa lib/period.js, no la reimplementa).
export function ventanaTrimestre(trimestre) {
  const meses = quarterMonths(trimestre)
  return { mesDesde: meses[0], mesHasta: meses[meses.length - 1] }
}
