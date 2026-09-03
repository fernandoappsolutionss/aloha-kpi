import { createServer } from 'node:http'

const HOST = '127.0.0.1'
const PORT = 4317
const MAX_BODY = 64 * 1024
const token = process.env.CRM_SERVICE_TOKEN

if (process.env.E2E_R3_DIALOGS !== '1' || !token) {
  throw new Error('El CRM stub R3 exige gate local y token dummy explícitos.')
}

const panamaToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Panama', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const value = (type) => parts.find((part) => part.type === type)?.value
  return `${value('year')}-${value('month')}-${value('day')}`
}

const fixtureEvent = () => ({
  id: 'e2e-r3-event-930032',
  account_id: 'c0c81438-bb54-4ae0-a019-b54e0bfcf870',
  name: 'Clase Fixture R3',
  description: 'Fixture local de solo lectura para diálogos responsive.',
  timezone: 'America/Panama',
  start_date: `${panamaToday()}T15:00:00-05:00`,
  end_date: `${panamaToday()}T16:00:00-05:00`,
  event_type: 'in_person',
  location: 'Salón fixture R3',
  meeting_url: null,
  status: 'published',
  is_free: true,
  price: 0,
  currency: 'USD',
  max_capacity: 15,
  tracking_token: 'e2e-r3-readonly-tracking',
  registration_questions: [],
  registration_count: 1,
  stats: { total: 1, attended: 0, not_attended: 0, pending: 1, paid: 0, total_revenue: 0 },
})

const fixtureRegistration = () => ({
  id: 'e2e-r3-registration-930042',
  event_id: 'e2e-r3-event-930032',
  first_name: 'Niño',
  last_name: 'Registro R3',
  email: 'registro-r3@example.invalid',
  phone: '+50761111111',
  registration_source: 'aloha_kpi',
  attributed_to: null,
  payment_status: 'pending',
  attendance_status: null,
  checked_in_at: null,
  registered_at: `${panamaToday()}T12:00:00-05:00`,
})

function send(response, status, payload) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

const READ_ACTIONS = new Set([
  'form_options',
  'list_events',
  'list_registrations',
  'list_registrations_by_event_ids',
])

const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    send(response, 200, { ok: true, mode: 'readonly' })
    return
  }
  if (request.method !== 'POST' || request.url !== '/api/integrations/aloha') {
    send(response, 404, { error: 'Ruta no permitida por el CRM stub R3.' })
    return
  }
  if (request.headers['x-service-token'] !== token) {
    send(response, 401, { error: 'Token de servicio inválido.' })
    return
  }

  let size = 0
  const chunks = []
  request.on('data', (chunk) => {
    size += chunk.length
    if (size > MAX_BODY) request.destroy()
    else chunks.push(chunk)
  })
  request.on('end', () => {
    let body
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch {
      send(response, 400, { error: 'JSON inválido.' })
      return
    }
    if (!READ_ACTIONS.has(body.action)) {
      send(response, 405, { error: 'El CRM stub R3 rechaza comandos de escritura.' })
      return
    }
    if (body.action === 'form_options') {
      send(response, 200, { sales_teams: [], pipeline_stages: [] })
      return
    }
    if (body.action === 'list_events') {
      send(response, 200, { events: [fixtureEvent()] })
      return
    }
    if (body.action === 'list_registrations') {
      if (String(body.event_id) !== 'e2e-r3-event-930032') {
        send(response, 200, { registrations: [] })
        return
      }
      send(response, 200, { registrations: [fixtureRegistration()] })
      return
    }
    const requested = new Set((body.event_ids || []).map(String))
    send(response, 200, {
      registrations: requested.has('e2e-r3-event-930032') ? [fixtureRegistration()] : [],
    })
  })
})

server.listen(PORT, HOST, () => {
  console.log(`CRM stub R3 de solo lectura listo en ${HOST}:${PORT}.`)
})

const shutdown = () => server.close(() => process.exit(0))
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
