'use server'
import { sql } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { crmCall, crmAccountForCentro, crmConfigured, crmBaseUrl } from '../../lib/crm'
import { armarAlohaGroup } from '../../lib/cupos-sync'
import { encolarSyncCrm } from '../../lib/llenado-service'
import { NINOS_POR_GRUPO_MODELO, horarioTextoDe } from '../../lib/modelo'
import { hoyISO } from '../../lib/operaciones'
import { ventanaNuevos } from '../../lib/llenado.mjs'

export async function eventosConfig() {
  return { configured: crmConfigured(), baseUrl: crmBaseUrl() }
}

// Opciones del formulario (equipos de venta + etapas de pipeline) de la cuenta del centro.
export async function opcionesFormulario(centroId) {
  await requireCentroAccess(centroId)
  const accountId = crmAccountForCentro(centroId)
  if (!accountId) return { sales_teams: [], pipeline_stages: [] }
  const res = await crmCall('form_options', { account_id: accountId })
  if (res.error) return { error: res.error, sales_teams: [], pipeline_stages: [] }
  return { sales_teams: res.sales_teams || [], pipeline_stages: res.pipeline_stages || [] }
}

// Eventos creados por este centro (espejo Neon → datos vivos del CRM, con stats).
// Cada evento sale enriquecido con su grupo por aperturar (si está vinculado):
// evento.grupo = { id, numero, horarioTexto, cupos } — una consulta agregada, sin N+1.
export async function listarEventos(centroId) {
  await requireCentroAccess(centroId)
  const rows = await sql`SELECT crm_event_id, grupo_id FROM centro_eventos WHERE centro_id = ${centroId} ORDER BY created_at DESC`
  const ids = rows.map((r) => r.crm_event_id)
  if (ids.length === 0) return { events: [] }
  const accountId = crmAccountForCentro(centroId)
  if (!accountId) return { error: 'El centro no tiene una cuenta CRM configurada.', events: [] }
  // La cuenta viva permite ignorar espejos locales de eventos eliminados en el
  // CRM sin relajar la autorización del endpoint batch.
  const res = await crmCall('list_events', { account_id: accountId })
  if (res.error) return { error: res.error, events: [] }
  if (!Array.isArray(res.events)) return { error: 'Respuesta inválida del CRM.', events: [] }
  const idsDelCentro = new Set(ids.map(String))
  const grupoPorEvento = new Map(rows.filter((r) => r.grupo_id).map((r) => [r.crm_event_id, r.grupo_id]))
  const grupoIds = [...new Set(grupoPorEvento.values())]
  const gruposPorId = new Map()
  if (grupoIds.length) {
    const gs = await sql`
      SELECT g.id, g.numero, g.inscripcion_abierta,
        COUNT(e.id) FILTER (WHERE e.estado IN ('activo', 'baja_potencial'))::int AS ninos
      FROM grupos g LEFT JOIN estudiantes e ON e.grupo_id = g.id
      WHERE g.id = ANY(${grupoIds})
      GROUP BY g.id, g.numero, g.inscripcion_abierta
    `
    const hs = await sql`
      SELECT grupo_id, dia, hora_inicio, hora_fin FROM grupo_horarios
      WHERE grupo_id = ANY(${grupoIds}) ORDER BY dia, hora_inicio
    `
    for (const g of gs) {
      const cerrado = g.inscripcion_abierta === false
      gruposPorId.set(String(g.id), {
        id: g.id,
        numero: g.numero,
        cerrado,
        // Grupo cerrado a inscripciones = 0 cupos para ventas, aunque tenga espacio.
        cupos: cerrado ? 0 : Math.max(0, NINOS_POR_GRUPO_MODELO - g.ninos),
        horarioTexto: horarioTextoDe(hs.filter((h) => String(h.grupo_id) === String(g.id))),
      })
    }
  }
  const events = res.events.filter((ev) => idsDelCentro.has(String(ev.id))).map((ev) => {
    const gid = grupoPorEvento.get(ev.id)
    return { ...ev, grupo: (gid && gruposPorId.get(String(gid))) || null }
  })
  return { events }
}

// Campos del evento que aceptamos del cliente (se pasan tal cual al CRM).
function pickEvent(data, accountId) {
  return {
    account_id: accountId,
    name: data.name?.trim(),
    description: data.description?.trim() || null,
    start_date: data.start_date,
    end_date: data.end_date || null,
    timezone: data.timezone || 'America/Panama',
    event_type: data.event_type || 'online',
    location: data.location?.trim() || null,
    meeting_url: data.meeting_url?.trim() || null,
    is_free: data.is_free ?? true,
    price: data.is_free ? 0 : (Number(data.price) || 0),
    currency: data.currency || 'USD',
    max_capacity: data.max_capacity ? Number(data.max_capacity) : null,
    status: data.status || 'published',
    sales_team_id: data.sales_team_id || null,
    pipeline_stage_id: data.pipeline_stage_id || null,
    attended_stage_id: data.attended_stage_id || null,
    won_stage_id: data.won_stage_id || null,
    registration_questions: Array.isArray(data.registration_questions) ? data.registration_questions : [],
  }
}

