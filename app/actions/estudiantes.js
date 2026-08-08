'use server'
import { sql, withTransaction } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { ITINERARIOS, NIVEL_MAX, ORIGENES, MOTIVOS_RETIRO, STATUS_PLATAFORMA, hoyISO } from '../../lib/operaciones'
import { pushCuposAlCrm } from '../../lib/cupos-sync'
import { bloquearMesesEditables } from '../../lib/mes-kpi'

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/
const intOr = (v, d = 0) => {
  const n = parseInt(v)
  return Number.isFinite(n) ? n : d
}
const ym = (fecha) => {
  const [y, m] = String(fecha).split('-').map(Number)
  return { year: y, month: m }
}

// Regla del negocio: un grupo con inscripcion_abierta = false está lleno/cerrado
// y ya NO entra nadie (inscripción, reincorporación ni cambio de grupo).
// Devuelve mensaje de error o null si el grupo acepta niños.
async function grupoAceptaNinos(centroId, grupoId, query = sql) {
  const [g] = await query`
    SELECT id, numero, inscripcion_abierta FROM grupos
    WHERE id = ${grupoId} AND centro_id = ${centroId}
  `
  if (!g) return 'El grupo no pertenece a este centro.'
  if (g.inscripcion_abierta === false) {
    return `El grupo ${g.numero} está cerrado a inscripciones: ya no entra nadie. Ábrelo de nuevo en Grupos y Fusiones si tiene cupo.`
  }
  return null
}

// Alta de un niño (clase de prueba, inscripción directa o traslado). Registra
// el evento de inscripción con el year/month de la fecha de inscripción.
export async function inscribirEstudiante(centroId, data) {
  await requireCentroAccess(centroId)
  const nombre = data?.nombre?.trim()
  if (!nombre) return { error: 'El nombre es requerido.' }
  const itinerario = data?.itinerario || 'TINY'
  if (!ITINERARIOS.includes(itinerario)) return { error: 'Itinerario inválido.' }
  const nivel = intOr(data?.nivel, 1)
  if (nivel < 1 || nivel > NIVEL_MAX[itinerario]) return { error: `El nivel de ${itinerario} va de 1 a ${NIVEL_MAX[itinerario]}.` }
  const origen = data?.origen || 'directo'
  if (!ORIGENES.includes(origen)) return { error: 'Origen inválido.' }
  const grupoId = data?.grupo_id || null
  if (grupoId) {
    const err = await grupoAceptaNinos(centroId, grupoId)
    if (err) return { error: err }
  }
  const crmId = data?.crm_registration_id?.trim() || null
  if (crmId) {
    const [dup] = await sql`SELECT id FROM estudiantes WHERE centro_id = ${centroId} AND crm_registration_id = ${crmId}`
    if (dup) return { error: 'Este registro ya fue inscrito.' }
  }
  const fecha = data?.fecha || hoyISO()
  if (!FECHA_RE.test(fecha)) return { error: 'Fecha de inscripción inválida (AAAA-MM-DD).' }
  const { year, month } = ym(fecha)
  const fechaCierre = data?.fecha_cierre_nivel || null
  if (fechaCierre && !FECHA_RE.test(fechaCierre)) return { error: 'Fecha de cierre de nivel inválida (AAAA-MM-DD).' }

  const now = new Date().toISOString()
  const resultado = await withTransaction(async (query) => {
    const errorMes = await bloquearMesesEditables(query, centroId, [{ year, month }])
    if (errorMes) return { error: errorMes }
    if (grupoId) {
      const errorGrupo = await grupoAceptaNinos(centroId, grupoId, query)
      if (errorGrupo) return { error: errorGrupo }
    }
    if (crmId) {
      const [dup] = await query`
        SELECT id FROM estudiantes
        WHERE centro_id = ${centroId} AND crm_registration_id = ${crmId}
      `
      if (dup) return { error: 'Este registro ya fue inscrito.' }
    }
    const [e] = await query`
      INSERT INTO estudiantes (centro_id, grupo_id, nombre, itinerario, nivel, estado, status_plataforma, origen,
        crm_registration_id, fecha_inscripcion, fecha_cierre_nivel, representante, correo, telefono, notas, updated_at)
      VALUES (${centroId}, ${grupoId}, ${nombre}, ${itinerario}, ${nivel}, 'activo', 'INCLUIR', ${origen},
        ${crmId}, ${fecha}, ${fechaCierre}, ${data?.representante?.trim() || null}, ${data?.correo?.trim() || null},
        ${data?.telefono?.trim() || null}, ${data?.notas?.trim() || null}, ${now})
      RETURNING id
    `
    await query`
      INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, a_grupo_id, a_nivel)
      VALUES (${e.id}, ${centroId}, 'inscripcion', ${year}, ${month}, ${fecha}, ${grupoId}, ${nivel})
    `
    return { ok: true, estudianteId: e.id }
  })
  if (resultado.error) return resultado
  // Si el grupo está vinculado a una clase de prueba, sus cupos viajan al CRM
  // (best effort: nunca lanza ni bloquea el ok).
  if (grupoId) await pushCuposAlCrm(centroId, grupoId)
  return resultado
}

