import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import { neonConfig, Pool } from '@neondatabase/serverless'
import ws from 'ws'
import bcrypt from 'bcryptjs'
import { resolveNeonE2EConfig } from '../../../lib/neon-e2e-config.mjs'
export const R10_MARKER = 'E2E_R10_AUDIT_V1'
export const R10_EMAIL = 'center-r10@e2e.invalid'
export const R10_PASSWORD = 'AlohaR10Disposable!2026'
export const R10_STATE = 'tests/e2e/.auth/r10-center.json'
export const R10_EVENT_ID = 'e2e-r10-event-1000033'
export const R10_ACCOUNT = 'c0c81438-bb54-4ae0-a019-b54e0bfcf870'
export const R10_IDS = { centros:[2], usuarios:[1000003,1000006], coaches:[1000004], salones:[1000005], grupos:[1000013,1000014,1000015], grupo_horarios:[1000016,1000017,1000018,1000019], estudiantes:[1000023,1000024,1000025,1000026,1000027], estudiante_eventos:[1000028,1000030], asistencias:[1000029], centro_eventos:[1000033], centro_reservas:[1000034], centro_reserva_salones:[1000035], trimestres:[1000040], pedidos_material:[1000041], cuadro_mensual:[1000042], peticiones:[1000050,1000051], peticion_estado_historial:[1000052,1000053], peticion_cotizaciones:[1000060,1000061,1000062] }
const manifestPath = resolve('tests/e2e/.auth/r10-fixture-manifest.json')
export function requireR10Gate(env = process.env) {
  if (env.E2E_R10_AUDIT !== '1' || env.E2E_DATABASE_CONFIRM !== 'disposable' || env.RESPONSIVE_BASE_URL
    || ['E2E_R9_OPERATIONS','E2E_R3_DIALOGS','E2E_R6_COMPARISONS','E2E_R8_CENTER_CORE','E2E_RUN_MUTATIONS'].some(k=>env[k] === '1')) throw new Error('R10 exige gate exclusivo local disposable.')
  if (env.E2E_CENTRO_ID && env.E2E_CENTRO_ID !== '2') throw new Error('R10 requiere centro propio 2.')
  if (!env.DATABASE_URL || env.DATABASE_URL !== env.USUARIOS_TEST_DATABASE_URL) throw new Error('R10 exige bases iguales.')
  const db = new URL(env.DATABASE_URL), http = new URL(env.E2E_NEON_HTTP)
  if (!['localhost','127.0.0.1','aloha-r2-pg'].includes(db.hostname) || http.protocol !== 'http:' || http.hostname !== '127.0.0.1' || http.username || http.password || !/^127\.0\.0\.1:\d+$/.test(env.E2E_NEON_WSPROXY || '')) throw new Error('R10 solo permite transportes locales.')
}
export async function r10Transaction(work) {
  requireR10Gate(); neonConfig.webSocketConstructor = ws
  Object.assign(neonConfig, resolveNeonE2EConfig(process.env))
  const pool = new Pool({connectionString:process.env.DATABASE_URL}), db = await pool.connect()
  try { await db.query('BEGIN ISOLATION LEVEL SERIALIZABLE'); const result = await work(async (sql, params=[]) => (await db.query(sql,params)).rows); await db.query('COMMIT'); return result }
  catch(error) { await db.query('ROLLBACK'); throw error }
  finally { db.release(); await pool.end() }
}
async function save(path, value) { await mkdir(dirname(path),{recursive:true}); await writeFile(path,JSON.stringify(value,null,2),{mode:0o600}) }
export async function readR10Manifest() {
  requireR10Gate(); const m = JSON.parse(await readFile(manifestPath,'utf8'))
  if (m.marker !== R10_MARKER || JSON.stringify(m.ids) !== JSON.stringify(R10_IDS)) throw new Error('Manifest R10 inválido.')
  return m
}
export async function prepareR10Fixture() {
  requireR10Gate()
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Panama',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  const past = new Date(new Date(today+'T12:00:00Z').getTime()-7*86400000).toISOString().slice(0,10)
  const accessToken = randomBytes(32).toString('hex')
  const token = randomBytes(24).toString('hex'), password = await bcrypt.hash(R10_PASSWORD,10)
  await r10Transaction(async q => {
    for (const [table,ids] of Object.entries(R10_IDS)) if ((await q(`SELECT id FROM ${table} WHERE id=ANY($1::int[])`,[ids])).length) throw new Error(`Colisión R10 en ${table}; no se adopta ni sobrescribe.`)
    if ((await q('SELECT id FROM usuarios WHERE email=$1',[R10_EMAIL])).length) throw new Error('Colisión usuario R10.')
    const m = {marker:R10_MARKER,ids:R10_IDS,today,past,token,accessToken,phase:'preparing',derived:{},months:[],quarter:[2,Number(today.slice(0,4)),Math.ceil(Number(today.slice(5,7))/3)]}
    await save(manifestPath,m)
    await q("INSERT INTO centros(id,nombre,region,pais) VALUES(2,'Centro R10 Operaciones de Aprendizaje Integral Panamá',$1,'PA')",[R10_MARKER])
    await q("INSERT INTO usuarios(id,nombre,email,password_hash,rol,centro_id) VALUES(1000003,$1,$2,$3,'administradora',2)",[R10_MARKER,R10_EMAIL,password])
    await q('INSERT INTO coaches(id,centro_id,nombre,nivel_kids,activo) VALUES(1000004,2,$1,10,true)',['Coach R10 Nombre Largo de Aprendizaje Integral'])
    await q('INSERT INTO salones(id,centro_id,nombre,activo) VALUES(1000005,2,$1,true)',['Salón R10 Aprendizaje Integral'])
    const it = {fecha_cierre_estimada:today,nivel:3,fecha_inicio:past,pais:'PA',con_feriados:false,versiones:[{vigente_desde:past,dias:[new Date(today+'T12:00Z').getUTCDay()]}],semanas:[{corto:'S1',etiqueta:'Primera clase',tipo:'clase',fechas:[past]},{corto:'S2',etiqueta:'Segunda clase',tipo:'clase',fechas:[today]}],excepciones:[],clases_suspendidas:[]}
    for (let i=0;i<3;i++) {
      await q("INSERT INTO grupos(id,centro_id,numero,itinerario,estado,coach_id,coach_token,fecha_apertura,fecha_inicio_clases,inscripcion_abierta,itinerario_clases,notas) VALUES($1,2,$2,'TINY','activo',1000004,$3,$4,$4,true,$5::jsonb,$6)",[1000013+i,`R10-${i+1}`,i===0?token:null,past,JSON.stringify(it),R10_MARKER])
      await q("INSERT INTO grupo_horarios(id,grupo_id,dia,hora_inicio,hora_fin,salon_id) VALUES($1,$2,$3,$4,$5,1000005)",[1000016+i,1000013+i,new Date(today+'T12:00Z').getUTCDay() || 1,`${15+i}:00`,`${16+i}:00`])
    }
    await q("INSERT INTO grupo_horarios(id,grupo_id,dia,hora_inicio,hora_fin,salon_id) VALUES(1000019,1000014,4,'18:30','19:30',1000005)")
    await q("INSERT INTO centro_reservas(id,centro_id,dia,hora_inicio,hora_fin,notas) VALUES(1000034,2,1,'14:45','16:15',$1)",[R10_MARKER])
    await q("INSERT INTO centro_reserva_salones(id,reserva_id,salon_id,rol,coach_id) VALUES(1000035,1000034,1000005,'tiny',1000004)")
    for (const [id,group,name,level,state,anchor] of [[1000023,1000013,'Ana R10 Con Plan Apellido Extraordinariamente Largo',3,'activo',past],[1000024,1000013,'Bruno R10 Sin Plan Apellido Extraordinariamente Largo',3,'baja_potencial',null],[1000025,null,'Celia R10 Sin Grupo Apellido Extraordinariamente Largo',1,'activo',past],[1000026,1000014,'Diego R10 Retirado Apellido Extraordinariamente Largo',1,'retirado',past],[1000027,1000015,'Elena R10 Último Nivel Apellido Extraordinariamente Largo',10,'activo',past]]) {
      await q("INSERT INTO estudiantes(id,centro_id,grupo_id,nombre,itinerario,nivel,estado,status_plataforma,origen,origen_venta,fecha_inscripcion,fecha_inicio_nivel,fecha_cierre_nivel,fecha_retiro,motivo_retiro,representante,correo,notas) VALUES($1,2,$2,$3,'TINY',$4,$5,'INCLUIR','directo','centro',$6,$7,$8,$9,$10,'Representante R10','familia-r10@example.invalid',$11)",[id,group,name,level,state,past,anchor,id===1000027?today:null,state==='retirado'?today:null,state==='retirado'?'ECONOMICO':null,R10_MARKER])
    }
    await q("INSERT INTO estudiante_eventos(id,estudiante_id,centro_id,tipo,fecha,year,month,a_grupo_id,notas) VALUES(1000028,1000024,2,'inscripcion',$1,$2,$3,1000013,$4)",[past,Number(past.slice(0,4)),Number(past.slice(5,7)),R10_MARKER])
    await q("INSERT INTO estudiante_eventos(id,estudiante_id,centro_id,tipo,fecha,year,month,de_grupo_id,motivo,notas) VALUES(1000030,1000026,2,'retiro',$1,$2,$3,1000014,'ECONOMICO',$4)",[today,Number(today.slice(0,4)),Number(today.slice(5,7)),R10_MARKER])
    await q("INSERT INTO asistencias(id,grupo_id,estudiante_id,fecha,estado) VALUES(1000029,1000013,1000023,$1,'presente')",[today])
    await q('INSERT INTO centro_eventos(id,centro_id,crm_event_id,crm_account_id,nombre,start_date,grupo_id,created_by) VALUES(1000033,2,$1,$2,$3,$4,1000013,$5)',[R10_EVENT_ID,R10_ACCOUNT,'Clase R10 Aprendizaje Integral',today+'T15:00:00-05:00',R10_MARKER])
    await seedReports(q,m)
    m.phase='ready'; await save(manifestPath,m)
  })
}
// Called only AFTER real auth/landing requests have drained.
export async function recordR10Auth() {
  const m = await readR10Manifest()
  await r10Transaction(async q => {
    for (const table of ['growth_snapshots','growth_recommendations']) m.derived[table]=(await q(`SELECT id FROM ${table} WHERE centro_id=2 ORDER BY id`)).map(r=>Number(r.id))
    for (const table of ['growth_notification_receipts','entrenamiento_progreso']) m.derived[table]=(await q(`SELECT id FROM ${table} WHERE usuario_id=1000003 ORDER BY id`)).map(r=>Number(r.id))
  })
  m.phase='authenticated'; await save(manifestPath,m)
}
export async function r10Snapshot() {
  return r10Transaction(async q => {
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
export async function cleanupR10Fixture() {
  let m; try {m=await readR10Manifest()} catch(e) {if(e.code==='ENOENT')return;throw e}
  await r10Transaction(async q => {
    const [c]=await q('SELECT region FROM centros WHERE id=2 FOR UPDATE')
    if (!c && m.phase==='preparing') return
    if(c?.region!==R10_MARKER) throw new Error('Cleanup R10 perdió propiedad de centro2.')
    // Discover own setup PKs even when auth was interrupted; record before deletion.
    for(const table of ['growth_snapshots','growth_recommendations']) m.derived[table]=(await q(`SELECT id FROM ${table} WHERE centro_id=2 ORDER BY id`)).map(r=>Number(r.id))
    for(const table of ['growth_notification_receipts','entrenamiento_progreso']) m.derived[table]=(await q(`SELECT id FROM ${table} WHERE usuario_id=1000003 ORDER BY id`)).map(r=>Number(r.id))
    await save(manifestPath,m)
    for(const table of ['growth_notification_receipts','growth_recommendations','growth_snapshots','entrenamiento_progreso']) await q(`DELETE FROM ${table} WHERE id=ANY($1::bigint[])`,[m.derived[table]])
    await cleanupReports(q,m)
    for(const table of ['centro_reserva_salones','centro_reservas','centro_eventos','asistencias','estudiante_eventos','estudiantes','grupo_horarios','grupos','coaches','salones','usuarios','centros']) await q(`DELETE FROM ${table} WHERE id=ANY($1::int[])`,[R10_IDS[table]])
    for(const [table,ids] of Object.entries(R10_IDS)) if((await q(`SELECT id FROM ${table} WHERE id=ANY($1::int[])`,[ids])).length) throw new Error('Cleanup R10 incompleto.')
    const {token,accessToken,...safe}=m; safe.phase='cleaned'
    await save(resolve('test-results/r10-cleanup-evidence.json'),safe)
    console.log('R10 cleanup exacto:',JSON.stringify({ids:safe.ids,derived:safe.derived}))
  })
  await rm(manifestPath,{force:true}); await rm(R10_STATE,{force:true}); for(const actor of ['admin','coordinator']) await rm(resolve('tests/e2e/.auth/r10-'+actor+'.json'),{force:true})
}

async function seedReports(q,m) {
  const year=Number(m.today.slice(0,4)), month=Number(m.today.slice(5,7)), quarter=Math.ceil(month/3)
  await q("INSERT INTO usuarios(id,nombre,email,rol,centro_id) VALUES(1000006,'Invitación R10','pending-r10@e2e.invalid','asistente',2)")
  await q("INSERT INTO password_tokens(token,user_id,purpose,expires_at) VALUES($1,1000006,'invite',now()+interval '2 days')",[m.accessToken])
  await q("INSERT INTO trimestres(id,centro_id,anio,trimestre) VALUES(1000040,2,$1,$2)",[year,quarter])
  const CUMPLIMIENTO_KEYS = ['classdojo_activo','ninos_completos_classdojo','padres_conectados','muro_informacion','bienvenida','calendario','clase_padres','fotos_grupo','seguimiento_evolucion','asistente_classdojo','portafolio','grupo_study','ninos_activos_study','niveles_actualizados','coach_activo','ninos_trabajando_study','asistencia_dias','centro_buen_estado','aromatizante','mesa_cafe','brochure','cartel_qr','wifi_gratis','saludo_cordial','encuestas_satisfaccion','coach_estrella','reuniones_mensuales','monitoreo_camaras','actividades_equipo','encuestas_equipo','meta_cobranza','meta_desercion','meta_nuevos_ingresos']
  const values=CUMPLIMIENTO_KEYS.map((_,i)=>i===0?'no':'si')
  for(const mes of [1,2,3]) await q('INSERT INTO cumplimiento(trimestre_id,mes,'+CUMPLIMIENTO_KEYS.join(',')+') VALUES(1000040,$1,'+CUMPLIMIENTO_KEYS.map((_,i)=>'$'+(i+2)).join(',')+')',[mes,...values])
  const long='Texto ficticio de auditoría R10: aprendizaje y seguimiento operativo. '.repeat(12)+'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.repeat(4)
  await q("INSERT INTO foda(centro_id,anio,trimestre,fortalezas,debilidades,oportunidades,amenazas,comentarios,comentario_estado) VALUES(2,$1,$2,$3,$3,$3,$3,$3,'Próximo trimestre')",[year,quarter,long])
  await q("INSERT INTO pedidos_material(id,centro_id,year,month,fecha,producto,itinerario,nivel,grupo_id,cantidad,monto,observaciones) VALUES(1000041,2,$1,$2,$3,'KIT','TINY',3,1000013,2,24,$4)",[year,month,m.today,long])
  for(let back=13;back>=1;back--) {
    const date=new Date(Date.UTC(year,month-1-back,1)), key=[2,date.getUTCFullYear(),date.getUTCMonth()+1]
    m.months.push(key)
    await q("INSERT INTO mes_kpi(centro_id,year,month,estado) VALUES($1,$2,$3,'cerrado')",key)
    await q("INSERT INTO resumen_mes(centro_id,year,month,ninos_inicio_mes,ninos_final_mes,grupos_activos,nuevos_activos_mes,cp_invitados,cp_asistieron,cp_matriculados,orig_referido,mot_economico) VALUES($1,$2,$3,50,55,6,5,10,8,4,3,1)",key)
  }
  const last=m.months.at(-1)
  const photo={nombre:'Centro R10',totales:{aPagar:55,nuevos:5,reincorporados:1,retirados:1,gruposActivos:6},iniciosClase:[],promedios:{sinK:9.2},royalties:{filas:[],totales:{totalRoyalty:660,totalContinuan:50,totalNinos:55,totalNuevos:5}},controlGrupos:{filas:[]},deserciones:[],pedidos:[],kpiComparacion:{},royaltyRate:12}
  await q("INSERT INTO cuadro_mensual(id,centro_id,year,month,datos) VALUES(1000042,$1,$2,$3,$4::jsonb)",[...last,JSON.stringify(photo)])
  const actor=JSON.stringify({id:1000003,nombre:R10_MARKER,email:R10_EMAIL,rol:'administradora'})
  for(const [id,type,category] of [[1000050,'comentario',null],[1000051,'peticion','otros']]) {
    await q("INSERT INTO peticiones(id,centro_id,anio,trimestre,texto,tipo,categoria,created_by,created_by_snapshot,submitted_at) VALUES($1,2,$2,$3,$4,$5,$6,1000003,$7::jsonb,now())",[id,year,quarter,long,type,category,actor])
    await q("INSERT INTO peticion_estado_historial(id,peticion_id,estado_nuevo,changed_by,changed_by_snapshot) VALUES($1,$2,'Próximo trimestre',1000003,$3::jsonb)",[id+2,id,actor])
  }
  for(let i=0;i<3;i++) {
    const path='fixture-r10/opaque-'+i+'.pdf'
    await q("INSERT INTO peticion_cotizaciones(id,peticion_id,proveedor_razon_social,proveedor_clave,proveedor_pais,proveedor_id_fiscal,proveedor_id_fiscal_clave,empresa_constituida,emite_factura_fiscal,blob_pathname,expected_pathname,archivo_nombre,archivo_mime,archivo_bytes,archivo_sha256,upload_status,uploaded_by,uploaded_by_snapshot,validada_at) VALUES($1,1000051,$2,$3,'PA',$4,$4,true,true,$5,$5,$6,'application/pdf',1024,$7,'valid',1000003,$8::jsonb,now())",[1000060+i,'Proveedor Ficticio '+i,'proveedor ficticio '+i,'R10FISCAL'+i,path,'Cotización ficticia '+i+'.pdf',createHash('sha256').update(path).digest('hex'),actor])
  }
  for(const [mod,tour,quiz] of [['meta',true,false],['modelo',false,true],['aperturar',true,true]]) await q("INSERT INTO entrenamiento_progreso(usuario_id,modulo,tour_visto_at,quiz_aprobado_at,intentos,ultimo_puntaje) VALUES(1000003,$1,$2,$3,1,3)",[mod,tour?m.today+'T12:00Z':null,quiz?m.today+'T12:05Z':null])
}
async function cleanupReports(q,m) {
  // Parent ownership was checked under a serializable lock. Capture exact keys
  // of automatic writes before deleting any owned rows.
  m.reportKeys={}
  for(const table of ['mes_kpi','resumen_mes','kpi_auto_ajustes','kpi_semanas']) m.reportKeys[table]=await q('SELECT centro_id,year,month'+(table==='kpi_semanas'?',semana':'')+' FROM '+table+' WHERE centro_id=2 ORDER BY year,month')
  await save(manifestPath,m)
  for(const table of ['peticion_estado_historial','peticion_cotizaciones','peticiones','cuadro_mensual','pedidos_material']) await q('DELETE FROM '+table+' WHERE id=ANY($1::int[])',[R10_IDS[table]])
  await q('DELETE FROM cumplimiento WHERE trimestre_id=1000040 AND mes=ANY($1::int[])',[[1,2,3]])
  await q('DELETE FROM foda WHERE centro_id=$1 AND anio=$2 AND trimestre=$3',m.quarter)
  await q('DELETE FROM trimestres WHERE id=1000040')
  for(const table of ['kpi_auto_ajustes','kpi_semanas','resumen_mes','mes_kpi']) for(const key of m.reportKeys[table]) await q('DELETE FROM '+table+' WHERE centro_id=$1 AND year=$2 AND month=$3'+(table==='kpi_semanas'?' AND semana=$4':''),table==='kpi_semanas'?[key.centro_id,key.year,key.month,key.semana]:[key.centro_id,key.year,key.month])
  await q('DELETE FROM password_tokens WHERE token=$1 AND user_id=1000006',[m.accessToken])
}
