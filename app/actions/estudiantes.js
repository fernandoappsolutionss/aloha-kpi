'use server'
import { sql, withTransaction } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { ITINERARIOS, NIVEL_MAX, ORIGENES, MOTIVOS_RETIRO, STATUS_PLATAFORMA, esOrigenVenta, hoyISO, fechaIso10, requiereOrigenVenta } from '../../lib/operaciones'
import { ventanaNuevos } from '../../lib/llenado.mjs'
import { colocacionInvalida } from '../../lib/colocacion.mjs'
import { encolarSyncCrm } from '../../lib/llenado-service'
import { bloquearMesesEditables } from '../../lib/mes-kpi'
import { ejecutarRetiroEn } from '../../lib/retiros-service'
import {
  anclaDeAlta,
  periodosCorreccionInscripcion,
  primerDiaMesSiguiente,
  estadoPrevioDeProgramacion,
} from '../../lib/retiros.mjs'
import { planNino, posicionPlanNino, calendarioVersionadoDe, crearMemoPlanes, enriquecerNinos } from '../../lib/plan-nino.mjs'
import { reAnclaEnDestino } from '../../lib/plan-grupo.mjs'
import { ORIGENES_ANCLA, TIPOS_EVENTO_ANCLA, errorFechaAncla, sugerenciasAncla, topeAncla } from '../../lib/ancla-sugerencias.mjs'
import { idsDeLote, preparaFijadoAncla } from '../../lib/ancla-lote.mjs'

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/
const intOr = (v, d = 0) => {
  const n = parseInt(v)
  return Number.isFinite(n) ? n : d
}
const ym = (fecha) => {
  const [y, m] = String(fecha).split('-').map(Number)
  return { year: y, month: m }
}

// El país del centro define sus fechas patrias (mismo criterio que
// app/actions/grupos.js; el nombre es solo respaldo pre-columna pais).
const paisDe = (c) => (c?.pais === 'VE' || (!c?.pais && /naranjos/i.test(c?.nombre || '')) ? 'VE' : 'PA')

