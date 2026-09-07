// Verificación de solo lectura del despliegue autorizado. Las cookies de prueba
// duran dos minutos, viven en memoria y nunca se imprimen ni se guardan.
import assert from 'node:assert/strict'
import { neon } from '@neondatabase/serverless'
import { SignJWT } from 'jose'
import { BLOCKED_UNTIL, MASTER_EMAIL } from './aplicar-master-access.mjs'

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET || process.env.E2E_DATABASE_CONFIRM) throw new Error('Se requiere el entorno productivo explícito, sin configuración E2E.')
const base='https://aloha-kpi.vercel.app'
const sql=neon(process.env.DATABASE_URL)
const users=await sql`SELECT id,email,rol,blocked_until,blocked_until>clock_timestamp() blocked FROM usuarios WHERE id IN (2,5,14) ORDER BY id`
assert.equal(users.length,3)
assert.equal(users[0].email,MASTER_EMAIL)
assert.equal(users[0].rol,'admin_master')
assert.notEqual(users[0].blocked,true)
assert.equal(users[1].email,'froberts@alohapanama.com')
assert.equal(users[2].email,'vcampos@alohapanama.com')
for(const user of users.slice(1)){assert.equal(user.rol,'admin_general');assert.equal(user.blocked,true);assert.equal(new Date(user.blocked_until).toISOString(),BLOCKED_UNTIL)}
const masters=await sql`SELECT id FROM usuarios WHERE rol='admin_master'`
assert.deepEqual(masters.map(u=>Number(u.id)),[2])
const secret=new TextEncoder().encode(process.env.SESSION_SECRET.trim())
async function cookie(user){return 'aloha_session='+await new SignJWT({uid:Number(user.id),rol:'admin_general',email:user.email,centro_id:null,centros:[]}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('2m').sign(secret)}
async function check(path,auth,status,label){
  const response=await fetch(base+path,{headers:auth?{cookie:auth}:{},redirect:'manual'})
  await response.arrayBuffer()
  assert.ok(status(response.status),`${label}: HTTP ${response.status}`)
  console.log('PASS',label)
}
for(const user of users.slice(1)){
  const auth=await cookie(user)
  for(const path of ['/dashboard','/dashboard/usuarios','/centro/2/kpi','/entrenamiento/oficio/of-cen-2.mp3']) await check(path,auth,s=>[302,303,307,308,401,403].includes(s),`${user.email} sin acceso a ${path}`)
  await check('/login',auth,s=>s===200,`${user.email}: login sin bucle`)
}
const masterCookie=await cookie(users[0])
await check('/dashboard/usuarios',masterCookie,s=>s===200,'Fernando Master entra con claims anteriores de General')
const [reader]=await sql`SELECT id,email FROM usuarios WHERE rol='admin_general' AND id NOT IN (5,14) AND password_hash IS NOT NULL AND (blocked_until IS NULL OR blocked_until<=clock_timestamp()) ORDER BY id LIMIT 1`
if(reader){
  const auth=await cookie(reader)
  for(const path of ['/dashboard/usuarios','/dashboard/metas','/dashboard/centros']) await check(path,auth,s=>s===200,`General activo conserva consulta ${path}`)
  for(const path of ['/dashboard/entrenamiento/oficio','/centro/2/entrenamiento/oficio','/entrenamiento/oficio/of-cen-2.mp3','/entrenamiento/%6fficio/of-cen-2.mp3','/entrenamient%6f/oficio/of-cen-2.mp3']) await check(path,auth,s=>[302,303,307,308,401,403].includes(s),`General activo no alcanza ${path}`)
}
console.log(JSON.stringify({status:'PASS',master:MASTER_EMAIL,blockedUntil:BLOCKED_UNTIL,accounts:users.map(({id,email,rol,blocked})=>({id,email,rol,blocked}))}))
