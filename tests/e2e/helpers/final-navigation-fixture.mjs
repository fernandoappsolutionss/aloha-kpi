import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { neonConfig, Pool } from '@neondatabase/serverless'
import ws from 'ws'
import bcrypt from 'bcryptjs'
import { resolveNeonE2EConfig } from '../../../lib/neon-e2e-config.mjs'

export const SUPERVISOR = { id: 991001, email: 'supervisor-final@e2e.invalid', password: 'AlohaFinalDisposable!2026' }
const marker = 'E2E_FINAL_NAVIGATION_SUPERVISOR'
const manifest = 'tests/e2e/.auth/final-navigation-manifest.json'
function guard() {
  const e=process.env
  if(e.E2E_DATABASE_CONFIRM!=='disposable'||e.RESPONSIVE_BASE_URL||e.DATABASE_URL!==e.USUARIOS_TEST_DATABASE_URL) throw new Error('Navegación final exige DB local disposable idéntica.')
  const db=new URL(e.DATABASE_URL),http=new URL(e.E2E_NEON_HTTP)
  if(!['localhost','127.0.0.1','aloha-r2-pg'].includes(db.hostname)||http.protocol!=='http:'||http.hostname!=='127.0.0.1'||!/^127\.0\.0\.1:\d+$/.test(e.E2E_NEON_WSPROXY||''))throw new Error('Transportes de navegación no locales.')
}
async function transaction(work) {
  guard();neonConfig.webSocketConstructor=ws;Object.assign(neonConfig,resolveNeonE2EConfig(process.env))
  const pool=new Pool({connectionString:process.env.DATABASE_URL}),db=await pool.connect()
  try {await db.query('BEGIN');const result=await work(db);await db.query('COMMIT');return result}
  catch(error){await db.query('ROLLBACK');throw error}finally{db.release();await pool.end()}
}
export async function prepareSupervisor() {
  guard()
  try{await readFile(manifest);throw new Error('Manifest previo: no adoptar fixture.')}catch(error){if(error.code!=='ENOENT')throw error}
  const hash=await bcrypt.hash(SUPERVISOR.password,10)
  await transaction(async db=>{
    const collision=await db.query('SELECT id FROM usuarios WHERE id=$1 OR email=$2',[SUPERVISOR.id,SUPERVISOR.email])
    if(collision.rowCount)throw new Error('Colisión supervisor; no sobrescribir.')
    await mkdir('tests/e2e/.auth',{recursive:true})
    await writeFile(manifest,JSON.stringify({marker,id:SUPERVISOR.id}),{mode:0o600,flag:'wx'})
    await db.query("INSERT INTO usuarios(id,nombre,email,password_hash,rol) VALUES($1,$2,$3,$4,'supervisor')",[SUPERVISOR.id,marker,SUPERVISOR.email,hash])
  })
}
export async function cleanupSupervisor() {
  guard();let m
  try{m=JSON.parse(await readFile(manifest,'utf8'))}catch(error){if(error.code==='ENOENT')return;throw error}
  if(m.marker!==marker||m.id!==SUPERVISOR.id)throw new Error('Manifest supervisor ajeno.')
  await transaction(async db=>{
    const {rows}=await db.query('SELECT nombre,email,rol,centro_id FROM usuarios WHERE id=$1 FOR UPDATE',[m.id])
    if(rows.length && (rows[0].nombre!==marker||rows[0].email!==SUPERVISOR.email||rows[0].rol!=='supervisor'||rows[0].centro_id!==null))throw new Error('Propiedad supervisor perdida.')
    for(const [table,column] of [['usuario_centros','usuario_id'],['password_tokens','user_id'],['entrenamiento_progreso','usuario_id']]) {
      if((await db.query(`SELECT 1 FROM ${table} WHERE ${column}=$1`,[m.id])).rowCount)throw new Error('Derivados supervisor inesperados; preservar y diagnosticar.')
    }
    m.receiptIds=(await db.query('SELECT id FROM growth_notification_receipts WHERE usuario_id=$1 ORDER BY id',[m.id])).rows.map(row=>Number(row.id))
    await writeFile(manifest,JSON.stringify(m),{mode:0o600})
    await db.query('DELETE FROM growth_notification_receipts WHERE usuario_id=$1 AND id=ANY($2::bigint[])',[m.id,m.receiptIds])
    await db.query('DELETE FROM usuarios WHERE id=$1',[m.id])
    if((await db.query('SELECT id FROM usuarios WHERE id=$1',[m.id])).rowCount)throw new Error('Cleanup supervisor incompleto.')
  })
  await rm(manifest)
  console.log('Cleanup supervisor local exacto:',JSON.stringify({usuarios:[m.id],receiptIds:m.receiptIds}),'; cuentas base intactas.')
}