// Edición general. Si cambia el nivel registra evento 'cambio_nivel'; si cambia
// el grupo, 'cambio_grupo'. Solo se tocan los campos que vienen en `data`.
export async function actualizarEstudiante(centroId, id, data) {
  await requireCentroAccess(centroId)
  const [est] = await sql`SELECT * FROM estudiantes WHERE id = ${id} AND centro_id = ${centroId}`
  if (!est) return { error: 'El estudiante no pertenece a este centro.' }

  const nombre = data?.nombre !== undefined ? String(data.nombre).trim() : est.nombre
  if (!nombre) return { error: 'El nombre es requerido.' }
  const itinerario = data?.itinerario !== undefined ? data.itinerario : est.itinerario
  if (!ITINERARIOS.includes(itinerario)) return { error: 'Itinerario inválido.' }
  const nivel = data?.nivel !== undefined ? intOr(data.nivel) : Number(est.nivel)
  if (nivel < 1 || nivel > NIVEL_MAX[itinerario]) return { error: `El nivel de ${itinerario} va de 1 a ${NIVEL_MAX[itinerario]}.` }
  let grupoId = est.grupo_id
  if (data?.grupo_id !== undefined) {
    grupoId = data.grupo_id || null
    // Solo si el niño CAMBIA de grupo: quedarse donde ya está siempre se puede.
    if (grupoId && String(grupoId) !== String(est.grupo_id ?? '')) {
      const err = await grupoAceptaNinos(centroId, grupoId)
      if (err) return { error: err }
    }
  }
  const statusPlataforma = data?.status_plataforma !== undefined ? data.status_plataforma : est.status_plataforma
  if (statusPlataforma && !STATUS_PLATAFORMA.includes(statusPlataforma)) return { error: 'Status de plataforma inválido.' }
  const origen = data?.origen !== undefined ? data.origen : est.origen
  if (origen && !ORIGENES.includes(origen)) return { error: 'Origen inválido.' }
  for (const campo of ['fecha_inscripcion', 'fecha_cierre_nivel', 'ultima_asistencia']) {
    if (data?.[campo] && !FECHA_RE.test(data[campo])) return { error: 'Las fechas van en formato AAAA-MM-DD.' }
  }
  const fechaDe = (campo) => (data?.[campo] !== undefined ? data[campo] || null : est[campo])
  const textoDe = (campo) => {
    if (data?.[campo] === undefined) return est[campo]
    return data[campo] == null ? null : String(data[campo]).trim() || null
  }

  const now = new Date().toISOString()
  await sql`
    UPDATE estudiantes SET
      nombre = ${nombre}, itinerario = ${itinerario}, nivel = ${nivel}, grupo_id = ${grupoId},
      status_plataforma = ${statusPlataforma}, origen = ${origen},
      fecha_inscripcion = ${fechaDe('fecha_inscripcion')},
      fecha_cierre_nivel = ${fechaDe('fecha_cierre_nivel')},
      ultima_asistencia = ${fechaDe('ultima_asistencia')},
      representante = ${textoDe('representante')}, correo = ${textoDe('correo')},
      telefono = ${textoDe('telefono')}, notas = ${textoDe('notas')}, updated_at = ${now}
    WHERE id = ${id}
  `
  const hoy = hoyISO()
  const { year, month } = ym(hoy)
  if (nivel !== Number(est.nivel)) {
    await sql`
      INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, de_nivel, a_nivel)
      VALUES (${id}, ${centroId}, 'cambio_nivel', ${year}, ${month}, ${hoy}, ${Number(est.nivel)}, ${nivel})
    `
  }
  if (String(grupoId ?? '') !== String(est.grupo_id ?? '')) {
    await sql`
      INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, de_grupo_id, a_grupo_id)
      VALUES (${id}, ${centroId}, 'cambio_grupo', ${year}, ${month}, ${hoy}, ${est.grupo_id}, ${grupoId})
    `
    // El cambio de grupo mueve cupos en ambos lados: si el grupo viejo o el
    // nuevo están vinculados a una clase de prueba, el CRM se entera (best effort).
    await pushCuposAlCrm(centroId, est.grupo_id)
    await pushCuposAlCrm(centroId, grupoId)
  }
  return { ok: true }
}

