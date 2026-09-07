'use server'
import { randomBytes } from 'crypto'
import { parseSalonCapacity } from '../../lib/salon-capacidad.mjs'
import { sql, withTransaction } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { getCurrentPeriod } from '../../lib/period'
import { ITINERARIOS, NIVEL_MAX, aperturaMinima, hoyISO, fechaIso10 } from '../../lib/operaciones'
import { analyze, underMeta, promedios, proximasFusiones } from '../../lib/fusiones'
import { validarSesion, chocanConBuffer, aMinutos, KINDER_INICIO, KINDER_FIN } from '../../lib/inventario'
import { NINOS_POR_GRUPO_MODELO, horarioTextoDe } from '../../lib/modelo'
import { encolarSyncCrm, encolarOutboxEn } from '../../lib/llenado-service'
import { fechaLimiteNuevos } from '../../lib/llenado.mjs'
import { generarItinerario, normalizarExcepciones, regenerarSufijo, versionesDe } from '../../lib/itinerario'
import { bloquearMesesEditables } from '../../lib/mes-kpi'
import { periodosAfectadosCambioInicioGrupo } from '../../lib/inicios-clase.mjs'
import { enriquecerNinos, crearMemoPlanes, calendarioVersionadoDe, generarItinerarioVersionado } from '../../lib/plan-nino.mjs'
import {
  grupoIniciado,
  clavesNoPermitidasPostInicio,
  fingerprintPlanGrupo,
  cohorteDeTransicion,
  reAnclaEnDestino,
  errorExcepcionesPasado,
} from '../../lib/plan-grupo.mjs'

// El país del centro define sus fechas patrias; el nombre es solo respaldo
// para centros creados antes de la columna pais.
const paisDe = (c) => (c?.pais === 'VE' || (!c?.pais && /naranjos/i.test(c?.nombre || '')) ? 'VE' : 'PA')

// itinerario_clases llega como objeto (JSONB) o, defensivamente, como string.
const itinerarioVigenteDe = (v) => {
  if (v == null) return null
  if (typeof v === 'string') {
    try { return JSON.parse(v) } catch { return null }
  }
  return v
}

// Genera y guarda el itinerario de clases del nivel (manual ALOHA Panamá):
// necesita fecha de inicio + días de clase. Los Naranjos opera con el
// reglamento de ALOHA Venezuela → su calendario no salta feriados panameños.
async function regenerarItinerarioClases(centroId, grupoId, { fechaInicio, horarios, nivel, excepciones }, query = sql) {
  if (!fechaInicio || !horarios?.length) return null
  const [c] = await query`SELECT nombre, pais FROM centros WHERE id = ${centroId}`
  const pais = paisDe(c)
  const it = generarItinerario({
    fechaInicio,
    dias: horarios.map((h) => h.dia),
    nivel: nivel || 1,
    pais,
    excepciones,
  })
  if (!it) return null
  // El sello de generación vive SOLO aquí, al persistir la referencia del
  // grupo: el motor puro de lib/itinerario.js es determinista (g1-13).
  const referencia = { ...it, generado_at: new Date().toISOString() }
  await query`
    UPDATE grupos SET itinerario_clases = ${JSON.stringify(referencia)}, updated_at = ${new Date().toISOString()}
    WHERE id = ${grupoId}
  `
  // (g1-15) Toda mutación de la referencia del aula (horario/fecha/nivel/
  // excepciones) encola el sync al CRM EN LA MISMA transacción; el push real
  // lo hace el consumidor del outbox. Un grupo recién creado aún no tiene
  // eventos vinculados: encola 0 filas y no pasa nada.
  await encolarSyncCrm([grupoId], 'itinerario', query)
  return referencia
}

const HORA_RE = /^\d{2}:\d{2}$/
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/
const intOr = (v, d = 0) => {
  const n = parseInt(v)
  return Number.isFinite(n) ? n : d
}
const ym = (fecha) => {
  const [y, m] = String(fecha).split('-').map(Number)
  return { year: y, month: m }
}

// Grupos del centro con coach, horarios y niños (activos + baja potencial)
// embebidos, en la forma que esperan lib/fusiones y lib/cuadro-calc. Cada niño
// viaja ENRIQUECIDO con su plan derivado (g1-13: una sola pasada por carga,
// memo compartido): operaciones, fusiones y el bucle de pares leen
// `e.plan.{estado, semana, cierre}` sin volver a derivar nada.
async function cargarGrupos(centroId) {
  const [c] = await sql`SELECT nombre, pais FROM centros WHERE id = ${centroId}`
  const grupos = await sql`SELECT * FROM grupos WHERE centro_id = ${centroId}`
  const coaches = await sql`SELECT * FROM coaches WHERE centro_id = ${centroId}`
  const horarios = await sql`
    SELECT h.* FROM grupo_horarios h JOIN grupos g ON g.id = h.grupo_id
    WHERE g.centro_id = ${centroId} ORDER BY h.dia, h.hora_inicio
  `
  const kids = await sql`
    SELECT * FROM estudiantes
    WHERE centro_id = ${centroId} AND estado IN ('activo', 'baja_potencial')
    ORDER BY nombre
  `
  const coachPorId = new Map(coaches.map((co) => [String(co.id), co]))
  const armados = grupos
    .map((g) => ({
      ...g,
      coach: (g.coach_id && coachPorId.get(String(g.coach_id))) || null,
      horarios: horarios.filter((h) => String(h.grupo_id) === String(g.id)),
      estudiantes: kids.filter((e) => String(e.grupo_id) === String(g.id)),
    }))
    .sort((a, b) => String(a.numero).localeCompare(String(b.numero), 'es', { numeric: true }))
  const memo = crearMemoPlanes()
  const hoy = hoyISO()
  const pais = paisDe(c)
  return armados.map((g) => ({
    ...g,
    estudiantes: enriquecerNinos(g.estudiantes, g, { hoy, pais, memo }),
  }))
}

// Meta de niños por grupo (gpn_min) y cupo máximo del trimestre actual.
async function metasOperativas() {
  const { year, quarter } = getCurrentPeriod()
  const [m] = await sql`SELECT gpn_min, cupo_max_grupo FROM metas WHERE anio = ${year} AND trimestre = ${quarter}`
  return { gpnMin: Number(m?.gpn_min) || 8, cupoMax: Number(m?.cupo_max_grupo) || 15 }
}

// Valida y normaliza las filas de horario del formulario. Devuelve
// { horarios: [{ dia, hora_inicio, hora_fin, salon_id }] } o { error }.
// Aplica las reglas del inventario ALOHA (ventana 12:30–20:30, sesiones de
// 1 h o 2 h) y bloquea choques de salón sin el buffer entre clases.
// `grupoId` excluye al propio grupo al validar choques (edición).
async function validarHorarios(centroId, horarios, grupoId = null) {
  const salones = await sql`SELECT id, nombre FROM salones WHERE centro_id = ${centroId}`
  const salonPorId = new Map(salones.map((s) => [String(s.id), s.nombre]))
  const out = []
  for (const h of horarios || []) {
    const dia = intOr(h?.dia)
    if (dia < 1 || dia > 7) return { error: 'Horario inválido: el día va de 1 (lunes) a 7 (domingo).' }
    if (!HORA_RE.test(h?.hora_inicio || '') || !HORA_RE.test(h?.hora_fin || '')) return { error: 'Horario inválido: las horas van en formato HH:MM.' }
    const invalida = validarSesion(dia, h.hora_inicio, h.hora_fin)
    if (invalida) return { error: invalida }
    const salonId = h.salon_id || null
    if (salonId && !salonPorId.has(String(salonId))) return { error: 'El salón no pertenece a este centro.' }
    out.push({ dia, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin, salon_id: salonId })
  }
  // El programa ALOHA son 2 horas semanales por grupo: 2 h un día, o 1 h en
  // dos días distintos. (Un grupo puede quedar sin horario mientras se define.)
  if (out.length) {
    const totalMin = out.reduce((a, h) => a + (aMinutos(h.hora_fin) - aMinutos(h.hora_inicio)), 0)
    if (totalMin !== 120) {
      return { error: `El programa son 2 horas semanales por grupo (1 bloque de 2 h o 2 bloques de 1 h). Este horario suma ${totalMin / 60} h.` }
    }
    if (out.length === 2 && out[0].dia === out[1].dia) {
      return { error: 'Las dos sesiones de 1 hora deben ir en días distintos.' }
    }
  }
  // Choques entre las propias filas del formulario (mismo salón).
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      const a = out[i]; const b = out[j]
      if (a.salon_id && a.dia === b.dia && String(a.salon_id) === String(b.salon_id) &&
          chocanConBuffer(aMinutos(a.hora_inicio), aMinutos(a.hora_fin), aMinutos(b.hora_inicio), aMinutos(b.hora_fin))) {
        return { error: `Dos sesiones del mismo grupo chocan en ${salonPorId.get(String(a.salon_id))} el mismo día (recuerda los 15 min entre clases).` }
      }
    }
  }
  // Choques contra los demás grupos activos del centro. OJO: la variante con
  // `${grupoId} IS NULL OR ...` revienta en Postgres (42P18: no puede inferir
  // el tipo de un parámetro que solo aparece en IS NULL) — por eso se bifurca.
  const ocupadas = grupoId
    ? await sql`
        SELECT h.dia, h.hora_inicio, h.hora_fin, h.salon_id, g.numero
        FROM grupo_horarios h JOIN grupos g ON g.id = h.grupo_id
        WHERE g.centro_id = ${centroId} AND g.estado = 'activo' AND h.salon_id IS NOT NULL
          AND g.id <> ${grupoId}
      `
    : await sql`
        SELECT h.dia, h.hora_inicio, h.hora_fin, h.salon_id, g.numero
        FROM grupo_horarios h JOIN grupos g ON g.id = h.grupo_id
        WHERE g.centro_id = ${centroId} AND g.estado = 'activo' AND h.salon_id IS NOT NULL
      `
  for (const n of out) {
    if (!n.salon_id) continue
    for (const o of ocupadas) {
      if (o.dia !== n.dia || String(o.salon_id) !== String(n.salon_id)) continue
      if (chocanConBuffer(aMinutos(n.hora_inicio), aMinutos(n.hora_fin), aMinutos(o.hora_inicio), aMinutos(o.hora_fin))) {
        return { error: `Choca con el Grupo ${o.numero} en ${salonPorId.get(String(n.salon_id))} (${o.hora_inicio}–${o.hora_fin}); deja al menos 15 min entre clases.` }
      }
    }
  }
  // Choques contra la CLASE DE PRUEBA: ese salón está tomado por padres, Tiny
  // o Kids. Se valida en el servidor porque al modal de grupo se puede llegar
  // sin pasar por el calendario.
  const reservadas = await sql`
    SELECT r.dia, r.hora_inicio, r.hora_fin, rs.salon_id, rs.rol
    FROM centro_reservas r JOIN centro_reserva_salones rs ON rs.reserva_id = r.id
    WHERE r.centro_id = ${centroId} AND r.activo = TRUE
  `
  for (const n of out) {
    if (!n.salon_id) continue
    for (const o of reservadas) {
      if (o.dia !== n.dia || String(o.salon_id) !== String(n.salon_id)) continue
      if (chocanConBuffer(aMinutos(n.hora_inicio), aMinutos(n.hora_fin), aMinutos(o.hora_inicio), aMinutos(o.hora_fin))) {
        return { error: `Choca con la clase de prueba (${o.hora_inicio}–${o.hora_fin}) en ${salonPorId.get(String(n.salon_id))}: ese salón atiende a ${o.rol}. Deja al menos 15 min entre clases.` }
      }
    }
  }
  return { horarios: out }
}

