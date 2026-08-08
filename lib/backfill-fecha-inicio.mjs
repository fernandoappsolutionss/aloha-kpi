// Backfill D7 v3 de grupos.fecha_inicio_clases — lógica PURA, sin BD.
//
// `itinerario_clases.fecha_inicio` es el inicio del NIVEL vigente, NO el
// inicio operativo del grupo. Copiarla a ciegas a `fecha_inicio_clases`
// reclasifica a los nuevos del mes (reproducción de Sol: nuevos de agosto
// 0→1). La regla corregida (gate 2, defecto g2-1) garantiza CERO
// reclasificación:
//
//   - Grupo SIN niños en su universo → fecha = it_inicio (grupo nuevo:
//     semántica exacta de "entra al cuadro cuando arranca su nivel").
//   - Grupo CON niños → fecha = LEAST(it_inicio, min(fecha_inscripcion del
//     universo)). Como la fecha asignada queda ≤ la inscripción de TODO niño
//     del universo, max(inscripción, fecha del grupo) — fechaInicioOperativa,
//     lib/inicios-clase.mjs:18-24 — no se mueve para nadie.
//
// El UNIVERSO reproduce exactamente la atribución de iniciosClase
// (lib/inicios-clase.mjs:40-43): todo estudiante cuya PRIMERA inscripción
// efectiva apunta a este grupo — a_grupo_id del primer evento 'inscripcion',
// con fallback al grupo_id actual si no hay evento — SIN filtrar por estado
// (un retirado del mes también cuenta como inicio si su retiro no es previo,
// así que excluirlo del universo sí podría reclasificarlo).
//
// El script (scripts/backfill-fecha-inicio-2026-08-08.mjs) pone el SQL y el
// CAS por fila; aquí vive la decisión por grupo, el comparable reducido del
// cuadro y la comparación before/after — todo probado en espejo en
// test/backfill-fecha-inicio.test.mjs.

import { grupoYaDioClases, iniciosClaseMes } from './inicios-clase.mjs'

// Una fecha de la BD llega como Date (driver de Neon) o como string ISO.
// SIEMPRE normalizar a 'AAAA-MM-DD' antes de comparar (lección de fechaIso10,
// lib/operaciones.js; local aquí para que el módulo siga siendo puro).
const iso10 = (v) => {
  if (!v) return null
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)
}

// Copias locales de lib/operaciones.js:5-8 (ese módulo es .js de Next y no se
// puede importar desde node puro). Si cambian allá, cambian aquí.
const ITINERARIOS = ['TINY', 'KIDS', 'KINDER']
const NIVEL_MAX = { TINY: 10, KIDS: 8, KINDER: 3 }