// (Diseño 2026-08-08, defecto 9) Valida el grupo por aperturar del formulario:
// del centro, activo y ABIERTO a niños nuevos — vincular una clase de prueba
// es apuntarle niños NUEVOS al grupo, así que al CREAR o CAMBIAR el vínculo
// aplica la misma ventana derivada que grupoAceptaNinosNuevos en
// app/actions/estudiantes.js (réplica local sobre lib/llenado: un 'use server'
// solo exporta actions). null = sin grupo. `conservarId`: al EDITAR sin
// cambiar el vínculo se conserva aunque el grupo ya se haya cerrado a nuevos
// — nunca se desvincula en silencio; la UI lo muestra como opción
// deshabilitada con el aviso "cerrado a nuevos — reasignar".
async function grupoValido(centroId, grupoId, conservarId = null) {
  if (!grupoId) return { grupoId: null }
  const [g] = await sql`SELECT * FROM grupos WHERE id = ${grupoId} AND centro_id = ${centroId}`
  if (!g || g.estado !== 'activo') return { error: 'El grupo no está activo o no pertenece a este centro.' }
  if (conservarId != null && String(grupoId) === String(conservarId)) return { grupoId: g.id }
  const v = ventanaNuevos(g, hoyISO())
  if (!v.abierta) {
    if (v.razon === 'palanca_cerrada') {
      return { error: `El grupo ${g.numero} está cerrado a inscripciones: ya no entra nadie. Ábrelo de nuevo en Grupos y Fusiones antes de vincularlo.` }
    }
    return { error: `El grupo ${g.numero} ya no acepta niños NUEVOS: su ventana venció el ${v.fechaLimite} (manual: Tiny hasta la semana 4 del libro, Kids hasta la 2). Extiende la ventana desde Grupos y Fusiones o vincula el grupo de la próxima inducción.` }
  }
  return { grupoId: g.id }
}

export async function crearEvento(centroId, data) {
  const s = await requireCentroAccess(centroId)
  const accountId = crmAccountForCentro(centroId)
  if (!accountId) return { error: 'Este centro no tiene cuenta de CRM asignada.' }
  if (!data?.name?.trim() || !data?.start_date) return { error: 'Nombre y fecha de inicio son requeridos.' }
  const vg = await grupoValido(centroId, data?.grupo_id)
  if (vg.error) return { error: vg.error }
  const event = pickEvent(data, accountId)
  event.aloha_group = vg.grupoId ? await armarAlohaGroup(centroId, vg.grupoId) : null
  const res = await crmCall('create_event', { event })
  if (res.error) return { error: res.error }
  const ev = res.event
  await sql`
    INSERT INTO centro_eventos (centro_id, crm_event_id, crm_account_id, nombre, start_date, grupo_id, created_by)
    VALUES (${centroId}, ${ev.id}, ${accountId}, ${ev.name}, ${ev.start_date}, ${vg.grupoId}, ${s.email || ''})
    ON CONFLICT (crm_event_id) DO NOTHING
  `
  return { ok: true, event: ev }
}

async function eventoDelCentro(centroId, eventId) {
  const r = await sql`SELECT 1 FROM centro_eventos WHERE centro_id = ${centroId} AND crm_event_id = ${eventId}`
  return r.length > 0
}

export async function actualizarEvento(centroId, eventId, data) {
  await requireCentroAccess(centroId)
  // El vínculo actual se lee junto con la pertenencia: si el grupo del evento
  // ya no acepta nuevos pero el formulario lo CONSERVA tal cual, se permite
  // (grupoValido con conservarId) — solo el vínculo NUEVO exige ventana abierta.
  const [actual] = await sql`SELECT grupo_id FROM centro_eventos WHERE centro_id = ${centroId} AND crm_event_id = ${eventId}`
  if (!actual) return { error: 'La clase de prueba no pertenece a este centro.' }
  const accountId = crmAccountForCentro(centroId)
  const ev = pickEvent(data, accountId)
  delete ev.account_id // no se cambia la cuenta en update
  // grupo_id solo se toca si viene en data: permite cambiar o quitar (null) el
  // grupo por aperturar; el CRM recibe el aloha_group nuevo (o null para limpiarlo).
  let grupoId
  if (data?.grupo_id !== undefined) {
    const vg = await grupoValido(centroId, data.grupo_id, actual.grupo_id)
    if (vg.error) return { error: vg.error }
    grupoId = vg.grupoId
    ev.aloha_group = grupoId ? await armarAlohaGroup(centroId, grupoId) : null
  }
  const res = await crmCall('update_event', { event_id: eventId, event: ev })
  if (res.error) return { error: res.error }
  await sql`UPDATE centro_eventos SET nombre = ${res.event?.name || ev.name}, start_date = ${res.event?.start_date || ev.start_date} WHERE crm_event_id = ${eventId}`
  if (data?.grupo_id !== undefined) {
    await sql`UPDATE centro_eventos SET grupo_id = ${grupoId} WHERE crm_event_id = ${eventId}`
  }
  return { ok: true, event: res.event }
}

