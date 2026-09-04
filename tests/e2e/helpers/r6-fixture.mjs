import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { neonConfig, Pool } from '@neondatabase/serverless'
import ws from 'ws'
import { resolveNeonE2EConfig } from '../../../lib/neon-e2e-config.mjs'

export const R6_MARKER = 'E2E_R6_COMPARISONS_V1'
export const R6_IDS = Object.freeze({ center: 910006, user: 920006 })
const manifestPath = resolve('tests/e2e/.auth/r6-fixture-manifest.json')
const evidencePath = resolve('tests/e2e/.auth/r6-cleanup-evidence.json')
const email = 'admin-r6@e2e.invalid'

export function requireR6Gate(env = process.env) {
  if (env.E2E_R6_COMPARISONS !== '1' || env.E2E_DATABASE_CONFIRM !== 'disposable'
    || env.RESPONSIVE_BASE_URL || env.E2E_R3_DIALOGS === '1' || env.E2E_RUN_MUTATIONS === '1') {
    throw new Error('R6 exige gate exclusivo local disposable.')
  }
  if (!env.DATABASE_URL || env.DATABASE_URL !== env.USUARIOS_TEST_DATABASE_URL) throw new Error('R6 exige bases iguales.')
  const db = new URL(env.DATABASE_URL)
  const http = new URL(env.E2E_NEON_HTTP)
  if (!['127.0.0.1', 'localhost', 'aloha-r2-pg'].includes(db.hostname)
    || http.protocol !== 'http:' || http.hostname !== '127.0.0.1' || http.username || http.password
    || !/^127\.0\.0\.1:\d+$/.test(env.E2E_NEON_WSPROXY || '')) throw new Error('R6 solo admite transportes locales.')
}

async function transaction(work) {
  requireR6Gate()
  neonConfig.webSocketConstructor = ws
  Object.assign(neonConfig, resolveNeonE2EConfig(process.env))
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = await pool.connect()
  try {
    await db.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
    const query = async (text, values = []) => (await db.query(text, values)).rows
    const result = await work(query)
    await db.query('COMMIT')
    return result
  } catch (e) {
    await db.query('ROLLBACK')
    throw e
  } finally { db.release(); await pool.end() }
}

async function save(manifest) {
  await mkdir(dirname(manifestPath), { recursive: true })
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), { mode: 0o600 })
}

async function owned(query, requirePresent = false) {
  const centers = await query('SELECT id, region FROM centros WHERE id=$1 FOR UPDATE', [R6_IDS.center])
  const users = await query('SELECT id,email,rol,centro_id FROM usuarios WHERE id=$1 FOR UPDATE', [R6_IDS.user])
  if ((requirePresent && (centers.length !== 1 || users.length !== 1))
    || centers.some(c => c.region !== R6_MARKER)
    || users.some(u => u.email !== email || u.rol !== 'administradora' || Number(u.centro_id) !== R6_IDS.center)) {
    throw new Error('R6 colisión o pérdida de propiedad: abortando sin borrar.')
  }
  return centers.length || users.length
}

async function baseFootprint(query) {
  return {
    snapshots: await query('SELECT id,centro_id,snapshot_date,engine_version FROM growth_snapshots WHERE centro_id IN (910001,910002) ORDER BY id'),
    recommendations: await query('SELECT id,centro_id,snapshot_id,status,generated_for FROM growth_recommendations WHERE centro_id IN (910001,910002) ORDER BY id'),
  }
}