// Regla del negocio: los Kinder solo se abren entre semana de 2:00 a 3:30 pm
// (zona Kinder). Sábados y horarios calientes quedan para Tiny y Kids.
function validarZonaKinder(itinerario, horarios) {
  if (itinerario !== 'KINDER') return null
  for (const h of horarios || []) {
    const ini = aMinutos(h.hora_inicio)
    const fin = aMinutos(h.hora_fin)
    if (h.dia >= 6 || ini < KINDER_INICIO || fin > KINDER_FIN) {
      return 'Los Kinder solo se abren entre semana en la zona Kinder (2:00–3:30 pm); los sábados y los horarios calientes quedan reservados para Tiny y Kids.'
    }
  }
  return null
}

// Carga única de la página de Grupos y Fusiones.
export async function loadOperaciones(centroId) {
  await requireCentroAccess(centroId)
  const [c] = await sql`SELECT nombre FROM centros WHERE id = ${centroId}`
  const grupos = await cargarGrupos(centroId)
  const coaches = await sql`SELECT * FROM coaches WHERE centro_id = ${centroId} ORDER BY nombre`
  const salones = await sql`SELECT * FROM salones WHERE centro_id = ${centroId} ORDER BY nombre`
  const retirados = await sql`
    SELECT * FROM estudiantes WHERE centro_id = ${centroId} AND estado = 'retirado'
    ORDER BY fecha_retiro DESC NULLS LAST, updated_at DESC LIMIT 30
  `
  // Niños sin grupo asignado (activos + baja potencial: siguen asistiendo).
  const sinGrupo = await sql`
    SELECT * FROM estudiantes
    WHERE centro_id = ${centroId} AND grupo_id IS NULL AND estado IN ('activo', 'baja_potencial')
    ORDER BY nombre
  `
  const metas = await metasOperativas()
  // Clase de prueba: la sala reservada. Viaja aparte de `grupos` para que la
  // tabla de grupos, las fusiones y el Cuadro de Negocio no la vean; el
  // calendario la mezcla como pseudo-grupo al pintar (lib/reservas).
  const rs = await sql`
    SELECT id, tipo, dia, hora_inicio, hora_fin, activo, notas
    FROM centro_reservas WHERE centro_id = ${centroId} AND activo = TRUE ORDER BY dia, hora_inicio
  `
  const rsSal = rs.length
    ? await sql`SELECT reserva_id, salon_id, rol, coach_id FROM centro_reserva_salones WHERE reserva_id = ANY(${rs.map((r) => r.id)})`
    : []
  const reservas = rs.map((r) => ({ ...r, salones: rsSal.filter((x) => x.reserva_id === r.id) }))
  // (R5) Asistencia PRESENTE del mes en curso para el botón único de retiro:
  // UNA query para todo el centro, no N por niño. Presente cuenta; justificada
  // y ausente no. La UI solo decide con esto qué botón mostrar ("Retirar" vs
  // "Retirar el próximo mes"); la verdad final la re-verifica el server con el
  // EXISTS dentro de la transacción del retiro (g1-23).
  const hoy = hoyISO()
  const inicioMes = `${hoy.slice(0, 7)}-01`
  const asis = await sql`
    SELECT a.estudiante_id, COUNT(*)::int AS presentes, MAX(a.fecha) AS ultima
    FROM asistencias a JOIN estudiantes e ON e.id = a.estudiante_id
    WHERE e.centro_id = ${centroId} AND a.estado = 'presente'
      AND a.fecha >= ${inicioMes}::date AND a.fecha < (${inicioMes}::date + interval '1 month')
    GROUP BY a.estudiante_id
  `
  const asistenciaMes = {}
  for (const a of asis) asistenciaMes[String(a.estudiante_id)] = { presentes: a.presentes, ultima: fechaIso10(a.ultima) }
  return { nombre: c?.nombre || '', grupos, coaches, salones, retirados, sinGrupo, metas, reservas, asistenciaMes }
}

export async function crearGrupo(centroId, data) {
  await requireCentroAccess(centroId)
  const numero = String(data?.numero || '').trim()
  if (!numero) return { error: 'El número de grupo es requerido.' }
  const itinerario = data?.itinerario || 'TINY'
  if (!ITINERARIOS.includes(itinerario)) return { error: 'Itinerario inválido.' }
  const [dup] = await sql`SELECT id FROM grupos WHERE centro_id = ${centroId} AND numero = ${numero}`
  if (dup) return { error: `Ya existe el grupo ${numero}` }
  const coachId = data?.coach_id || null
  if (coachId) {
    const [co] = await sql`SELECT id FROM coaches WHERE id = ${coachId} AND centro_id = ${centroId}`
    if (!co) return { error: 'El coach no pertenece a este centro.' }
  }
  // (R1) Una sola fecha: fecha_apertura MURIÓ — no se acepta ni se escribe
  // (created_at es la historia de publicación; la columna queda congelada).
  // (g1-2) La fecha de inicio de clases es OBLIGATORIA para todo grupo nuevo,
  // incluidos KINDER y online: un grupo activo sin fecha ya no nace.
  const fechaInicio = data?.fecha_inicio_clases || null
  if (!fechaInicio) return { error: 'La fecha de inicio de clases es requerida para abrir el grupo (también KINDER y online).' }
  if (!FECHA_RE.test(fechaInicio)) return { error: 'Fecha de inicio de clases inválida (AAAA-MM-DD).' }
  const periodoInicio = ym(fechaInicio)
  const inscripcionAbierta = data?.inscripcion_abierta === undefined ? true : !!data.inscripcion_abierta
  const v = await validarHorarios(centroId, data?.horarios)
  if (v.error) return { error: v.error }
  const zk = validarZonaKinder(itinerario, v.horarios)
  if (zk) return { error: zk }

  const now = new Date().toISOString()
  const resultado = await withTransaction(async (query) => {
    const errorMes = await bloquearMesesEditables(query, centroId, [periodoInicio])
    if (errorMes) return { error: errorMes }
    const [duplicado] = await query`
      SELECT id FROM grupos WHERE centro_id = ${centroId} AND numero = ${numero}
    `
    if (duplicado) return { error: `Ya existe el grupo ${numero}` }
    const [g] = await query`
      INSERT INTO grupos (centro_id, numero, itinerario, es_online, coach_id, estado, fecha_inicio_clases, inscripcion_abierta, notas, updated_at)
      VALUES (${centroId}, ${numero}, ${itinerario}, ${!!data?.es_online}, ${coachId}, 'activo', ${fechaInicio}, ${inscripcionAbierta}, ${data?.notas?.trim() || null}, ${now})
      RETURNING id
    `
    for (const h of v.horarios) {
      await query`
        INSERT INTO grupo_horarios (grupo_id, dia, hora_inicio, hora_fin, salon_id)
        VALUES (${g.id}, ${h.dia}, ${h.hora_inicio}, ${h.hora_fin}, ${h.salon_id})
      `
    }
    // El itinerario arranca con el INICIO DE CLASES, nunca con la publicación
    // (regla de Fernando 2026-08-08): la fecha ya es obligatoria (g1-2), así
    // que el primer plan nace aquí siempre que haya horario. Un grupo sin
    // horario conserva su fecha pero queda `sin_plan` para los consumidores:
    // jamás se inventa horario (regenerarItinerarioClases devuelve null).
    await regenerarItinerarioClases(centroId, g.id, {
      fechaInicio,
      horarios: v.horarios,
      nivel: intOr(data?.nivel, 1),
    }, query)
    return { ok: true, grupoId: g.id }
  })
  if (resultado.error) return resultado
  // Aviso del manual: apertura mínima 8 TINY / 10 KIDS en nivel 1, 6 en niveles superiores.
  let warn
  if (data?.ninos_iniciales !== undefined && data?.ninos_iniciales !== null && data?.ninos_iniciales !== '') {
    const minimo = aperturaMinima(itinerario, intOr(data.nivel, 1))
    const n = intOr(data.ninos_iniciales)
    if (n < minimo) warn = `Apertura con ${n} niños, por debajo del mínimo del manual (${minimo}). El grupo queda bajo responsabilidad del centro en niveles superiores.`
  }
  return warn ? { ...resultado, warn } : resultado
}

