'use server'
import { sql } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { crmCall, crmAccountForCentro, crmConfigured, crmBaseUrl } from '../../lib/crm'

// Estado de configuración (para mostrar aviso si falta conectar el CRM).
export async function eventosConfig() {
  return { configured: crmConfigured(), baseUrl: crmBaseUrl() }
}

// Eventos creados por este centro: el espejo en Neon define cuáles son "suyos",
// y los datos vivos (registros, estado) se traen del CRM en tiempo real.
export async function listarEventos(centroId) {
  await requireCentroAccess(centroId)
  const rows = await sql`SELECT crm_event_id FROM centro_eventos WHERE centro_id = ${centroId} ORDER BY created_at DESC`
  const ids = rows.map((r) => r.crm_event_id)
  if (ids.length === 0) return { events: [] }
  const res = await crmCall('get_events_by_ids', { ids })
  if (res.error) return { error: res.error, events: [] }
  return { events: res.events || [] }
}

export async function crearEvento(centroId, data) {
  const s = await requireCentroAccess(centroId)
  const accountId = crmAccountForCentro(centroId)
  if (!accountId) return { error: 'Este centro no tiene cuenta de CRM asignada.' }
  if (!data?.name?.trim() || !data?.start_date) return { error: 'Nombre y fecha de inicio son requeridos.' }

  const event = {
    account_id: accountId,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    start_date: data.start_date,
    end_date: data.end_date || null,
    event_type: data.event_type || 'online',
    location: data.location?.trim() || null,
    meeting_url: data.meeting_url?.trim() || null,
    max_capacity: data.max_capacity ? Number(data.max_capacity) : null,
    status: data.status || 'published',
  }
  const res = await crmCall('create_event', { event })
  if (res.error) return { error: res.error }
  const ev = res.event
  await sql`
    INSERT INTO centro_eventos (centro_id, crm_event_id, crm_account_id, nombre, start_date, created_by)
    VALUES (${centroId}, ${ev.id}, ${accountId}, ${ev.name}, ${ev.start_date}, ${s.email || ''})
    ON CONFLICT (crm_event_id) DO NOTHING
  `
  return { ok: true, event: ev }
}

// Seguridad: un centro solo puede ver/tocar SUS eventos (los del espejo).
async function eventoDelCentro(centroId, eventId) {
  const r = await sql`SELECT 1 FROM centro_eventos WHERE centro_id = ${centroId} AND crm_event_id = ${eventId}`
  return r.length > 0
}

export async function listarRegistros(centroId, eventId) {
  await requireCentroAccess(centroId)
  if (!(await eventoDelCentro(centroId, eventId))) return { error: 'Evento no pertenece a este centro.', registrations: [] }
  const res = await crmCall('list_registrations', { event_id: eventId })
  if (res.error) return { error: res.error, registrations: [] }
  return { registrations: res.registrations || [] }
}

export async function agregarInvitado(centroId, eventId, data) {
  await requireCentroAccess(centroId)
  if (!(await eventoDelCentro(centroId, eventId))) return { error: 'Evento no pertenece a este centro.' }
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
  if (!(await eventoDelCentro(centroId, eventId))) return { error: 'Evento no pertenece a este centro.' }
  const res = await crmCall('update_registration', {
    registration_id: registrationId,
    attendance_status: attended ? 'attended' : 'no_show',
  })
  if (res.error) return { error: res.error }
  return { ok: true, registration: res.registration }
}
