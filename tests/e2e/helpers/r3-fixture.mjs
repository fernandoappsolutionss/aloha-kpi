import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { neonConfig, Pool } from '@neondatabase/serverless'
import ws from 'ws'

import { resolveNeonE2EConfig } from '../../../lib/neon-e2e-config.mjs'

export const R3_MARKER = 'E2E_R3_DIALOGS_V1'
export const R3_IDS = Object.freeze({
  centerOperations: 2,
  centerGrowth: 3,
  group: 930002,
  schedule: 930012,
  student: 930022,
  eventMirror: 930032,
  salon: 930052,
  crmEvent: 'e2e-r3-event-930032',
  crmRegistration: 'e2e-r3-registration-930042',
})

export const R3_MANIFEST_PATH = resolve(process.cwd(), 'test-results/r3-fixture-manifest.json')

function queryTag(db) {
  return async function query(strings, ...values) {
    if (typeof strings === 'string') {
      const result = await db.query(strings, values[0] || [])
      return result.rows
    }
    let text = strings[0]
    for (let index = 0; index < values.length; index++) text += `$${index + 1}${strings[index + 1]}`
    const result = await db.query(text, values)
    return result.rows
  }
}

function configureTransport() {
  neonConfig.webSocketConstructor = ws
  const transport = resolveNeonE2EConfig(process.env)
  if (!transport) throw new Error('El fixture R3 exige transporte Neon E2E explícito.')
  neonConfig.fetchEndpoint = transport.fetchEndpoint
  neonConfig.wsProxy = transport.wsProxy
  neonConfig.useSecureWebSocket = transport.useSecureWebSocket
  neonConfig.forceDisablePgSSL = transport.forceDisablePgSSL
  neonConfig.pipelineTLS = transport.pipelineTLS
  neonConfig.pipelineConnect = transport.pipelineConnect
}

async function transaction(callback) {
  configureTransport()
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = await pool.connect()
  try {
    await db.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
    const result = await callback(queryTag(db))
    await db.query('COMMIT')
    return result
  } catch (error) {
    try { await db.query('ROLLBACK') } catch {}
    throw error
  } finally {
    db.release()
    await pool.end()
  }
}

async function queryOnce(callback) {
  configureTransport()
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    return await callback(queryTag(pool))
  } finally {
    await pool.end()
  }
}

export function requireDisposableGate(env = process.env) {
  const required = ['DATABASE_URL', 'USUARIOS_TEST_DATABASE_URL', 'E2E_NEON_HTTP', 'E2E_NEON_WSPROXY', 'E2E_ADMIN_EMAIL']
  if (env.E2E_R3_DIALOGS !== '1') throw new Error('El fixture R3 solo puede ejecutarse con E2E_R3_DIALOGS=1.')
  if (env.E2E_DATABASE_CONFIRM !== 'disposable') throw new Error('El fixture R3 exige E2E_DATABASE_CONFIRM=disposable.')
  if (required.some((name) => !env[name])) throw new Error('Faltan variables de la base desechable para el fixture R3.')
  if (env.DATABASE_URL !== env.USUARIOS_TEST_DATABASE_URL) {
    throw new Error('El fixture R3 abortó: DATABASE_URL no coincide con USUARIOS_TEST_DATABASE_URL.')
  }
  const endpoint = new URL(env.E2E_NEON_HTTP)
  const database = new URL(env.DATABASE_URL)
  if (env.RESPONSIVE_BASE_URL || endpoint.protocol !== 'http:' || endpoint.hostname !== '127.0.0.1'
      || endpoint.username || endpoint.password || !/^127\.0\.0\.1:\d+$/.test(env.E2E_NEON_WSPROXY)
      || !['127.0.0.1', 'localhost', 'aloha-r2-pg'].includes(database.hostname)) {
    throw new Error('El fixture R3 exige transporte y base locales; no admite destinos remotos.')
  }
}

function panamaDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Panama', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const value = (type) => parts.find((part) => part.type === type)?.value
  return `${value('year')}-${value('month')}-${value('day')}`
}

function addUtcDays(date, amount) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10)
}