export async function actualizarGrupo(centroId, grupoId, data) {
  await requireCentroAccess(centroId)
  const [g] = await sql`SELECT * FROM grupos WHERE id = ${grupoId} AND centro_id = ${centroId}`
  if (!g) return { error: 'El grupo no pertenece a este centro.' }

  const numero = data?.numero !== undefined ? String(data.numero).trim() : g.numero
  if (!numero) return { error: 'El número de grupo es requerido.' }
  if (numero !== g.numero) {
    const [dup] = await sql`SELECT id FROM grupos WHERE centro_id = ${centroId} AND numero = ${numero} AND id <> ${grupoId}`
    if (dup) return { error: `Ya existe el grupo ${numero}` }
  }
  const itinerario = data?.itinerario !== undefined ? data.itinerario : g.itinerario
  if (!ITINERARIOS.includes(itinerario)) return { error: 'Itinerario inválido.' }
  const coachId = data?.coach_id !== undefined ? data.coach_id || null : g.coach_id
  if (data?.coach_id) {
    const [co] = await sql`SELECT id FROM coaches WHERE id = ${data.coach_id} AND centro_id = ${centroId}`
    if (!co) return { error: 'El coach no pertenece a este centro.' }
  }
  const esOnline = data?.es_online !== undefined ? !!data.es_online : g.es_online
  // (R1) fecha_apertura MURIÓ: no se acepta ni se escribe. Si un payload viejo
  // la trae, se ignora — la columna queda congelada, sin escrituras nuevas
  // (created_at es la historia de publicación).
  if (data?.fecha_inicio_clases && !FECHA_RE.test(data.fecha_inicio_clases)) return { error: 'Fecha de inicio de clases inválida (AAAA-MM-DD).' }
  // Contrato del payload (gate Sol, defecto 7 — carrera del modal): campo
  // AUSENTE = NO TOCAR. El modal viejo reenviaba SIEMPRE inscripcion_abierta y
  // fecha_inicio_clases y podía revertir un cierre de palanca concurrente o
  // pisar una fecha ajustada en paralelo. Por eso:
  // - inscripcion_abierta ya NO se acepta ni se escribe aquí: la palanca solo
  //   la mueve setInscripcionAbierta (con CAS).
  // - fecha_inicio_clases solo se escribe si el payload la trae (el cliente
  //   manda el campo únicamente cuando el usuario lo editó); además, dentro de
  //   la transacción se relee el grupo con FOR UPDATE y se aborta si la fecha
  //   cambió mientras el modal estaba abierto (PR #81).
  const inicioEditado = data?.fecha_inicio_clases !== undefined
  // (g1-2) Pre-inicio la fecha se CAMBIA, nunca se BORRA; post-inicio ni se
  // toca (la corta la allowlist). Un payload que intente vaciarla muere aquí.
  if (inicioEditado && !data.fecha_inicio_clases) {
    return { error: 'La fecha de inicio de clases no se puede borrar: cámbiala si hace falta, pero todo grupo la necesita (R1).' }
  }
  const fechaInicio = inicioEditado ? data.fecha_inicio_clases : fechaIso10(g.fecha_inicio_clases)
  const inicioCambio = fechaIso10(fechaInicio) !== fechaIso10(g.fecha_inicio_clases)
  const notas = data?.notas !== undefined ? data.notas?.trim() || null : g.notas

  let horarios = null
  if (Array.isArray(data?.horarios)) {
    const v = await validarHorarios(centroId, data.horarios, grupoId)
    if (v.error) return { error: v.error }
    const zk = validarZonaKinder(itinerario, v.horarios)
    if (zk) return { error: zk }
    horarios = v.horarios
  }

  const now = new Date().toISOString()
  const resultado = await withTransaction(async (query) => {
    const [grupoBloqueado] = await query`
      SELECT * FROM grupos
      WHERE id = ${grupoId} AND centro_id = ${centroId}
      FOR UPDATE
    `
    if (!grupoBloqueado) return { error: 'El grupo no pertenece a este centro.' }
    if (fechaIso10(grupoBloqueado.fecha_inicio_clases) !== fechaIso10(g.fecha_inicio_clases)) {
      return { error: 'La fecha de inicio cambió mientras editabas. Recarga el grupo antes de continuar.' }
    }
    // (g1-5) El candado se decide con hoy Panamá RECALCULADO tras el lock,
    // sobre la fila bloqueada: una petición que esperó el lock cruzando
    // medianoche ya cuenta como post-inicio (la UI solo anticipa). Fecha NULL
    // legacy = INICIADO (fail closed, R1): nunca abre la edición completa.
    const hoyPanama = hoyISO()
    const iniciado = grupoIniciado(grupoBloqueado.fecha_inicio_clases, hoyPanama)
    const itVigente = itinerarioVigenteDe(grupoBloqueado.itinerario_clases)

    if (iniciado) {
      // (g1-4) ALLOWLIST ESTRICTA post-inicio: SOLO horarios y coach_id — ni
      // notas (post-inicio las notas van en el panel, no en este modal).
      // Cualquier otra clave PRESENTE en el payload se rechaza con error
      // legible, traiga el valor que traiga: nada se adivina.
      // ÚNICA excepción (g1-2, reparación legacy): un grupo activo con fecha
      // NULL cuenta como iniciado (fail closed) pero necesita un camino para
      // FIJARLE su fecha real — sin él quedaría ineditable para siempre
      // (regresión: antes del remodelado actualizarGrupo sí la fijaba). Solo
      // aplica con la fecha actual en NULL, solo acepta fecha PASADA o de hoy
      // (una futura sacaría al veterano del Cuadro, g1-1) y protege los meses
      // que el inicio efectivo de sus niños pueda mover.
      const reparaFechaNull = grupoBloqueado.fecha_inicio_clases == null && inicioEditado
      const extras = clavesNoPermitidasPostInicio(data)
        .filter((k) => !(reparaFechaNull && k === 'fecha_inicio_clases'))
      if (extras.length) {
        return { error: `El grupo ya inició clases: solo se pueden cambiar horario y coach. Quita del cambio: ${extras.join(', ')}.` }
      }
      if (reparaFechaNull) {
        if (fechaIso10(fechaInicio) > hoyPanama) {
          return { error: 'El grupo ya opera: su fecha de inicio de clases solo puede registrarse en el pasado (o hoy). Una fecha futura lo sacaría del Cuadro de Negocio.' }
        }
        const estudiantes = await query`
          SELECT id, grupo_id, fecha_inscripcion FROM estudiantes
          WHERE centro_id = ${centroId}
        `
        const eventos = await query`
          SELECT id, estudiante_id, tipo, fecha, a_grupo_id
          FROM estudiante_eventos
          WHERE centro_id = ${centroId} AND tipo = 'inscripcion'
          ORDER BY fecha, id
        `
        const periodos = periodosAfectadosCambioInicioGrupo({
          grupo: grupoBloqueado,
          fechaNueva: fechaInicio,
          estudiantes,
          eventos,
          fechaReferencia: hoyPanama,
        })
        const errorMes = await bloquearMesesEditables(query, centroId, periodos)
        if (errorMes) return { error: errorMes }
        await query`UPDATE grupos SET fecha_inicio_clases = ${fechaInicio}, updated_at = ${now} WHERE id = ${grupoId}`
        // La referencia del aula NO se regenera por fijar una fecha
        // administrativa: si el grupo tiene plan, su itinerario ya manda; si
        // no lo tiene, el plan nace al editar el horario (nunca se reescribe
        // un calendario en producción desde aquí).
      }
      // Rama SQL SEPARADA (g1-4): no menciona numero/itinerario/online/fecha/
      // notas — esta rama no puede tocar un campo estructural ni por accidente.
      if (data?.coach_id !== undefined) {
        await query`UPDATE grupos SET coach_id = ${coachId}, updated_at = ${now} WHERE id = ${grupoId}`
      } else {
        await query`UPDATE grupos SET updated_at = ${now} WHERE id = ${grupoId}`
      }
      if (horarios) {
        await query`DELETE FROM grupo_horarios WHERE grupo_id = ${grupoId}`
        for (const h of horarios) {
          await query`
            INSERT INTO grupo_horarios (grupo_id, dia, hora_inicio, hora_fin, salon_id)
            VALUES (${grupoId}, ${h.dia}, ${h.hora_inicio}, ${h.hora_fin}, ${h.salon_id})
          `
        }
        // R2b (g1-7): POST-INICIO el horario nuevo entra en vigor MAÑANA
        // (Panamá) y solo se regenera el sufijo futuro del calendario
        // versionado — toda clase ya dada o con asistencia registrada se
        // conserva. La verdad del plan vigente es la FILA BLOQUEADA
        // (itinerario_clases.fecha_inicio/nivel/excepciones del FOR UPDATE):
        // fecha_inicio_clases SOLO inicializa el primer plan del grupo, nunca
        // re-ancla niveles posteriores.
        if (itVigente?.semanas?.length) {
          const [yh, mh, dh] = hoyPanama.split('-').map(Number)
          const desde = new Date(Date.UTC(yh, mh - 1, dh + 1)).toISOString().slice(0, 10)
          // Set protegido: toda fecha con asistencia registrada del grupo se
          // conserva aunque caiga en el futuro (marcas por adelantado).
          const asis = await query`SELECT DISTINCT fecha FROM asistencias WHERE grupo_id = ${grupoId}`
          const it = regenerarSufijo(itVigente, {
            desde,
            diasNuevos: horarios.map((h) => h.dia),
            excepciones: itVigente.excepciones || [],
            fechasConAsistencia: new Set(asis.map((a) => fechaIso10(a.fecha))),
          })
          if (it) {
            // Mismo contrato que regenerarItinerarioClases: el motor es puro y
            // el sello de generación se agrega SOLO al persistir (g1-13).
            const referencia = { ...it, generado_at: new Date().toISOString() }
            await query`
              UPDATE grupos SET itinerario_clases = ${JSON.stringify(referencia)}, updated_at = ${now}
              WHERE id = ${grupoId}
            `
            // (g1-15) La referencia del aula cambió: el CRM se entera EN la
            // misma transacción, nunca con push inline.
            await encolarSyncCrm([grupoId], 'itinerario', query)
          }
        } else if (grupoBloqueado.fecha_inicio_clases) {
          // Iniciado con fecha pero aún sin plan: fecha_inicio_clases
          // inicializa el PRIMER plan (regeneración completa).
          await regenerarItinerarioClases(centroId, grupoId, {
            fechaInicio: fechaIso10(grupoBloqueado.fecha_inicio_clases),
            horarios,
            nivel: itVigente?.nivel || 1,
            excepciones: itVigente?.excepciones || [],
          }, query)
        }
        // Legacy NULL sin plan: no hay referencia que regenerar y nada se
        // inventa (g1-2) — el cambio de horario queda solo en grupo_horarios.
      }
      return { ok: true }
    }

    // ── PRE-INICIO: edición completa. Sin fecha_apertura (R1, columna
    // congelada) y sin inscripcion_abierta (solo la mueve setInscripcionAbierta
    // con CAS); la fecha no editada tampoco se escribe: el CASE deja la
    // columna intacta cuando el payload no trajo el campo. ──
    if (inicioCambio) {
      const estudiantes = await query`
        SELECT id, grupo_id, fecha_inscripcion FROM estudiantes
        WHERE centro_id = ${centroId}
      `
      const eventos = await query`
        SELECT id, estudiante_id, tipo, fecha, a_grupo_id
        FROM estudiante_eventos
        WHERE centro_id = ${centroId} AND tipo = 'inscripcion'
        ORDER BY fecha, id
      `
      const periodos = periodosAfectadosCambioInicioGrupo({
        grupo: grupoBloqueado,
        fechaNueva: fechaInicio,
        estudiantes,
        eventos,
        fechaReferencia: hoyPanama,
      })
      const errorMes = await bloquearMesesEditables(query, centroId, periodos)
      if (errorMes) return { error: errorMes }
    }
    await query`
      UPDATE grupos SET numero = ${numero}, itinerario = ${itinerario}, es_online = ${esOnline},
        coach_id = ${coachId},
        fecha_inicio_clases = CASE WHEN ${inicioEditado}::boolean
          THEN ${inicioEditado ? fechaInicio : null}::date ELSE fecha_inicio_clases END,
        notas = ${notas}, updated_at = ${now}
      WHERE id = ${grupoId}
    `
    if (horarios) {
      await query`DELETE FROM grupo_horarios WHERE grupo_id = ${grupoId}`
      for (const h of horarios) {
        await query`
          INSERT INTO grupo_horarios (grupo_id, dia, hora_inicio, hora_fin, salon_id)
          VALUES (${grupoId}, ${h.dia}, ${h.hora_inicio}, ${h.hora_fin}, ${h.salon_id})
        `
      }
    }
    // R2b (g1-7): PRE-INICIO la regeneración es completa, como siempre (el
    // primer plan se ancla en fecha_inicio_clases); nivel y excepciones
    // vigentes se conservan de la fila bloqueada.
    if ((horarios || inicioCambio) && fechaInicio) {
      const hs = horarios || (await query`SELECT dia FROM grupo_horarios WHERE grupo_id = ${grupoId}`)
      await regenerarItinerarioClases(centroId, grupoId, {
        fechaInicio,
        horarios: hs,
        nivel: itVigente?.nivel || 1,
        excepciones: itVigente?.excepciones || [],
      }, query)
    }
    return { ok: true }
  })
  // Sin push inline al CRM: este formulario ya no toca la palanca, así que no
  // hay cupos que empujar aquí (la palanca encola en setInscripcionAbierta).
  return resultado
}

