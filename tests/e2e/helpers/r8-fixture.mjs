import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { neonConfig, Pool } from '@neondatabase/serverless'
import ws from 'ws'
import bcrypt from 'bcryptjs'
import { resolveNeonE2EConfig } from '../../../lib/neon-e2e-config.mjs'

export const R8_MARKER = 'E2E_R8_CENTER_CORE_V1'
export const R8_IDS = { center: 3, user: 980003, group: 980013, student: 980023, graduate: 980024, event: 980033, sale: 980043, priorSale: 980044, withdrawal: 980045 }
export const R8_EMAIL = 'center-r8@e2e.invalid'
export const R8_PASSWORD = 'AlohaR8Disposable!2026'
export const R8_STATE = 'tests/e2e/.auth/r8-center.json'
const manifestPath = resolve('tests/e2e/.auth/r8-fixture-manifest.json')
const evidencePath = resolve('test-results/r8-cleanup-evidence.json')
export const R8_YEAR = 2026
export const R8_MONTH = 9
export const R8_EVENT = { id: 'e2e-r8-event-980033', account_id: 'c0c81438-bb54-4ae0-a019-b54e0bfcf870', start_date: '2026-09-01T15:00:00-05:00' }
export const R8_REGISTRATION = { id: 'e2e-r8-registration-980053', event_id: R8_EVENT.id, registered_at: '2026-09-01T12:00:00-05:00', attendance_status: 'attended', checked_in_at: '2026-09-01T15:00:00-05:00' }
export async function r8Crm(action, payload) {
  if (action === 'list_events' && payload.account_id === R8_EVENT.account_id) return { events: [R8_EVENT] }
  if (action === 'list_registrations_by_event_ids') return { registrations: payload.event_ids.includes(R8_EVENT.id) ? [R8_REGISTRATION] : [] }
  throw new Error(`Comando CRM no esperado: ${action}`)
}