async function assertOwnedOrFree(query, table, id, markerColumn = null) {
  const rows = markerColumn
    ? await query(`SELECT id, ${markerColumn} AS marker FROM ${table} WHERE id = $1 FOR UPDATE`, [id])
    : await query(`SELECT id FROM ${table} WHERE id = $1 FOR UPDATE`, [id])
  if (!rows.length) return
  if (!markerColumn || rows[0].marker !== R3_MARKER) {
    throw new Error(`Colisión E2E R3: ${table}(${id}) ya existe y no pertenece al fixture.`)
  }
}

export async function prepareR3Fixture() {
  requireDisposableGate()
  const today = panamaDate()
  const [year, month] = today.split('-').map(Number)
  const anchor = addUtcDays(today, -56)
  // Solo hace falta persistir el calendario versionado: el plan por niño se
  // deriva al leerlo con el generador único de producción.
  const itinerary = {
    nivel: 1,
    fecha_inicio: anchor,
    semanas: [],
    excepciones: [],
    clases_suspendidas: [],
    pais: 'PA',
    con_feriados: true,
    versiones: [{ vigente_desde: anchor, dias: [1] }],
  }

  const manifest = await transaction(async (query) => {
    const centers = await query`
      SELECT id, region FROM centros
      WHERE id = ANY(${[R3_IDS.centerOperations, R3_IDS.centerGrowth]}::int[])
      ORDER BY id
      FOR UPDATE
    `
    for (const center of centers) {
      if (center.region !== R3_MARKER) {
        throw new Error(`Colisión E2E R3: centros(${center.id}) ya existe sin el marcador propio.`)
      }
    }

    const staleSnapshots = await query`
      SELECT id FROM growth_snapshots WHERE centro_id = ${R3_IDS.centerGrowth} ORDER BY id
    `
    const staleSnapshotIds = staleSnapshots.map((row) => Number(row.id))
    if (staleSnapshotIds.length) {
      await query`DELETE FROM growth_notification_receipts WHERE snapshot_id = ANY(${staleSnapshotIds}::bigint[])`
      await query`DELETE FROM growth_recommendations WHERE snapshot_id = ANY(${staleSnapshotIds}::bigint[])`
      await query`DELETE FROM growth_snapshots WHERE id = ANY(${staleSnapshotIds}::bigint[])`
    }

    await assertOwnedOrFree(query, 'grupos', R3_IDS.group, 'notas')
    await assertOwnedOrFree(query, 'estudiantes', R3_IDS.student, 'notas')
    await assertOwnedOrFree(query, 'centro_eventos', R3_IDS.eventMirror, 'created_by')
    await assertOwnedOrFree(query, 'salones', R3_IDS.salon, 'nombre')
    const schedules = await query`
      SELECT gh.id, gh.grupo_id, g.notas AS marker
      FROM grupo_horarios gh
      LEFT JOIN grupos g ON g.id = gh.grupo_id
      WHERE gh.id = ${R3_IDS.schedule}
      FOR UPDATE OF gh
    `
    if (schedules.length && (Number(schedules[0].grupo_id) !== R3_IDS.group || schedules[0].marker !== R3_MARKER)) {
      throw new Error(`Colisión E2E R3: grupo_horarios(${R3_IDS.schedule}) ya existe y no pertenece al fixture.`)
    }

    // Recuperación acotada de una corrida R3 interrumpida. Solo se tocan PK
    // fijas después de demostrar que sus padres conservan el marcador propio.
    await query`DELETE FROM centro_eventos WHERE id = ${R3_IDS.eventMirror}`
    await query`DELETE FROM estudiantes WHERE id = ${R3_IDS.student}`
    await query`DELETE FROM grupo_horarios WHERE id = ${R3_IDS.schedule}`
    await query`DELETE FROM grupos WHERE id = ${R3_IDS.group}`
    await query`DELETE FROM salones WHERE id = ${R3_IDS.salon} AND nombre = ${R3_MARKER}`

    for (const [id, name] of [
      [R3_IDS.centerOperations, 'Centro Fixture R3 Operaciones'],
      [R3_IDS.centerGrowth, 'Centro Fixture R3 Growth'],
    ]) {
      await query`
        INSERT INTO centros (id, nombre, region, pais)
        VALUES (${id}, ${name}, ${R3_MARKER}, 'PA')
        ON CONFLICT (id) DO UPDATE
          SET nombre = EXCLUDED.nombre, region = EXCLUDED.region, pais = EXCLUDED.pais
      `
    }

    await query`
      INSERT INTO salones (id, centro_id, nombre, activo)
      VALUES (${R3_IDS.salon}, ${R3_IDS.centerOperations}, ${R3_MARKER}, TRUE)
    `
    await query`
      INSERT INTO grupos (
        id, centro_id, numero, itinerario, estado, fecha_apertura,
        fecha_inicio_clases, inscripcion_abierta, itinerario_clases, notas
      ) VALUES (
        ${R3_IDS.group}, ${R3_IDS.centerOperations}, 'R3', 'TINY', 'activo', ${anchor},
        ${anchor}, TRUE, ${JSON.stringify(itinerary)}::jsonb, ${R3_MARKER}
      )
    `
    await query`
      INSERT INTO grupo_horarios (id, grupo_id, dia, hora_inicio, hora_fin)
      VALUES (${R3_IDS.schedule}, ${R3_IDS.group}, 1, '15:00', '16:00')
    `
    await query`
      INSERT INTO estudiantes (
        id, centro_id, grupo_id, nombre, itinerario, nivel, estado,
        status_plataforma, origen, origen_venta, fecha_inscripcion,
        fecha_inicio_nivel, representante, correo, telefono, notas
      ) VALUES (
        ${R3_IDS.student}, ${R3_IDS.centerOperations}, ${R3_IDS.group},
        'Niño Fixture R3', 'TINY', 1, 'activo', 'INCLUIR', 'directo', 'centro',
        ${anchor}, ${anchor}, 'Representante Fixture R3', 'fixture-r3@example.invalid',
        '+50760000000', ${R3_MARKER}
      )
    `
    await query`
      INSERT INTO centro_eventos (
        id, centro_id, crm_event_id, crm_account_id, nombre, start_date, grupo_id, created_by
      ) VALUES (
        ${R3_IDS.eventMirror}, ${R3_IDS.centerOperations}, ${R3_IDS.crmEvent},
        'c0c81438-bb54-4ae0-a019-b54e0bfcf870', 'Clase Fixture R3',
        ${`${today}T15:00:00-05:00`}, ${R3_IDS.group}, ${R3_MARKER}
      )
    `

    for (const [centerId, state] of [
      [R3_IDS.centerOperations, 'abierto'],
      [R3_IDS.centerGrowth, 'cerrado'],
    ]) {
      await query`
        INSERT INTO mes_kpi (centro_id, year, month, estado)
        VALUES (${centerId}, ${year}, ${month}, ${state})
        ON CONFLICT (centro_id, year, month) DO UPDATE SET estado = EXCLUDED.estado
      `
    }

    const [admin] = await query`
      SELECT id FROM usuarios WHERE email = ${process.env.E2E_ADMIN_EMAIL} LIMIT 1
    `
    if (!admin) throw new Error('El fixture R3 requiere el usuario admin local creado por R2.')

    return {
      marker: R3_MARKER,
      createdAt: new Date().toISOString(),
      today,
      year,
      month,
      adminUserId: Number(admin.id),
      ids: R3_IDS,
      growth: { snapshotIds: [], recommendationIds: [], receiptIds: [] },
    }
  })

  await mkdir(dirname(R3_MANIFEST_PATH), { recursive: true })
  await writeFile(R3_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 })
  return manifest
}