export async function eliminarEvento(centroId, eventId) {
  await requireCentroAccess(centroId)
  if (!(await eventoDelCentro(centroId, eventId))) return { error: 'La clase de prueba no pertenece a este centro.' }
  const res = await crmCall('delete_event', { event_id: eventId })
  if (res.error) return { error: res.error }
  await sql`DELETE FROM centro_eventos WHERE crm_event_id = ${eventId}`
  return { ok: true }
}

export async function duplicarEvento(centroId, eventId) {
  const s = await requireCentroAccess(centroId)
  if (!(await eventoDelCentro(centroId, eventId))) return { error: 'La clase de prueba no pertenece a este centro.' }
  const accountId = crmAccountForCentro(centroId)
  // El duplicado hereda el grupo por aperturar del original, pero el CRM
  // guarda la copia con aloha_group = null (no congela el snapshot viejo del
  // original — fix hermano en route.ts). Por eso aquí se RECALCULA el snapshot
  // fresco (diseño 2026-08-08, defecto 11): primero el outbox durable (si el
  // push muere o el proceso cae, el cron lo repara en la próxima corrida) y
  // luego el push inline para que el vendedor vea la tarjeta de una vez.
  const [origen] = await sql`SELECT grupo_id FROM centro_eventos WHERE crm_event_id = ${eventId}`
  const res = await crmCall('duplicate_event', { event_id: eventId })
  if (res.error) return { error: res.error }
  const ev = res.event
  await sql`
    INSERT INTO centro_eventos (centro_id, crm_event_id, crm_account_id, nombre, start_date, grupo_id, created_by)
    VALUES (${centroId}, ${ev.id}, ${accountId}, ${ev.name}, ${ev.start_date}, ${origen?.grupo_id || null}, ${s.email || ''})
    ON CONFLICT (crm_event_id) DO NOTHING
  `
  if (origen?.grupo_id) {
    await encolarSyncCrm([origen.grupo_id], 'duplicar_evento')
    const aloha_group = await armarAlohaGroup(centroId, origen.grupo_id)
    const push = await crmCall('update_event', { event_id: ev.id, event: { aloha_group } })
    if (push.error) {
      // El duplicado ya existe en ambos lados: no se rompe el ok — la fila
      // del outbox de arriba empuja el estado vigente en la próxima corrida.
      return { ok: true, event: ev, warn: `La copia quedó sin cupos en el CRM (${push.error}); el cron los empuja en la próxima corrida.` }
    }
  }
  return { ok: true, event: ev }
}

export async function listarRegistros(centroId, eventId) {
  await requireCentroAccess(centroId)
  if (!(await eventoDelCentro(centroId, eventId))) return { error: 'La clase de prueba no pertenece a este centro.', registrations: [] }
  const res = await crmCall('list_registrations', { event_id: eventId })
  if (res.error) return { error: res.error, registrations: [] }
  return { registrations: res.registrations || [] }
}

export async function agregarInvitado(centroId, eventId, data) {
  await requireCentroAccess(centroId)
  if (!(await eventoDelCentro(centroId, eventId))) return { error: 'La clase de prueba no pertenece a este centro.' }
  if (!data?.first_name?.trim()) return { error: 'El nombre es requerido.' }
  const res = await crmCall('add_registration', {
    event_id: eventId,
    first_name: data.first_name.trim(),
    last_name: data.last_name?.trim() || null,
    email: data.email?.trim() || null,
    phone: data.phone?.trim() || null,
    notes: data.notes?.trim() || null,
  })
  if (res.error) return { error: res.error }
  return { ok: true, registration: res.registration }
}

export async function marcarAsistencia(centroId, eventId, registrationId, attended) {
  await requireCentroAccess(centroId)
  if (!(await eventoDelCentro(centroId, eventId))) return { error: 'La clase de prueba no pertenece a este centro.' }
  const res = await crmCall('update_registration', {
    registration_id: registrationId,
    attendance_status: attended ? 'attended' : 'no_show',
  })
  if (res.error) return { error: res.error }
  return { ok: true, registration: res.registration }
}

export async function marcarPago(centroId, eventId, registrationId, paid) {
  await requireCentroAccess(centroId)
  if (!(await eventoDelCentro(centroId, eventId))) return { error: 'La clase de prueba no pertenece a este centro.' }
  const res = await crmCall('update_registration', {
    registration_id: registrationId,
    payment_status: paid ? 'paid' : 'pending',
  })
  if (res.error) return { error: res.error }
  return { ok: true, registration: res.registration }
}
