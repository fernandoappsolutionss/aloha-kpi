import test, { before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { crearServicio, anotarAltaNueva } from '../../lib/referidos/servicio.mjs'
import { CUENTA_PA } from '../../lib/referidos/reglas.mjs'

// Referidos contra Postgres real: dinero, carreras y privacidad. BORRA los
// datos de referidos; solo contra una base desechable con db/schema.sql aplicado.
//   REFERIDOS_TEST_DATABASE_URL=postgres://… REFERIDOS_TEST_CONFIRM=disposable npm run test:referidos:db
const url = process.env.REFERIDOS_TEST_DATABASE_URL
if (!url || process.env.REFERIDOS_TEST_CONFIRM !== 'disposable') {
  throw new Error('REFERIDOS_TEST_DATABASE_URL y REFERIDOS_TEST_CONFIRM=disposable son obligatorias; esta prueba borra datos.')
}

const pool = new pg.Pool({ connectionString: url, max: 20 })
const tag = (ejecutar) => async (strings, ...values) => {
  if (typeof strings === 'string') return (await ejecutar(strings, values[0] || [])).rows
  let text = strings[0]
  for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`
  return (await ejecutar(text, values)).rows
}
const sql = tag((text, values) => pool.query(text, values))
async function withTransaction(callback) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED')
    const resultado = await callback(tag((text, values) => client.query(text, values)))
    await client.query('COMMIT')
    return resultado
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    throw error
  } finally { client.release() }
}

// CRM de mentira, con paginación y total como el integrador nuevo.
let eventos, registros, crmConTotal
const pagina = (filas, { offset = 0, limit = 500 }) => filas.slice(offset, offset + limit)
async function crm(action, payload) {
  if (action === 'list_events') {
    const filas = eventos.filter((e) => e.account_id === payload.account_id)
    return crmConTotal ? { events: pagina(filas, payload), total: filas.length } : { events: filas }
  }
  if (action === 'get_event') {
    const event = eventos.find((e) => e.id === payload.event_id)
    return event ? { event } : { error: 'Evento no encontrado' }
  }
  if (action === 'list_registrations') {
    const filas = registros.filter((r) => r.event_id === payload.event_id)
    return crmConTotal ? { registrations: pagina(filas, payload), total: filas.length } : { registrations: filas }
  }
  return { error: 'acción desconocida' }
}
const servicio = crearServicio({ sql, withTransaction, crm, centrosDeCuenta: () => [centroId] })

let centroId
const evento = (id, start_date) => { const e = { id, account_id: CUENTA_PA, start_date }; eventos.push(e); return e }
const inscribir = (id, event_id, phone, extra = {}) => {
  const r = { id, event_id, phone, first_name: `Persona ${id}`, attendance_status: 'registered', registered_at: '2026-11-05T10:00:00Z', ...extra }
  registros.push(r)
  return r
}
const miembro = async (telefonoNorm) => (await sql`SELECT * FROM referidos_miembros WHERE telefono_norm = ${telefonoNorm}`)[0]
const saldo = async (id) => (await sql`SELECT COALESCE(SUM(monto_cent),0)::int AS s FROM referidos_movimientos WHERE miembro_id = ${id}`)[0].s
const activar = (montos = {}) => sql`
  INSERT INTO referidos_config (crm_account_id, activo, activo_desde, bono_clase_prueba_cent, bono_referido_asiste_cent, bono_referido_inscrito_cent)
  VALUES (${CUENTA_PA}, true, '2026-11-01', ${montos.cp ?? 500}, ${montos.asiste ?? 300}, ${montos.inscrito ?? 1000})`

before(async () => {
  await pool.query(readFileSync(new URL('../../db/migrations/2026-11-12-referidos.sql', import.meta.url), 'utf8'))
})
beforeEach(async () => {
  await pool.query(`TRUNCATE referidos_movimientos, referidos_registros, referidos_apple_dispositivos, referidos_google_bajas,
    referidos_intentos, referidos_eventos, referidos_config, referidos_miembros RESTART IDENTITY CASCADE`)
  await pool.query(`DELETE FROM centros WHERE nombre = 'Centro referidos'`)
  centroId = (await sql`INSERT INTO centros (nombre) VALUES ('Centro referidos') RETURNING id`)[0].id
  eventos = []; registros = []; crmConTotal = true
})
after(() => pool.end())

test('bono de clase de prueba: asistió → no asistió → asistió → cancelada, siempre neto', async () => {
  await activar()
  const e = evento('ev1', '2026-11-10T15:00:00Z')
  const r = inscribir('r1', 'ev1', '61234567', { attendance_status: 'attended' })
  await servicio.importarEvento(e); await servicio.acreditar(CUENTA_PA)
  const m = await miembro('50761234567')
  assert.equal(await saldo(m.id), 500)
  await servicio.acreditar(CUENTA_PA)
  assert.equal(await saldo(m.id), 500, 'idempotente')

  r.attendance_status = 'no_show'
  await servicio.importarEvento(e); await servicio.acreditar(CUENTA_PA)
  assert.equal(await saldo(m.id), 0)

  // Cambia la configuración: el bono vuelve con su importe ORIGINAL.
  await sql`UPDATE referidos_config SET bono_clase_prueba_cent = 900`
  r.attendance_status = 'attended'
  await servicio.importarEvento(e); await servicio.acreditar(CUENTA_PA)
  assert.equal(await saldo(m.id), 500)

  r.attendance_status = 'cancelled'
  await servicio.importarEvento(e); await servicio.acreditar(CUENTA_PA)
  assert.equal(await saldo(m.id), 0)
  assert.equal((await sql`SELECT COUNT(*)::int AS n FROM referidos_movimientos`)[0].n, 4)
})

test('apagado o clase anterior a activo_desde: tarjeta sí, saldo no', async () => {
  const e = evento('ev1', '2026-11-10T15:00:00Z')
  inscribir('r1', 'ev1', '61234567', { attendance_status: 'attended' })
  await servicio.importarEvento(e); await servicio.acreditar(CUENTA_PA)
  const m = await miembro('50761234567')
  assert.ok(m.token && m.codigo)
  assert.equal(await saldo(m.id), 0)
  await activar()
  await sql`UPDATE referidos_config SET activo_desde = '2026-12-01'`
  await servicio.acreditar(CUENTA_PA)
  assert.equal(await saldo(m.id), 0)
  // Fernando pone una fecha pasada: se acredita a quien ya fue.
  await sql`UPDATE referidos_config SET activo_desde = '2026-11-01'`
  await servicio.acreditar(CUENTA_PA)
  assert.equal(await saldo(m.id), 500)
})

test('referido completo: asiste, se inscribe, se anula la matrícula tras un canje', async () => {
  await activar()
  evento('ev1', '2026-11-03T15:00:00Z'); evento('ev2', '2026-11-10T15:00:00Z')
  inscribir('ra', 'ev1', '61111111', { attendance_status: 'attended', registered_at: '2026-11-01T10:00:00Z' })
  await servicio.correrCuenta(CUENTA_PA, { desdeDias: null })
  const a = await miembro('50761111111')

  const rb = inscribir('rb', 'ev2', '62222222', { referral_code: a.codigo, registered_at: '2026-11-05T10:00:00Z' })
  // Autorreferido: A se inscribe otra vez con su propio código.
  inscribir('ra2', 'ev2', '61111111', { referral_code: a.codigo, registered_at: '2026-11-06T10:00:00Z' })
  await servicio.correrCuenta(CUENTA_PA, { desdeDias: 400 })
  const b = await miembro('50762222222')
  assert.equal(b.referidor_id, a.id)
  assert.equal((await miembro('50761111111')).referidor_id, null)
  assert.equal(await saldo(a.id), 500, 'inscribirse no paga')

  rb.attendance_status = 'attended'
  await servicio.correrCuenta(CUENTA_PA, { desdeDias: 400 })
  assert.equal(await saldo(a.id), 800)
  assert.equal(await saldo(b.id), 500)

  // Ficha nueva con inscripción efectiva.
  const [est] = await sql`INSERT INTO estudiantes (centro_id, nombre, estado, crm_registration_id, telefono, fecha_inscripcion)
    VALUES (${centroId}, 'Niño B', 'activo', 'rb', '62222222', '2026-11-11') RETURNING id`
  await withTransaction((q) => anotarAltaNueva(q, { crmRegistrationId: 'rb', estudianteId: est.id, centroId }))
  await servicio.acreditar(CUENTA_PA)
  assert.equal(await saldo(a.id), 800, 'ficha pendiente (sin evento de inscripción) aún no paga')
  await sql`INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha) VALUES (${est.id}, ${centroId}, 'inscripcion', 2026, 11, '2026-11-11')`
  await servicio.acreditar(CUENTA_PA)
  assert.equal(await saldo(a.id), 1800)

  const canje = await servicio.moverSaldo({ miembroId: a.id, tipo: 'canje', montoCent: 1800, nota: 'Factura 1', claveOp: randomUUID(), centroId })
  assert.equal(canje.saldo, 0)
  await sql`UPDATE estudiantes SET estado = 'matricula_anulada' WHERE id = ${est.id}`
  await servicio.acreditar(CUENTA_PA); await servicio.acreditar(CUENTA_PA)
  assert.equal(await saldo(a.id), -1000, 'el reverso deja deuda, una sola vez')
  const sinSaldo = await servicio.moverSaldo({ miembroId: a.id, tipo: 'canje', montoCent: 100, nota: 'x', claveOp: randomUUID(), centroId })
  assert.match(sinSaldo.error, /Saldo insuficiente/)
})

test('antecedente antiguo sin código: no es referido nuevo aunque los eventos lleguen en orden inverso', async () => {
  await activar()
  evento('nuevo', '2026-11-10T15:00:00Z'); evento('viejo', '2026-01-10T15:00:00Z'); evento('ev-a', '2026-11-03T15:00:00Z')
  inscribir('ra', 'ev-a', '61111111', { registered_at: '2026-11-01T10:00:00Z' })
  await servicio.importarEvento(eventos[2])
  const a = await miembro('50761111111')
  inscribir('rb-nuevo', 'nuevo', '62222222', { referral_code: a.codigo, attendance_status: 'attended', registered_at: '2026-11-05T10:00:00Z' })
  inscribir('rb-viejo', 'viejo', '62222222', { registered_at: '2026-01-05T10:00:00Z' })

  // Solo el evento reciente y sin cobertura: no se cierra nada ni se paga al referidor.
  await servicio.importarEvento(eventos[0])
  await servicio.acreditar(CUENTA_PA, { cerrarAtribucion: true })
  assert.equal((await miembro('50762222222')).atribucion_cerrada, false)
  assert.equal(await saldo(a.id), 0)

  await servicio.correrCuenta(CUENTA_PA, { desdeDias: null })
  const b = await miembro('50762222222')
  assert.equal(b.atribucion_cerrada, true)
  assert.equal(b.referidor_id, null)
  assert.equal(await saldo(a.id), 0)
})

test('CRM sin total (sin certificar) o corrida parcial: no marca cobertura ni cierra atribuciones', async () => {
  await activar()
  evento('ev1', '2026-11-10T15:00:00Z')
  inscribir('r1', 'ev1', '61234567')
  crmConTotal = false
  const r = await servicio.correrCuenta(CUENTA_PA, { desdeDias: null })
  assert.equal(r.completo, false)
  assert.equal((await sql`SELECT cobertura_completa_at FROM referidos_config`)[0].cobertura_completa_at, null)
  assert.equal((await miembro('50761234567')).atribucion_cerrada, false)
  crmConTotal = true
  // Carga histórica cortada por tiempo: tampoco; al reanudar, completa.
  evento('ev2', '2026-11-11T15:00:00Z')
  let vueltas = 0
  assert.equal((await servicio.correrCuenta(CUENTA_PA, { desdeDias: null, hasta: () => vueltas++ >= 1 })).completo, false)
  // Cobertura parcial (ventana de 45 días) tampoco la marca.
  await servicio.correrCuenta(CUENTA_PA, { desdeDias: 45 })
  assert.equal((await sql`SELECT cobertura_completa_at FROM referidos_config`)[0].cobertura_completa_at, null)
  await sql`DELETE FROM referidos_eventos WHERE crm_event_id = 'ev2'`
  const reanudada = await servicio.correrCuenta(CUENTA_PA, { desdeDias: null })
  assert.equal(reanudada.completo, true)
  assert.equal(reanudada.importados, 1, 'solo importa lo que faltaba')
  assert.ok((await sql`SELECT cobertura_completa_at FROM referidos_config`)[0].cobertura_completa_at)
})

test('canjes concurrentes y clave repetida: nunca saldo negativo ni doble descuento', async () => {
  await activar()
  const e = evento('ev1', '2026-11-10T15:00:00Z')
  inscribir('r1', 'ev1', '61234567', { attendance_status: 'attended' })
  await servicio.importarEvento(e); await servicio.acreditar(CUENTA_PA)
  const m = await miembro('50761234567')
  const intentos = await Promise.all(Array.from({ length: 6 }, () =>
    servicio.moverSaldo({ miembroId: m.id, tipo: 'canje', montoCent: 400, nota: 'Factura', claveOp: randomUUID(), centroId })))
  assert.equal(intentos.filter((r) => r.ok).length, 1)
  assert.equal(await saldo(m.id), 100)
  const claveOp = randomUUID()
  const dobles = await Promise.all([1, 2, 3].map(() =>
    servicio.moverSaldo({ miembroId: m.id, tipo: 'canje', montoCent: 50, nota: 'Factura', claveOp, centroId })))
  assert.ok(dobles.every((r) => r.ok))
  assert.equal(await saldo(m.id), 50)
  // Ajuste negativo discrecional no puede dejar deuda.
  const ajuste = await servicio.moverSaldo({ miembroId: m.id, tipo: 'ajuste', montoCent: -500, nota: 'x', claveOp: randomUUID() })
  assert.match(ajuste.error, /Saldo insuficiente/)
})

test('dos importaciones y acreditaciones simultáneas del mismo evento: un miembro, un bono', async () => {
  await activar()
  const e = evento('ev1', '2026-11-10T15:00:00Z')
  inscribir('r1', 'ev1', '61234567', { attendance_status: 'attended' })
  inscribir('r2', 'ev1', '+507 6123-4567', { attendance_status: 'attended', first_name: 'Otro nombre' })
  await Promise.all([1, 2, 3, 4].map(() => servicio.importarEvento(e)))
  await Promise.all([1, 2, 3, 4].map(() => servicio.acreditar(CUENTA_PA)))
  const miembros = await sql`SELECT * FROM referidos_miembros`
  assert.equal(miembros.length, 1)
  assert.equal(miembros[0].nombre, 'Persona r1', 'una inscripción posterior no sobrescribe al miembro')
  assert.equal(await saldo(miembros[0].id), 1000)
})

test('alta por enlace: un solo uso, nunca revela la tarjeta de un miembro existente', async () => {
  evento('ev1', '2026-11-10T15:00:00Z'); evento('ev2', '2026-11-17T15:00:00Z')
  inscribir('r1', 'ev1', '61234567')
  const simultaneas = await Promise.all([1, 2, 3].map(() => servicio.consumirAlta({ eventId: 'ev1', registrationId: 'r1', ip: '1.1.1.1' })))
  assert.equal(simultaneas.filter((r) => r.token).length, 1)
  assert.equal((await servicio.consumirAlta({ eventId: 'ev1', registrationId: 'r1', ip: '1.1.1.1' })).error, 'no')

  // Otra persona se inscribe con el teléfono de la víctima: no obtiene su tarjeta.
  inscribir('r-atacante', 'ev2', '61234567')
  assert.equal((await servicio.consumirAlta({ eventId: 'ev2', registrationId: 'r-atacante', ip: '2.2.2.2' })).error, 'no')
  // Inscripción con evento equivocado o inexistente.
  assert.equal((await servicio.consumirAlta({ eventId: 'ev2', registrationId: 'r1', ip: '2.2.2.2' })).error, 'no')
  assert.equal((await servicio.consumirAlta({ eventId: 'nada', registrationId: 'r1', ip: '2.2.2.2' })).error, 'no')
  // Límite por IP.
  let ultimo
  for (let i = 0; i < 12; i++) ultimo = await servicio.consumirAlta({ eventId: 'ev1', registrationId: 'r1', ip: '3.3.3.3' })
  assert.equal(ultimo.error, 'limite')
})

test('reemitir: el enlace anterior y el de alta dejan de servir', async () => {
  const e = evento('ev1', '2026-11-10T15:00:00Z')
  inscribir('r1', 'ev1', '61234567')
  await servicio.importarEvento(e)
  const antes = await miembro('50761234567')
  const { token } = await servicio.reemitir(antes.id, { objetoGoogle: (m) => `issuer.m${m.id}_${m.emision}` })
  assert.equal(await servicio.tarjetaPorToken(antes.token), null)
  const tarjeta = await servicio.tarjetaPorToken(token)
  assert.equal(tarjeta.emision, 2)
  assert.notEqual(tarjeta.apple_auth, antes.apple_auth)
  assert.equal((await servicio.consumirAlta({ eventId: 'ev1', registrationId: 'r1', ip: '1.1.1.1' })).error, 'no')
})

test('sin teléfono válido: no crea miembro ni agrupa desconocidos', async () => {
  const e = evento('ev1', '2026-11-10T15:00:00Z')
  inscribir('r1', 'ev1', null); inscribir('r2', 'ev1', '123')
  const r = await servicio.importarEvento(e)
  assert.equal(r.sinTelefono, 2)
  assert.equal((await sql`SELECT COUNT(*)::int AS n FROM referidos_miembros`)[0].n, 0)
})

test('paginación del CRM: recorre todas las páginas y certifica por ids únicos', async () => {
  const e = evento('ev1', '2026-11-10T15:00:00Z')
  for (let i = 0; i < 1203; i++) inscribir(`r${i}`, 'ev1', String(60000000 + i))
  const r = await servicio.importarEvento(e)
  assert.equal(r.inscritos, 1203)
  assert.equal(r.certificado, true)
})