async function loadManifest() {
  const raw = await readFile(R3_MANIFEST_PATH, 'utf8')
  const manifest = JSON.parse(raw)
  if (manifest.marker !== R3_MARKER) throw new Error('El manifest R3 no conserva el marcador esperado.')
  return manifest
}

export async function cleanupR3Fixture() {
  requireDisposableGate()
  const manifest = await loadManifest()
  const cleaned = await transaction(async (query) => {
    const centers = await query`
      SELECT id, region FROM centros
      WHERE id = ANY(${[R3_IDS.centerOperations, R3_IDS.centerGrowth]}::int[])
      FOR UPDATE
    `
    for (const center of centers) {
      if (center.region !== R3_MARKER) {
        throw new Error(`Cleanup R3 abortado: centros(${center.id}) perdió el marcador propio.`)
      }
    }

    const snapshots = await query`
      SELECT id FROM growth_snapshots WHERE centro_id = ${R3_IDS.centerGrowth} ORDER BY id
    `
    const recommendations = await query`
      SELECT id FROM growth_recommendations WHERE centro_id = ${R3_IDS.centerGrowth} ORDER BY id
    `
    const receipts = snapshots.length
      ? await query`
          SELECT id FROM growth_notification_receipts
          WHERE usuario_id = ${manifest.adminUserId}
            AND snapshot_id = ANY(${snapshots.map((row) => Number(row.id))}::bigint[])
          ORDER BY id
        `
      : []

    const receiptIds = receipts.map((row) => Number(row.id))
    const recommendationIds = recommendations.map((row) => Number(row.id))
    const snapshotIds = snapshots.map((row) => Number(row.id))
    // Captura durable antes de borrar: incluso un fallo del teardown deja las
    // PK exactas, nunca un patrón por nombre, disponibles para recuperación.
    manifest.growth = { receiptIds, recommendationIds, snapshotIds }
    await writeFile(R3_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 })
    if (receiptIds.length) await query`DELETE FROM growth_notification_receipts WHERE id = ANY(${receiptIds}::bigint[])`
    if (recommendationIds.length) await query`DELETE FROM growth_recommendations WHERE id = ANY(${recommendationIds}::bigint[])`
    if (snapshotIds.length) await query`DELETE FROM growth_snapshots WHERE id = ANY(${snapshotIds}::bigint[])`

    await query`DELETE FROM centro_eventos WHERE id = ${R3_IDS.eventMirror} AND created_by = ${R3_MARKER}`
    await query`DELETE FROM estudiantes WHERE id = ${R3_IDS.student} AND notas = ${R3_MARKER}`
    await query`
      DELETE FROM grupo_horarios
      WHERE id = ${R3_IDS.schedule}
        AND grupo_id = ${R3_IDS.group}
    `
    await query`DELETE FROM grupos WHERE id = ${R3_IDS.group} AND notas = ${R3_MARKER}`
    await query`DELETE FROM salones WHERE id = ${R3_IDS.salon} AND nombre = ${R3_MARKER} AND centro_id = ${R3_IDS.centerOperations}`
    await query`
      DELETE FROM mes_kpi
      WHERE (centro_id, year, month) IN (
        (${R3_IDS.centerOperations}, ${manifest.year}, ${manifest.month}),
        (${R3_IDS.centerGrowth}, ${manifest.year}, ${manifest.month})
      )
    `
    await query`
      DELETE FROM centros
      WHERE id = ANY(${[R3_IDS.centerOperations, R3_IDS.centerGrowth]}::int[])
        AND region = ${R3_MARKER}
    `

    return {
      snapshotIds,
      recommendationIds,
      receiptIds,
      fixtureIds: [R3_IDS.eventMirror, R3_IDS.student, R3_IDS.schedule, R3_IDS.group, R3_IDS.salon, R3_IDS.centerOperations, R3_IDS.centerGrowth],
    }
  })

  await rm(R3_MANIFEST_PATH, { force: true })
  return cleaned
}

export async function readR3Manifest() {
  requireDisposableGate()
  return loadManifest()
}

export async function readR3GrowthReceipt(manifest) {
  requireDisposableGate()
  return queryOnce(async (query) => {
    const [row] = await query`
      SELECT r.id, r.shown_at, r.acknowledged_at, r.snoozed_until
      FROM growth_notification_receipts r
      JOIN growth_snapshots s ON s.id = r.snapshot_id
      WHERE r.usuario_id = ${manifest.adminUserId}
        AND s.centro_id = ${manifest.ids.centerGrowth}
      ORDER BY r.id DESC
      LIMIT 1
    `
    return row || null
  })
}
