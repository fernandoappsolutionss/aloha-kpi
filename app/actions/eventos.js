'use server'
import { sql } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { crmCall, crmAccountForCentro, crmConfigured, crmBaseUrl } from '../../lib/crm'

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
export async function listarEventos(centroId) {
  await requireCentroAccess(centroId)
  const rows = await sql`SELECT crm_event_id FROM centro_eventos WHERE centro_id = ${centroId} ORDER BY created_at DESC`
  const ids = rows.map((r) => r.crm_event_id)
  if (ids.length === 0) return { events: [] }
  const res = await crmCall('get_events_by_ids', { ids })
  if (res.error) return { error: res.error, events: [] }
  return { events: res.events || [] }
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

export async function crearEvento(centroId, data) {
  const s = await requireCentroAccess(centroId)
  const accountId = crmAccountForCentro(centroId)
  if (!accountId) return { error: 'Este centro no tiene cuenta de CRM asignada.' }
  if (!data?.name?.trim() || !data?.start_date) return { error: 'Nombre y fecha de inicio son requeridos.' }
  const res = await crmCall('create_event', { event: pickEvent(data, accountId) })
  if (res.error) return { error: res.error }
  const ev = res.event
  await sql`
    INSERT INTO centro_eventos (centro_id, crm_event_id, crm_account_id, nombre, start_date, created_by)
    VALUES (${centroId}, ${ev.id}, ${accountId}, ${ev.name}, ${ev.start_date}, ${s.email || ''})
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
  if (!(await eventoDelCentro(centroId, eventId))) return { error: 'La clase de prueba no pertenece a este centro.' }
  const accountId = crmAccountForCentro(centroId)
  const ev = pickEvent(data, accountId)
  delete ev.account_id // no se cambia la cuenta en update
  const res = await crmCall('update_event', { event_id: eventId, event: ev })
  if (res.error) return { error: res.error }
  await sql`UPDATE centro_eventos SET nombre = ${res.event?.name || ev.name}, start_date = ${res.event?.start_date || ev.start_date} WHERE crm_event_id = ${eventId}`
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
  const res = await crmCall('duplicate_event', { event_id: eventId })
  if (res.error) return { error: res.error }
  const ev = res.event
  await sql`
    INSERT INTO centro_eventos (centro_id, crm_event_id, crm_account_id, nombre, start_date, created_by)
    VALUES (${centroId}, ${ev.id}, ${accountId}, ${ev.name}, ${ev.start_date}, ${s.email || ''})
    ON CONFLICT (crm_event_id) DO NOTHING
  `
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

/**
 * Guarda una nota de seguimiento del participante.
 *
 * El CRM guarda la ULTIMA nota en la registración y además la agrega al
 * historial (timeline del lead y del deal), igual que el link de seguimiento.
 */
export async function guardarNota(centroId, eventId, registrationId, notas) {
  await requireCentroAccess(centroId)
  if (!(await eventoDelCentro(centroId, eventId))) return { error: 'La clase de prueba no pertenece a este centro.' }
  const texto = String(notas ?? '').trim()
  if (!texto) return { error: 'La nota está vacía.' }
  const res = await crmCall('update_registration', {
    registration_id: registrationId,
    notes: texto,
  })
  if (res.error) return { error: res.error }
  return { ok: true, registration: res.registration }
}

/** Historial de notas de un participante (las que ya escribió cualquiera). */
export async function listarNotas(centroId, eventId, registrationId) {
  await requireCentroAccess(centroId)
  if (!(await eventoDelCentro(centroId, eventId))) return { error: 'La clase de prueba no pertenece a este centro.', notes: [] }
  const res = await crmCall('list_registration_notes', { registration_id: registrationId })
  if (res.error) return { error: res.error, notes: [] }
  return { notes: res.notes || [] }
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