// Último día del mes en iso10 (mismo cálculo que calcularCuadro,
// lib/cuadro-snapshot.js:48).
export function finDeMes(year, month) {
  const y = Number(year)
  const m = Number(month)
  return `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
}

// itinerario_clases llega como objeto (JSONB) o, defensivamente, como string
// (mismo criterio que lib/llenado.mjs). Devuelve el inicio del nivel vigente.
export function itInicioDe(grupo) {
  let it = grupo?.itinerario_clases
  if (it == null) return null
  if (typeof it === 'string') {
    try { it = JSON.parse(it) } catch { return null }
  }
  return iso10(it?.fecha_inicio)
}

// Espejo de compareEvents (lib/inicios-clase.mjs:12-16): fecha iso10 y luego
// id, para que "primer evento" signifique lo mismo aquí y allá.
const compareEventos = (a, b) => {
  const porFecha = String(iso10(a?.fecha) || '').localeCompare(String(iso10(b?.fecha) || ''))
  if (porFecha !== 0) return porFecha
  return Number(a?.id || 0) - Number(b?.id || 0)
}

// Universo de cada grupo: estudiantes cuya PRIMERA inscripción efectiva apunta
// a él (espejo de lib/inicios-clase.mjs:40-43, incluidos retirados y sin
// grupo actual). Devuelve Map(String(grupoId) → [{ estudianteId, fecha }]);
// `fecha` es la de la inscripción efectiva (evento.fecha, con fallback a
// estudiante.fecha_inscripcion) y puede ser null si no existe ninguna.
export function universosPorGrupo(estudiantes, eventos) {
  const eventosPorEstudiante = new Map()
  for (const evento of eventos || []) {
    if (evento.tipo !== 'inscripcion') continue
    const key = String(evento.estudiante_id)
    const actuales = eventosPorEstudiante.get(key) || []
    actuales.push(evento)
    eventosPorEstudiante.set(key, actuales)
  }

  const universos = new Map()
  for (const estudiante of estudiantes || []) {
    const inscripciones = eventosPorEstudiante.get(String(estudiante.id)) || []
    const primera = inscripciones.sort(compareEventos)[0] || null
    const grupoId = primera?.a_grupo_id ?? estudiante.grupo_id ?? null
    if (grupoId == null) continue
    const key = String(grupoId)
    const filas = universos.get(key) || []
    filas.push({
      estudianteId: estudiante.id,
      fecha: iso10(primera?.fecha) || iso10(estudiante.fecha_inscripcion),
    })
    universos.set(key, filas)
  }
  return universos
}

// La decisión D7 v3 por grupo. Devuelve { fecha, regla, minInscripcion }:
//   - 'sin_ninos'          → fecha = it_inicio (universo vacío).
//   - 'con_ninos'          → fecha = LEAST(it_inicio, min inscripción).
//   - 'sin_it_inicio'      → EXCLUIDO: el JSON no trae fecha_inicio usable.
//   - 'universo_sin_fecha' → EXCLUIDO: algún estudiante del universo no tiene
//     fecha de inscripción; hoy no cuenta como inicio (fechaInicioOperativa
//     devuelve null y se salta), pero CUALQUIER fecha que asignemos al grupo
//     lo haría aparecer como nuevo — decide un humano, no el backfill.
// Regla de Fernando 2026-08-08: TODO grupo lleva la fecha de inicio de clases
// de su itinerario; el que no tiene itinerario queda vacio hasta que se le cree.
// La cota conservadora que esta funcion aplicaba antes (bajar la fecha hasta la
// primera inscripcion para no reclasificar niños) ya no hace falta: quien evita
// esa reclasificacion es grupoYaDioClases (lib/inicios-clase.mjs), que reconoce
// que un grupo de nivel 2+ ya dio su primera clase y no vuelve a estrenar a sus
// niños en cada nivel.
export function decidirFechaInicio({ itInicio }) {
  const inicio = iso10(itInicio)
  if (!inicio) return { fecha: null, regla: 'sin_it_inicio', minInscripcion: null }
  return { fecha: inicio, regla: 'del_itinerario', minInscripcion: null }
}

// Copia de grupos con las fechas del manifiesto aplicadas (simulación del
// "después" para la verificación; no muta los originales). Solo pisa filas
// que siguen en NULL — la misma condición del CAS real.
export function patchFechaInicio(grupos, decisionesPorGrupo) {
  return (grupos || []).map((g) => {
    const decision = decisionesPorGrupo.get(String(g.id))
    if (!decision?.fecha || g.fecha_inicio_clases != null) return g
    return { ...g, fecha_inicio_clases: decision.fecha }
  })
}

const paga = (e) => e.estado === 'activo' || e.estado === 'baja_potencial'

// Comparable REDUCIDO del cuadro de un mes: exactamente las cantidades que
// `fecha_inicio_clases` puede mover, reproduciendo el filtro de calcularCuadro
// (lib/cuadro-snapshot.js:45-52) y los totales de lib/cuadro-calc.js:
//   - gruposIds: grupos iniciados (entran al cuadro ese mes).
//   - ninosIds:  estudiantes contados (los de grupos NO iniciados quedan fuera).
//   - nuevosIds: inicios de clase del mes vía iniciosClaseMes (sobre los
//     conjuntos COMPLETOS, igual que calcularCuadro:79).
//   - royalties: totales de cuadroRoyalties (solo itinerario/nivel válidos).
//   - aPagar:    total de cuadroControlGrupos (activos+baja_potencial con
//     grupo iniciado o sin grupo — los "sueltos" pagan).
export function comparableMes({ grupos, estudiantes, eventos, year, month, royaltyRate }) {
  const finMes = finDeMes(year, month)
  // Misma regla que lib/cuadro-snapshot.js: un grupo de nivel 2+ ya dio su
  // primera clase y nunca sale del cuadro por su fecha de nivel.
  const iniciado = (g) =>
    !g.fecha_inicio_clases || grupoYaDioClases(g) || iso10(g.fecha_inicio_clases) <= finMes
  const iniciados = (grupos || []).filter(iniciado)
  const idsIniciados = new Set(iniciados.map((g) => String(g.id)))
  const noIniciados = new Set((grupos || []).filter((g) => !iniciado(g)).map((g) => String(g.id)))
  const contados = (estudiantes || []).filter((e) => !e.grupo_id || !noIniciados.has(String(e.grupo_id)))

  const inicios = iniciosClaseMes(estudiantes, grupos, eventos, year, month)
  const nuevosIds = new Set(inicios.map((fila) => String(fila.estudianteId)))

  const activos = contados.filter(paga)
  // cuadroRoyalties (lib/cuadro-calc.js:30-51) solo suma filas con itinerario
  // y nivel dentro del catálogo; un nivel fuera de rango no paga en esa hoja.
  const conRoyalty = activos.filter((e) =>
    ITINERARIOS.includes(e.itinerario) && Number(e.nivel) >= 1 && Number(e.nivel) <= (NIVEL_MAX[e.itinerario] || 0)
  )
  const rate = Number(royaltyRate) || 0
  // aPagar (lib/cuadro-calc.js:63-120): una fila por grupo del cuadro más la
  // fila SIN ASIGNAR; un niño cuyo grupo no está en el cuadro no paga aquí.
  const aPagar = activos.filter((e) => e.grupo_id == null || idsIniciados.has(String(e.grupo_id))).length

  return {
    gruposIds: [...idsIniciados].sort((a, b) => Number(a) - Number(b)),
    ninosIds: contados.map((e) => String(e.id)).sort((a, b) => Number(a) - Number(b)),
    // Con qué grupo contaba cada niño del mes: es lo que decide si un grupo
    // que sale del cuadro estaba realmente vacío (variación aprobada) o se
    // llevó gente por delante (diferencia que aborta).
    ninosPorGrupo: contados
      .filter((e) => e.grupo_id != null)
      .map((e) => ({ ninoId: String(e.id), grupoId: String(e.grupo_id) })),
    nuevosIds: [...nuevosIds].sort((a, b) => Number(a) - Number(b)),
    royalties: {
      totalNinos: conRoyalty.length,
      totalNuevos: conRoyalty.filter((e) => nuevosIds.has(String(e.id))).length,
      totalRoyalty: conRoyalty.length * rate,
    },
    aPagar,
  }
}

const diffDeSets = (campo, antes, despues, diferencias) => {
  const setAntes = new Set(antes)
  const setDespues = new Set(despues)
  for (const id of antes) if (!setDespues.has(id)) diferencias.push({ campo, tipo: 'sale', id })
  for (const id of despues) if (!setAntes.has(id)) diferencias.push({ campo, tipo: 'entra', id })
}

// Compara el comparable de un mes antes vs después del backfill.
// TODO debe ser idéntico — cualquier diferencia aborta — EXCEPTO la variación
// documentada y aprobada: un grupo SIN NIÑOS en el mes con it_inicio futuro
// sale del cuadro de los meses previos a su fecha (semántica "entra al cuadro
// ese mes"). Esa variación se lista APARTE como cambio intencional y no cuenta
// como diferencia. Si el grupo SÍ tenía niños, su salida es diferencia y aborta.
// `decisiones` es Map(String(grupoId) → decisión).
export function compararComparables(antes, despues, { decisiones, finMes }) {
  const variaciones = []
  const diferencias = []
  // Vacío se decide con los DATOS del mes comparado, no con la regla con la que
  // se eligió la fecha: si ningún niño del mes pertenecía al grupo, está vacío.
  const conNinos = new Set((antes.ninosPorGrupo || []).map((par) => String(par.grupoId)))
  const esGrupoVacio = (id) => !conNinos.has(String(id))

  const setDespues = new Set(despues.gruposIds)
  const setAntes = new Set(antes.gruposIds)
  for (const id of antes.gruposIds) {
    if (setDespues.has(id)) continue
    const decision = decisiones?.get(String(id))
    if (esGrupoVacio(id) && decision?.fecha && decision.fecha > finMes) {
      variaciones.push({ tipo: 'grupo_vacio_sale_del_mes', grupoId: id, fechaAsignada: decision.fecha })
    } else {
      diferencias.push({ campo: 'gruposIds', tipo: 'sale', id })
    }
  }
  for (const id of despues.gruposIds) {
    if (!setAntes.has(id)) diferencias.push({ campo: 'gruposIds', tipo: 'entra', id })
  }

  diffDeSets('ninosIds', antes.ninosIds, despues.ninosIds, diferencias)
  diffDeSets('nuevosIds', antes.nuevosIds, despues.nuevosIds, diferencias)

  for (const campo of ['totalNinos', 'totalNuevos', 'totalRoyalty']) {
    if (antes.royalties[campo] !== despues.royalties[campo]) {
      diferencias.push({ campo: `royalties.${campo}`, antes: antes.royalties[campo], despues: despues.royalties[campo] })
    }
  }
  if (antes.aPagar !== despues.aPagar) {
    diferencias.push({ campo: 'aPagar', antes: antes.aPagar, despues: despues.aPagar })
  }

  return { variaciones, diferencias }
}

// Estado de una entrada del manifiesto contra la fila viva (mismo vocabulario
// que lib/kpi-history-repair.mjs:31-36): 'aplicada' si la columna ya tiene la
// fecha decidida, 'pendiente' si sigue NULL y la decisión recalculada en vivo
// coincide con la del manifiesto, 'conflicto' ante cualquier deriva (fecha
// distinta, it_inicio movido, decisión que ya no reproduce la auditada).
export function estadoCandidato(filaViva, entrada, decisionViva) {
  if (!filaViva) return 'conflicto'
  const fechaActual = iso10(filaViva.fecha_inicio_clases)
  if (fechaActual) return fechaActual === entrada.fecha ? 'aplicada' : 'conflicto'
  if (itInicioDe(filaViva) !== entrada.itInicio) return 'conflicto'
  if (decisionViva?.fecha !== entrada.fecha || decisionViva?.regla !== entrada.regla) return 'conflicto'
  return 'pendiente'
}
