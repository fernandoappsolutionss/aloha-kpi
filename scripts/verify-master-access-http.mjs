// Prueba de contratos HTTP reales contra la instancia LOCAL desechable.
// No abre un navegador, no usa sesiones de producción y no envía correos.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SignJWT } from 'jose'
import pg from 'pg'

const base = process.env.MASTER_TEST_URL || 'http://127.0.0.1:4358'
const database = process.env.USUARIOS_TEST_DATABASE_URL
if (process.env.E2E_DATABASE_CONFIRM !== 'disposable' || !database ||
    !['localhost','127.0.0.1'].includes(new URL(database).hostname) ||
    !['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Solo se permite la instancia local desechable.')
const db = new pg.Client({ connectionString: database })
await db.connect()
const secret = new TextEncoder().encode(process.env.SESSION_SECRET)
async function cookie(uid, rol = 'admin_general', email = 'general@e2e.invalid') {
  return 'aloha_session=' + await new SignJWT({ uid,rol,email,centro_id:null,centros:[] }).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(secret)
}
const cookies = { general: await cookie(30), master: await cookie(2,'admin_general','fperez@teamsolutionss.com') }
async function get(path, auth = cookies.general) {
  return fetch(base + path, { headers: auth ? {cookie:auth} : {}, redirect:'manual' })
}
function entry(file, name) {
  const manifest = JSON.parse(readFileSync('.next/server/server-reference-manifest.json','utf8'))
  const found = Object.entries(manifest.node).find(([,v]) => v.exportedName === name && v.filename === `app/actions/${file}.js`)
  if (!found) throw new Error(`Acción no compilada: ${file}.${name}`)
  const [id,value]=found
  const route=Object.keys(value.workers)[0].replace(/^app/,'').replace(/\/page$/,'') || '/'
  return {id,route}
}
async function action(file,name,args,auth=cookies.general) {
  const {id,route}=entry(file,name)
  const response=await fetch(base+route,{method:'POST',headers:{cookie:auth,'next-action':id,'content-type':'text/plain;charset=UTF-8','accept':'text/x-component','origin':base},body:JSON.stringify(args),redirect:'manual'})
  const text=await response.text()
  const line=text.split('\n').find(x=>/^1:/.test(x))
  let result=null
  if(line&&!line.startsWith('1:E')){try{result=JSON.parse(line.slice(2))}catch{}}
  return {response,text,result}
}
let assertions=0
function check(condition,message){assert.ok(condition,message);assertions++;console.log('PASS',message)}
async function fingerprint(){
  const result={}
  for(const table of ['centros','usuarios','password_tokens','metas','mes_kpi','kpi_semanas','foda','salones','pedidos_material']){
    result[table]=(await db.query(`SELECT md5(coalesce(string_agg(v::text,'|' ORDER BY v::text),'')) hash FROM (SELECT to_jsonb(t) v FROM ${table} t) q`)).rows[0].hash
  }
  return result
}
try {
  for(const route of ['/dashboard/usuarios','/dashboard/metas','/dashboard/centros','/centro/1/kpi','/centro/1/grupos','/centro/1/cuadro','/centro/1/foda']) {
    const response=await get(route)
    check(response.status===200,`General puede consultar ${route}`)
    await response.text()
  }
  const page=await action('usuarios','getUsuariosPageData',[])
  check(page.result?.users?.length>=8,'General recibe el listado global de usuarios')
  check(page.result?.capabilities?.createUser===false,'General no recibe capacidad de crear usuarios')
  check(page.result?.users?.every(u=>Object.values(u.actions||{}).every(v=>!v)),'General no recibe acciones sobre usuarios')
  const mutations=[
    ['centros','createCentro',[{nombre:'NO CREAR MASTER QA',region:'QA',pais:'PA'}]],
    ['centros','updateCentro',[1,{nombre:'NO EDITAR MASTER QA',region:'QA',pais:'PA'}]],
    ['metas','saveMetas',[2026,3,{meta_nuevos_ingresos_mes:60,meta_desercion_mes:3,meta_cobranza_max:5,gpn_min:8,cp_conversion:50}]],
    ['usuarios','createUsuario',[{nombre:'Prohibido QA',email:'prohibido-master@e2e.invalid',rol:'asistente',centro_id:1}]],
    ['usuarios','updateUsuario',[33,{nombre:'NO EDITAR QA',rol:'asistente',centro_id:1}]],
    ['usuarios','reenviarInvitacion',[33]],
    ['usuarios','deleteUsuario',[33]],
    ['kpi','saveKpiMes',[1,2026,9,{},[]]],
    ['grupos','saveSalon',[1,{nombre:'NO CREAR SALON QA',capacidad_ninos:8}]],
    ['cuadro','savePedido',[1,{year:2026,month:9,producto:'NO GUARDAR QA',cantidad:1,monto:1}]],
    ['foda','saveFoda',[1,2026,3,{fortalezas:'NO GUARDAR QA'}]],
  ]
  const beforeMutations=await fingerprint()
  for(const [file,name,args] of mutations){
    const result=await action(file,name,args)
    check(Boolean(result.result?.error)||result.response.status>=400||/^1:E/m.test(result.text),`General denegado en ${file}.${name}`)
  }
  assert.deepEqual(await fingerprint(),beforeMutations,'General no cambió ninguna fila operativa ni token de acceso')
  check(true,'Once acciones HTTP de escritura dejaron intactas nueve tablas')
  const paths=['/dashboard/entrenamiento/oficio','/centro/1/entrenamiento/oficio','/centro/1/entrenamiento/oficio/of-cen-2','/centro/1/entrenamiento/oficio/of-cen-2/sop','/centro/1/entrenamiento/oficio/glosario','/entrenamiento/oficio/of-cen-2.mp3','/entrenamiento/guia/of-coa-6/vista.mp3']
  for(const path of paths){const r=await get(path);check(r.status!==200,`General no alcanza ${path}`);await r.arrayBuffer()}
  const nav=await action('navigation','getNavigationContext',[],cookies.master)
  check(nav.result?.actor?.role==='admin_master','Cookie vieja de Fernando usa su rol Master vigente')
  const masterPage=await action('usuarios','getUsuariosPageData',[],cookies.master)
  check(masterPage.result?.capabilities?.createUser===true,'Master conserva gestión de usuarios')
  const self=masterPage.result?.users?.find(u=>Number(u.id)===2)
  check(self&&Object.values(self.actions||{}).every(v=>!v),'Master no puede autoeliminarse, degradarse ni bloquearse')
  await db.query("UPDATE usuarios SET blocked_until=now()+interval '1 hour' WHERE id=30")
  try {
    for(const path of ['/dashboard','/dashboard/usuarios','/centro/1/kpi','/entrenamiento/oficio/of-cen-2.mp3','/api/centro/1/cuadro?year=2026&month=9']){
      const r=await get(path);check(r.status!==200,`Cookie ya abierta queda bloqueada en ${path}`);await r.arrayBuffer()
    }
    const r=await get('/login');check(r.status===200,'Bloqueado puede ver login sin bucle');await r.text()
  }finally{await db.query('UPDATE usuarios SET blocked_until=NULL WHERE id=30')}
  const unblocked=await get('/dashboard');check(unblocked.status===200,'Usuario recupera acceso al quitar bloqueo');await unblocked.text()
  console.log(JSON.stringify({assertions,status:'PASS'}))
}finally{await db.end()}
