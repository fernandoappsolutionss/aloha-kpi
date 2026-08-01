'use server'
import { sql } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { getCurrentPeriod } from '../../lib/period'
import { ITINERARIOS, NIVEL_MAX, aperturaMinima, hoyISO } from '../../lib/operaciones'
import { analyze, underMeta, promedios, proximasFusiones } from '../../lib/fusiones'
import { validarSesion, chocanConBuffer, aMinutos, KINDER_INICIO, KINDER_FIN } from '../../lib/inventario'
import { NINOS_POR_GRUPO_MODELO, horarioTextoDe } from '../../lib/modelo'
import { pushCuposAlCrm, desvincularGrupoEnEventos } from '../../lib/cupos-sync'
import { generarItinerario, normalizarExcepciones } from '../../lib/itinerario'

// Genera y guarda el itinerario de clases del nivel (manual ALOHA Panamá):
// necesita fecha de inicio + días de clase. Los Naranjos opera con el
// reglamento de ALOHA Venezuela → su calendario no salta feriados panameños.
async function regenerarItinerarioClases(centroId, grupoId, { fechaInicio, horarios, nivel, excepciones }) {
  if (!fechaInicio || !horarios?.length) return null
  const [c] = await sql`SELECT nombre FROM centros WHERE id = ${centroId}`
  const conFeriados = !/naranjos/i.test(c?.nombre || '')
  const it = generarItinerario({
    fechaInicio,
    dias: horarios.map((h) => h.dia),
    nivel: nivel || 1,
    conFeriados,
    excepciones,
  })
  if (!it) return null
  await sql`UPDATE grupos SET itinerario_clases = ${JSON.stringify(it)} WHERE id = ${grupoId}`
  return it
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
// embebidos, en la forma que esperan lib/fusiones y lib/cuadro-calc.
async function cargarGrupos(centroId) {
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
  return grupos
    .map((g) => ({
      ...g,
      coach: (g.coach_id && coachPorId.get(String(g.coach_id))) || null,
      horarios: horarios.filter((h) => String(h.grupo_id) === String(g.id)),
      estudiantes: kids.filter((e) => String(e.grupo_id) === String(g.id)),
    }))
    .sort((a, b) => String(a.numero).localeCompare(String(b.numero), 'es', { numeric: true }))
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
// 1 h o 2 h) y bloquea choques de salón sin los 30 min entre clases.
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
        return { error: `Dos sesiones del mismo grupo chocan en ${salonPorId.get(String(a.salon_id))} el mismo día (recuerda los 30 min entre clases).` }
      }
    }
  }
  // Choques contra los demás grupos activos del centro.
  const ocupadas = await sql`
    SELECT h.dia, h.hora_inicio, h.hora_fin, h.salon_id, g.numero
    FROM grupo_horarios h JOIN grupos g ON g.id = h.grupo_id
    WHERE g.centro_id = ${centroId} AND g.estado = 'activo' AND h.salon_id IS NOT NULL
      AND (${grupoId} IS NULL OR g.id <> ${grupoId})
  `
  for (const n of out) {
    if (!n.salon_id) continue
    for (const o of ocupadas) {
      if (o.dia !== n.dia || String(o.salon_id) !== String(n.salon_id)) continue
      if (chocanConBuffer(aMinutos(n.hora_inicio), aMinutos(n.hora_fin), aMinutos(o.hora_inicio), aMinutos(o.hora_fin))) {
        return { error: `Choca con el Grupo ${o.numero} en ${salonPorId.get(String(n.salon_id))} (${o.hora_inicio}–${o.hora_fin}); deja al menos 30 min entre clases.` }
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
  return { nombre: c?.nombre || '', grupos, coaches, salones, retirados, sinGrupo, metas }
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
  const fechaApertura = data?.fecha_apertura || null
  if (fechaApertura && !FECHA_RE.test(fechaApertura)) return { error: 'Fecha de apertura inválida (AAAA-MM-DD).' }
  const fechaInicio = data?.fecha_inicio_clases || null
  if (fechaInicio && !FECHA_RE.test(fechaInicio)) return { error: 'Fecha de inicio de clases inválida (AAAA-MM-DD).' }
  const inscripcionAbierta = data?.inscripcion_abierta === undefined ? true : !!data.inscripcion_abierta
  const v = await validarHorarios(centroId, data?.horarios)
  if (v.error) return { error: v.error }
  const zk = validarZonaKinder(itinerario, v.horarios)
  if (zk) return { error: zk }

  const now = new Date().toISOString()
  const [g] = await sql`
    INSERT INTO grupos (centro_id, numero, itinerario, es_online, coach_id, estado, fecha_apertura, fecha_inicio_clases, inscripcion_abierta, notas, updated_at)
    VALUES (${centroId}, ${numero}, ${itinerario}, ${!!data?.es_online}, ${coachId}, 'activo', ${fechaApertura}, ${fechaInicio}, ${inscripcionAbierta}, ${data?.notas?.trim() || null}, ${now})
    RETURNING id
  `
  for (const h of v.horarios) {
    await sql`
      INSERT INTO grupo_horarios (grupo_id, dia, hora_inicio, hora_fin, salon_id)
      VALUES (${g.id}, ${h.dia}, ${h.hora_inicio}, ${h.hora_fin}, ${h.salon_id})
    `
  }
  // El grupo nace con el itinerario de clases de su nivel (regla de Fernando):
  // inducción, semanas del libro, mental days y cierre, saltando feriados.
  await regenerarItinerarioClases(centroId, g.id, {
    fechaInicio: fechaInicio || fechaApertura,
    horarios: v.horarios,
    nivel: intOr(data?.nivel, 1),
  })
  // Aviso del manual: apertura mínima 8 TINY / 10 KIDS en nivel 1, 6 en niveles superiores.
  let warn
  if (data?.ninos_iniciales !== undefined && data?.ninos_iniciales !== null && data?.ninos_iniciales !== '') {
    const minimo = aperturaMinima(itinerario, intOr(data.nivel, 1))
    const n = intOr(data.ninos_iniciales)
    if (n < minimo) warn = `Apertura con ${n} niños, por debajo del mínimo del manual (${minimo}). El grupo queda bajo responsabilidad del centro en niveles superiores.`
  }
  return warn ? { ok: true, grupoId: g.id, warn } : { ok: true, grupoId: g.id }
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
  if (data?.fecha_apertura && !FECHA_RE.test(data.fecha_apertura)) return { error: 'Fecha de apertura inválida (AAAA-MM-DD).' }
  const fechaApertura = data?.fecha_apertura !== undefined ? data.fecha_apertura || null : g.fecha_apertura
  if (data?.fecha_inicio_clases && !FECHA_RE.test(data.fecha_inicio_clases)) return { error: 'Fecha de inicio de clases inválida (AAAA-MM-DD).' }
  const fechaInicio = data?.fecha_inicio_clases !== undefined ? data.fecha_inicio_clases || null : g.fecha_inicio_clases
  const inscripcionAbierta = data?.inscripcion_abierta !== undefined ? !!data.inscripcion_abierta : g.inscripcion_abierta !== false
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
  await sql`
    UPDATE grupos SET numero = ${numero}, itinerario = ${itinerario}, es_online = ${esOnline},
      coach_id = ${coachId}, fecha_apertura = ${fechaApertura}, fecha_inicio_clases = ${fechaInicio},
      inscripcion_abierta = ${inscripcionAbierta}, notas = ${notas}, updated_at = ${now}
    WHERE id = ${grupoId}
  `
  if (horarios) {
    await sql`DELETE FROM grupo_horarios WHERE grupo_id = ${grupoId}`
    for (const h of horarios) {
      await sql`
        INSERT INTO grupo_horarios (grupo_id, dia, hora_inicio, hora_fin, salon_id)
        VALUES (${grupoId}, ${h.dia}, ${h.hora_inicio}, ${h.hora_fin}, ${h.salon_id})
      `
    }
  }
  // Regenera el itinerario si cambió lo que lo define (fecha de inicio u
  // horarios); el nivel y las clases suspendidas del grupo se conservan.
  const inicioCambio = String(fechaInicio || '') !== String(g.fecha_inicio_clases || '').slice(0, 10)
  if ((horarios || inicioCambio) && fechaInicio) {
    const hs = horarios || (await sql`SELECT dia FROM grupo_horarios WHERE grupo_id = ${grupoId}`)
    await regenerarItinerarioClases(centroId, grupoId, {
      fechaInicio,
      horarios: hs,
      nivel: g.itinerario_clases?.nivel || 1,
      excepciones: g.itinerario_clases?.excepciones || [],
    })
  }
  // Si cambió el estado de inscripciones, ventas debe ver los cupos correctos.
  if ((g.inscripcion_abierta !== false) !== inscripcionAbierta) await pushCuposAlCrm(centroId, grupoId)
  return { ok: true }
}

// Ajusta el itinerario del nivel de UN grupo: nivel que cursa, fecha de inicio
// del nivel y clases suspendidas (excepciones). La plantilla de semanas es la
// base de franquicia y no se toca aquí; lo que cambia es cómo cae en el
// calendario de este grupo. Devuelve el itinerario ya regenerado.
export async function ajustarItinerarioGrupo(centroId, grupoId, data) {
  await requireCentroAccess(centroId)
  const [g] = await sql`SELECT * FROM grupos WHERE id = ${grupoId} AND centro_id = ${centroId}`
  if (!g) return { error: 'El grupo no pertenece a este centro.' }

  const nivel = intOr(data?.nivel, g.itinerario_clases?.nivel || 1)
  const topeNivel = NIVEL_MAX[g.itinerario] || 10
  if (nivel < 1 || nivel > topeNivel) return { error: `El nivel de ${g.itinerario} va de 1 a ${topeNivel}.` }

  const fechaInicio = String(data?.fecha_inicio || '').slice(0, 10)
  if (!FECHA_RE.test(fechaInicio)) return { error: 'La fecha de inicio del nivel es requerida (AAAA-MM-DD).' }

  const horarios = await sql`SELECT dia FROM grupo_horarios WHERE grupo_id = ${grupoId}`
  if (!horarios.length) return { error: 'El grupo no tiene horario registrado: sin días de clase no hay itinerario.' }

  const excepciones = normalizarExcepciones(data?.excepciones)
  const it = await regenerarItinerarioClases(centroId, grupoId, { fechaInicio, horarios, nivel, excepciones })
  if (!it) return { error: 'No se pudo generar el itinerario con esos datos.' }

  // La fecha de inicio del nivel en curso ES la fecha de inicio de clases del
  // grupo: mantenerlas alineadas evita que el siguiente guardado lo regenere.
  await sql`
    UPDATE grupos SET fecha_inicio_clases = ${fechaInicio}, updated_at = ${new Date().toISOString()}
    WHERE id = ${grupoId}
  `
  return { ok: true, itinerario: it }
}

// Abre o cierra las inscripciones de un grupo (en llenado ↔ ya no entra nadie).
// Cerrado: no acepta inscripción, reincorporación, cambio de grupo ni fusión.
export async function toggleInscripcionGrupo(centroId, grupoId) {
  await requireCentroAccess(centroId)
  const [g] = await sql`SELECT id, numero, inscripcion_abierta FROM grupos WHERE id = ${grupoId} AND centro_id = ${centroId}`
  if (!g) return { error: 'El grupo no pertenece a este centro.' }
  const nueva = g.inscripcion_abierta === false
  await sql`UPDATE grupos SET inscripcion_abierta = ${nueva}, updated_at = ${new Date().toISOString()} WHERE id = ${grupoId}`
  // Cupos al CRM: cerrado = 0 disponibles aunque tenga espacio (best effort).
  await pushCuposAlCrm(centroId, grupoId)
  return { ok: true, abierta: nueva }
}

// Cierre manual (manual: un grupo en 0 niños se cierra para no afectar la rentabilidad).
export async function cerrarGrupo(centroId, grupoId) {
  await requireCentroAccess(centroId)
  const [g] = await sql`SELECT id FROM grupos WHERE id = ${grupoId} AND centro_id = ${centroId}`
  if (!g) return { error: 'El grupo no pertenece a este centro.' }
  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM estudiantes WHERE grupo_id = ${grupoId} AND estado IN ('activo', 'baja_potencial')`
  if (n > 0) return { error: `El grupo tiene ${n} niños activos` }
  await sql`UPDATE grupos SET estado = 'cerrado', fecha_cierre = ${hoyISO()}, updated_at = ${new Date().toISOString()} WHERE id = ${grupoId}`
  // Un grupo cerrado no puede seguir vendiéndose: se desvincula de las clases
  // de prueba y el CRM deja de mostrar sus cupos (best effort).
  await desvincularGrupoEnEventos(centroId, grupoId)
  return { ok: true }
}

export async function reabrirGrupo(centroId, grupoId) {
  await requireCentroAccess(centroId)
  const r = await sql`
    UPDATE grupos SET estado = 'activo', fecha_cierre = NULL, fusionado_en = NULL, updated_at = ${new Date().toISOString()}
    WHERE id = ${grupoId} AND centro_id = ${centroId} RETURNING id
  `
  if (!r.length) return { error: 'El grupo no pertenece a este centro.' }
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
// aperturar). Además de id/numero/itinerario devuelve horarioTexto (am/pm) y
// cupos frente al modelo ("quedan X de 10") — campos agregados, sin romper consumidores.
export async function listarGruposActivos(centroId) {
  await requireCentroAccess(centroId)
  const rows = await sql`
    SELECT g.id, g.numero, g.itinerario, g.inscripcion_abierta, g.fecha_inicio_clases,
      COUNT(e.id) FILTER (WHERE e.estado IN ('activo', 'baja_potencial'))::int AS ninos
    FROM grupos g LEFT JOIN estudiantes e ON e.grupo_id = g.id
    WHERE g.centro_id = ${centroId} AND g.estado = 'activo'
    GROUP BY g.id, g.numero, g.itinerario, g.inscripcion_abierta, g.fecha_inicio_clases
  `
  const horarios = await sql`
    SELECT h.grupo_id, h.dia, h.hora_inicio, h.hora_fin
    FROM grupo_horarios h JOIN grupos g ON g.id = h.grupo_id
    WHERE g.centro_id = ${centroId} AND g.estado = 'activo'
    ORDER BY h.dia, h.hora_inicio
  `
  return rows
    .map((g) => ({
      id: g.id,
      numero: g.numero,
      itinerario: g.itinerario,
      inscripcionAbierta: g.inscripcion_abierta !== false,
      fechaInicioClases: g.fecha_inicio_clases ? String(g.fecha_inicio_clases).slice(0, 10) : null,
      horarioTexto: horarioTextoDe(horarios.filter((h) => String(h.grupo_id) === String(g.id))),
      cupos: Math.max(0, NINOS_POR_GRUPO_MODELO - g.ninos),
    }))
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
  if (data?.id) {
    const r = await sql`
      UPDATE salones SET nombre = ${nombre}, es_hibrido = ${!!data.es_hibrido}
      WHERE id = ${data.id} AND centro_id = ${centroId} RETURNING id
    `
    if (!r.length) return { error: 'El salón no pertenece a este centro.' }
    return { ok: true, salonId: r[0].id }
  }
  const [s] = await sql`
    INSERT INTO salones (centro_id, nombre, es_hibrido)
    VALUES (${centroId}, ${nombre}, ${!!data?.es_hibrido})
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
  for (const e of moveKids) {
    await sql`UPDATE estudiantes SET grupo_id = ${tgt.id}, updated_at = ${now} WHERE id = ${e.id}`
    await sql`
      INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, de_grupo_id, a_grupo_id)
      VALUES (${e.id}, ${centroId}, 'fusion', ${year}, ${month}, ${hoy}, ${src.id}, ${tgt.id})
    `
  }
  // Si el origen queda sin niños se marca fusionado (manual: cerrar para no afectar rentabilidad).
  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM estudiantes WHERE grupo_id = ${src.id} AND estado IN ('activo', 'baja_potencial')`
  let cerrado = false
  if (n === 0) {
    await sql`UPDATE grupos SET estado = 'fusionado', fusionado_en = ${tgt.id}, fecha_cierre = ${hoy}, updated_at = ${now} WHERE id = ${src.id}`
    cerrado = true
  }
  // La fusión mueve matrícula: el CRM recibe los cupos nuevos del destino y,
  // del origen, los cupos actualizados — o la desvinculación si quedó fusionado
  // (best effort, nunca rompe el { ok } local).
  await pushCuposAlCrm(centroId, tgt.id)
  if (cerrado) await desvincularGrupoEnEventos(centroId, src.id)
  else await pushCuposAlCrm(centroId, src.id)
  return { ok: true, cerrado }
}
