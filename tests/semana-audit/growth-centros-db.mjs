// Comprueba migración y acciones reales en un esquema propio del PostgreSQL desechable.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import pg from 'pg'
const r=JSON.parse(await readFile('.scratch/administradora-e2e/runtime.json','utf8'))
assert.equal(new URL(r.database).hostname,'127.0.0.1');assert.equal(new URL(r.database).pathname,'/administradora_test')
const db=new pg.Client({connectionString:r.database});await db.connect()
const schema=`qa_growth_${process.pid}`
try {
  const snapshots=[]
  for (const centro of [2,3]) snapshots.push((await db.query("INSERT INTO growth_snapshots(centro_id,snapshot_date,engine_version,confidence,payload) VALUES($1,'2026-10-23','qa-recibos','high','{}') ON CONFLICT(centro_id,snapshot_date,engine_version) DO UPDATE SET payload=EXCLUDED.payload RETURNING id",[centro])).rows[0].id)
  await db.query(`CREATE SCHEMA ${schema}`)
  await db.query(`SET search_path TO ${schema},public`)
  await db.query('CREATE TABLE growth_notification_receipts (LIKE public.growth_notification_receipts INCLUDING ALL)')
  await db.query('ALTER TABLE growth_notification_receipts DROP COLUMN IF EXISTS centro_id CASCADE')
  await db.query('ALTER TABLE growth_notification_receipts DROP CONSTRAINT IF EXISTS growth_notification_receipts_usuario_id_week_start_key')
  await db.query('ALTER TABLE growth_notification_receipts ADD CONSTRAINT growth_notification_receipts_usuario_id_week_start_key UNIQUE(usuario_id,week_start)')
  await db.query("INSERT INTO growth_notification_receipts(usuario_id,snapshot_id,week_start,shown_at) VALUES(102,$1,'2026-10-19','2026-10-20T12:00:00Z')",[snapshots[0]])
  const migration=await readFile('db/migrations/2026-10-23-growth-recibos-centro.sql','utf8')
  await db.query(migration);await db.query(migration)
  const [backfill]=(await db.query('SELECT centro_id,shown_at FROM growth_notification_receipts')).rows
  assert.equal(backfill.centro_id,2);assert.equal(backfill.shown_at.toISOString(),'2026-10-20T12:00:00.000Z')
  const sql=async(strings,...values)=>(await db.query(strings.reduce((s,t,i)=>s+(i?'$'+i:'')+t,''),values)).rows
  const source=(await readFile('app/actions/growth.js','utf8')).replace(/^import[\s\S]*?from ['"][^'"]+['"]\n/gm,'').replace(/export async function /g,'async function ')
  const actions=new Function('sql','requireCentroAccess','requireCurrentWriteCentro','growthWeekStart','puedeEscribirCentro','calculateCentroGrowth','nextPendingRecommendation','briefingEligibility','snoozeUntilTomorrow',source+';return {getGrowthBriefing,markGrowthBriefingShown,acknowledgeGrowthBriefing,snoozeGrowthBriefing}')(
    sql,async()=>({uid:102}),async()=>({uid:102}),()=> '2026-10-19',()=>true,
    async id=>({snapshotId:snapshots[id-2],center:{id},projection:{scenarios:{base:{series:[]}},requirements:{}},metrics:{},recommendations:[]}),()=>null,
    ({receipt})=>({shouldShow:!receipt?.acknowledgedAt}),()=> '2026-10-25T12:00:00Z')
  await actions.acknowledgeGrowthBriefing(2)
  assert.equal((await actions.getGrowthBriefing(2)).shouldShow,false)
  assert.equal((await actions.getGrowthBriefing(3)).shouldShow,true)
  await actions.markGrowthBriefingShown(3);await actions.snoozeGrowthBriefing(3)
  const rows=(await db.query('SELECT centro_id,acknowledged_at,snoozed_until,shown_at FROM growth_notification_receipts ORDER BY centro_id')).rows
  assert.equal(rows.length,2);assert.ok(rows[0].acknowledged_at);assert.equal(rows[0].snoozed_until,null)
  assert.equal(rows[1].acknowledged_at,null);assert.ok(rows[1].snoozed_until);assert.ok(rows[1].shown_at)
  await assert.rejects(db.query("INSERT INTO growth_notification_receipts(usuario_id,centro_id,snapshot_id,week_start) VALUES(102,3,$1,'2026-10-19')",[snapshots[1]]),e=>e.code==='23505')
  console.log('PASS Migración repetible conserva recibo histórico; crear, mostrar, confirmar y posponer quedan aislados por centro; duplicado rechazado')
  await db.query('SET search_path TO public')
  await db.query(migration)
} finally {
  await db.query('ROLLBACK')
  await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
  await db.end();console.log('Esquema temporal retirado y conexión cerrada; no se usó navegador')
}