// (g1-10) TRANSICIÓN DE COHORTE: ajustar el itinerario del grupo dejó de ser
// un bypass del candado — es la transición de plan de R3. La referencia del
// aula cambia (nivel, fecha de inicio del nivel, excepciones) y con ella se
// mueve SOLO la cohorte: los niños activos/baja_potencial cuyo (itinerario,
// nivel, fecha_inicio_nivel) coincide EXACTAMENTE con la referencia ANTERIOR;
// el niño adelantado, atrasado o con ancla propia queda intacto. El cliente
// manda `fingerprint` del plan que VIO (fingerprintPlanGrupo — CAS optimista):
// si la referencia cambió en otra pestaña, se aborta sin efectos. La plantilla
// de semanas es la base de franquicia y no se toca aquí.
export async function ajustarItinerarioGrupo(centroId, grupoId, data) {
  await requireCentroAccess(centroId)
  const [g] = await sql`SELECT * FROM grupos WHERE id = ${grupoId} AND centro_id = ${centroId}`
  if (!g) return { error: 'El grupo no pertenece a este centro.' }

  const nivel = intOr(data?.nivel, g.itinerario_clases?.nivel || 1)
  const topeNivel = NIVEL_MAX[g.itinerario] || 10
  if (nivel < 1 || nivel > topeNivel) return { error: `El nivel de ${g.itinerario} va de 1 a ${topeNivel}.` }

  const fechaInicio = String(data?.fecha_inicio || '').slice(0, 10)
  if (!FECHA_RE.test(fechaInicio)) return { error: 'La fecha de inicio del nivel es requerida (AAAA-MM-DD).' }
  const excepciones = normalizarExcepciones(data?.excepciones)
  if (data?.fingerprint === undefined) {
    return { error: 'Falta el fingerprint del plan que estás editando: recarga el grupo e intenta de nuevo.' }
  }

  return await withTransaction(async (query) => {
    // ORDEN DE LOCKS grupos → mes_kpi → estudiantes (PR #81): el mismo de
    // actualizarGrupo y del alta — tomados siempre en este orden no hay
    // deadlock entre ajustar el plan e inscribir/retirar.
    const [grupoBloqueado] = await query`
      SELECT * FROM grupos
      WHERE id = ${grupoId} AND centro_id = ${centroId}
      FOR UPDATE
    `
    if (!grupoBloqueado) return { error: 'El grupo no pertenece a este centro.' }
    if (fechaIso10(grupoBloqueado.fecha_inicio_clases) !== fechaIso10(g.fecha_inicio_clases)) {
      return { error: 'La fecha de inicio cambió mientras editabas. Recarga el grupo antes de continuar.' }
    }
    // CAS del plan sobre la FILA BLOQUEADA: el fingerprint que vio el cliente
    // debe coincidir con la referencia vigente (g1-10).
    const referenciaAnterior = itinerarioVigenteDe(grupoBloqueado.itinerario_clases)
    if (fingerprintPlanGrupo(referenciaAnterior) !== data.fingerprint) {
      return { error: 'El plan del grupo cambió mientras editabas (otra pestaña u otro usuario). Recarga el grupo antes de continuar.' }
    }
    const horarios = await query`SELECT dia FROM grupo_horarios WHERE grupo_id = ${grupoId}`
    if (!horarios.length) return { error: 'El grupo no tiene horario registrado: sin días de clase no hay itinerario.' }

    // (g1-5, mismo patrón) hoy Panamá RECALCULADO tras el lock decide si la
    // transición es VIGENTE (fecha <= hoy: la cohorte se mueve ya) o FUTURA
    // (queda pendiente: nivel y royalties no cambian anticipadamente).
    const hoyPanama = hoyISO()
    const vigente = fechaInicio <= hoyPanama
    const cambiaCohorte =
      nivel !== (Number(referenciaAnterior?.nivel) || null) ||
      fechaInicio !== fechaIso10(referenciaAnterior?.fecha_inicio)

    if (vigente && cambiaCohorte) {
      // Los eventos de la cohorte caen en el mes de HOY: se serializa contra
      // cerrarMes antes de tocar niños (mes cerrado = intocable).
      const errorMes = await bloquearMesesEditables(query, centroId, [ym(hoyPanama)])
      if (errorMes) return { error: errorMes }
    }
    // Lock de los niños del grupo (cohorte y no-cohorte: el filtro exacto se
    // decide sobre filas congeladas, no sobre una foto vieja).
    const ninos = await query`
      SELECT id, itinerario, nivel, fecha_inicio_nivel, estado FROM estudiantes
      WHERE grupo_id = ${grupoId} AND centro_id = ${centroId}
        AND estado IN ('activo', 'baja_potencial')
      ORDER BY id
      FOR UPDATE
    `
    const cohorte = cohorteDeTransicion(referenciaAnterior, grupoBloqueado.itinerario, ninos)

    // (g2-1) La fecha del nivel vive dentro del itinerario y aquí ya NO se copia
    // a grupos.fecha_inicio_clases: itinerario.fecha_inicio es el inicio del
    // NIVEL vigente y la columna es el inicio operativo del GRUPO (la que
    // determina cuándo cada niño se vuelve activo) — mezclarlas reclasificaba
    // como "nuevos" del mes a niños viejos en el Cuadro de Negocio.

    if (!referenciaAnterior) {
      // Grupo SIN plan: nace la PRIMERA referencia del aula (no hay transición
      // que programar ni cohorte que mover — mismo camino del primer plan de
      // crearGrupo). El CAS de arriba garantiza que el cliente vio 'sin_plan'.
      const it = await regenerarItinerarioClases(
        centroId, grupoId, { fechaInicio, horarios, nivel, excepciones }, query,
      )
      if (!it) return { error: 'No se pudo generar el itinerario con esos datos.' }
      return { ok: true, itinerario: it, ninosActualizados: 0 }
    }

    if (!cambiaCohorte) {
      // Solo cambiaron EXCEPCIONES (mismo nivel, misma ancla). La referencia
      // NO se re-tira con generarItinerario plano: eso resetearía versiones[]
      // a los días ACTUALES y reescribiría el pasado del calendario (un grupo
      // que cambió de día a mitad de nivel perdería sus clases viejas con
      // asistencia — contrato R2b/g1-7). Se regenera con el GENERADOR
      // VERSIONADO (g1-13) sobre el calendario vigente: el tramo ya vivido se
      // reproduce idéntico y las excepciones nuevas solo tocan de hoy en
      // adelante (validación g1-7/g1-23 sobre las marcas del grupo).
      const asis = await query`SELECT DISTINCT fecha FROM asistencias WHERE grupo_id = ${grupoId}`
      const errorExc = errorExcepcionesPasado({
        referencia: referenciaAnterior,
        excepciones,
        hoy: hoyPanama,
        fechasConAsistencia: new Set(asis.map((a) => fechaIso10(a.fecha))),
      })
      if (errorExc) return { error: errorExc }
      const [c] = await query`SELECT nombre, pais FROM centros WHERE id = ${centroId}`
      const it = generarItinerarioVersionado({
        fechaInicio: fechaIso10(referenciaAnterior.fecha_inicio),
        calendarioVersionado: versionesDe(referenciaAnterior),
        nivel: Number(referenciaAnterior.nivel) || nivel,
        pais: paisDe(c),
        excepciones,
      })
      if (!it) return { error: 'No se pudo generar el itinerario con esos datos.' }
      // El sello de generación se agrega SOLO al persistir (g1-13); una
      // transición futura pendiente colgada de la referencia se conserva.
      const referencia = {
        ...it,
        ...(referenciaAnterior.transicion_pendiente
          ? { transicion_pendiente: referenciaAnterior.transicion_pendiente }
          : {}),
        generado_at: new Date().toISOString(),
      }
      await query`
        UPDATE grupos SET itinerario_clases = ${JSON.stringify(referencia)}, updated_at = ${new Date().toISOString()}
        WHERE id = ${grupoId}
      `
      // (g1-15) La referencia del aula cambió: el CRM se entera EN la misma
      // transacción, nunca con push inline.
      await encolarSyncCrm([grupoId], 'itinerario', query)
      return { ok: true, itinerario: referencia, ninosActualizados: 0 }
    }
    if (!vigente) {
      // TRANSICIÓN FUTURA (g1-10) → SOLO la fila de transición pendiente
      // IDEMPOTENTE colgada de la referencia (una sola por grupo: reintentar
      // el mismo ajuste la reescribe igual). La referencia VIGENTE del aula NO
      // se toca anticipadamente: hasta aplica_desde, el calendario que ven el
      // coach y marcarAsistencia sigue siendo el actual (persistir aquí la
      // referencia futura dejaba al aula sin sus clases de HOY). Nivel y
      // royalties de los niños tampoco cambian; el aplicador consume la fila
      // cuando llegue la fecha (fase R5 del rollout) usando la cohorte aquí
      // congelada.
      const pendiente = {
        aplica_desde: fechaInicio,
        nivel,
        ancla: fechaInicio,
        cohorte: {
          itinerario: grupoBloqueado.itinerario,
          nivel: Number(referenciaAnterior?.nivel) || null,
          fecha_inicio_nivel: fechaIso10(referenciaAnterior?.fecha_inicio),
        },
      }
      await query`
        UPDATE grupos
        SET itinerario_clases = itinerario_clases || ${JSON.stringify({ transicion_pendiente: pendiente })}::jsonb,
          updated_at = ${new Date().toISOString()}
        WHERE id = ${grupoId}
      `
      return { ok: true, itinerario: referenciaAnterior, transicionPendiente: pendiente, ninosActualizados: 0 }
    }
    // TRANSICIÓN VIGENTE: la referencia nueva del nivel se persiste y encola
    // CRM EN la transacción (g1-15) — plan nuevo anclado en fechaInicio — y la
    // cohorte se mueve YA.
    const it = await regenerarItinerarioClases(
      centroId,
      grupoId,
      { fechaInicio, horarios, nivel, excepciones },
      query,
    )
    if (!it) return { error: 'No se pudo generar el itinerario con esos datos.' }
    // La cohorte se mueve YA — nivel + ancla + evento por
    // niño, todo en la misma transacción; los demás niños quedan intactos.
    const { year, month } = ym(hoyPanama)
    const now = new Date().toISOString()
    for (const n of cohorte) {
      await query`
        UPDATE estudiantes SET nivel = ${nivel}, fecha_inicio_nivel = ${fechaInicio}, updated_at = ${now}
        WHERE id = ${n.id}
      `
      const detalle = {
        origen: 'transicion_cohorte',
        ancla_antes: fechaIso10(n.fecha_inicio_nivel),
        ancla_despues: fechaInicio,
      }
      await query`
        INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, de_nivel, a_nivel, detalle)
        VALUES (${n.id}, ${centroId}, 'cambio_nivel', ${year}, ${month}, ${hoyPanama}, ${Number(n.nivel)}, ${nivel}, ${JSON.stringify(detalle)})
      `
    }
    return { ok: true, itinerario: it, ninosActualizados: cohorte.length }
  })
}

