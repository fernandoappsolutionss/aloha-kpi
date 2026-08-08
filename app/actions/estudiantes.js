'use server'
import { sql, withTransaction } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { ITINERARIOS, NIVEL_MAX, ORIGENES, MOTIVOS_RETIRO, STATUS_PLATAFORMA, esOrigenVenta, hoyISO, requiereOrigenVenta } from '../../lib/operaciones'
import { ventanaNuevos } from '../../lib/llenado.mjs'
import { colocacionInvalida } from '../../lib/colocacion.mjs'
import { encolarSyncCrm } from '../../lib/llenado-service'
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

// (Diseño 2026-08-08) Qué bloquea cada cosa — el manual habla de NIÑOS NUEVOS:
// - grupoAceptaNinosNuevos: palanca manual ∧ ventana derivada de nuevos
//   abierta (TINY hasta la semana 4 del libro, KIDS hasta la 2, sobre el nivel
//   VIGENTE del itinerario; KINDER y sin-itinerario exentos;
//   llenado_extendido_hasta la extiende con rastro). La usan el alta nueva —
//   incluida la colocación desde clase de prueba, que entra por
//   inscribirEstudiante — y la PRIMERA colocación de un niño sin grupo (g2-6).
// - grupoAceptaMovimientos: SOLO la palanca. Reincorporar y el cambio de grupo
//   interno no son niños nuevos — el cierre automático de ventana jamás frena
//   un movimiento (pedido explícito de Fernando; la fusión aplica el mismo
//   criterio al destino en app/actions/grupos.js).
// Ambas reciben el grupo ya leído y devuelven mensaje de error o null.
function grupoAceptaNinosNuevos(grupo, hoy = hoyISO()) {
  const v = ventanaNuevos(grupo, hoy)
  if (v.abierta) return null
  if (v.razon === 'no_activo') return 'El grupo no está activo.'
  if (v.razon === 'palanca_cerrada') {
    return `El grupo ${grupo.numero} está cerrado a inscripciones: ya no entra nadie. Ábrelo de nuevo en Grupos y Fusiones si tiene cupo.`
  }
  return `El grupo ${grupo.numero} ya no acepta niños NUEVOS: su ventana venció el ${v.fechaLimite} (manual: Tiny hasta la semana 4 del libro, Kids hasta la 2). Extiende la ventana desde Grupos y Fusiones o apunta la venta a la inducción del próximo nivel.`
}

function grupoAceptaMovimientos(grupo) {
  if (!grupo || grupo.estado !== 'activo') return 'El grupo no está activo o no pertenece a este centro.'
  if (grupo.inscripcion_abierta === false) {
    return `El grupo ${grupo.numero} está cerrado a inscripciones: ya no entra nadie. Ábrelo de nuevo en Grupos y Fusiones si tiene cupo.`
  }
  return null
}