export function requireR8Gate(env = process.env) {
  if (env.E2E_R8_CENTER_CORE !== '1' || env.E2E_DATABASE_CONFIRM !== 'disposable' || env.RESPONSIVE_BASE_URL
    || ['E2E_R3_DIALOGS', 'E2E_R6_COMPARISONS', 'E2E_RUN_MUTATIONS'].some(key => env[key] === '1')) throw new Error('R8 exige gate exclusivo local disposable.')
  if (env.E2E_CENTRO_ID && env.E2E_CENTRO_ID !== '3') throw new Error('R8 requiere su centro exclusivo 3.')
  if (!env.DATABASE_URL || env.DATABASE_URL !== env.USUARIOS_TEST_DATABASE_URL) throw new Error('R8 exige bases iguales.')
  const db = new URL(env.DATABASE_URL), http = new URL(env.E2E_NEON_HTTP)
  if (!['localhost', '127.0.0.1', 'aloha-r2-pg'].includes(db.hostname) || http.protocol !== 'http:'
    || http.hostname !== '127.0.0.1' || http.username || http.password || !/^127\.0\.0\.1:\d+$/.test(env.E2E_NEON_WSPROXY || '')) throw new Error('R8 solo admite transportes locales.')
}
export function r8Pool() {
  requireR8Gate()
  neonConfig.webSocketConstructor = ws
  Object.assign(neonConfig, resolveNeonE2EConfig(process.env))
  return new Pool({ connectionString: process.env.DATABASE_URL })
}
export async function r8Transaction(work) {
  const pool = r8Pool(), db = await pool.connect()
  try {
    await db.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
    const result = await work(async (text, values = []) => (await db.query(text, values)).rows)
    await db.query('COMMIT')
    return result
  } catch (error) { await db.query('ROLLBACK'); throw error }
  finally { db.release(); await pool.end() }
}
async function save(path, value) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value, null, 2), { mode: 0o600 })
}
async function footprint(query) {
  return {
    snapshots: await query('SELECT id,centro_id,snapshot_date,engine_version FROM growth_snapshots WHERE centro_id IN (910001,910002) ORDER BY id'),
    recommendations: await query('SELECT id,centro_id,snapshot_id,status FROM growth_recommendations WHERE centro_id IN (910001,910002) ORDER BY id'),
  }
}
export async function readR8Manifest() {
  requireR8Gate()
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (manifest.marker !== R8_MARKER || JSON.stringify(manifest.ids) !== JSON.stringify(R8_IDS)) throw new Error('Manifest R8 inválido.')
  return manifest
}
export async function prepareR8Fixture() {
  requireR8Gate()
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Panama',year:'numeric',month:'2-digit'}).formatToParts(new Date())
  if (Number(parts.find(p=>p.type==='year').value) !== R8_YEAR || Number(parts.find(p=>p.type==='month').value) !== R8_MONTH) throw new Error('Fixture R8 septiembre2026 vencida: actualiza y revisa sus PK antes de abrir rutas escritoras.')
  const passwordHash = await bcrypt.hash(R8_PASSWORD, 10)
  await r8Transaction(async query => {
    // Any pre-existing row is a collision, even an interrupted R8 run: recover
    // explicitly from its own manifest, never overwrite another task's center3.
    for (const [table, ids] of [['centros', [3]], ['usuarios', [R8_IDS.user]], ['grupos', [R8_IDS.group]], ['estudiantes', [R8_IDS.student, R8_IDS.graduate]], ['centro_eventos', [R8_IDS.event]], ['estudiante_eventos', [R8_IDS.sale, R8_IDS.priorSale, R8_IDS.withdrawal]]]) {
      if ((await query(`SELECT id FROM ${table} WHERE id=ANY($1::int[])`, [ids])).length) throw new Error(`Colisión R8: ${table}; recupera el manifest antes de sembrar.`)
    }
    if ((await query('SELECT id FROM usuarios WHERE email=$1', [R8_EMAIL])).length) throw new Error('Colisión R8 email.')
    const manifest = { marker: R8_MARKER, ids: R8_IDS, year: R8_YEAR, month: R8_MONTH, months: [7,8,9], baseBefore: await footprint(query), phase: 'preparing' }
    await save(manifestPath, manifest)
    await query('INSERT INTO centros(id,nombre,region,pais) VALUES(3,$1,$2,\'PA\')', ['Centro R8 de Aprendizaje Integral con Nombre Extraordinariamente Largo Panamá', R8_MARKER])
    await query('INSERT INTO usuarios(id,nombre,email,password_hash,rol,centro_id) VALUES($1,$2,$3,$4,\'administradora\',3)', [R8_IDS.user, R8_MARKER, R8_EMAIL, passwordHash])
    const itinerary = { nivel: 1, fecha_inicio: '2026-07-01', semanas: [], excepciones: [], clases_suspendidas: [], pais: 'PA', con_feriados: true, versiones: [{ vigente_desde: '2026-07-01', dias: [2] }] }
    await query("INSERT INTO grupos(id,centro_id,numero,itinerario,estado,fecha_apertura,fecha_inicio_clases,itinerario_clases,notas) VALUES($1,3,'R8','TINY','activo','2026-07-01','2026-07-01',$2::jsonb,$3)", [R8_IDS.group, JSON.stringify(itinerary), R8_MARKER])
    for (const [id, state, date] of [[R8_IDS.student, 'activo', '2026-09-01'], [R8_IDS.graduate, 'retirado', '2026-07-01']]) {
      await query("INSERT INTO estudiantes(id,centro_id,grupo_id,nombre,itinerario,nivel,estado,status_plataforma,origen,origen_venta,fecha_inscripcion,fecha_inicio_nivel,notas) VALUES($1,3,$2,$3,'TINY',1,$4,'INCLUIR','directo','centro',$5,$5,$6)", [id,R8_IDS.group,`Niño fixture R8 ${id}`,state,date,R8_MARKER])
    }
    for (const [id, student, type, date, month, origin, reason] of [
      [R8_IDS.sale,R8_IDS.student,'inscripcion','2026-09-01',9,'directo',null],
      [R8_IDS.priorSale,R8_IDS.graduate,'inscripcion','2026-07-01',7,'directo',null],
      [R8_IDS.withdrawal,R8_IDS.graduate,'retiro','2026-09-02',9,null,'graduado'],
    ]) await query('INSERT INTO estudiante_eventos(id,estudiante_id,centro_id,tipo,fecha,year,month,origen,motivo,a_grupo_id,notas) VALUES($1,$2,3,$3,$4,2026,$5,$6,$7,$8,$9)', [id,student,type,date,month,origin,reason,R8_IDS.group,R8_MARKER])
    await query('INSERT INTO centro_eventos(id,centro_id,crm_event_id,crm_account_id,nombre,start_date,created_by) VALUES($1,3,$2,$3,$4,$5,$6)', [R8_IDS.event,R8_EVENT.id,R8_EVENT.account_id,'Clase de prueba R8',R8_EVENT.start_date,R8_MARKER])
    for (const month of manifest.months) {
      await query('INSERT INTO mes_kpi(centro_id,year,month,estado) VALUES(3,2026,$1,$2)', [month,month === 9 ? 'abierto' : 'cerrado'])
      await query('INSERT INTO resumen_mes(centro_id,year,month,ninos_inicio_mes,ninos_final_mes,grupos_activos,nuevos_activos_mes,meta_nuevos_mensual,cp_invitados,cp_asistieron,cp_matriculados,cp_matriculados_override,mot_graduado) VALUES(3,2026,$1,40,40,1,2,20,10,8,6,$2,$3)', [month,month === 9 ? 7 : null,month === 8 ? 2 : 0])
      for (let week = 1; week <= 5; week++) await query('INSERT INTO kpi_semanas(centro_id,year,month,semana,cob_d1,cob_d5,ing_d1,des_d1) VALUES(3,2026,$1,$2,$3,$4,$5,$6)', [month,week,week,month === 9 ? 9 : 4,month === 9 ? 99 : 2,month === 9 ? 88 : 1])
    }
    manifest.phase = 'ready'
    await save(manifestPath, manifest)
  })
}
export async function prepareR8Receipt() {
  const { calculateCentroGrowth } = await import('../../../lib/growth/server.js')
  const { growthWeekStart } = await import('../../../lib/growth/notifications.mjs')
  const growth = await calculateCentroGrowth(3)
  await r8Transaction(query => query('INSERT INTO growth_notification_receipts(usuario_id,snapshot_id,week_start,shown_at,acknowledged_at) VALUES($1,$2,$3,now(),now()) ON CONFLICT(usuario_id,week_start) DO NOTHING', [R8_IDS.user,growth.snapshotId,growthWeekStart()]))
}
export async function setR8BriefingVisible(visible) {
  await readR8Manifest()
  await r8Transaction(query => query('UPDATE growth_notification_receipts SET shown_at=$1, acknowledged_at=$1, snoozed_until=NULL WHERE usuario_id=$2', [visible ? null : new Date().toISOString(), R8_IDS.user]))
}
export async function cleanupR8Fixture() {
  let manifest
  try { manifest = await readR8Manifest() } catch (error) { if (error.code === 'ENOENT') return; throw error }
  if (manifest.sqlFault && !manifest.sqlFault.cleaned) throw new Error('Limpia primero los objetos DDL propios R8.')
  await r8Transaction(async query => {
    const [center] = await query('SELECT region FROM centros WHERE id=3 FOR UPDATE')
    const [user] = await query('SELECT nombre,email,centro_id FROM usuarios WHERE id=$1 FOR UPDATE',[R8_IDS.user])
    if (!center && !user && manifest.phase === 'preparing') return
    if (center?.region !== R8_MARKER || user?.nombre !== R8_MARKER || user?.email !== R8_EMAIL || Number(user?.centro_id) !== 3) throw new Error('Cleanup R8 perdió propiedad; no se borra.')
    manifest.derived = {}
    for (const table of ['growth_snapshots','growth_recommendations']) manifest.derived[table] = (await query(`SELECT id FROM ${table} WHERE centro_id=3 ORDER BY id`)).map(row => Number(row.id))
    for (const table of ['growth_notification_receipts','entrenamiento_progreso']) manifest.derived[table] = (await query(`SELECT id FROM ${table} WHERE usuario_id=$1 ORDER BY id`,[R8_IDS.user])).map(row => Number(row.id))
    manifest.adjustments = await query('SELECT centro_id,year,month,ajustes FROM kpi_auto_ajustes WHERE centro_id=3 ORDER BY year,month')
    manifest.baseAfter = await footprint(query)
    await save(manifestPath,manifest)
    for (const table of ['growth_notification_receipts','growth_recommendations','growth_snapshots','entrenamiento_progreso']) await query(`DELETE FROM ${table} WHERE id=ANY($1::bigint[])`,[manifest.derived[table]])
    for (const row of manifest.adjustments) await query('DELETE FROM kpi_auto_ajustes WHERE centro_id=3 AND year=$1 AND month=$2',[row.year,row.month])
    for (const month of manifest.months) {
      for (let week=1; week<=5; week++) await query('DELETE FROM kpi_semanas WHERE centro_id=3 AND year=2026 AND month=$1 AND semana=$2',[month,week])
      for (const table of ['resumen_mes','mes_kpi']) await query(`DELETE FROM ${table} WHERE centro_id=3 AND year=2026 AND month=$1`,[month])
    }
    await query('DELETE FROM centro_eventos WHERE id=$1 AND created_by=$2',[R8_IDS.event,R8_MARKER])
    await query('DELETE FROM estudiante_eventos WHERE id=ANY($1::int[]) AND notas=$2',[[R8_IDS.sale,R8_IDS.priorSale,R8_IDS.withdrawal],R8_MARKER])
    await query('DELETE FROM estudiantes WHERE id=ANY($1::int[]) AND notas=$2',[[R8_IDS.student,R8_IDS.graduate],R8_MARKER])
    await query('DELETE FROM grupos WHERE id=$1 AND notas=$2',[R8_IDS.group,R8_MARKER])
    await query('DELETE FROM usuarios WHERE id=$1 AND nombre=$2',[R8_IDS.user,R8_MARKER])
    await query('DELETE FROM centros WHERE id=3 AND region=$1',[R8_MARKER])
    manifest.phase = 'cleaned'
    await save(evidencePath,manifest)
    console.log('R8 cleanup por PK:', JSON.stringify({ids:manifest.ids,derived:manifest.derived,adjustments:manifest.adjustments.map(({centro_id,year,month}) => [centro_id,year,month])}))
  })
  await rm(manifestPath,{force:true})
  await rm(R8_STATE,{force:true})
}