// Link del coach: token estable por grupo para la lista de asistencia
// (/coach/<token>, sin sesión). Se genera la primera vez que se pide.
export async function linkCoach(centroId, grupoId) {
  await requireCentroAccess(centroId)
  const [g] = await sql`SELECT id, coach_token FROM grupos WHERE id = ${grupoId} AND centro_id = ${centroId}`
  if (!g) return { error: 'El grupo no pertenece a este centro.' }
  let token = g.coach_token
  if (!token) {
    token = randomBytes(18).toString('base64url')
    await sql`UPDATE grupos SET coach_token = ${token}, updated_at = ${new Date().toISOString()} WHERE id = ${grupoId}`
  }
  return { ok: true, path: `/coach/${token}` }
}

// ── MATRIZ DE COMANDOS POST-INICIO (g1-6) ───────────────────────────────────
// Con el grupo iniciado, la ÚNICA puerta estructural es actualizarGrupo y su
// allowlist (horarios + coach, g1-4; más la reparación puntual del legacy con
// fecha NULL: fijarle su fecha real PASADA una sola vez, g1-2). Estos
// comandos de operación/lifecycle
// siguen PERMITIDOS post-inicio, cada uno sujeto a sus invariantes propias y
// SIN capacidad de tocar campos estructurales (numero, itinerario, es_online,
// fecha_inicio_clases, notas):
//   - setInscripcionAbierta → solo `inscripcion_abierta` (palanca, CAS).
//   - cerrarGrupo → solo `estado`/`fecha_cierre` (+ desvincular clases de
//     prueba y outbox).
//   - reabrirGrupo → solo `estado`/`fecha_cierre`/`fusionado_en`, y EXIGE
//     fecha de inicio presente (g1-2).
//   - aplicarFusion → mueve niños (grupo_id + re-anclaje g1-9) y marca el
//     origen `fusionado`; jamás edita campos del destino.
//   - extenderVentanaLlenado → solo `llenado_extendido_hasta`.
//   - ajustarItinerarioGrupo → dejó de ser bypass: es la transición de plan de
//     R3 (cohorte exacta + fingerprint CAS, g1-10); solo `itinerario_clases` y
//     la cohorte de niños.
// Si un comando nuevo necesita tocar otra columna de `grupos`, NO entra en
// esta matriz: pasa por actualizarGrupo y su candado.