// itinerario_clases llega como objeto (JSONB) o, defensivamente, como string.
const itinerarioVigenteDe = (v) => {
  if (v == null) return null
  if (typeof v === 'string') {
    try { return JSON.parse(v) } catch { return null }
  }
  return v
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
  // Cerrado por nivel avanzado no tiene fecha límite que mostrar: decir
  // "venció el null" era el mensaje que salía antes de esta rama.
  if (v.razon === 'nivel_avanzado') {
    return `El grupo ${grupo.numero} ya no acepta niños NUEVOS: su llenado fue en el arranque y hoy va en un nivel más adelantado. Extiende la ventana desde Grupos y Fusiones (queda registrado) o coloca al niño en un grupo en llenado.`
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

// Lado {calendarioVersionado, excepciones, pais} de un grupo para el
// re-anclaje g1-9 (mismo armado que aplicarFusion): calendario y excepciones
// salen de la fila del grupo + sus horarios, leídos DENTRO de la transacción.
async function ladoPlanDe(query, grupoFila, pais) {
  if (!grupoFila) return null
  const it = itinerarioVigenteDe(grupoFila.itinerario_clases)
  const horarios = await query`SELECT dia FROM grupo_horarios WHERE grupo_id = ${grupoFila.id}`
  const grupoCal = { id: grupoFila.id, itinerario_clases: it, horarios }
  return { calendarioVersionado: calendarioVersionadoDe(grupoCal), excepciones: it?.excepciones || [], pais }
}

// Posición derivada de un niño en el calendario de un grupo (para el detalle
// de los eventos de cierre de nivel, g1-11): sin lado o sin ancla ⇒ sin_plan
// explícito — nada se inventa.
function posicionEn(lado, ancla, nivel, hoy, memo) {
  if (!lado) return { estado: 'sin_plan', indice: null }
  const plan = planNino({
    ancla,
    nivel,
    pais: lado.pais,
    calendarioVersionado: lado.calendarioVersionado,
    excepciones: lado.excepciones,
  }, memo)
  const p = posicionPlanNino(plan, hoy)
  return { estado: p.estado, indice: p.indice }
}

// Alta de un niño (clase de prueba, inscripción directa o traslado).
// (g1-8) Con grupo asignado: el evento de venta nace AQUÍ (con origen copiado
// atómicamente, g1-17) y el ancla = max(fecha_inscripcion,
// grupo.fecha_inicio_clases). SIN grupo: flujo `pendiente` — ficha solamente,
// SIN evento de venta y SIN ancla; ambos nacen en la PRIMERA COLOCACIÓN
// (actualizarEstudiante, tratada como niño nuevo).
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
  // (g1-11) fecha_cierre_nivel = OVERRIDE MANUAL: solo se escribe si el form
  // la trajo; el cierre derivado se calcula al vuelo y jamás se persiste.
  const fechaCierre = data?.fecha_cierre_nivel || null
  if (fechaCierre && !FECHA_RE.test(fechaCierre)) return { error: 'Fecha de cierre de nivel inválida (AAAA-MM-DD).' }

  const now = new Date().toISOString()
  // (g2-3) Alta ATÓMICA: mes editable, gate de ventana sobre el grupo releído y
  // BLOQUEADO, duplicado de CRM, estudiante (ficha + ancla + cierre), evento y
  // outbox van en la MISMA transacción SERIALIZABLE — si la palanca se cerró o
  // la ventana venció entre el prechequeo y el commit, no queda nada a medias.
  // El CRM se entera por el outbox (ya NO pushCuposAlCrm inline).
  let resultado
  try {
    resultado = await withTransaction(async (query) => {
      // ORDEN DE LOCKS grupos → mes_kpi → estudiantes, el mismo de
      // actualizarGrupo (PR #81): tomarlos siempre en este orden evita deadlocks
      // entre editar el grupo e inscribir en él. El ORDEN DE MENSAJES no cambia:
      // se bloquea primero y se evalúa después.
      const g = grupoId ? await grupoDe(centroId, grupoId, query, { bloquear: true }) : null
      // El mes KPI solo importa cuando nace el evento de venta (con grupo). El
      // alta pendiente es ficha pura: ningún periodo del cuadro se toca (g1-8).
      if (grupoId) {
        const errorMes = await bloquearMesesEditables(query, centroId, [{ year, month }])
        if (errorMes) return { error: errorMes }
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
      // (g1-8) Ancla por niño: con grupo, max(fecha_inscripcion,
      // fecha_inicio_clases del grupo BLOQUEADO); sin grupo, NULL (pendiente).
      const ancla = grupoId ? anclaDeAlta(fecha, g.fecha_inicio_clases) : null
      const [e] = await query`
        INSERT INTO estudiantes (centro_id, grupo_id, nombre, itinerario, nivel, estado, status_plataforma, origen,
          origen_venta, crm_registration_id, fecha_inscripcion, fecha_inicio_nivel, fecha_cierre_nivel, representante, correo, telefono, notas, updated_at)
        VALUES (${centroId}, ${grupoId}, ${nombre}, ${itinerario}, ${nivel}, 'activo', 'INCLUIR', ${origen},
          ${origenVenta}, ${crmId}, ${fecha}, ${ancla}, ${fechaCierre}, ${data?.representante?.trim() || null}, ${data?.correo?.trim() || null},
          ${data?.telefono?.trim() || null}, ${data?.notas?.trim() || null}, ${now})
        RETURNING id
      `
      if (grupoId) {
        // Evento de VENTA canónico (g1-17): origen copiado atómicamente del alta.
        await query`
          INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, a_grupo_id, a_nivel, origen)
          VALUES (${e.id}, ${centroId}, 'inscripcion', ${year}, ${month}, ${fecha}, ${grupoId}, ${nivel}, ${origen})
        `
        // Cupos al CRM vía outbox, en la MISMA transacción que el alta.
        await encolarSyncCrm([grupoId], 'inscripcion', query)
      }
      return { ok: true, estudianteId: e.id, pendiente: !grupoId }
    })
  } catch (error) {
    // El índice único (centro_id, crm_registration_id) es la última palabra
    // contra dos altas simultáneas del mismo registro de CRM: el 23505 se
    // traduce al mismo mensaje del prechequeo, nunca a un error crudo.
    if (crmId && error?.code === '23505') return { error: 'Este registro ya fue inscrito.' }
    throw error
  }
  return resultado
}

// Edición general — TODO en UNA transacción (ficha + ancla + cierre + eventos
// + outbox, g1-8/g1-9/g1-19). Ramas:
// - Cambio de nivel manual: evento 'cambio_nivel' con el CIERRE del nivel que
//   termina en detalle (anclas y posiciones antes/después) y ancla nueva =
//   fecha del cambio.
// - PRIMERA colocación de un pendiente: nace el evento de venta canónico con
//   fecha = fecha de colocación (hoy Panamá, bajo lock del mes) y ancla =
//   max(fecha_colocacion, fecha_inicio_clases del grupo) — JAMÁS la
//   fecha_inscripcion vieja de la ficha (g1-8, corrección g2-1).
// - Traslado de grupo: re-anclaje semántico al calendario del destino (g1-9,
//   mismo motor que la fusión); sin equivalente se aborta con error legible.
// - Corrección de fecha_inscripcion: flujo de 4 periodos (g1-19).
// ultimaAsistencia SALIÓ del contrato público (g1-23): se deriva server-side
// de las asistencias y este endpoint la ignora aunque el payload la traiga.
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
  if (data?.grupo_id !== undefined) grupoId = data.grupo_id || null
  const cambiaGrupo = String(grupoId ?? '') !== String(est.grupo_id ?? '')
  if (cambiaGrupo && grupoId) {
    const g = await grupoDe(centroId, grupoId)
    if (!g) return { error: 'El grupo no pertenece a este centro.' }
  }
  const statusPlataforma = data?.status_plataforma !== undefined ? data.status_plataforma : est.status_plataforma
  if (statusPlataforma && !STATUS_PLATAFORMA.includes(statusPlataforma)) return { error: 'Status de plataforma inválido.' }
  const origen = data?.origen !== undefined ? data.origen : est.origen
  if (origen && !ORIGENES.includes(origen)) return { error: 'Origen inválido.' }
  // Canal comercial de la venta (independiente del origen técnico de arriba):
  // alimenta los orig_* del KPI.
  const origenVenta = data?.origen_venta !== undefined
    ? String(data.origen_venta || '').trim().toLowerCase() || null
    : est.origen_venta
  if (origenVenta && !esOrigenVenta(origenVenta)) return { error: 'Origen comercial inválido.' }
  // (g1-23) ultima_asistencia ya NO se edita desde aquí: es derivada.
  for (const campo of ['fecha_inscripcion', 'fecha_cierre_nivel']) {
    if (data?.[campo] && !FECHA_RE.test(data[campo])) return { error: 'Las fechas van en formato AAAA-MM-DD.' }
  }
  // (g1-19) La fecha de inscripción NUNCA se vacía.
  if (data?.fecha_inscripcion !== undefined && !data.fecha_inscripcion) {
    return { error: 'La fecha de inscripción no se puede vaciar: corrígela si hace falta, pero todo niño la necesita.' }
  }
  const fechaInscripcionNueva = data?.fecha_inscripcion !== undefined
    ? String(data.fecha_inscripcion).slice(0, 10)
    : fechaIso10(est.fecha_inscripcion)
  const corrigeInscripcion = fechaInscripcionNueva !== fechaIso10(est.fecha_inscripcion)
  const cierreDe = () => (data?.fecha_cierre_nivel !== undefined ? data.fecha_cierre_nivel || null : est.fecha_cierre_nivel)
  const textoDe = (campo) => {
    if (data?.[campo] === undefined) return est[campo]
    return data[campo] == null ? null : String(data[campo]).trim() || null
  }
  const nivelCambia = nivel !== Number(est.nivel)

  const now = new Date().toISOString()
  const ERROR_CARRERA = 'El estudiante cambió mientras editabas (otra pestaña u otro usuario). Recarga antes de continuar.'
  return await withTransaction(async (query) => {
    const hoy = hoyISO()
    const { year: yHoy, month: mHoy } = ym(hoy)
    // ORDEN DE LOCKS grupos → mes_kpi → estudiantes (PR #81). Destino y origen
    // del traslado se bloquean en UN statement ordenado por id (patrón de
    // aplicarFusion): dos ediciones cruzadas no se traban entre sí.
    const idsGrupos = [
      ...(cambiaGrupo && grupoId ? [Number(grupoId)] : []),
      ...(cambiaGrupo && est.grupo_id ? [Number(est.grupo_id)] : []),
    ].sort((a, b) => a - b)
    const gruposBloqueados = idsGrupos.length
      ? await query`
          SELECT * FROM grupos
          WHERE id = ANY(${idsGrupos}::int[]) AND centro_id = ${centroId}
          ORDER BY id
          FOR UPDATE
        `
      : []
    const destino = cambiaGrupo && grupoId
      ? gruposBloqueados.find((x) => String(x.id) === String(grupoId)) || null
      : null
    const origenGrupo = cambiaGrupo && est.grupo_id
      ? gruposBloqueados.find((x) => String(x.id) === String(est.grupo_id)) || null
      : null
    if (cambiaGrupo && grupoId && !destino) return { error: 'El grupo no pertenece a este centro.' }

    // Historia del niño DENTRO de la transacción: define pendiente/colocado.
    const eventosIns = await query`
      SELECT id, fecha, year, month, a_grupo_id FROM estudiante_eventos
      WHERE estudiante_id = ${id} AND tipo = 'inscripcion'
      ORDER BY fecha, id
    `
    const [evConGrupo] = await query`
      SELECT id FROM estudiante_eventos
      WHERE estudiante_id = ${id} AND a_grupo_id IS NOT NULL LIMIT 1
    `
    // (g2-6) PRIMERA COLOCACIÓN cuenta como niño NUEVO: sin grupo actual y sin
    // historial de grupo. Pendiente PURO (g1-8): además sin evento de venta —
    // su KPI nace al colocarlo, no antes.
    const tuvoGrupo = est.grupo_id != null || !!evConGrupo
    const esPendientePuro = !tuvoGrupo && eventosIns.length === 0
    const primeraColocacion = cambiaGrupo && grupoId && !tuvoGrupo

    // ¿La corrección de fecha toca periodos KPI? Solo si el niño tiene evento
    // canónico (g1-19, corrección g2-1): el pendiente sin evento corrige la
    // ficha y ningún periodo se bloquea.
    let eventoCanonico = null
    if (corrigeInscripcion && eventosIns.length > 0) {
      if (eventosIns.length > 1) {
        return { error: `El niño tiene ${eventosIns.length} eventos de inscripción y debería tener UNO: repara la historia (dedupe g1-17) antes de corregir la fecha.` }
      }
      eventoCanonico = eventosIns[0]
    }
    if (corrigeInscripcion && eventosIns.length === 0 && tuvoGrupo) {
      return { error: 'El niño está colocado pero no tiene evento canónico de inscripción: repara la historia (backfill g1-12) antes de corregir la fecha.' }
    }

    // Bloqueo de meses en UNA sola llamada ordenada: el mes de hoy si nacen
    // eventos ahora, y los 4 periodos de la corrección (g1-19).
    const periodos = []
    const nacenEventosHoy = (nivelCambia && !esPendientePuro) || (cambiaGrupo && !esPendientePuro) || primeraColocacion
    if (nacenEventosHoy) periodos.push({ year: yHoy, month: mHoy })
    if (eventoCanonico) {
      periodos.push(...periodosCorreccionInscripcion({
        fechaFichaVieja: est.fecha_inscripcion,
        evento: eventoCanonico,
        fechaNueva: fechaInscripcionNueva,
      }))
    }
    if (periodos.length) {
      const errorMes = await bloquearMesesEditables(query, centroId, periodos)
      if (errorMes) return { error: errorMes }
    }

    // El niño, bloqueado. La decisión (nivel viejo, grupo viejo, ancla) se
    // tomó sobre la lectura previa: si la fila ya no coincide, se aborta.
    const [bloqueado] = await query`
      SELECT * FROM estudiantes WHERE id = ${id} AND centro_id = ${centroId} FOR UPDATE
    `
    if (!bloqueado) return { error: 'El estudiante no pertenece a este centro.' }
    if (
      String(bloqueado.grupo_id ?? '') !== String(est.grupo_id ?? '') ||
      Number(bloqueado.nivel) !== Number(est.nivel) ||
      bloqueado.itinerario !== est.itinerario ||
      bloqueado.estado !== est.estado ||
      fechaIso10(bloqueado.fecha_inscripcion) !== fechaIso10(est.fecha_inscripcion) ||
      fechaIso10(bloqueado.fecha_inicio_nivel) !== fechaIso10(est.fecha_inicio_nivel)
    ) {
      return { error: ERROR_CARRERA }
    }

    // Gates del destino sobre la fila BLOQUEADA: primera colocación = niño
    // nuevo (ventana completa); traslado real = movimiento (solo palanca).
    if (cambiaGrupo && grupoId) {
      const errorGrupo = tuvoGrupo ? grupoAceptaMovimientos(destino) : grupoAceptaNinosNuevos(destino, hoy)
      if (errorGrupo) return { error: errorGrupo }
      // (Defecto 10) Matriz de colocación, igual que en inscribirEstudiante:
      // se valida con el itinerario/nivel que el niño tendrá TRAS esta edición.
      const errCol = colocacionInvalida({ itinerario, nivel }, destino.itinerario)
      if (errCol) return { error: errCol }
    }

    const [centro] = await query`SELECT nombre, pais FROM centros WHERE id = ${centroId}`
    const pais = paisDe(centro)
    const memo = crearMemoPlanes()

    // ── Ancla y eventos ──────────────────────────────────────────────────────
    let ancla = fechaIso10(est.fecha_inicio_nivel)
    const eventos = [] // se insertan al final, tras decidir la ficha completa

    // (g1-19) Corrección con evento canónico: lock del evento + CAS, ficha +
    // evento (fecha y year/month) + ancla inicial si no hubo transición.
    if (eventoCanonico) {
      const [evBloqueado] = await query`
        SELECT * FROM estudiante_eventos WHERE id = ${eventoCanonico.id} FOR UPDATE
      `
      if (
        !evBloqueado || evBloqueado.tipo !== 'inscripcion' ||
        fechaIso10(evBloqueado.fecha) !== fechaIso10(eventoCanonico.fecha) ||
        Number(evBloqueado.year) !== Number(eventoCanonico.year) ||
        Number(evBloqueado.month) !== Number(eventoCanonico.month)
      ) {
        return { error: ERROR_CARRERA }
      }
      const { year: yN, month: mN } = ym(fechaInscripcionNueva)
      await query`
        UPDATE estudiante_eventos SET fecha = ${fechaInscripcionNueva}, year = ${yN}, month = ${mN}
        WHERE id = ${eventoCanonico.id}
      `
      // Ancla INICIAL: solo si el niño no tuvo transición posterior (cambio de
      // nivel, graduación, fusión o cambio de grupo re-anclan por su cuenta —
      // si existe cualquiera, la ancla vigente ya no es la inicial y no se toca).
      const [transicion] = await query`
        SELECT id FROM estudiante_eventos
        WHERE estudiante_id = ${id}
          AND tipo IN ('cambio_nivel', 'graduacion_tiny', 'fusion', 'cambio_grupo')
        LIMIT 1
      `
      if (!transicion) {
        const [gIns] = eventoCanonico.a_grupo_id
          ? await query`SELECT fecha_inicio_clases FROM grupos WHERE id = ${eventoCanonico.a_grupo_id}`
          : [null]
        ancla = anclaDeAlta(fechaInscripcionNueva, gIns?.fecha_inicio_clases)
      }
    }

    // Lados del plan para posiciones y re-anclaje (solo si hacen falta).
    const ladoOrigen = cambiaGrupo && origenGrupo ? await ladoPlanDe(query, origenGrupo, pais) : null
    const ladoDestino = cambiaGrupo && destino ? await ladoPlanDe(query, destino, pais) : null

    // Cambio de NIVEL manual (g1-11): cierre del nivel que termina en detalle
    // (anclas y posiciones antes/después) y ancla nueva = fecha del cambio.
    // En un pendiente puro el nivel es solo dato de ficha: sin venta no hay
    // transición que registrar (sus eventos nacen en la primera colocación).
    if (nivelCambia && !esPendientePuro) {
      // Posición ANTES en el calendario donde el niño estaba (origen si además
      // se traslada); posición DESPUÉS en el calendario donde quedará.
      const ladoActual = cambiaGrupo
        ? ladoOrigen
        : est.grupo_id ? await ladoPlanDe(query, await grupoDe(centroId, est.grupo_id, query), pais) : null
      const ladoNuevo = cambiaGrupo ? ladoDestino : ladoActual
      const detalle = {
        origen: 'cambio_nivel_manual',
        cierre_nivel_terminado: hoy,
        ancla_antes: ancla,
        posicion_antes: posicionEn(ladoActual, ancla, Number(est.nivel), hoy, memo),
        ancla_despues: hoy,
        posicion_despues: posicionEn(ladoNuevo, hoy, nivel, hoy, memo),
      }
      eventos.push({
        tipo: 'cambio_nivel', fecha: hoy, year: yHoy, month: mHoy,
        de_nivel: Number(est.nivel), a_nivel: nivel, detalle,
      })
      ancla = hoy
    }

    // Cambio de GRUPO.
    if (cambiaGrupo) {
      if (primeraColocacion) {
        if (eventosIns.length === 0) {
          // (g1-8/g2-1) Nace la fecha KPI canónica: evento_inscripcion.fecha =
          // fecha de colocación (hoy, bajo el lock del mes de hoy), con origen
          // copiado atómicamente. La fecha_inscripcion vieja de la ficha
          // pendiente NO backdatea ni la venta ni el ancla.
          eventos.push({
            tipo: 'inscripcion', fecha: hoy, year: yHoy, month: mHoy,
            a_grupo_id: grupoId, a_nivel: nivel, origen,
          })
        } else {
          // Pendiente LEGACY con venta ya contada: la colocación es un
          // movimiento de grupo, sin segunda inscripción canónica (g1-17).
          eventos.push({
            tipo: 'cambio_grupo', fecha: hoy, year: yHoy, month: mHoy,
            de_grupo_id: est.grupo_id, a_grupo_id: grupoId,
          })
        }
        ancla = anclaDeAlta(hoy, destino.fecha_inicio_clases)
      } else if (grupoId && !nivelCambia) {
        // (g1-9) TRASLADO: se conserva la posición semántica en el calendario
        // del destino — misma semana (mismo índice), ancla más cercana, empate
        // → la más antigua; sin equivalente se aborta TODA la edición. El niño
        // sin plan derivable se mueve sin re-anclar (nada se inventa).
        const r = reAnclaEnDestino({
          ancla,
          nivel,
          hoy,
          origen: ladoOrigen || {},
          destino: ladoDestino || {},
        }, memo)
        if (r === null) {
          return { error: `El traslado no se aplicó: el horario del grupo ${destino.numero} no tiene una semana equivalente para la posición actual del niño (nivel ${nivel}, ancla ${ancla}). Ajusta el plan del destino o elige otro grupo.` }
        }
        const detalle = {
          ancla_antes: ancla,
          posicion_antes: r.sinPlan ? { estado: 'sin_plan', indice: null } : r.antes,
          ancla_despues: r.sinPlan ? ancla : r.ancla,
          posicion_despues: r.sinPlan ? { estado: 'sin_plan', indice: null } : r.despues,
        }
        eventos.push({
          tipo: 'cambio_grupo', fecha: hoy, year: yHoy, month: mHoy,
          de_grupo_id: est.grupo_id, a_grupo_id: grupoId, detalle,
        })
        if (!r.sinPlan) ancla = r.ancla
      } else if (!esPendientePuro) {
        // Traslado con cambio de nivel simultáneo (el evento de nivel ya lleva
        // el ancla nueva = hoy) o salida a "sin grupo": movimiento simple.
        eventos.push({
          tipo: 'cambio_grupo', fecha: hoy, year: yHoy, month: mHoy,
          de_grupo_id: est.grupo_id, a_grupo_id: grupoId,
          detalle: { ancla_antes: fechaIso10(est.fecha_inicio_nivel), ancla_despues: ancla },
        })
      }
    }

    // ── Ficha completa en UN update (incluye ancla y cierre override) ────────
    await query`
      UPDATE estudiantes SET
        nombre = ${nombre}, itinerario = ${itinerario}, nivel = ${nivel}, grupo_id = ${grupoId},
        status_plataforma = ${statusPlataforma}, origen = ${origen}, origen_venta = ${origenVenta},
        fecha_inscripcion = ${fechaInscripcionNueva},
        fecha_inicio_nivel = ${ancla},
        fecha_cierre_nivel = ${cierreDe()},
        representante = ${textoDe('representante')}, correo = ${textoDe('correo')},
        telefono = ${textoDe('telefono')}, notas = ${textoDe('notas')}, updated_at = ${now}
      WHERE id = ${id}
    `
    for (const ev of eventos) {
      await query`
        INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha,
          de_grupo_id, a_grupo_id, de_nivel, a_nivel, origen, detalle)
        VALUES (${id}, ${centroId}, ${ev.tipo}, ${ev.year}, ${ev.month}, ${ev.fecha},
          ${ev.de_grupo_id ?? null}, ${ev.a_grupo_id ?? null}, ${ev.de_nivel ?? null}, ${ev.a_nivel ?? null},
          ${ev.origen ?? null}, ${ev.detalle ? JSON.stringify(ev.detalle) : null})
      `
    }
    // El cambio de grupo mueve cupos en ambos lados: outbox EN la transacción
    // (el consumidor del cron empuja el estado vigente al CRM).
    if (cambiaGrupo) await encolarSyncCrm([est.grupo_id, grupoId], 'cambio_grupo', query)
    return { ok: true }
  })
}

// Graduación Tiny → Kids (manual: todo graduado de Tiny 10 que continúa entra
// en KIDS nivel 5, progresión aprobada sin permiso corporativo). Transaccional:
// ficha + ancla + evento con el cierre del nivel que termina en detalle.
export async function graduarTiny(centroId, id) {
  await requireCentroAccess(centroId)
  const hoy = hoyISO()
  const { year, month } = ym(hoy)
  const now = new Date().toISOString()
  return await withTransaction(async (query) => {
    const errorMes = await bloquearMesesEditables(query, centroId, [{ year, month }])
    if (errorMes) return { error: errorMes }
    const [est] = await query`
      SELECT * FROM estudiantes WHERE id = ${id} AND centro_id = ${centroId} FOR UPDATE
    `
    if (!est) return { error: 'El estudiante no pertenece a este centro.' }
    if (est.estado === 'retirado') return { error: 'El estudiante está retirado.' }
    if (est.itinerario !== 'TINY' || Number(est.nivel) !== 10) return { error: 'Solo se gradúan niños de TINY nivel 10.' }
    const [centro] = await query`SELECT nombre, pais FROM centros WHERE id = ${centroId}`
    const lado = est.grupo_id
      ? await ladoPlanDe(query, await grupoDe(centroId, est.grupo_id, query), paisDe(centro))
      : null
    const memo = crearMemoPlanes()
    const anclaAntes = fechaIso10(est.fecha_inicio_nivel)
    // (g1-11) El cierre real de TINY 10 queda en el detalle del evento; la
    // ancla nueva del nivel KIDS 5 es la fecha del cambio.
    const detalle = {
      origen: 'graduacion_tiny',
      cierre_nivel_terminado: hoy,
      ancla_antes: anclaAntes,
      posicion_antes: posicionEn(lado, anclaAntes, 10, hoy, memo),
      ancla_despues: hoy,
      posicion_despues: posicionEn(lado, hoy, 5, hoy, memo),
    }
    await query`
      UPDATE estudiantes SET itinerario = 'KIDS', nivel = 5, fecha_inicio_nivel = ${hoy}, updated_at = ${now}
      WHERE id = ${id}
    `
    await query`
      INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, de_nivel, a_nivel, detalle)
      VALUES (${id}, ${centroId}, 'graduacion_tiny', ${year}, ${month}, ${hoy}, 10, 5, ${JSON.stringify(detalle)})
    `
    return { ok: true }
  })
}

// ── Fijar el ancla de nivel a mano (R3, la salida de los "sin plan") ────────
// El backfill (g1-12) dejó fuera A PROPÓSITO a los niños cuya historia no
// demuestra su ancla (evento de inscripción con nivel discordante, movimientos
// que no calzan, aula con otro nivel): salen con el chip "sin plan" y sin plan
// no hay semana, ni cierre, ni aviso de liberación. Esta es la única puerta
// para ponerles el ancla — y NO es un cambio de nivel: el niño sigue en el
// nivel que ya cursa; lo que se declara es CUÁNDO lo empezó.
// Las opciones que la pantalla ofrece las arma lib/ancla-sugerencias.mjs
// (puro): con el grupo, con la cohorte, desde su inscripción o a mano.

// Las aulas de una lista de niños con sus horarios: de ahí sale el calendario
// versionado con el que se deriva cualquier plan (lib/plan-nino).
async function gruposDeNinos(query, centroId, ninos) {
  const idsGrupos = [...new Set((ninos || []).map((n) => n.grupo_id).filter((v) => v != null).map(Number))]
  if (!idsGrupos.length) return []
  const filas = await query`
    SELECT * FROM grupos WHERE id = ANY(${idsGrupos}::int[]) AND centro_id = ${centroId}
  `
  const horarios = await query`
    SELECT grupo_id, dia FROM grupo_horarios WHERE grupo_id = ANY(${idsGrupos}::int[])
  `
  return filas.map((g) => ({
    ...g,
    horarios: horarios.filter((h) => String(h.grupo_id) === String(g.id)),
  }))
}

// Los niños de la operación con su plan derivado RECALCULADO, en la MISMA
// forma que el roster (lib/plan-nino: { estado, ancla, indiceSemana, semana,
// cierre, itinerario }) — así la UI lo pinta sin recargar y sin derivar nada.
async function planesDerivadosDe(query, centroId, ninos, hoy) {
  const [centro] = await query`SELECT nombre, pais FROM centros WHERE id = ${centroId}`
  const grupos = await gruposDeNinos(query, centroId, ninos)
  return enriquecerNinos(ninos, grupos, { hoy, pais: paisDe(centro), memo: crearMemoPlanes() })
}

// Motor compartido por fijarInicioNivel y fijarInicioNivelLote: MISMA
// validación, UNA transacción, lock por niño y evento de rastro por cambio
// real. Devuelve { ok, actualizados, ninos: [{ id, nombre, actualizado, plan }] }.
async function fijarAnclasDeNivel(centroId, ids, { fecha, origen } = {}) {
  const hoy = hoyISO()
  const errorFecha = errorFechaAncla(fecha, hoy)
  if (errorFecha) return { error: errorFecha }
  const ancla = fechaIso10(fecha)
  const origenAncla = origen == null || origen === '' ? 'manual' : String(origen)
  if (!ORIGENES_ANCLA.includes(origenAncla)) {
    return { error: 'Origen de la sugerencia inválido: usa una de las opciones de la pantalla o escribe la fecha a mano.' }
  }
  // Únicos y ORDENADOS: el orden ascendente es el mismo del lock (idsDeLote).
  const unicos = idsDeLote(ids)
  if (!unicos.length) return { error: 'Selecciona al menos un niño para fijarle el inicio de nivel.' }

  const now = new Date().toISOString()
  return await withTransaction(async (query) => {
    // Se bloquean el mes del ANCLA (mover el ancla mueve el cierre de nivel
    // que se declara) y el mes de HOY (donde nace el evento de rastro). El mes
    // del ancla VIEJA no se bloquea a propósito: el ancla no alimenta ing_*/
    // des_* ni el snapshot mensual, y exigirlo dejaría sin reparación a los
    // niños cuyo dato malo cayó en un mes ya cerrado.
    const errorMes = await bloquearMesesEditables(query, centroId, [ym(ancla), ym(hoy)])
    if (errorMes) {
      // Qué mes lo frenó no puede quedar en misterio: el admin necesita saber
      // si el problema es la fecha que propuso o el mes en curso.
      const mes = (f) => `${String(ym(f).month).padStart(2, '0')}/${ym(f).year}`
      return { error: `${errorMes} El inicio que propones cae en ${mes(ancla)} y el rastro del cambio en ${mes(hoy)}: los dos meses tienen que estar abiertos.` }
    }
    // Lock por id ascendente (mismo patrón de aplicarFusion): dos ediciones
    // cruzadas del mismo grupo no se traban entre sí.
    const ninos = await query`
      SELECT * FROM estudiantes
      WHERE id = ANY(${unicos}::int[]) AND centro_id = ${centroId}
      ORDER BY id
      FOR UPDATE
    `
    // La regla de quién se escribe vive en lib/ancla-lote (puro, con test
    // espejo): cohorte completa, nadie retirado, nadie sin grupo, y el que ya
    // tiene esa misma fecha sale con `cambia: false` (idempotencia).
    const prep = preparaFijadoAncla({ ninos, ids: unicos, ancla })
    if (prep.error) return { error: prep.error }

    const { year, month } = ym(hoy)
    const cambios = new Map(prep.cambios.map((c) => [String(c.id), c.cambia]))
    for (const c of prep.cambios) {
      // Idempotente: fijar la MISMA fecha no toca la ficha ni duplica evento.
      if (!c.cambia) continue
      await query`
        UPDATE estudiantes SET fecha_inicio_nivel = ${ancla}, updated_at = ${now} WHERE id = ${c.id}
      `
      // Evento de RASTRO, no de nivel: de_nivel = a_nivel = el que ya cursa.
      // Con a_nivel concordante, un backfill futuro lo reconoce como fuente
      // legítima del ancla (peldaño 1 de lib/backfill-anclas-nivel.mjs) en vez
      // de marcar al niño como historia rota.
      const detalle = {
        ancla_antes: c.anclaAntes,
        ancla_despues: ancla,
        origen: origenAncla,
        motivo: 'fijar_inicio_nivel',
      }
      await query`
        INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, de_nivel, a_nivel, detalle)
        VALUES (${c.id}, ${centroId}, 'cambio_nivel', ${year}, ${month}, ${hoy},
          ${c.nivel}, ${c.nivel}, ${JSON.stringify(detalle)})
      `
    }
    const actualizados = prep.actualizados

    // (g1-15) SIN encolarSyncCrm: las anclas individuales no alimentan ni la
    // ventana de llenado ni el CRM — solo la referencia del grupo lo hace.

    // Plan derivado con el ancla YA escrita (misma transacción): la fila leída
    // arriba es la vieja, así que se recalcula sobre el valor nuevo.
    const enriquecidos = await planesDerivadosDe(
      query,
      centroId,
      ninos.map((n) => ({ ...n, fecha_inicio_nivel: ancla })),
      hoy,
    )
    return {
      ok: true,
      actualizados,
      ninos: enriquecidos.map((n) => ({
        id: Number(n.id),
        nombre: n.nombre,
        actualizado: cambios.get(String(n.id)) === true,
        plan: n.plan,
      })),
    }
  })
}

// Fija el inicio de nivel de UN niño. `origen` es la fuente que escogió el
// admin (lib/ancla-sugerencias.mjs); queda en el detalle del evento para saber
// después POR QUÉ esa fecha. Devuelve el plan derivado recalculado.
export async function fijarInicioNivel(centroId, estudianteId, { fecha, origen } = {}) {
  await requireCentroAccess(centroId)
  const r = await fijarAnclasDeNivel(centroId, [estudianteId], { fecha, origen })
  if (r.error) return r
  const [n] = r.ninos
  return { ok: true, actualizado: !!n?.actualizado, plan: n?.plan || null }
}

// Variante en LOTE: los niños de un grupo que comparten la misma situación
// (caso Calle 50 G71: 7 niños KIDS 3, todos sin ancla) se resuelven de un
// tirón — MISMA validación, UNA sola transacción: o entran todos o no entra
// ninguno.
export async function fijarInicioNivelLote(centroId, { estudianteIds, fecha, origen } = {}) {
  await requireCentroAccess(centroId)
  return await fijarAnclasDeNivel(centroId, estudianteIds, { fecha, origen })
}

// Las opciones de ancla de uno o varios niños — SOLO LECTURA: no escribe nada
// (eso es fijarInicioNivel/fijarInicioNivelLote). Se calcula en el SERVIDOR
// porque las tres fuentes viven en la BD y el navegador no las tiene: la
// referencia del aula, las anclas de los compañeros y sobre todo el EVENTO de
// inscripción canónico — que NO es la `fecha_inscripcion` de la ficha (en el
// pendiente colocado la fecha KPI nace en la colocación, g1-8). El país sale
// del centro, no del reloj del navegador.
// → { ok, hoy, tope, ninos: [{ id, nombre, itinerario, nivel, grupo_id, opciones, recomendada }] }
export async function sugerenciasAnclaNinos(centroId, estudianteIds) {
  await requireCentroAccess(centroId)
  const ids = [...new Set((estudianteIds || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))]
  if (!ids.length) return { error: 'Selecciona al menos un niño para ver sus opciones de inicio de nivel.' }
  const [centro] = await sql`SELECT nombre, pais FROM centros WHERE id = ${centroId}`
  const ninos = await sql`
    SELECT * FROM estudiantes WHERE id = ANY(${ids}::int[]) AND centro_id = ${centroId} ORDER BY nombre
  `
  if (ninos.length !== ids.length) {
    return { error: 'Alguno de los niños ya no está en este centro. Recarga la pantalla antes de continuar.' }
  }
  const grupos = await gruposDeNinos(sql, centroId, ninos)
  const idsGrupos = grupos.map((g) => Number(g.id))
  // Compañeros = los OTROS del aula que siguen asistiendo (activo o baja
  // potencial): un retirado ya no define la cohorte del nivel.
  const companeros = idsGrupos.length
    ? await sql`
        SELECT id, grupo_id, itinerario, nivel, estado, fecha_inicio_nivel
        FROM estudiantes
        WHERE centro_id = ${centroId} AND grupo_id = ANY(${idsGrupos}::int[])
          AND estado IN ('activo', 'baja_potencial')
      `
    : []
  // Los eventos que hacen falta para VERIFICAR cada fuente, no solo la
  // inscripción: los movimientos que pudieron re-anclar al niño (traslado,
  // fusión, cambio de nivel) y, en todos, `a_nivel` y `a_grupo_id`. Sin esas
  // dos columnas la pantalla ofrecía como "la más probable" la inscripción de
  // OTRO nivel — justo la que el backfill rechazó por discordante — y le
  // prestaba la fecha del aula a un niño que ese día estaba en otro salón.
  const eventos = await sql`
    SELECT id, estudiante_id, tipo, fecha, a_nivel, a_grupo_id
    FROM estudiante_eventos
    WHERE estudiante_id = ANY(${ids}::int[]) AND centro_id = ${centroId}
      AND tipo = ANY(${TIPOS_EVENTO_ANCLA}::text[])
    ORDER BY fecha, id
  `
  const hoy = hoyISO()
  const pais = paisDe(centro)
  const memo = crearMemoPlanes()
  const porGrupo = new Map(grupos.map((g) => [String(g.id), g]))
  return {
    ok: true,
    hoy,
    tope: topeAncla(hoy),
    ninos: ninos.map((n) => {
      const grupo = n.grupo_id == null ? null : porGrupo.get(String(n.grupo_id)) || null
      const s = sugerenciasAncla(
        {
          nino: n,
          grupo,
          companeros: companeros.filter(
            (c) => String(c.grupo_id) === String(n.grupo_id) && String(c.id) !== String(n.id),
          ),
          eventos: eventos.filter((e) => String(e.estudiante_id) === String(n.id)),
          hoy,
          pais,
        },
        memo,
      )
      return {
        id: Number(n.id),
        nombre: n.nombre,
        itinerario: n.itinerario,
        nivel: Number(n.nivel),
        grupo_id: n.grupo_id == null ? null : Number(n.grupo_id),
        opciones: s.opciones,
        recomendada: s.recomendada,
      }
    }),
  }
}

// Baja potencial (cuadro real: sigue este mes, se va el próximo). El motivo es
// opcional y queda en el evento para el seguimiento. Alerta MANUAL: no
// programa nada — el retiro con fecha va por programarRetiro (R5).
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
// Un retiro PROGRAMADO no se revierte por aquí: eso es cancelarRetiroProgramado
// (que restaura estado Y limpia la fecha — si solo se moviera el estado, el
// CHECK de coherencia lo rechazaría y el cron lo retiraría igual).
export async function revertirBajaPotencial(centroId, id) {
  await requireCentroAccess(centroId)
  const [est] = await sql`SELECT id, estado, retiro_programado_para FROM estudiantes WHERE id = ${id} AND centro_id = ${centroId}`
  if (!est) return { error: 'El estudiante no pertenece a este centro.' }
  if (est.estado !== 'baja_potencial') return { error: 'El estudiante no está en baja potencial.' }
  if (est.retiro_programado_para) {
    return { error: `El niño tiene un retiro programado para el ${fechaIso10(est.retiro_programado_para)}: usa "Cancelar retiro programado" para revertirlo completo.` }
  }
  await sql`UPDATE estudiantes SET estado = 'activo', updated_at = ${new Date().toISOString()} WHERE id = ${id}`
  return { ok: true }
}

// Retiro INMEDIATO con motivo (g1-22..24). Guiado por asistencia: si el niño
// tiene asistencia PRESENTE en el mes del retiro, este botón no es el correcto
// — se dirige a "Retirar el próximo mes" (programarRetiro). El EXISTS corre
// DENTRO de la transacción con el MISMO lock de estudiante que usa la
// asistencia (g1-23). Override: EXACTAMENTE rol admin_general, con motivo y
// evidencia que quedan en el detalle del evento junto al actor.
// ultimaAsistencia salió del contrato público: se deriva de las asistencias.
export async function retirarEstudiante(centroId, id, { motivo, fecha, override } = {}) {
  const sesion = await requireCentroAccess(centroId)
  if (!MOTIVOS_RETIRO.includes(motivo)) return { error: 'Motivo de retiro inválido.' }
  const hoy = hoyISO()
  const fechaRetiro = fecha || hoy
  if (!FECHA_RE.test(fechaRetiro)) return { error: 'Fecha de retiro inválida (AAAA-MM-DD).' }
  // La fecha viene libre del caller: sin esta cota, una fecha FUTURA movía el
  // EXISTS de asistencia a un mes sin marcas y cualquier admin se saltaba la
  // norma "termina su mes" (g1-23/g1-24). El retiro se declara sobre lo ya
  // vivido; el "se va el próximo mes" tiene su camino: programarRetiro.
  if (fechaRetiro > hoy) {
    return {
      error: `La fecha de retiro no puede ser futura (hoy es ${hoy}). Para que el niño termine su mes y salga el próximo, usa "Retirar el próximo mes".`,
      requiereProgramacion: true,
    }
  }
  const { year, month } = ym(fechaRetiro)
  let overrideDetalle = null
  if (override) {
    if (sesion.rol !== 'admin_general') {
      return { error: 'Solo un admin general puede forzar el retiro de un niño con asistencia en el mes.' }
    }
    const motivoOv = String(override.motivo || '').trim()
    const evidencia = String(override.evidencia || '').trim()
    if (!motivoOv || !evidencia) return { error: 'El override requiere motivo y evidencia (qué pasó y cómo consta).' }
    overrideDetalle = {
      actor: sesion.email || sesion.nombre || String(sesion.uid),
      motivo: motivoOv,
      evidencia,
    }
  }
  const inicioMes = `${year}-${String(month).padStart(2, '0')}-01`

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
    // (g1-23) La evidencia se evalúa DENTRO de la transacción, sobre el mismo
    // lock que toma marcarAsistencia: nadie marca un presente entre el chequeo
    // y el commit del retiro. Y cubre el mes del retiro Y LOS POSTERIORES:
    // backdatear la fecha a un mes abierto sin marcas no esquiva una
    // asistencia presente más reciente (el niño que vio clases después de esa
    // fecha no puede quedar retirado antes de su propia evidencia).
    const [asistio] = await query`
      SELECT MAX(fecha) AS ultima FROM asistencias
      WHERE estudiante_id = ${id} AND estado = 'presente'
        AND fecha >= ${inicioMes}::date
    `
    if (asistio?.ultima && !overrideDetalle) {
      const u = ym(fechaIso10(asistio.ultima))
      return {
        error: `El niño vio clases en ${String(u.month).padStart(2, '0')}/${u.year} (hay asistencia presente registrada). Norma del cuadro: termina su mes — usa "Retirar el próximo mes" para programar el retiro al día 1. Solo un admin general puede forzarlo ya, con motivo y evidencia.`,
        requiereProgramacion: true,
      }
    }
    await ejecutarRetiroEn(query, {
      estudiante: est,
      centroId,
      motivo,
      fecha: fechaRetiro,
      detalle: overrideDetalle ? { override_asistencia: overrideDetalle } : null,
    })
    return { ok: true, grupoId: est.grupo_id, ultimaAsis: fechaIso10(est.ultima_asistencia) }
  })
  if (resultado.error) return resultado

  const out = { ok: true }
  // Norma del cuadro: el niño que vio clases en un mes se declara retirado en
  // ESE mes. La última asistencia es la derivada server-side (g1-23); si cae
  // en otro mes que el retiro, se avisa.
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