// Graduación Tiny → Kids (manual: todo graduado de Tiny 10 que continúa entra
// en KIDS nivel 5, progresión aprobada sin permiso corporativo).
export async function graduarTiny(centroId, id) {
  await requireCentroAccess(centroId)
  const [est] = await sql`SELECT * FROM estudiantes WHERE id = ${id} AND centro_id = ${centroId}`
  if (!est) return { error: 'El estudiante no pertenece a este centro.' }
  if (est.estado === 'retirado') return { error: 'El estudiante está retirado.' }
  if (est.itinerario !== 'TINY' || Number(est.nivel) !== 10) return { error: 'Solo se gradúan niños de TINY nivel 10.' }
  const hoy = hoyISO()
  const { year, month } = ym(hoy)
  await sql`UPDATE estudiantes SET itinerario = 'KIDS', nivel = 5, updated_at = ${new Date().toISOString()} WHERE id = ${id}`
  await sql`
    INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, de_nivel, a_nivel)
    VALUES (${id}, ${centroId}, 'graduacion_tiny', ${year}, ${month}, ${hoy}, 10, 5)
  `
  return { ok: true }
}

// Baja potencial (cuadro real: sigue este mes, se va el próximo). El motivo es
// opcional y queda en el evento para el seguimiento.
export async function marcarBajaPotencial(centroId, id, { motivo } = {}) {
  await requireCentroAccess(centroId)
  const [est] = await sql`SELECT id, estado FROM estudiantes WHERE id = ${id} AND centro_id = ${centroId}`
  if (!est) return { error: 'El estudiante no pertenece a este centro.' }
  if (est.estado !== 'activo') return { error: 'El estudiante no está activo.' }
  if (motivo && !MOTIVOS_RETIRO.includes(motivo)) return { error: 'Motivo inválido.' }
  const hoy = hoyISO()
  const { year, month } = ym(hoy)
  await sql`UPDATE estudiantes SET estado = 'baja_potencial', updated_at = ${new Date().toISOString()} WHERE id = ${id}`
  await sql`
    INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, motivo)
    VALUES (${id}, ${centroId}, 'baja_potencial', ${year}, ${month}, ${hoy}, ${motivo || null})
  `
  return { ok: true }
}

// Revierte la alerta de baja potencial. Sin evento nuevo: el niño nunca se fue,
// así que no es una reincorporación (esas son para retirados que vuelven).
export async function revertirBajaPotencial(centroId, id) {
  await requireCentroAccess(centroId)
  const [est] = await sql`SELECT id, estado FROM estudiantes WHERE id = ${id} AND centro_id = ${centroId}`
  if (!est) return { error: 'El estudiante no pertenece a este centro.' }
  if (est.estado !== 'baja_potencial') return { error: 'El estudiante no está en baja potencial.' }
  await sql`UPDATE estudiantes SET estado = 'activo', updated_at = ${new Date().toISOString()} WHERE id = ${id}`
  return { ok: true }
}