// Palanca manual de inscripciones con CAS (gate Sol, defecto 7): el UPDATE
// exige el estado que el usuario VIO (`esperado`) — dos pestañas moviendo la
// palanca a la vez ya no se pisan en silencio: la que llega tarde recibe error
// y recarga. Cerrada = no entra nadie (ni inscripción, ni reincorporación, ni
// cambio de grupo, ni fusión hacia él). El CRM se entera por el outbox (ya NO
// pushCuposAlCrm inline): solo se encola si el CAS ganó, y el consumidor del
// cron empuja el estado vigente. COALESCE: en filas pre-migración NULL cuenta
// como abierta (misma convención `!== false` del cliente).
export async function setInscripcionAbierta(centroId, grupoId, deseado, esperado) {
  await requireCentroAccess(centroId)
  const r = await sql`
    UPDATE grupos SET inscripcion_abierta = ${!!deseado}, updated_at = ${new Date().toISOString()}
    WHERE id = ${grupoId} AND centro_id = ${centroId} AND estado = 'activo'
      AND COALESCE(inscripcion_abierta, TRUE) = ${!!esperado}
    RETURNING id
  `
  if (!r.length) {
    const [g] = await sql`SELECT estado, inscripcion_abierta FROM grupos WHERE id = ${grupoId} AND centro_id = ${centroId}`
    if (!g) return { error: 'El grupo no pertenece a este centro.' }
    if (g.estado !== 'activo') return { error: 'El grupo no está activo.' }
    return { error: 'La palanca cambió en otra pestaña o sesión: recarga para ver el estado actual.', abierta: g.inscripcion_abierta !== false }
  }
  await encolarSyncCrm([grupoId], 'palanca')
  return { ok: true, abierta: !!deseado }
}

// Compatibilidad con la UI vieja (se actualiza en la fase Superficie): lee el
// estado actual y delega en el CAS de setInscripcionAbierta — el toggle "a
// ciegas" que podía revertir un cierre concurrente desaparece.
export async function toggleInscripcionGrupo(centroId, grupoId) {
  await requireCentroAccess(centroId)
  const [g] = await sql`SELECT id, inscripcion_abierta FROM grupos WHERE id = ${grupoId} AND centro_id = ${centroId}`
  if (!g) return { error: 'El grupo no pertenece a este centro.' }
  const actual = g.inscripcion_abierta !== false
  return await setInscripcionAbierta(centroId, grupoId, !actual, actual)
}

// Cierre manual (manual: un grupo en 0 niños se cierra para no afectar la
// rentabilidad). Transaccional (g2-3 / g2-5) sobre withTransaction: la
// verificación de 0 niños, el cierre, la desvinculación de las clases de prueba
// y el encolado clear_group van en la MISMA transacción SERIALIZABLE. El FOR
// UPDATE sobre el grupo serializa contra la palanca y contra el alta (que
// también bloquea la fila), y SERIALIZABLE cubre al niño que llegue por otra
// vía entre el conteo y el commit. Los crm_event_id se capturan ANTES de
// desvincular, así el consumidor del outbox nunca pierde a quién limpiarle
// aloha_group aunque el vínculo local ya no exista (reemplaza al
// desvincularGrupoEnEventos best-effort inline).
export async function cerrarGrupo(centroId, grupoId) {
  await requireCentroAccess(centroId)
  const [g] = await sql`SELECT id FROM grupos WHERE id = ${grupoId} AND centro_id = ${centroId}`
  if (!g) return { error: 'El grupo no pertenece a este centro.' }
  const now = new Date().toISOString()
  const hoy = hoyISO()
  return await withTransaction(async (query) => {
    const [grupo] = await query`
      SELECT id FROM grupos WHERE id = ${grupoId} AND centro_id = ${centroId} FOR UPDATE
    `
    if (!grupo) return { error: 'El grupo no pertenece a este centro.' }
    const [{ n }] = await query`
      SELECT COUNT(*)::int AS n FROM estudiantes
      WHERE grupo_id = ${grupoId} AND estado IN ('activo', 'baja_potencial')
    `
    if (Number(n) > 0) return { error: `El grupo tiene ${n} niños activos` }
    await query`
      UPDATE grupos SET estado = 'cerrado', fecha_cierre = ${hoy}, updated_at = ${now}
      WHERE id = ${grupoId}
    `
    // (g2-5) Capturar ANTES de desvincular: después del UPDATE ya no hay forma
    // de saber a qué eventos del CRM había que limpiarles el grupo.
    const vinculados = await query`
      SELECT crm_event_id, grupo_id FROM centro_eventos WHERE grupo_id = ${grupoId} FOR UPDATE
    `
    await query`UPDATE centro_eventos SET grupo_id = NULL WHERE grupo_id = ${grupoId}`
    await encolarOutboxEn(query, vinculados, { op: 'clear_group', motivo: 'cierre', clave: now })
    return { ok: true }
  })
}

// (g1-2) Reabrir EXIGE fecha de inicio presente: un grupo activo sin fecha ya
// no puede existir (R1, fail closed). El legacy NULL se trata como iniciado en
// el resto del código, pero aquí se bloquea la reapertura hasta fijarla.
export async function reabrirGrupo(centroId, grupoId) {
  await requireCentroAccess(centroId)
  const r = await sql`
    UPDATE grupos SET estado = 'activo', fecha_cierre = NULL, fusionado_en = NULL, updated_at = ${new Date().toISOString()}
    WHERE id = ${grupoId} AND centro_id = ${centroId} AND fecha_inicio_clases IS NOT NULL
    RETURNING id
  `
  if (!r.length) {
    const [g] = await sql`SELECT fecha_inicio_clases FROM grupos WHERE id = ${grupoId} AND centro_id = ${centroId}`
    if (!g) return { error: 'El grupo no pertenece a este centro.' }
    return { error: 'El grupo no tiene fecha de inicio de clases: todo grupo activo la necesita (R1). Fíjala antes de reabrirlo.' }
  }
  return { ok: true }
}

// Mayor número de grupo del centro + 1, para prellenar el formulario de apertura.
export async function siguienteNumero(centroId) {
  await requireCentroAccess(centroId)
  const rows = await sql`SELECT numero FROM grupos WHERE centro_id = ${centroId}`
  let max = 0
  for (const r of rows) {
    const n = parseInt(String(r.numero).replace(/[^0-9]/g, ''), 10)
    if (Number.isFinite(n) && n > max) max = n
  }
  return max + 1
}