// "Retirar el próximo mes" (g1-24): programa el retiro para el día 1 del mes
// siguiente. En UNA transacción: guarda el ESTADO PREVIO en el detalle del
// evento de programación, escribe baja_potencial + retiro_programado_para,
// BLOQUEA el mes objetivo (g2-4: cerrarMes reconcilia contra esta fila) y
// encola CRM. El motivo es OBLIGATORIO: sin motivo no hay deserción medible.
export async function programarRetiro(centroId, id, { motivo } = {}) {
  await requireCentroAccess(centroId)
  if (!MOTIVOS_RETIRO.includes(motivo)) return { error: 'El motivo del retiro es obligatorio para programarlo.' }
  const hoy = hoyISO()
  const { year, month } = ym(hoy)
  const fechaRetiro = primerDiaMesSiguiente(hoy)
  const objetivo = ym(fechaRetiro)
  const now = new Date().toISOString()
  return await withTransaction(async (query) => {
    // Mes de hoy (el evento de programación) + mes OBJETIVO (el del retiro):
    // bloquearMesesEditables ordena y depura — cerrarMes no puede congelar el
    // mes objetivo mientras esta programación está a medio escribir.
    const errorMes = await bloquearMesesEditables(query, centroId, [{ year, month }, objetivo])
    if (errorMes) return { error: errorMes }
    const [est] = await query`
      SELECT * FROM estudiantes WHERE id = ${id} AND centro_id = ${centroId} FOR UPDATE
    `
    if (!est) return { error: 'El estudiante no pertenece a este centro.' }
    if (est.estado === 'retirado') return { error: 'El estudiante ya está retirado.' }
    if (est.retiro_programado_para) {
      return { error: `El niño ya tiene un retiro programado para el ${fechaIso10(est.retiro_programado_para)}. Cancélalo antes de programar otro.` }
    }
    const estadoPrevio = est.estado // 'activo' o 'baja_potencial' (alerta manual)
    await query`
      UPDATE estudiantes SET estado = 'baja_potencial', retiro_programado_para = ${fechaRetiro}, updated_at = ${now}
      WHERE id = ${id}
    `
    const detalle = { estado_previo: estadoPrevio, retiro_programado_para: fechaRetiro }
    await query`
      INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, de_grupo_id, motivo, detalle)
      VALUES (${id}, ${centroId}, 'retiro_programado', ${year}, ${month}, ${hoy}, ${est.grupo_id}, ${motivo}, ${JSON.stringify(detalle)})
    `
    if (est.grupo_id) await encolarSyncCrm([est.grupo_id], 'retiro_programado', query)
    return { ok: true, retiroProgramadoPara: fechaRetiro }
  })
}