// Inyección artificial separada de las barreras reales. Sólo DB disposable;
// los nombres/OIDs se registran antes del COMMIT y nunca se adoptan objetos.
const faultObjects = { sequence:'r8_kpi_fault_attempts', function:'r8_kpi_fault', trigger:'r8_kpi_fault_trigger' }
export async function installR8SqlFault(code) {
  if (!['40001','23514'].includes(code)) throw new Error('SQLSTATE fixture inválido.')
  const manifest = await readR8Manifest()
  return r8Transaction(async query => {
    const [center] = await query('SELECT region FROM centros WHERE id=3 FOR UPDATE')
    if (center?.region !== R8_MARKER) throw new Error('La fixture R8 perdió propiedad antes del DDL.')
    const [collision] = await query("SELECT to_regclass('public.r8_kpi_fault_attempts') AS seq,to_regprocedure('public.r8_kpi_fault()') AS fn,EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='r8_kpi_fault_trigger') AS trigger")
    if (collision.seq || collision.fn || collision.trigger) throw new Error('Colisión DDL R8: no se adopta objeto existente.')
    await query('CREATE SEQUENCE public.r8_kpi_fault_attempts')
    await query(`CREATE FUNCTION public.r8_kpi_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.centro_id = 3 THEN
        PERFORM nextval('public.r8_kpi_fault_attempts');
        RAISE EXCEPTION 'R8 inyección SQLSTATE ${code}' USING ERRCODE='${code}';
      END IF;
      RETURN NEW;
    END $$`)
    await query('CREATE TRIGGER r8_kpi_fault_trigger BEFORE INSERT ON public.mes_kpi FOR EACH ROW EXECUTE FUNCTION public.r8_kpi_fault()')
    const [oids] = await query("SELECT 'public.r8_kpi_fault_attempts'::regclass::oid AS sequence,'public.r8_kpi_fault()'::regprocedure::oid AS function,(SELECT oid FROM pg_trigger WHERE tgname='r8_kpi_fault_trigger' AND tgrelid='public.mes_kpi'::regclass) AS trigger")
    manifest.sqlFault = { names:faultObjects,oids,code }
    await save(manifestPath,manifest)
    return manifest.sqlFault
  })
}
export async function removeR8SqlFault() {
  const manifest = await readR8Manifest()
  if (!manifest.sqlFault) return
  await r8Transaction(async query => {
    const [oids] = await query("SELECT to_regclass('public.r8_kpi_fault_attempts')::oid AS sequence,to_regprocedure('public.r8_kpi_fault()')::oid AS function,(SELECT oid FROM pg_trigger WHERE tgname='r8_kpi_fault_trigger' AND tgrelid='public.mes_kpi'::regclass) AS trigger")
    if (JSON.stringify(oids) !== JSON.stringify(manifest.sqlFault.oids)) throw new Error('DDL R8 perdió propiedad: se aborta cleanup.')
    await query('DROP TRIGGER r8_kpi_fault_trigger ON public.mes_kpi')
    await query('DROP FUNCTION public.r8_kpi_fault()')
    await query('DROP SEQUENCE public.r8_kpi_fault_attempts')
    manifest.sqlFault.cleaned = true
    await save(manifestPath,manifest)
    console.log('R8 DDL cleanup exacto',JSON.stringify(manifest.sqlFault))
  })
}