// Action ligera para selects de otras páginas (eventos → Inscribir, grupo por
// aperturar). Además de id/numero/itinerario devuelve horarioTexto (am/pm),
// cupos frente al modelo ("quedan X de 10"), el nivel del itinerario vigente y
// la fecha límite de niños nuevos (para que el selector de eventos inicialice
// nivel/itinerario desde el grupo y ordene por cierre de ventana) — campos
// agregados, sin romper consumidores.
export async function listarGruposActivos(centroId) {
  await requireCentroAccess(centroId)
  const rows = await sql`
    SELECT g.id, g.numero, g.itinerario, g.inscripcion_abierta, g.fecha_inicio_clases,
      g.itinerario_clases, g.llenado_extendido_hasta, g.estado,
      COUNT(e.id) FILTER (WHERE e.estado IN ('activo', 'baja_potencial'))::int AS ninos
    FROM grupos g LEFT JOIN estudiantes e ON e.grupo_id = g.id
    WHERE g.centro_id = ${centroId} AND g.estado = 'activo'
    GROUP BY g.id
  `
  const horarios = await sql`
    SELECT h.grupo_id, h.dia, h.hora_inicio, h.hora_fin
    FROM grupo_horarios h JOIN grupos g ON g.id = h.grupo_id
    WHERE g.centro_id = ${centroId} AND g.estado = 'activo'
    ORDER BY h.dia, h.hora_inicio
  `
  return rows
    .map((g) => {
      const limite = fechaLimiteNuevos(g)
      return {
        id: g.id,
        numero: g.numero,
        itinerario: g.itinerario,
        inscripcionAbierta: g.inscripcion_abierta !== false,
        fechaInicioClases: fechaIso10(g.fecha_inicio_clases),
        // Nivel VIGENTE del itinerario del grupo (sin itinerario = nivel 1).
        nivel: Number(g.itinerario_clases?.nivel) || 1,
        // Fecha límite de niños nuevos derivada (incluye llenado_extendido_hasta);
        // null = exento, sin itinerario válido O cerrado por nivel avanzado.
        fechaLimiteNuevos: limite.fechaLimite,
        // La RAZÓN viaja junto a la fecha: sin ella, un `null` de
        // 'nivel_avanzado' (grupo del nivel 2 en adelante, cerrado a nuevos)
        // se leía en el selector como "exento" y el vendedor escogía un grupo
        // que el server rechaza al guardar.
        razonLimiteNuevos: limite.razon,
        horarioTexto: horarioTextoDe(horarios.filter((h) => String(h.grupo_id) === String(g.id))),
        cupos: Math.max(0, NINOS_POR_GRUPO_MODELO - g.ninos),
      }
    })
    .sort((a, b) => String(a.numero).localeCompare(String(b.numero), 'es', { numeric: true }))
}

// Action ligera para el hint de grupos_activos en la página de KPI.
export async function contarGruposActivos(centroId) {
  await requireCentroAccess(centroId)
  const [r] = await sql`SELECT COUNT(*)::int AS n FROM grupos WHERE centro_id = ${centroId} AND estado = 'activo'`
  return r?.n || 0
}

export async function saveCoach(centroId, data) {
  await requireCentroAccess(centroId)
  const nombre = data?.nombre?.trim()
  if (!nombre) return { error: 'El nombre es requerido.' }
  const nivelKids = intOr(data?.nivel_kids)
  if (nivelKids < 0 || nivelKids > 8) return { error: 'El nivel KIDS va de 0 a 8.' }
  const now = new Date().toISOString()
  if (data?.id) {
    const r = await sql`
      UPDATE coaches SET nombre = ${nombre}, nivel_kids = ${nivelKids}, kinder1 = ${!!data.kinder1}, kinder23 = ${!!data.kinder23}, updated_at = ${now}
      WHERE id = ${data.id} AND centro_id = ${centroId} RETURNING id
    `
    if (!r.length) return { error: 'El coach no pertenece a este centro.' }
    return { ok: true, coachId: r[0].id }
  }
  const [co] = await sql`
    INSERT INTO coaches (centro_id, nombre, nivel_kids, kinder1, kinder23, updated_at)
    VALUES (${centroId}, ${nombre}, ${nivelKids}, ${!!data?.kinder1}, ${!!data?.kinder23}, ${now})
    RETURNING id
  `
  return { ok: true, coachId: co.id }
}

export async function toggleCoach(centroId, id, activo) {
  await requireCentroAccess(centroId)
  const r = await sql`
    UPDATE coaches SET activo = ${!!activo}, updated_at = ${new Date().toISOString()}
    WHERE id = ${id} AND centro_id = ${centroId} RETURNING id
  `
  if (!r.length) return { error: 'El coach no pertenece a este centro.' }
  return { ok: true }
}

export async function saveSalon(centroId, data) {
  await requireCentroAccess(centroId)
  const nombre = data?.nombre?.trim()
  if (!nombre) return { error: 'El nombre es requerido.' }
  const capacidad = parseSalonCapacity(data?.capacidad_ninos)
  if (capacidad.error) return { error: capacidad.error }
  // Una pestaña anterior al despliegue no envía el campo; no debe borrarlo.
  const cambiaCapacidad = Object.prototype.hasOwnProperty.call(data, 'capacidad_ninos')
  if (data?.id) {
    const r = await sql`
      UPDATE salones SET nombre = ${nombre}, es_hibrido = ${!!data.es_hibrido},
        capacidad_ninos = CASE WHEN ${cambiaCapacidad} THEN ${capacidad.value}::integer ELSE capacidad_ninos END
      WHERE id = ${data.id} AND centro_id = ${centroId} RETURNING id
    `
    if (!r.length) return { error: 'El salón no pertenece a este centro.' }
    return { ok: true, salonId: r[0].id }
  }
  const [s] = await sql`
    INSERT INTO salones (centro_id, nombre, es_hibrido, capacidad_ninos)
    VALUES (${centroId}, ${nombre}, ${!!data?.es_hibrido}, ${capacidad.value})
    RETURNING id
  `
  return { ok: true, salonId: s.id }
}

export async function toggleSalon(centroId, id, activo) {
  await requireCentroAccess(centroId)
  const r = await sql`
    UPDATE salones SET activo = ${!!activo}
    WHERE id = ${id} AND centro_id = ${centroId} RETURNING id
  `
  if (!r.length) return { error: 'El salón no pertenece a este centro.' }
  return { ok: true }
}

// Panel de fusiones: grupos bajo meta, plan sugerido del mes y promedios.
export async function sugerenciasFusion(centroId) {
  await requireCentroAccess(centroId)
  const grupos = await cargarGrupos(centroId)
  const metas = await metasOperativas()
  const opts = { MIN: metas.gpnMin, MAX: metas.cupoMax }
  const bajoMeta = grupos.filter((g) => underMeta(g, opts.MIN)).sort((a, b) => a.estudiantes.length - b.estudiantes.length)
  return { bajoMeta, sugerencias: proximasFusiones(grupos, opts), promedios: promedios(grupos, opts.MIN), metas }
}