export async function prepareR6Fixture() {
  await transaction(async query => {
    if (await owned(query)) throw new Error('Fixture R6 existente: recupera su manifest antes de otra corrida.')
    const months = [7, 8, 9].map(month => [R6_IDS.center, 2026, month])
    const weeks = months.flatMap(key => [1, 2, 3, 4, 5].map(week => [...key, week]))
    const manifest = { marker: R6_MARKER, ids: R6_IDS, months, weeks, progressIds: [], growth: {}, baseBefore: await baseFootprint(query), phase: 'preparing' }
    // Persistir propiedad antes del COMMIT permite recuperar una interrupción.
    await save(manifest)
    await query('INSERT INTO centros (id,nombre,region,pais) VALUES ($1,$2,$3,$4)', [R6_IDS.center, 'Centro Fixture R6 Comparaciones', R6_MARKER, 'PA'])
    await query('INSERT INTO usuarios (id,nombre,email,rol,centro_id) VALUES ($1,$2,$3,$4,$5)', [R6_IDS.user, 'Administradora Fixture R6', email, 'administradora', R6_IDS.center])
    for (const [index, key] of months.entries()) {
      await query("INSERT INTO mes_kpi (centro_id,year,month,estado) VALUES ($1,$2,$3,'cerrado')", key)
      await query('INSERT INTO resumen_mes (centro_id,year,month,ninos_inicio_mes,ninos_final_mes,grupos_activos,nuevos_activos_mes,meta_nuevos_mensual) VALUES ($1,$2,$3,$4,$5,$6,$7,8)', [...key, [100,104,109][index], [104,109,115][index], [10,10,11][index], [6,7,8][index]])
    }
    for (const key of weeks) await query('INSERT INTO kpi_semanas (centro_id,year,month,semana,ing_d1,des_d1,cob_d5) VALUES ($1,$2,$3,$4,2,$5,1)', [...key, key[3] === 3 ? 1 : 0])
    for (const [module, tour, quiz] of [['meta', true, true], ['modelo', true, false], ['aperturar', false, true]]) {
      const [row] = await query('INSERT INTO entrenamiento_progreso (usuario_id,modulo,tour_visto_at,quiz_aprobado_at,intentos,ultimo_puntaje) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [R6_IDS.user, module, tour ? '2026-09-01T12:00:00Z' : null, quiz ? '2026-09-01T12:05:00Z' : null, quiz ? 1 : 0, quiz ? 3 : null])
      manifest.progressIds.push(Number(row.id))
    }
    manifest.phase = 'ready'
    await save(manifest)
  })
}

export async function cleanupR6Fixture() {
  requireR6Gate()
  let manifest
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')) } catch (error) { if (error.code === 'ENOENT') return; throw error }
  if (manifest.marker !== R6_MARKER || manifest.ids.center !== R6_IDS.center || manifest.ids.user !== R6_IDS.user) throw new Error('Manifest R6 inválido.')
  const expectedMonths = [7, 8, 9].map(month => [R6_IDS.center, 2026, month])
  const expectedWeeks = expectedMonths.flatMap(key => [1, 2, 3, 4, 5].map(week => [...key, week]))
  if (JSON.stringify(manifest.months) !== JSON.stringify(expectedMonths) || JSON.stringify(manifest.weeks) !== JSON.stringify(expectedWeeks)
    || !manifest.progressIds.every(id => Number.isSafeInteger(id) && id > 0)) throw new Error('Claves de manifest R6 inválidas.')
  await transaction(async query => {
    if (!await owned(query)) {
      if (!['preparing','cleaned-own-fixture-base-preserved'].includes(manifest.phase)) throw new Error('Fixture R6 ausente inesperadamente.')
      for(const [table,ids] of [['entrenamiento_progreso',manifest.progressIds],['growth_snapshots',manifest.growth.snapshotIds||[]],['growth_recommendations',manifest.growth.recommendationIds||[]],['growth_notification_receipts',manifest.growth.receiptIds||[]]]) {
        if(!Array.isArray(ids)||!ids.every(id=>Number.isSafeInteger(id)&&id>0))throw new Error('PK recuperada de R6 inválida.')
        if((await query(`SELECT 1 FROM ${table} WHERE id=ANY($1::bigint[])`,[ids])).length)throw new Error('R6 parcialmente presente o PK reutilizada; abortando recuperación.')
      }
      for(const table of ['resumen_mes','mes_kpi','kpi_semanas','growth_snapshots','growth_recommendations']) if((await query(`SELECT 1 FROM ${table} WHERE centro_id=$1`,[R6_IDS.center])).length)throw new Error('R6 conserva filas dependientes; no es una limpieza completada.')
      return
    }
    await owned(query, true)
    const snapshots = await query('SELECT id,engine_version FROM growth_snapshots WHERE centro_id=$1 ORDER BY id', [R6_IDS.center])
    const recommendations = await query('SELECT id FROM growth_recommendations WHERE centro_id=$1 ORDER BY id', [R6_IDS.center])
    const snapshotIds = snapshots.map(r => Number(r.id))
    const receipts = await query('SELECT id FROM growth_notification_receipts WHERE snapshot_id=ANY($1::bigint[]) ORDER BY id', [snapshotIds])
    manifest.growth = { snapshotIds, snapshots, recommendationIds: recommendations.map(r => Number(r.id)), receiptIds: receipts.map(r => Number(r.id)) }
    manifest.baseAfter = await baseFootprint(query)
    manifest.phase = 'cleanup-growth'
    await save(manifest)
    await query('DELETE FROM growth_notification_receipts WHERE id=ANY($1::bigint[])', [manifest.growth.receiptIds])
    await query('DELETE FROM growth_recommendations WHERE id=ANY($1::bigint[]) AND centro_id=$2', [manifest.growth.recommendationIds, R6_IDS.center])
    await query('DELETE FROM growth_snapshots WHERE id=ANY($1::bigint[]) AND centro_id=$2', [snapshotIds, R6_IDS.center])
    manifest.phase = 'cleanup-fixture'
    await save(manifest)
    await query('DELETE FROM entrenamiento_progreso WHERE id=ANY($1::bigint[]) AND usuario_id=$2', [manifest.progressIds, R6_IDS.user])
    for (const key of manifest.weeks) await query('DELETE FROM kpi_semanas WHERE centro_id=$1 AND year=$2 AND month=$3 AND semana=$4', key)
    for (const key of manifest.months) {
      await query('DELETE FROM resumen_mes WHERE centro_id=$1 AND year=$2 AND month=$3', key)
      await query('DELETE FROM mes_kpi WHERE centro_id=$1 AND year=$2 AND month=$3', key)
    }
    await query('DELETE FROM usuarios WHERE id=$1 AND email=$2 AND centro_id=$3', [R6_IDS.user, email, R6_IDS.center])
    await query('DELETE FROM centros WHERE id=$1 AND region=$2', [R6_IDS.center, R6_MARKER])
    for (const [table, key, id] of [['centros','id',R6_IDS.center], ['usuarios','id',R6_IDS.user], ['entrenamiento_progreso','usuario_id',R6_IDS.user], ...['mes_kpi','resumen_mes','kpi_semanas','growth_snapshots','growth_recommendations'].map(table => [table,'centro_id',R6_IDS.center])]) {
      const remaining = await query(`SELECT 1 FROM ${table} WHERE ${key}=$1`, [id])
      if (remaining.length) throw new Error(`Cleanup R6 incompleto: ${table}`)
    }
    const remainingReceipts = await query('SELECT 1 FROM growth_notification_receipts WHERE snapshot_id=ANY($1::bigint[])', [snapshotIds])
    if (remainingReceipts.length) throw new Error('Cleanup R6 incompleto: receipts')
    manifest.phase = 'cleaned-own-fixture-base-preserved'
    await save(manifest)
  })
  await writeFile(evidencePath, JSON.stringify(manifest, null, 2), { mode: 0o600 })
  await rm(manifestPath)
}