// Retiro con motivo del cuadro de deserciones. El evento lleva el year/month de
// la fecha de retiro (así el niño cae en el mes correcto del cuadro).
export async function retirarEstudiante(centroId, id, { motivo, fecha, ultimaAsistencia } = {}) {
  await requireCentroAccess(centroId)
  if (!MOTIVOS_RETIRO.includes(motivo)) return { error: 'Motivo de retiro inválido.' }
  const fechaRetiro = fecha || hoyISO()
  if (!FECHA_RE.test(fechaRetiro)) return { error: 'Fecha de retiro inválida (AAAA-MM-DD).' }
  if (ultimaAsistencia && !FECHA_RE.test(ultimaAsistencia)) return { error: 'Última asistencia inválida (AAAA-MM-DD).' }
  const { year, month } = ym(fechaRetiro)

  const now = new Date().toISOString()
  const resultado = await withTransaction(async (query) => {
    const errorMes = await bloquearMesesEditables(query, centroId, [{ year, month }])
    if (errorMes) return { error: errorMes }
    const [est] = await query`
      SELECT * FROM estudiantes
      WHERE id = ${id} AND centro_id = ${centroId}
      FOR UPDATE
    `
    if (!est) return { error: 'El estudiante no pertenece a este centro.' }
    if (est.estado === 'retirado') return { error: 'El estudiante ya está retirado.' }
    const ultimaAsis = ultimaAsistencia || est.ultima_asistencia || null
    await query`
      UPDATE estudiantes SET estado = 'retirado', status_plataforma = 'DESACTIVAR', motivo_retiro = ${motivo},
        fecha_retiro = ${fechaRetiro}, ultima_asistencia = ${ultimaAsis}, updated_at = ${now}
      WHERE id = ${id}
    `
    await query`
      INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, de_grupo_id, motivo)
      VALUES (${id}, ${centroId}, 'retiro', ${year}, ${month}, ${fechaRetiro}, ${est.grupo_id}, ${motivo})
    `
    return { ok: true, grupoId: est.grupo_id, ultimaAsis }
  })
  if (resultado.error) return resultado
  // Cupos al CRM si el grupo está vinculado a una clase de prueba (best effort).
  if (resultado.grupoId) await pushCuposAlCrm(centroId, resultado.grupoId)

  const out = { ok: true }
  // Norma del cuadro: el niño que vio clases en un mes se declara retirado en
  // ESE mes (cuenta al inicio del mes aunque ya sabemos que no sigue). Si la
  // fecha de retiro cae en otro mes que la última asistencia, se avisa.
  if (resultado.ultimaAsis) {
    const a = ym(resultado.ultimaAsis)
    if (a.year !== year || a.month !== month) {
      out.warn = `La última asistencia fue el ${resultado.ultimaAsis} pero el retiro quedó declarado en ${String(month).padStart(2, '0')}/${year}. Norma del cuadro: si el niño vio clases en un mes, se declara retirado en ese mismo mes (usa esa fecha de retiro si ese mes sigue abierto).`
    }
  }
  // Si el grupo queda sin niños, la UI ofrece cerrarlo (regla del manual).
  if (resultado.grupoId) {
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM estudiantes WHERE grupo_id = ${resultado.grupoId} AND estado IN ('activo', 'baja_potencial')`
    if (n === 0) {
      const [g] = await sql`SELECT numero FROM grupos WHERE id = ${resultado.grupoId}`
      if (g) out.grupoVacio = g.numero
    }
  }
  return out
}

// Un retirado que vuelve: entra a un grupo activo y cuenta como reincorporado
// del mes (no como nuevo).
export async function reincorporarEstudiante(centroId, id, { grupoId } = {}) {
  await requireCentroAccess(centroId)
  if (!grupoId) return { error: 'Selecciona el grupo donde se reincorpora.' }

  const now = new Date().toISOString()
  const hoy = hoyISO()
  const { year, month } = ym(hoy)
  const resultado = await withTransaction(async (query) => {
    const errorMes = await bloquearMesesEditables(query, centroId, [{ year, month }])
    if (errorMes) return { error: errorMes }
    const [est] = await query`
      SELECT * FROM estudiantes
      WHERE id = ${id} AND centro_id = ${centroId}
      FOR UPDATE
    `
    if (!est) return { error: 'El estudiante no pertenece a este centro.' }
    if (est.estado !== 'retirado') return { error: 'El estudiante no está retirado.' }
    const [g] = await query`
      SELECT id FROM grupos
      WHERE id = ${grupoId} AND centro_id = ${centroId} AND estado = 'activo'
    `
    if (!g) return { error: 'El grupo no está activo o no pertenece a este centro.' }
    const errorGrupo = await grupoAceptaNinos(centroId, grupoId, query)
    if (errorGrupo) return { error: errorGrupo }
    await query`
      UPDATE estudiantes SET estado = 'activo', grupo_id = ${grupoId}, status_plataforma = 'INCLUIR',
        motivo_retiro = NULL, fecha_retiro = NULL, updated_at = ${now}
      WHERE id = ${id}
    `
    await query`
      INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, a_grupo_id)
      VALUES (${id}, ${centroId}, 'reincorporacion', ${year}, ${month}, ${hoy}, ${grupoId})
    `
    return { ok: true }
  })
  if (resultado.error) return resultado
  // Cupos al CRM si el grupo está vinculado a una clase de prueba (best effort).
  await pushCuposAlCrm(centroId, grupoId)
  return resultado
}