// Mueve niños del grupo origen al destino. Re-ejecuta el análisis del manual
// server-side: si la fusión está bloqueada, no se aplica aunque la UI la pida.
export async function aplicarFusion(centroId, { deGrupoId, aGrupoId, estudianteIds } = {}) {
  await requireCentroAccess(centroId)
  if (!deGrupoId || !aGrupoId || String(deGrupoId) === String(aGrupoId)) return { error: 'Selecciona un grupo origen y un destino distintos.' }
  if (!Array.isArray(estudianteIds) || !estudianteIds.length) return { error: 'Selecciona al menos un niño para fusionar.' }

  const grupos = await cargarGrupos(centroId)
  const src = grupos.find((g) => String(g.id) === String(deGrupoId))
  const tgt = grupos.find((g) => String(g.id) === String(aGrupoId))
  if (!src || !tgt) return { error: 'El grupo no pertenece a este centro.' }
  if (tgt.estado !== 'activo') return { error: 'El grupo destino no está activo.' }
  // El destino solo respeta la PALANCA manual (movimiento interno, no niño
  // nuevo): el cierre automático de ventana jamás frena una fusión — pedido
  // explícito de Fernando (mismo criterio que grupoAceptaMovimientos).
  if (tgt.inscripcion_abierta === false) return { error: `El grupo ${tgt.numero} está cerrado a inscripciones: ya no entra nadie. Ábrelo de nuevo antes de fusionar hacia él.` }
  const ids = new Set(estudianteIds.map((x) => String(x)))
  const moveKids = src.estudiantes.filter((e) => ids.has(String(e.id)))
  if (moveKids.length !== ids.size) return { error: 'Hay niños que no pertenecen al grupo origen.' }

  const metas = await metasOperativas()
  const analisis = analyze(moveKids, src, tgt, { MIN: metas.gpnMin, MAX: metas.cupoMax })
  if (analisis.blocked) {
    const razones = analisis.reasons.filter((r) => r.k === 'no').map((r) => r.t).join(' · ')
    return { error: `Fusión bloqueada: ${razones}` }
  }

  const now = new Date().toISOString()
  const hoy = hoyISO()
  const { year, month } = ym(hoy)
  const idsNum = moveKids.map((e) => Number(e.id))
  const ERROR_CARRERA = 'La fusión no se aplicó: el grupo origen cambió de niños o el destino se cerró mientras confirmabas. Recarga y revisa el plan.'
  // (g2-3) Escritura transaccional interactiva (withTransaction, SERIALIZABLE):
  // se releen y BLOQUEAN origen y destino (y los niños del origen con FOR
  // UPDATE) ANTES de mover, y el conteo del origen debe ser EXACTAMENTE el que
  // vio la UI — si cambió entre el análisis y el commit se aborta con error
  // legible y sin efectos a medias. Movimientos, eventos, marca de origen
  // fusionado, desvinculación de clases de prueba y outbox viajan juntos:
  // - (g2-5) los crm_event_id del origen se capturan ANTES de desvincular y su
  //   clear_group se encola EN LA MISMA transacción — el consumidor nunca
  //   pierde a quién limpiarle aloha_group.
  // - El destino (y el origen, si sigue vivo) encolan sync_group; el push real
  //   lo hace el consumidor del cron (ya NO pushCuposAlCrm inline).
  return await withTransaction(async (query) => {
    // Los dos grupos se bloquean en UN statement ordenado por id: dos fusiones
    // cruzadas toman los locks en el mismo orden y no se traban entre sí.
    const bloqueados = await query`
      SELECT id, numero, estado, inscripcion_abierta, itinerario, itinerario_clases
      FROM grupos
      WHERE id = ANY(${[Number(src.id), Number(tgt.id)]}::int[]) AND centro_id = ${centroId}
      ORDER BY id
      FOR UPDATE
    `
    const origen = bloqueados.find((x) => String(x.id) === String(src.id))
    const destino = bloqueados.find((x) => String(x.id) === String(tgt.id))
    if (!origen || !destino) return { error: 'El grupo no pertenece a este centro.' }
    if (destino.estado !== 'activo') return { error: 'El grupo destino no está activo.' }
    // El destino solo respeta la PALANCA manual (ver arriba): la ventana de
    // nuevos vencida jamás frena una fusión.
    if (destino.inscripcion_abierta === false) {
      return { error: `El grupo ${destino.numero} está cerrado a inscripciones: ya no entra nadie. Ábrelo de nuevo antes de fusionar hacia él.` }
    }
    // INVARIANTE: el conteo de niños del origen NO cambió entre la validación
    // y el movimiento. Se relee con FOR UPDATE (nadie los mueve ni los retira
    // hasta el commit) y se compara con lo que vio la UI. Las columnas del
    // plan (nivel, ancla) salen de estas filas CONGELADAS, no de la foto que
    // vio la UI.
    const enOrigen = await query`
      SELECT id, itinerario, nivel, fecha_inicio_nivel, fecha_cierre_nivel, estado
      FROM estudiantes
      WHERE grupo_id = ${src.id} AND estado IN ('activo', 'baja_potencial')
      ORDER BY id
      FOR UPDATE
    `
    if (enOrigen.length !== src.estudiantes.length) return { error: ERROR_CARRERA }

    // (g1-9) RE-ANCLAJE SEMÁNTICO al calendario del destino, bajo lock: cada
    // niño conserva su posición (índice de semana a la fecha efectiva `hoy`) —
    // se busca la ancla del destino que produce EL MISMO índice; la más
    // cercana; empate → la más antigua; sin equivalente → se aborta TODA la
    // fusión con error legible. El niño sin plan derivable (sin ancla o grupo
    // sin calendario) se mueve sin re-anclar: nada que preservar, nada se
    // inventa. Calendarios y excepciones salen de las filas bloqueadas.
    const [centro] = await query`SELECT nombre, pais FROM centros WHERE id = ${centroId}`
    const pais = paisDe(centro)
    const horariosFusion = await query`
      SELECT grupo_id, dia FROM grupo_horarios
      WHERE grupo_id = ANY(${[Number(src.id), Number(tgt.id)]}::int[])
    `
    const ladoDe = (fila) => {
      const it = itinerarioVigenteDe(fila.itinerario_clases)
      const grupoCal = {
        id: fila.id,
        itinerario_clases: it,
        horarios: horariosFusion.filter((h) => String(h.grupo_id) === String(fila.id)),
      }
      return { calendarioVersionado: calendarioVersionadoDe(grupoCal), excepciones: it?.excepciones || [], pais }
    }
    const ladoOrigen = ladoDe(origen)
    const ladoDestino = ladoDe(destino)
    const memo = crearMemoPlanes()
    const reAnclas = new Map() // por (ancla|nivel): los que comparten plan comparten re-anclaje
    const porId = new Map(enOrigen.map((e) => [String(e.id), e]))
    const planMovidos = []
    for (const idNino of idsNum) {
      const e = porId.get(String(idNino))
      if (!e) return { error: ERROR_CARRERA }
      const anclaAntes = fechaIso10(e.fecha_inicio_nivel)
      const key = `${anclaAntes}|${Number(e.nivel)}`
      if (!reAnclas.has(key)) {
        reAnclas.set(key, reAnclaEnDestino({
          ancla: anclaAntes,
          nivel: e.nivel,
          hoy,
          origen: ladoOrigen,
          destino: ladoDestino,
        }, memo))
      }
      const r = reAnclas.get(key)
      if (r === null) {
        return { error: `La fusión no se aplicó: el horario del grupo ${destino.numero} no tiene una semana equivalente para la posición actual de los niños de nivel ${e.nivel} (ancla ${anclaAntes}). Ajusta el plan del destino o elige otro grupo.` }
      }
      planMovidos.push({ id: Number(e.id), anclaAntes, anclaDespues: r.sinPlan ? anclaAntes : r.ancla, reAncla: r })
    }

    // Movimiento + re-anclaje por niño (las anclas difieren entre niños, así
    // que el UPDATE masivo con UNNEST murió con el fallback al grupo).
    let movidosTotal = 0
    for (const m of planMovidos) {
      const movido = await query`
        UPDATE estudiantes SET grupo_id = ${tgt.id}, fecha_inicio_nivel = ${m.anclaDespues}, updated_at = ${now}
        WHERE id = ${m.id} AND grupo_id = ${src.id}
        RETURNING id
      `
      movidosTotal += movido.length
    }
    if (movidosTotal !== idsNum.length) return { error: ERROR_CARRERA }
    // El evento de fusión guarda ancla y posición ANTES/DESPUÉS (g1-9): la
    // auditoría (y el backfill g1-12) reconstruyen el plan de cada niño sin
    // adivinar. sin_plan queda explícito — jamás un -1 ni una fecha inventada.
    for (const m of planMovidos) {
      const detalle = {
        ancla_antes: m.anclaAntes,
        posicion_antes: m.reAncla.sinPlan ? { estado: 'sin_plan', indice: null } : m.reAncla.antes,
        ancla_despues: m.anclaDespues,
        posicion_despues: m.reAncla.sinPlan ? { estado: 'sin_plan', indice: null } : m.reAncla.despues,
      }
      await query`
        INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, de_grupo_id, a_grupo_id, detalle)
        VALUES (${m.id}, ${centroId}, 'fusion', ${year}, ${month}, ${hoy}, ${src.id}, ${tgt.id}, ${JSON.stringify(detalle)})
      `
    }
    // El origen queda fusionado solo si se llevó a TODOS sus niños.
    const cerrado = planMovidos.length === enOrigen.length
    if (cerrado) {
      await query`
        UPDATE grupos SET estado = 'fusionado', fusionado_en = ${tgt.id}, fecha_cierre = ${hoy}, updated_at = ${now}
        WHERE id = ${src.id}
      `
      const vinculados = await query`
        SELECT crm_event_id, grupo_id FROM centro_eventos WHERE grupo_id = ${src.id} FOR UPDATE
      `
      await query`UPDATE centro_eventos SET grupo_id = NULL WHERE grupo_id = ${src.id}`
      await encolarOutboxEn(query, vinculados, { op: 'clear_group', motivo: 'fusion', clave: now })
    }
    const gruposSync = cerrado ? [Number(tgt.id)] : [Number(tgt.id), Number(src.id)]
    const eventosSync = await query`
      SELECT crm_event_id, grupo_id FROM centro_eventos WHERE grupo_id = ANY(${gruposSync}::int[])
    `
    await encolarOutboxEn(query, eventosSync, { op: 'sync_group', motivo: 'fusion', clave: now })
    return { ok: true, cerrado }
  })
}

// Override consciente de la ventana de niños nuevos (diseño 2026-08-08): un
// admin extiende el llenado más allá de la semana límite del manual y queda
// rastro en la columna `llenado_extendido_hasta` — la extensión vence sola
// (fechaLimiteNuevos solo la respeta mientras sea posterior al límite
// derivado). Validación: fecha futura y a lo sumo 8 semanas desde hoy Panamá;
// más que eso ya no es "extender la inducción", es otra decisión de negocio.
// `fecha` null retira la extensión. El CRM se entera por el outbox (la fecha
// límite viaja en el payload de cupos), nunca con push inline.
export async function extenderVentanaLlenado(centroId, grupoId, fecha) {
  await requireCentroAccess(centroId)
  const limpia = fecha == null || fecha === ''
  const f = limpia ? null : String(fecha).slice(0, 10)
  if (!limpia) {
    if (!FECHA_RE.test(f)) return { error: 'Fecha de extensión inválida (AAAA-MM-DD).' }
    const hoy = hoyISO()
    if (f <= hoy) return { error: 'La extensión debe ser una fecha futura: hoy el grupo ya se rige por su ventana vigente.' }
    const [y, m, d] = hoy.split('-').map(Number)
    const tope = new Date(Date.UTC(y, m - 1, d + 56)).toISOString().slice(0, 10)
    if (f > tope) return { error: `La extensión máxima es de 8 semanas (hasta el ${tope}); más que eso apunta la venta a la inducción del próximo nivel.` }
  }
  const r = await sql`
    UPDATE grupos SET llenado_extendido_hasta = ${f}, updated_at = ${new Date().toISOString()}
    WHERE id = ${grupoId} AND centro_id = ${centroId} AND estado = 'activo'
    RETURNING id
  `
  if (!r.length) return { error: 'El grupo no está activo o no pertenece a este centro.' }
  await encolarSyncCrm([grupoId], 'extension_ventana')
  return { ok: true, hasta: f }
}