// Cancela un retiro programado — TRANSACCIONAL COMPLETO (g2-3): lock del
// estudiante + lock del mes objetivo; valida que la programación siga activa;
// RESTAURA el estado previo guardado por programarRetiro (normalmente
// 'activo'); LIMPIA retiro_programado_para (si no se limpia, el cron lo
// retiraría igual: la limpieza es parte del contrato, no un detalle — y el
// CHECK de coherencia la exige en el MISMO statement); escribe el evento de
// cancelación (clave de outbox distinta a la de programación) y encola CRM.
export async function cancelarRetiroProgramado(centroId, id) {
  await requireCentroAccess(centroId)
  const hoy = hoyISO()
  const { year, month } = ym(hoy)
  const now = new Date().toISOString()
  return await withTransaction(async (query) => {
    // La fecha objetivo se lee ANTES de bloquear meses (orden mes → niño);
    // tras el lock del niño se re-verifica que siga siendo la misma.
    const [pre] = await query`
      SELECT estado, retiro_programado_para FROM estudiantes
      WHERE id = ${id} AND centro_id = ${centroId}
    `
    if (!pre) return { error: 'El estudiante no pertenece a este centro.' }
    if (pre.estado !== 'baja_potencial' || !pre.retiro_programado_para) {
      return { error: 'El niño no tiene un retiro programado activo.' }
    }
    const fechaProg = fechaIso10(pre.retiro_programado_para)
    const errorMes = await bloquearMesesEditables(query, centroId, [{ year, month }, ym(fechaProg)])
    if (errorMes) return { error: errorMes }
    const [est] = await query`
      SELECT * FROM estudiantes WHERE id = ${id} AND centro_id = ${centroId} FOR UPDATE
    `
    if (!est || est.estado !== 'baja_potencial' || fechaIso10(est.retiro_programado_para) !== fechaProg) {
      return { error: 'La programación cambió mientras cancelabas (otra pestaña o el cron). Recarga y revisa el estado del niño.' }
    }
    // Estado previo desde el ÚLTIMO evento de programación (normalmente
    // 'activo'; fail safe si el evento no aparece).
    const [evProg] = await query`
      SELECT detalle FROM estudiante_eventos
      WHERE estudiante_id = ${id} AND tipo = 'retiro_programado'
      ORDER BY id DESC LIMIT 1
    `
    const estadoRestaurado = estadoPrevioDeProgramacion(evProg?.detalle)
    await query`
      UPDATE estudiantes SET estado = ${estadoRestaurado}, retiro_programado_para = NULL, updated_at = ${now}
      WHERE id = ${id}
    `
    const detalle = { estado_restaurado: estadoRestaurado, retiro_programado_para: fechaProg }
    await query`
      INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, de_grupo_id, detalle)
      VALUES (${id}, ${centroId}, 'retiro_cancelado', ${year}, ${month}, ${hoy}, ${est.grupo_id}, ${JSON.stringify(detalle)})
    `
    if (est.grupo_id) await encolarSyncCrm([est.grupo_id], 'retiro_cancelado', query)
    return { ok: true, estado: estadoRestaurado }
  })
}

// Un retirado que vuelve: entra a un grupo activo y cuenta como reincorporado
// del mes (no como nuevo). El ancla NO se toca: su comienzo de nivel es un
// hecho histórico — el plan derivado en el grupo nuevo sale de esa ancla (y si
// no da, queda sin_plan explícito; nada se inventa).
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