// El grupo completo del centro (las validaciones de ventana necesitan
// itinerario_clases y llenado_extendido_hasta). null si no pertenece.
// Con el `query` de una transacción interactiva (lib/db.js withTransaction) y
// `bloquear`, la fila queda tomada hasta el COMMIT: así el gate de ventana se
// evalúa sobre un grupo que nadie puede cerrar mientras se escribe el alta.
async function grupoDe(centroId, grupoId, query = sql, { bloquear = false } = {}) {
  const filas = bloquear
    ? await query`SELECT * FROM grupos WHERE id = ${grupoId} AND centro_id = ${centroId} FOR UPDATE`
    : await query`SELECT * FROM grupos WHERE id = ${grupoId} AND centro_id = ${centroId}`
  return filas[0] || null
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
  const hoy = hoyISO()
  if (grupoId) {
    const g = await grupoDe(centroId, grupoId)
    if (!g) return { error: 'El grupo no pertenece a este centro.' }
    // Prechequeo con mensaje amable; la garantía real la da el gate atómico
    // de abajo, que relee el MISMO grupo con FOR UPDATE dentro de la
    // transacción (incluido el override llenado_extendido_hasta).
    const err = grupoAceptaNinosNuevos(g, hoy)
    if (err) return { error: err }
    // (Defecto 10) Matriz de colocación: la misma regla que frena una fusión
    // frena la colocación del niño nuevo (réplica de lib/fusiones.js:130-148
    // en lib/colocacion.mjs) — el modal de inscripción desde la clase de
    // prueba ya no puede meter un Tiny a un grupo Kids ni un Kids <3 a Tiny.
    const errCol = colocacionInvalida({ itinerario, nivel }, g.itinerario)
    if (errCol) return { error: errCol }
  }
  const crmId = data?.crm_registration_id?.trim() || null
  if (crmId) {
    const [dup] = await sql`SELECT id FROM estudiantes WHERE centro_id = ${centroId} AND crm_registration_id = ${crmId}`
    if (dup) return { error: 'Este registro ya fue inscrito.' }
  }
  const fecha = data?.fecha || hoy
  if (!FECHA_RE.test(fecha)) return { error: 'Fecha de inscripción inválida (AAAA-MM-DD).' }
  const origenVenta = data?.origen_venta ? String(data.origen_venta).trim().toLowerCase() : null
  if (origenVenta && !esOrigenVenta(origenVenta)) return { error: 'Origen comercial inválido.' }
  if (!origenVenta && requiereOrigenVenta(fecha)) return { error: 'Selecciona el origen comercial de la venta.' }
  const { year, month } = ym(fecha)
  const fechaCierre = data?.fecha_cierre_nivel || null
  if (fechaCierre && !FECHA_RE.test(fechaCierre)) return { error: 'Fecha de cierre de nivel inválida (AAAA-MM-DD).' }

  const now = new Date().toISOString()
  // (g2-3) Alta ATÓMICA: mes editable, gate de ventana sobre el grupo releído y
  // BLOQUEADO, duplicado de CRM, estudiante, evento y outbox van en la MISMA
  // transacción SERIALIZABLE — si la palanca se cerró o la ventana venció entre
  // el prechequeo y el commit, no queda nada a medias. El CRM se entera por el
  // outbox (ya NO pushCuposAlCrm inline): el consumidor del cron empuja el
  // estado vigente y loadOperaciones nunca espera red externa.
  let resultado
  try {
    resultado = await withTransaction(async (query) => {
      // ORDEN DE LOCKS grupos → mes_kpi → estudiantes, el mismo de
      // actualizarGrupo (PR #81): tomarlos siempre en este orden evita deadlocks
      // entre editar el grupo e inscribir en él. El ORDEN DE MENSAJES no cambia:
      // se bloquea primero y se evalúa después.
      const g = grupoId ? await grupoDe(centroId, grupoId, query, { bloquear: true }) : null
      const errorMes = await bloquearMesesEditables(query, centroId, [{ year, month }])
      if (errorMes) return { error: errorMes }
      if (grupoId) {
        if (!g) return { error: 'El grupo no pertenece a este centro.' }
        // Ventana de niños NUEVOS + palanca, sobre la fila ya bloqueada. Límite
        // nulo (KINDER o itinerario legacy) = exento: nunca cerrar a ciegas.
        const errorGrupo = grupoAceptaNinosNuevos(g, hoy)
        if (errorGrupo) return { error: errorGrupo }
        const errorColocacion = colocacionInvalida({ itinerario, nivel }, g.itinerario)
        if (errorColocacion) return { error: errorColocacion }
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
          origen_venta, crm_registration_id, fecha_inscripcion, fecha_cierre_nivel, representante, correo, telefono, notas, updated_at)
        VALUES (${centroId}, ${grupoId}, ${nombre}, ${itinerario}, ${nivel}, 'activo', 'INCLUIR', ${origen},
          ${origenVenta}, ${crmId}, ${fecha}, ${fechaCierre}, ${data?.representante?.trim() || null}, ${data?.correo?.trim() || null},
          ${data?.telefono?.trim() || null}, ${data?.notas?.trim() || null}, ${now})
        RETURNING id
      `
      await query`
        INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, a_grupo_id, a_nivel)
        VALUES (${e.id}, ${centroId}, 'inscripcion', ${year}, ${month}, ${fecha}, ${grupoId}, ${nivel})
      `
      // Cupos al CRM vía outbox, en la MISMA transacción que el alta.
      if (grupoId) await encolarSyncCrm([grupoId], 'inscripcion', query)
      return { ok: true, estudianteId: e.id }
    })
  } catch (error) {
    if (crmId && error?.code === '23505') return { error: 'Este registro ya fue inscrito.' }
    throw error
  }
  return resultado
}

// Edición general. Si cambia el nivel registra evento 'cambio_nivel'; si cambia
// el grupo, 'cambio_grupo'. Solo se tocan los campos que vienen en `data`.
export async function actualizarEstudiante(centroId, id, data) {
  await requireCentroAccess(centroId)
  for (const campo of ['fecha_inscripcion', 'fecha_cierre_nivel', 'ultima_asistencia']) {
    if (data?.[campo] && !FECHA_RE.test(data[campo])) return { error: 'Las fechas van en formato AAAA-MM-DD.' }
  }
  const [esperado] = await sql`SELECT * FROM estudiantes WHERE id = ${id} AND centro_id = ${centroId}`
  if (!esperado) return { error: 'El estudiante no pertenece a este centro.' }

  const grupoSolicitado = data?.grupo_id !== undefined ? data.grupo_id || null : esperado.grupo_id
  if (grupoSolicitado != null && !Number.isInteger(Number(grupoSolicitado))) {
    return { error: 'Grupo inválido.' }
  }
  const hoy = hoyISO()
  const { year, month } = ym(hoy)
  const gruposABloquear = [...new Set([esperado.grupo_id, grupoSolicitado]
    .filter((grupoId) => grupoId != null)
    .map(String))]
    .sort((a, b) => Number(a) - Number(b))

  return await withTransaction(async (query) => {
    // Orden común del módulo: grupos -> mes -> estudiante. La lectura inicial
    // solo define qué filas tomar; la ficha se relee y valida bajo FOR UPDATE.
    const gruposBloqueados = new Map()
    for (const grupoId of gruposABloquear) {
      const grupo = await grupoDe(centroId, grupoId, query, { bloquear: true })
      if (grupo) gruposBloqueados.set(String(grupo.id), grupo)
    }
    const errorMes = await bloquearMesesEditables(query, centroId, [{ year, month }])
    if (errorMes) return { error: errorMes }

    const [est] = await query`
      SELECT * FROM estudiantes
      WHERE id = ${id} AND centro_id = ${centroId}
      FOR UPDATE
    `
    if (!est) return { error: 'El estudiante no pertenece a este centro.' }
    if (String(est.grupo_id ?? '') !== String(esperado.grupo_id ?? '')) {
      return { error: 'Otro usuario cambió el grupo de este niño. Recarga antes de continuar.' }
    }

    const nombre = data?.nombre !== undefined ? String(data.nombre).trim() : est.nombre
    if (!nombre) return { error: 'El nombre es requerido.' }
    const itinerario = data?.itinerario !== undefined ? data.itinerario : est.itinerario
    if (!ITINERARIOS.includes(itinerario)) return { error: 'Itinerario inválido.' }
    const nivel = data?.nivel !== undefined ? intOr(data.nivel) : Number(est.nivel)
    if (nivel < 1 || nivel > NIVEL_MAX[itinerario]) {
      return { error: `El nivel de ${itinerario} va de 1 a ${NIVEL_MAX[itinerario]}.` }
    }
    const grupoId = data?.grupo_id !== undefined ? data.grupo_id || null : est.grupo_id
    const cambioGrupo = String(grupoId ?? '') !== String(est.grupo_id ?? '')
    if (cambioGrupo && grupoId) {
      const grupo = gruposBloqueados.get(String(grupoId))
      if (!grupo) return { error: 'El grupo no pertenece a este centro.' }
      let tuvoGrupo = est.grupo_id != null
      if (!tuvoGrupo) {
        const [eventoConGrupo] = await query`
          SELECT id FROM estudiante_eventos
          WHERE estudiante_id = ${id} AND a_grupo_id IS NOT NULL LIMIT 1
        `
        tuvoGrupo = !!eventoConGrupo
      }
      const errorGrupo = tuvoGrupo ? grupoAceptaMovimientos(grupo) : grupoAceptaNinosNuevos(grupo, hoy)
      if (errorGrupo) return { error: errorGrupo }
      const errorColocacion = colocacionInvalida({ itinerario, nivel }, grupo.itinerario)
      if (errorColocacion) return { error: errorColocacion }
    }

    const statusPlataforma = data?.status_plataforma !== undefined ? data.status_plataforma : est.status_plataforma
    if (statusPlataforma && !STATUS_PLATAFORMA.includes(statusPlataforma)) {
      return { error: 'Status de plataforma inválido.' }
    }
    const origen = data?.origen !== undefined ? data.origen : est.origen
    if (origen && !ORIGENES.includes(origen)) return { error: 'Origen inválido.' }
    const origenVenta = data?.origen_venta !== undefined
      ? String(data.origen_venta || '').trim().toLowerCase() || null
      : est.origen_venta
    if (origenVenta && !esOrigenVenta(origenVenta)) return { error: 'Origen comercial inválido.' }
    const fechaDe = (campo) => (data?.[campo] !== undefined ? data[campo] || null : est[campo])
    const textoDe = (campo) => {
      if (data?.[campo] === undefined) return est[campo]
      return data[campo] == null ? null : String(data[campo]).trim() || null
    }
    const now = new Date().toISOString()

    await query`
      UPDATE estudiantes SET
        nombre = ${nombre}, itinerario = ${itinerario}, nivel = ${nivel}, grupo_id = ${grupoId},
        status_plataforma = ${statusPlataforma}, origen = ${origen}, origen_venta = ${origenVenta},
        fecha_inscripcion = ${fechaDe('fecha_inscripcion')},
        fecha_cierre_nivel = ${fechaDe('fecha_cierre_nivel')},
        ultima_asistencia = ${fechaDe('ultima_asistencia')},
        representante = ${textoDe('representante')}, correo = ${textoDe('correo')},
        telefono = ${textoDe('telefono')}, notas = ${textoDe('notas')}, updated_at = ${now}
      WHERE id = ${id}
    `
    if (nivel !== Number(est.nivel)) {
      await query`
        INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, de_nivel, a_nivel)
        VALUES (${id}, ${centroId}, 'cambio_nivel', ${year}, ${month}, ${hoy}, ${Number(est.nivel)}, ${nivel})
      `
    }
    if (cambioGrupo) {
      await query`
        INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, de_grupo_id, a_grupo_id)
        VALUES (${id}, ${centroId}, 'cambio_grupo', ${year}, ${month}, ${hoy}, ${est.grupo_id}, ${grupoId})
      `
      await encolarSyncCrm([est.grupo_id, grupoId], 'cambio_grupo', query)
    }
    return { ok: true }
  })
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
    // Cupos al CRM vía outbox si el grupo está vinculado a una clase de prueba,
    // en la MISMA transacción (ya NO push inline: el consumidor del cron empuja
    // el estado vigente).
    if (est.grupo_id) await encolarSyncCrm([est.grupo_id], 'retiro', query)
    return { ok: true, grupoId: est.grupo_id, ultimaAsis }
  })
  if (resultado.error) return resultado

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
    // Mismo orden de locks que el alta: grupos → mes_kpi → estudiantes.
    // Reincorporar es MOVIMIENTO, no niño nuevo: solo respeta la palanca manual
    // (la ventana de nuevos vencida jamás frena un regreso). El grupo se relee
    // BLOQUEADO para que la palanca no se cierre entre el chequeo y el commit.
    const g = await grupoDe(centroId, grupoId, query, { bloquear: true })
    const errorMes = await bloquearMesesEditables(query, centroId, [{ year, month }])
    if (errorMes) return { error: errorMes }
    const [est] = await query`
      SELECT * FROM estudiantes
      WHERE id = ${id} AND centro_id = ${centroId}
      FOR UPDATE
    `
    if (!est) return { error: 'El estudiante no pertenece a este centro.' }
    if (est.estado !== 'retirado') return { error: 'El estudiante no está retirado.' }
    const errorGrupo = grupoAceptaMovimientos(g)
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
    // Cupos al CRM vía outbox si el grupo está vinculado a una clase de prueba,
    // en la MISMA transacción (ya NO push inline).
    await encolarSyncCrm([grupoId], 'reincorporacion', query)
    return { ok: true }
  })
  return resultado
}
