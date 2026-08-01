'use server'
import { sql } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { getCurrentPeriod } from '../../lib/period'
import { ITINERARIOS, aperturaMinima, hoyISO } from '../../lib/operaciones'
import { analyze, underMeta, promedios, proximasFusiones } from '../../lib/fusiones'

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
async function validarHorarios(centroId, horarios) {
  const salones = await sql`SELECT id FROM salones WHERE centro_id = ${centroId}`
  const salonIds = new Set(salones.map((s) => String(s.id)))
  const out = []
  for (const h of horarios || []) {
    const dia = intOr(h?.dia)
    if (dia < 1 || dia > 7) return { error: 'Horario inválido: el día va de 1 (lunes) a 7 (domingo).' }
    if (!HORA_RE.test(h?.hora_inicio || '') || !HORA_RE.test(h?.hora_fin || '')) return { error: 'Horario inválido: las horas van en formato HH:MM.' }
    const salonId = h.salon_id || null
    if (salonId && !salonIds.has(String(salonId))) return { error: 'El salón no pertenece a este centro.' }
    out.push({ dia, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin, salon_id: salonId })
  }
  return { horarios: out }
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
  const v = await validarHorarios(centroId, data?.horarios)
  if (v.error) return { error: v.error }

  const now = new Date().toISOString()
  const [g] = await sql`
    INSERT INTO grupos (centro_id, numero, itinerario, es_online, coach_id, estado, fecha_apertura, notas, updated_at)
    VALUES (${centroId}, ${numero}, ${itinerario}, ${!!data?.es_online}, ${coachId}, 'activo', ${fechaApertura}, ${data?.notas?.trim() || null}, ${now})
    RETURNING id
  `
  for (const h of v.horarios) {
    await sql`
      INSERT INTO grupo_horarios (grupo_id, dia, hora_inicio, hora_fin, salon_id)
      VALUES (${g.id}, ${h.dia}, ${h.hora_inicio}, ${h.hora_fin}, ${h.salon_id})
    `
  }
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
  const notas = data?.notas !== undefined ? data.notas?.trim() || null : g.notas

  let horarios = null
  if (Array.isArray(data?.horarios)) {
    const v = await validarHorarios(centroId, data.horarios)
    if (v.error) return { error: v.error }
    horarios = v.horarios
  }

  const now = new Date().toISOString()
  await sql`
    UPDATE grupos SET numero = ${numero}, itinerario = ${itinerario}, es_online = ${esOnline},
      coach_id = ${coachId}, fecha_apertura = ${fechaApertura}, notas = ${notas}, updated_at = ${now}
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
  return { ok: true }
}

// Cierre manual (manual: un grupo en 0 niños se cierra para no afectar la rentabilidad).
export async function cerrarGrupo(centroId, grupoId) {
  await requireCentroAccess(centroId)
  const [g] = await sql`SELECT id FROM grupos WHERE id = ${grupoId} AND centro_id = ${centroId}`
  if (!g) return { error: 'El grupo no pertenece a este centro.' }
  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM estudiantes WHERE grupo_id = ${grupoId} AND estado IN ('activo', 'baja_potencial')`
  if (n > 0) return { error: `El grupo tiene ${n} niños activos` }
  await sql`UPDATE grupos SET estado = 'cerrado', fecha_cierre = ${hoyISO()}, updated_at = ${new Date().toISOString()} WHERE id = ${grupoId}`
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

// Action ligera para selects de otras páginas (eventos → Inscribir).
export async function listarGruposActivos(centroId) {
  await requireCentroAccess(centroId)
  const rows = await sql`SELECT id, numero, itinerario FROM grupos WHERE centro_id = ${centroId} AND estado = 'activo'`
  return rows.sort((a, b) => String(a.numero).localeCompare(String(b.numero), 'es', { numeric: true }))
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
  return { ok: true, cerrado }
}
