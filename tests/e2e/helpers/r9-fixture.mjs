import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import { neonConfig, Pool } from '@neondatabase/serverless'
import ws from 'ws'
import bcrypt from 'bcryptjs'
import { resolveNeonE2EConfig } from '../../../lib/neon-e2e-config.mjs'
export const R9_MARKER = 'E2E_R9_OPERATIONS_V1'
export const R9_EMAIL = 'center-r9@e2e.invalid'
export const R9_PASSWORD = 'AlohaR9Disposable!2026'
export const R9_STATE = 'tests/e2e/.auth/r9-center.json'
export const R9_EVENT_ID = 'e2e-r9-event-990033'
export const R9_ACCOUNT = 'c0c81438-bb54-4ae0-a019-b54e0bfcf870'
export const R9_IDS = { centros:[2], usuarios:[990003], coaches:[990004], salones:[990005], grupos:[990013,990014,990015], grupo_horarios:[990016,990017,990018], estudiantes:[990023,990024,990025,990026,990027], estudiante_eventos:[990028], asistencias:[990029], centro_eventos:[990033] }
const manifestPath = resolve('tests/e2e/.auth/r9-fixture-manifest.json')
export function requireR9Gate(env = process.env) {
  if (env.E2E_R9_OPERATIONS !== '1' || env.E2E_DATABASE_CONFIRM !== 'disposable' || env.RESPONSIVE_BASE_URL
    || ['E2E_R3_DIALOGS','E2E_R6_COMPARISONS','E2E_R8_CENTER_CORE','E2E_RUN_MUTATIONS'].some(k=>env[k] === '1')) throw new Error('R9 exige gate exclusivo local disposable.')
  if (env.E2E_CENTRO_ID && env.E2E_CENTRO_ID !== '2') throw new Error('R9 requiere centro propio 2.')
  if (!env.DATABASE_URL || env.DATABASE_URL !== env.USUARIOS_TEST_DATABASE_URL) throw new Error('R9 exige bases iguales.')
  const db = new URL(env.DATABASE_URL), http = new URL(env.E2E_NEON_HTTP)
  if (!['localhost','127.0.0.1','aloha-r2-pg'].includes(db.hostname) || http.protocol !== 'http:' || http.hostname !== '127.0.0.1' || http.username || http.password || !/^127\.0\.0\.1:\d+$/.test(env.E2E_NEON_WSPROXY || '')) throw new Error('R9 solo permite transportes locales.')
}
export async function r9Transaction(work) {
  requireR9Gate(); neonConfig.webSocketConstructor = ws
  Object.assign(neonConfig, resolveNeonE2EConfig(process.env))
  const pool = new Pool({connectionString:process.env.DATABASE_URL}), db = await pool.connect()
  try { await db.query('BEGIN ISOLATION LEVEL SERIALIZABLE'); const result = await work(async (sql, params=[]) => (await db.query(sql,params)).rows); await db.query('COMMIT'); return result }
  catch(error) { await db.query('ROLLBACK'); throw error }
  finally { db.release(); await pool.end() }
}
async function save(path, value) { await mkdir(dirname(path),{recursive:true}); await writeFile(path,JSON.stringify(value,null,2),{mode:0o600}) }
export async function readR9Manifest() {
  requireR9Gate(); const m = JSON.parse(await readFile(manifestPath,'utf8'))
  if (m.marker !== R9_MARKER || JSON.stringify(m.ids) !== JSON.stringify(R9_IDS)) throw new Error('Manifest R9 inválido.')
  return m
}
export async function prepareR9Fixture() {
  requireR9Gate()
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Panama',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  const past = new Date(new Date(today+'T12:00:00Z').getTime()-7*86400000).toISOString().slice(0,10)
  const token = randomBytes(24).toString('hex'), password = await bcrypt.hash(R9_PASSWORD,10)
  await r9Transaction(async q => {
    for (const [table,ids] of Object.entries(R9_IDS)) if ((await q(`SELECT id FROM ${table} WHERE id=ANY($1::int[])`,[ids])).length) throw new Error(`Colisión R9 en ${table}; no se adopta ni sobrescribe.`)
    if ((await q('SELECT id FROM usuarios WHERE email=$1',[R9_EMAIL])).length) throw new Error('Colisión usuario R9.')
    const m = {marker:R9_MARKER,ids:R9_IDS,today,past,token,phase:'preparing',derived:{}}
    await save(manifestPath,m)
    await q("INSERT INTO centros(id,nombre,region,pais) VALUES(2,'Centro R9 Operaciones de Aprendizaje Integral Panamá',$1,'PA')",[R9_MARKER])
    await q("INSERT INTO usuarios(id,nombre,email,password_hash,rol,centro_id) VALUES(990003,$1,$2,$3,'administradora',2)",[R9_MARKER,R9_EMAIL,password])
    await q('INSERT INTO coaches(id,centro_id,nombre,nivel_kids,activo) VALUES(990004,2,$1,10,true)',['Coach R9 Nombre Largo de Aprendizaje Integral'])
    await q('INSERT INTO salones(id,centro_id,nombre,activo) VALUES(990005,2,$1,true)',['Salón R9 Aprendizaje Integral'])
    const it = {nivel:3,fecha_inicio:past,pais:'PA',con_feriados:false,versiones:[{vigente_desde:past,dias:[new Date(today+'T12:00Z').getUTCDay()]}],semanas:[{corto:'S1',etiqueta:'Primera clase',tipo:'clase',fechas:[past]},{corto:'S2',etiqueta:'Segunda clase',tipo:'clase',fechas:[today]}],excepciones:[],clases_suspendidas:[]}
    for (let i=0;i<3;i++) {
      await q("INSERT INTO grupos(id,centro_id,numero,itinerario,estado,coach_id,coach_token,fecha_apertura,fecha_inicio_clases,inscripcion_abierta,itinerario_clases,notas) VALUES($1,2,$2,'TINY','activo',990004,$3,$4,$4,true,$5::jsonb,$6)",[990013+i,`R9-${i+1}`,i===0?token:null,past,JSON.stringify(it),R9_MARKER])
      await q("INSERT INTO grupo_horarios(id,grupo_id,dia,hora_inicio,hora_fin,salon_id) VALUES($1,$2,$3,$4,$5,990005)",[990016+i,990013+i,new Date(today+'T12:00Z').getUTCDay() || 1,`${15+i}:00`,`${16+i}:00`])
    }
    for (const [id,group,name,level,state,anchor] of [[990023,990013,'Ana R9 Con Plan Apellido Extraordinariamente Largo',3,'activo',past],[990024,990013,'Bruno R9 Sin Plan Apellido Extraordinariamente Largo',3,'activo',null],[990025,null,'Celia R9 Sin Grupo Apellido Extraordinariamente Largo',1,'activo',past],[990026,990014,'Diego R9 Retirado Apellido Extraordinariamente Largo',1,'retirado',past],[990027,990015,'Elena R9 Último Nivel Apellido Extraordinariamente Largo',10,'activo',past]]) {
      await q("INSERT INTO estudiantes(id,centro_id,grupo_id,nombre,itinerario,nivel,estado,status_plataforma,origen,origen_venta,fecha_inscripcion,fecha_inicio_nivel,fecha_cierre_nivel,fecha_retiro,motivo_retiro,representante,correo,notas) VALUES($1,2,$2,$3,'TINY',$4,$5,'INCLUIR','directo','centro',$6,$7,$8,$9,$10,'Representante R9','familia-r9@example.invalid',$11)",[id,group,name,level,state,past,anchor,id===990027?today:null,state==='retirado'?past:null,state==='retirado'?'economico':null,R9_MARKER])
    }
    await q("INSERT INTO estudiante_eventos(id,estudiante_id,centro_id,tipo,fecha,year,month,a_grupo_id,notas) VALUES(990028,990024,2,'inscripcion',$1,$2,$3,990013,$4)",[past,Number(past.slice(0,4)),Number(past.slice(5,7)),R9_MARKER])
    await q("INSERT INTO asistencias(id,grupo_id,estudiante_id,fecha,estado) VALUES(990029,990013,990023,$1,'presente')",[today])
    await q('INSERT INTO centro_eventos(id,centro_id,crm_event_id,crm_account_id,nombre,start_date,grupo_id,created_by) VALUES(990033,2,$1,$2,$3,$4,990013,$5)',[R9_EVENT_ID,R9_ACCOUNT,'Clase R9 Aprendizaje Integral',today+'T15:00:00-05:00',R9_MARKER])
    m.phase='ready'; await save(manifestPath,m)
  })
}
// Called only AFTER real auth/landing requests have drained.
export async function recordR9Auth() {
  const m = await readR9Manifest()
  await r9Transaction(async q => {
    for (const table of ['growth_snapshots','growth_recommendations']) m.derived[table]=(await q(`SELECT id FROM ${table} WHERE centro_id=2 ORDER BY id`)).map(r=>Number(r.id))
    for (const table of ['growth_notification_receipts','entrenamiento_progreso']) m.derived[table]=(await q(`SELECT id FROM ${table} WHERE usuario_id=990003 ORDER BY id`)).map(r=>Number(r.id))
  })
  m.phase='authenticated'; await save(manifestPath,m)
}
export async function r9Snapshot() {
  return r9Transaction(async q => {
    const tables = (await q("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).map(r=>r.tablename)
    const result={}
    for (const table of tables) {
      if (!/^[a-z0-9_]+$/.test(table)) throw new Error('Tabla no soportada en snapshot.')
      const rows=await q(`SELECT to_jsonb(t) AS row FROM "${table}" t ORDER BY to_jsonb(t)::text`)
      result[table]={count:rows.length,hash:createHash('sha256').update(JSON.stringify(rows)).digest('hex')}
    }
    return result
  })
}
export async function cleanupR9Fixture() {
  let m; try {m=await readR9Manifest()} catch(e) {if(e.code==='ENOENT')return;throw e}
  await r9Transaction(async q => {
    const [c]=await q('SELECT region FROM centros WHERE id=2 FOR UPDATE')
    if (!c && m.phase==='preparing') return
    if(c?.region!==R9_MARKER) throw new Error('Cleanup R9 perdió propiedad de centro2.')
    // Discover own setup PKs even when auth was interrupted; record before deletion.
    for(const table of ['growth_snapshots','growth_recommendations']) m.derived[table]=(await q(`SELECT id FROM ${table} WHERE centro_id=2 ORDER BY id`)).map(r=>Number(r.id))
    for(const table of ['growth_notification_receipts','entrenamiento_progreso']) m.derived[table]=(await q(`SELECT id FROM ${table} WHERE usuario_id=990003 ORDER BY id`)).map(r=>Number(r.id))
    await save(manifestPath,m)
    for(const table of ['growth_notification_receipts','growth_recommendations','growth_snapshots','entrenamiento_progreso']) await q(`DELETE FROM ${table} WHERE id=ANY($1::bigint[])`,[m.derived[table]])
    for(const table of ['centro_eventos','asistencias','estudiante_eventos','estudiantes','grupo_horarios','grupos','coaches','salones','usuarios','centros']) await q(`DELETE FROM ${table} WHERE id=ANY($1::int[])`,[R9_IDS[table]])
    for(const [table,ids] of Object.entries(R9_IDS)) if((await q(`SELECT id FROM ${table} WHERE id=ANY($1::int[])`,[ids])).length) throw new Error('Cleanup R9 incompleto.')
    const {token,...safe}=m; safe.phase='cleaned'
    await save(resolve('test-results/r9-cleanup-evidence.json'),safe)
    console.log('R9 cleanup exacto:',JSON.stringify({ids:safe.ids,derived:safe.derived}))
  })
  await rm(manifestPath,{force:true}); await rm(R9_STATE,{force:true})
}
